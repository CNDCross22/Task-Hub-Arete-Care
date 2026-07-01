import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createLocalBackend } from './backend/localBackend'
import { createSupabaseBackend } from './backend/supabaseBackend'
import { createEdgeBackend, hasEdgeConfig } from './backend/edgeBackend'
import { hasSupabaseConfig } from './backend/supabaseClient'
import { seedData } from './seed'
import { TASK_DEFAULTS } from './config'
import { uid, nowIso } from '@/lib/id'
import { buildSeries, completionStamp, SERIES_SKIP } from '@/data/recurrence'
import { useToast } from '@/components/Toast'

// Backend priority:
//   edge     — secure Edge Function proxy (RLS on; service key server-side)
//   supabase — direct table access via publishable key (RLS off; dev only)
//   local    — browser localStorage (no backend configured)
const backend = hasEdgeConfig
  ? createEdgeBackend()
  : hasSupabaseConfig
    ? createSupabaseBackend()
    : createLocalBackend(seedData)
export const BACKEND_MODE = hasEdgeConfig ? 'edge' : hasSupabaseConfig ? 'supabase' : 'local'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyCount, setBusyCount] = useState(0)
  const toast = useToast()

  // Re-run the initial fetch (used by the load-error screen's Retry button).
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  // Shared task editor modal state (used by Topbar, Tasks, Kanban, etc.)
  const [modal, setModal] = useState({ open: false, mode: 'create', task: null })

  // Run a backend mutation with a global busy flag + success/error toast.
  // Rethrows so callers that care (e.g. the task modal) can react to failure.
  const runMutation = useCallback(
    async (fn, { success, error } = {}) => {
      setBusyCount((n) => n + 1)
      try {
        const result = await fn()
        if (success) toast.success(success)
        return result
      } catch (e) {
        toast.error(error || e?.message || 'Something went wrong')
        throw e
      } finally {
        setBusyCount((n) => n - 1)
      }
    },
    [toast],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)
    backend
      .getAll()
      .then((db) => {
        if (!active) return
        // One-time migrations: backfill completedAt for old completed tasks, and
        // a seriesId for any recurring task created before series linking existed
        // (so it collapses to a series row and offers the this/all-occurrence edit).
        const raw = db.tasks || []
        let changed = false
        const migrated = raw.map((t) => {
          let next = t
          if (next.status === 'completed' && !next.completedAt) {
            next = { ...next, completedAt: next.dueDate || next.createdAt }
            changed = true
          }
          if (next.recurring && !next.seriesId) {
            next = { ...next, seriesId: uid('s') }
            changed = true
          }
          return next
        })
        setProjects(db.projects || [])
        setTasks(migrated)
        setMembers(db.members || [])
        setLoading(false)
        if (changed) backend.replace('tasks', migrated).catch(() => {})
      })
      .catch((e) => {
        // A failed first fetch must not leave the app stuck on the loading screen.
        if (!active) return
        setLoadError(e)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  const createTask = useCallback(
    (data) =>
      runMutation(
        async () => {
          const base = {
            id: uid('t'),
            createdAt: nowIso(),
            assignees: [],
            tags: [],
            recurring: false,
            recurrence: 'weekly',
            completedAt: null,
            seriesId: null,
            ...TASK_DEFAULTS,
            ...data,
          }
          const item = {
            ...base,
            completedAt: base.status === 'completed' ? base.completedAt || nowIso() : null,
            // A recurring task and all its occurrences share one series id.
            seriesId: base.recurring ? base.seriesId || uid('s') : null,
          }
          await backend.create('tasks', item)
          // Recurring task: also create the upcoming occurrences so they're all visible.
          const series = buildSeries(item)
          await Promise.all(series.map((c) => backend.create('tasks', c)))
          setTasks((t) => [...series, item, ...t])
          return item
        },
        {
          success: data?.recurring ? 'Recurring task created' : 'Task created',
          error: 'Couldn’t create the task',
        },
      ),
    [runMutation],
  )

  const updateTask = useCallback(
    (id, patch) => {
      const existing = tasks.find((t) => t.id === id)
      const justCompleted = patch.status === 'completed' && existing?.status !== 'completed'
      return runMutation(
        async () => {
          let finalPatch = patch
          if ('status' in patch) {
            finalPatch = {
              ...patch,
              completedAt: completionStamp(existing?.status, existing?.completedAt, patch.status),
            }
          }
          // Turning recurring ON (via edit) assigns a series id + pre-creates occurrences.
          const turningOn = patch.recurring === true && existing && existing.recurring !== true
          if (turningOn) {
            finalPatch = { ...finalPatch, seriesId: existing.seriesId || uid('s') }
          }

          await backend.update('tasks', id, finalPatch)
          setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...finalPatch } : x)))

          if (turningOn) {
            const series = buildSeries({ ...existing, ...finalPatch })
            if (series.length) {
              await Promise.all(series.map((c) => backend.create('tasks', c)))
              setTasks((t) => [...series, ...t])
            }
          }
        },
        {
          success: justCompleted ? 'Task completed' : 'Task updated',
          error: 'Couldn’t update the task',
        },
      )
    },
    [runMutation, tasks],
  )

  const removeTask = useCallback(
    (id) =>
      runMutation(
        async () => {
          await backend.remove('tasks', id)
          setTasks((t) => t.filter((x) => x.id !== id))
        },
        { success: 'Task deleted', error: 'Couldn’t delete the task' },
      ),
    [runMutation],
  )

  // Delete every task (used by the Admin "clear tasks" tool during testing).
  const clearTasks = useCallback(() => {
    const ids = tasks.map((t) => t.id)
    if (ids.length === 0) return Promise.resolve()
    return runMutation(
      async () => {
        await Promise.all(ids.map((id) => backend.remove('tasks', id)))
        setTasks([])
      },
      { success: `Cleared ${ids.length} task${ids.length === 1 ? '' : 's'}`, error: 'Couldn’t clear tasks' },
    )
  }, [runMutation, tasks])

  // Apply an "all occurrences" edit to a series.
  //   - Detail change only → patch every occurrence, keep each one's own date.
  //   - Frequency change → keep the edited task as the anchor, drop the future
  //     occurrences, and rebuild them with the new spacing (so weekly→daily
  //     actually re-spaces the dates instead of just relabeling them).
  const updateSeries = useCallback(
    (seriesId, patch) =>
      runMutation(
        async () => {
          const targets = tasks.filter((t) => t.seriesId === seriesId)
          const anchor = tasks.find((t) => t.id === patch.id) || targets[0]
          if (!anchor) return
          const freqChanged = !!patch.recurrence && patch.recurrence !== anchor.recurrence

          if (!freqChanged) {
            const fields = { ...patch }
            for (const k of SERIES_SKIP) delete fields[k]
            await Promise.all(targets.map((t) => backend.update('tasks', t.id, fields)))
            setTasks((ts) => ts.map((t) => (t.seriesId === seriesId ? { ...t, ...fields } : t)))
            return
          }

          // Frequency changed: update the anchor in place (new freq + edits + its
          // own dates), delete the other not-yet-done occurrences, then regenerate.
          const updatedAnchor = { ...anchor, ...patch }
          const anchorPatch = { ...patch }
          delete anchorPatch.id
          await backend.update('tasks', anchor.id, anchorPatch)

          const drop = targets.filter((t) => t.id !== anchor.id && t.status !== 'completed')
          await Promise.all(drop.map((t) => backend.remove('tasks', t.id)))

          const regen = buildSeries(updatedAnchor)
          await Promise.all(regen.map((c) => backend.create('tasks', c)))

          const dropIds = new Set(drop.map((t) => t.id))
          setTasks((ts) => [
            ...regen,
            ...ts.filter((t) => !dropIds.has(t.id)).map((t) => (t.id === anchor.id ? updatedAnchor : t)),
          ])
        },
        { success: 'All occurrences updated', error: 'Couldn’t update the series' },
      ),
    [runMutation, tasks],
  )

  const deleteSeries = useCallback(
    (seriesId) =>
      runMutation(
        async () => {
          const ids = tasks.filter((t) => t.seriesId === seriesId).map((t) => t.id)
          await Promise.all(ids.map((id) => backend.remove('tasks', id)))
          setTasks((ts) => ts.filter((t) => t.seriesId !== seriesId))
        },
        { success: 'Recurring series deleted', error: 'Couldn’t delete the series' },
      ),
    [runMutation, tasks],
  )

  const moveTask = useCallback((id, status) => updateTask(id, { status }), [updateTask])

  // Drag-to-reschedule on the calendar. Optimistic (snaps back on failure).
  // Single-day tasks move whole; multi-day keep their start (clamped if the
  // new due date would fall before it).
  const rescheduleTask = useCallback(
    async (id, dateKey) => {
      const t = tasks.find((x) => x.id === id)
      if (!t || !dateKey || t.dueDate === dateKey) return
      const singleDay = !t.startDate || t.startDate === t.dueDate
      const patch =
        singleDay || (t.startDate && t.startDate > dateKey)
          ? { startDate: dateKey, dueDate: dateKey }
          : { dueDate: dateKey }
      const prev = tasks
      setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      try {
        await backend.update('tasks', id, patch)
      } catch {
        setTasks(prev)
        toast.error('Couldn’t move the task')
      }
    },
    [tasks, toast],
  )

  // Drag-and-drop reorder. Removes the dragged task and re-inserts it:
  //   - before `beforeId` when given (drop onto a card), else
  //   - at the end of the `newStatus` column (drop onto empty space).
  // Persists the whole tasks array so the order survives refresh.
  const reorderTask = useCallback(
    async (dragId, newStatus, beforeId = null) => {
      const moving = tasks.find((t) => t.id === dragId)
      if (!moving) return
      const updated =
        moving.status === newStatus
          ? moving
          : {
              ...moving,
              status: newStatus,
              completedAt: completionStamp(moving.status, moving.completedAt, newStatus),
            }

      let arr = tasks.filter((t) => t.id !== dragId)
      let insertAt
      if (beforeId && beforeId !== dragId) {
        insertAt = arr.findIndex((t) => t.id === beforeId)
        if (insertAt === -1) insertAt = arr.length
      } else {
        let lastIdx = -1
        arr.forEach((t, i) => {
          if (t.status === newStatus) lastIdx = i
        })
        insertAt = lastIdx === -1 ? arr.length : lastIdx + 1
      }
      arr = [...arr.slice(0, insertAt), updated, ...arr.slice(insertAt)]

      // Optimistic move; revert + warn if the save doesn't land. (No success
      // toast — drag/drop is frequent and the move itself is the feedback.)
      const prev = tasks
      setTasks(arr)
      try {
        await backend.replace('tasks', arr)
      } catch {
        setTasks(prev)
        toast.error('Couldn’t move the task')
      }
    },
    [tasks, toast],
  )

  const createProject = useCallback(
    (data) =>
      runMutation(
        async () => {
          const item = { id: uid('p'), color: 'blue', description: '', ...data }
          await backend.create('projects', item)
          setProjects((p) => [...p, item])
          return item
        },
        { success: 'Project created', error: 'Couldn’t create the project' },
      ),
    [runMutation],
  )

  const updateProject = useCallback(
    (id, patch) =>
      runMutation(
        async () => {
          await backend.update('projects', id, patch)
          setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)))
        },
        { success: 'Project updated', error: 'Couldn’t update the project' },
      ),
    [runMutation],
  )

  const removeProject = useCallback(
    (id) =>
      runMutation(
        async () => {
          await backend.remove('projects', id)
          setProjects((p) => p.filter((x) => x.id !== id))
          // Detach tasks from the deleted project (keep the tasks themselves).
          setTasks((ts) => ts.map((t) => (t.projectId === id ? { ...t, projectId: '' } : t)))
          const affected = tasks.filter((t) => t.projectId === id)
          await Promise.all(affected.map((t) => backend.update('tasks', t.id, { projectId: '' })))
        },
        { success: 'Project deleted', error: 'Couldn’t delete the project' },
      ),
    [runMutation, tasks],
  )

  const createMember = useCallback(
    (data) =>
      runMutation(
        async () => {
          const item = {
            id: uid('m'),
            role: 'member',
            active: true,
            department: 'IT',
            createdAt: nowIso(),
            ...data,
          }
          await backend.create('members', item)
          setMembers((m) => [...m, item])
          return item
        },
        { success: 'Member added', error: 'Couldn’t add the member' },
      ),
    [runMutation],
  )

  const updateMember = useCallback(
    (id, patch) =>
      runMutation(
        async () => {
          await backend.update('members', id, patch)
          setMembers((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)))
        },
        { success: 'Member updated', error: 'Couldn’t update the member' },
      ),
    [runMutation],
  )

  const removeMember = useCallback(
    (id) =>
      runMutation(
        async () => {
          await backend.remove('members', id)
          setMembers((m) => m.filter((x) => x.id !== id))
        },
        { success: 'Member removed', error: 'Couldn’t remove the member' },
      ),
    [runMutation],
  )

  // Modal controls
  const openNewTask = useCallback(
    (prefill = {}) => setModal({ open: true, mode: 'create', task: prefill }),
    [],
  )
  const openEditTask = useCallback(
    (task) => setModal({ open: true, mode: 'edit', task }),
    [],
  )
  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), [])

  const value = useMemo(
    () => ({
      projects,
      tasks,
      members,
      loading,
      loadError,
      reload,
      busy: busyCount > 0,
      createTask,
      updateTask,
      removeTask,
      clearTasks,
      updateSeries,
      deleteSeries,
      moveTask,
      reorderTask,
      rescheduleTask,
      createProject,
      updateProject,
      removeProject,
      createMember,
      updateMember,
      removeMember,
      modal,
      openNewTask,
      openEditTask,
      closeModal,
    }),
    [
      projects,
      tasks,
      members,
      loading,
      loadError,
      reload,
      busyCount,
      createTask,
      updateTask,
      removeTask,
      clearTasks,
      updateSeries,
      deleteSeries,
      moveTask,
      reorderTask,
      rescheduleTask,
      createProject,
      updateProject,
      removeProject,
      createMember,
      updateMember,
      removeMember,
      modal,
      openNewTask,
      openEditTask,
      closeModal,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}

export const projectMeta = (projects, id) => projects.find((p) => p.id === id) || null
