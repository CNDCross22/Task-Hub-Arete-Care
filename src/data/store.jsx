import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createLocalBackend } from './backend/localBackend'
import { createSupabaseBackend } from './backend/supabaseBackend'
import { createEdgeBackend, hasEdgeConfig } from './backend/edgeBackend'
import { hasSupabaseConfig } from './backend/supabaseClient'
import { seedData } from './seed'
import { TASK_DEFAULTS } from './config'
import { uid, nowIso } from '@/lib/id'
import { buildSeries, completionStamp, SERIES_SKIP } from '@/data/recurrence'
import { notifyChange, subscribeToChanges } from './realtime'
import { useToast } from '@/components/Toast'

// Updates arrive instantly by push (see ./realtime): whoever changes something
// broadcasts a ping and everyone else refetches. This poll is only a safety net
// for when the websocket is blocked (some corporate networks) or a ping goes
// missing, so it's slow — push is the path that makes the app feel live.
const POLL_MS = 15000

// At most one refetch per this window, so a burst of pings (or a spoofed one —
// the channel is reachable with the public key) can't spam the Edge Function.
const SYNC_THROTTLE_MS = 700

// Number of writes currently in flight. The live-sync poll checks this so a
// server snapshot taken before a pending save can't clobber the optimistic UI.
let pendingWrites = 0

// Wrap every mutating method so `pendingWrites` covers all of them — including
// reorder/reschedule, which intentionally skip the global busy flag — and so a
// "changed" ping goes out after any successful write, whatever the code path.
function trackWrites(b) {
  const wrap = (fn) => async (...args) => {
    pendingWrites++
    try {
      const result = await fn(...args)
      notifyChange()
      return result
    } finally {
      pendingWrites--
    }
  }
  return {
    ...b,
    create: wrap(b.create.bind(b)),
    update: wrap(b.update.bind(b)),
    remove: wrap(b.remove.bind(b)),
    replace: wrap(b.replace.bind(b)),
    ...(b.createMany ? { createMany: wrap(b.createMany.bind(b)) } : {}),
  }
}

// Backend priority:
//   edge     — secure Edge Function proxy (RLS on; service key server-side)
//   supabase — direct table access via publishable key (RLS off; dev only)
//   local    — browser localStorage (no backend configured)
const backend = trackWrites(
  hasEdgeConfig
    ? createEdgeBackend()
    : hasSupabaseConfig
      ? createSupabaseBackend()
      : createLocalBackend(seedData),
)
export const BACKEND_MODE = hasEdgeConfig ? 'edge' : hasSupabaseConfig ? 'supabase' : 'local'

// Backfill fields on rows written before completedAt / seriesId existed, so an
// old task still collapses as a series and reports its completion date.
function migrateTasks(raw) {
  let changed = false
  const tasks = raw.map((t) => {
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
  return { tasks, changed }
}

const DataContext = createContext(null)
// Ephemeral UI state that changes often (a save's busy flag flips on every
// mutation; the modal opens/closes) lives in its own contexts so those updates
// only re-render the few consumers that care — not every data reader.
const BusyContext = createContext(false)
const ModalContext = createContext(null)

// Persist a batch of new tasks in one request when the backend supports it
// (createMany), else fall back to individual creates.
async function persistMany(items) {
  if (!items || !items.length) return
  if (backend.createMany) await backend.createMany('tasks', items)
  else await Promise.all(items.map((c) => backend.create('tasks', c)))
}

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

  // Serialized copy of the last server payload we applied, so a poll that finds
  // nothing new skips setState entirely (no re-render, no flicker).
  const snapshotRef = useRef('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)
    backend
      .getAll()
      .then((db) => {
        if (!active) return
        // One-time migrations, written back so later loads are already clean.
        const { tasks: migrated, changed } = migrateTasks(db.tasks || [])
        snapshotRef.current = JSON.stringify(db)
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

  // Pull the latest server state. Cheap when nothing changed: the payload is
  // compared against the last one applied, so an unchanged poll skips setState
  // entirely (no re-render, no flicker).
  const syncNow = useCallback(async () => {
    // Don't fetch in a background tab, and never race a save that's in flight.
    if (document.hidden || pendingWrites > 0) return
    try {
      const db = await backend.getAll()
      // A write started while we were fetching — this snapshot predates it.
      if (pendingWrites > 0) return
      const sig = JSON.stringify(db)
      if (sig === snapshotRef.current) return
      snapshotRef.current = sig
      setProjects(db.projects || [])
      setTasks(migrateTasks(db.tasks || []).tasks)
      setMembers(db.members || [])
    } catch {
      // Keep the last good data on screen; the next ping/tick retries.
    }
  }, [])

  // Throttled entry point for pushed pings: runs immediately when idle, else
  // schedules one trailing refetch, so N rapid pings cost at most one fetch per
  // window and we still end on the newest state.
  const lastSyncRef = useRef(0)
  const queuedRef = useRef(false)
  const scheduleSync = useCallback(() => {
    const wait = SYNC_THROTTLE_MS - (Date.now() - lastSyncRef.current)
    if (wait <= 0) {
      lastSyncRef.current = Date.now()
      syncNow()
      return
    }
    if (queuedRef.current) return
    queuedRef.current = true
    setTimeout(() => {
      queuedRef.current = false
      lastSyncRef.current = Date.now()
      syncNow()
    }, wait)
  }, [syncNow])

  // Instant updates: refetch the moment another client reports a change.
  useEffect(() => {
    if (BACKEND_MODE === 'local' || loading || loadError) return
    return subscribeToChanges(scheduleSync)
  }, [loading, loadError, scheduleSync])

  // Safety net for a dropped websocket or a missed ping, plus an immediate
  // catch-up whenever the tab/app comes back to the foreground.
  useEffect(() => {
    if (BACKEND_MODE === 'local' || loading || loadError) return
    const id = setInterval(syncNow, POLL_MS)
    const onWake = () => {
      if (!document.hidden) syncNow()
    }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [loading, loadError, syncNow])

  // Optimistic: the UI updates immediately and the save runs in the background,
  // rolling back with an error toast if it fails. Makes add/edit feel instant
  // (and recurring adds close the modal right away while occurrences save).
  const createTask = useCallback(
    (data) => {
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
      const series = buildSeries(item)
      const addedIds = new Set([item.id, ...series.map((s) => s.id)])
      setTasks((t) => [...series, item, ...t])

      setBusyCount((n) => n + 1)
      ;(async () => {
        try {
          await backend.create('tasks', item)
          await persistMany(series)
          toast.success(data?.recurring ? 'Recurring task created' : 'Task created')
        } catch {
          setTasks((t) => t.filter((x) => !addedIds.has(x.id)))
          toast.error('Couldn’t create the task')
        } finally {
          setBusyCount((n) => n - 1)
        }
      })()
      return item
    },
    [toast],
  )

  const updateTask = useCallback(
    (id, patch) => {
      const existing = tasks.find((t) => t.id === id)
      if (!existing) return Promise.resolve()
      let finalPatch = patch
      if ('status' in patch) {
        finalPatch = { ...patch, completedAt: completionStamp(existing.status, existing.completedAt, patch.status) }
      }
      // Turning recurring ON (via edit) assigns a series id + pre-creates occurrences.
      const turningOn = patch.recurring === true && existing.recurring !== true
      if (turningOn) finalPatch = { ...finalPatch, seriesId: existing.seriesId || uid('s') }
      const justCompleted = patch.status === 'completed' && existing.status !== 'completed'

      const prev = tasks
      setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...finalPatch } : x)))
      const series = turningOn ? buildSeries({ ...existing, ...finalPatch }) : []
      if (series.length) setTasks((t) => [...series, ...t])

      setBusyCount((n) => n + 1)
      ;(async () => {
        try {
          await backend.update('tasks', id, finalPatch)
          await persistMany(series)
          toast.success(justCompleted ? 'Task completed' : 'Task updated')
        } catch {
          setTasks(prev)
          toast.error('Couldn’t update the task')
        } finally {
          setBusyCount((n) => n - 1)
        }
      })()
      return Promise.resolve()
    },
    [tasks, toast],
  )

  const removeTask = useCallback(
    (id) => {
      const prev = tasks
      setTasks((t) => t.filter((x) => x.id !== id))
      setBusyCount((n) => n + 1)
      ;(async () => {
        try {
          await backend.remove('tasks', id)
          toast.success('Task deleted')
        } catch {
          setTasks(prev)
          toast.error('Couldn’t delete the task')
        } finally {
          setBusyCount((n) => n - 1)
        }
      })()
      return Promise.resolve()
    },
    [tasks, toast],
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

  // Move a task one slot up (dir -1) or down (dir +1) among the tasks that share
  // its status — the Tasks list's arrow controls, an alternative to dragging.
  // `groupIds` is that status group in the order the user currently sees it, so
  // the move always matches the screen (filters and paging included).
  //
  // Fast path: slot a fractional sortIndex between the new neighbours and write
  // that one row. Fallback (a neighbour is unnumbered, or the gap is used up):
  // renumber the group by position, writing only the rows that actually moved.
  const moveWithin = useCallback(
    (id, dir, groupIds) => {
      const i = groupIds.indexOf(id)
      const j = i + dir
      if (i === -1 || j < 0 || j >= groupIds.length) return Promise.resolve()

      const rest = groupIds.filter((x) => x !== id)
      const indexOf = (tid) => {
        const t = tasks.find((x) => x.id === tid)
        return t && typeof t.sortIndex === 'number' ? t.sortIndex : null
      }
      const above = rest[j - 1]
      const below = rest[j]
      const ai = above ? indexOf(above) : null
      const bi = below ? indexOf(below) : null

      let newIndex = null
      if (ai !== null && bi !== null) {
        if (bi - ai > 1e-6) newIndex = (ai + bi) / 2
      } else if (ai !== null && !below) newIndex = ai + 1
      else if (bi !== null && !above) newIndex = bi - 1

      const prev = tasks
      const changes =
        newIndex !== null
          ? [{ id, sortIndex: newIndex }]
          : [...rest.slice(0, j), id, ...rest.slice(j)]
              .map((tid, pos) => ({ id: tid, sortIndex: pos }))
              .filter(({ id: tid, sortIndex }) => tasks.find((x) => x.id === tid)?.sortIndex !== sortIndex)

      if (!changes.length) return Promise.resolve()
      const next = new Map(changes.map((c) => [c.id, c.sortIndex]))
      setTasks((ts) => ts.map((t) => (next.has(t.id) ? { ...t, sortIndex: next.get(t.id) } : t)))

      setBusyCount((n) => n + 1)
      ;(async () => {
        try {
          await Promise.all(changes.map((c) => backend.update('tasks', c.id, { sortIndex: c.sortIndex })))
        } catch {
          setTasks(prev)
          toast.error('Couldn’t reorder the tasks')
        } finally {
          setBusyCount((n) => n - 1)
        }
      })()
      return Promise.resolve()
    },
    [tasks, toast],
  )

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

  // Drag-and-drop reorder. Removes the dragged task and re-inserts it before
  // `beforeId` (drop onto a card), else at the end of the `newStatus` column.
  // `patch` lets a calendar drop also move the task's date while repositioning.
  //
  // Fast path: give the moved task a fractional sortIndex BETWEEN its new
  // neighbours and write only that one row. Fallback (a neighbour has no numeric
  // sortIndex yet, or the gap is exhausted): renumber the whole list. Fallbacks
  // normalise every row, so subsequent reorders stay on the fast single-row path.
  const reorderTask = useCallback(
    async (dragId, newStatus, beforeId = null, patch = null) => {
      const moving = tasks.find((t) => t.id === dragId)
      if (!moving) return
      const statusPatch =
        moving.status === newStatus
          ? null
          : { status: newStatus, completedAt: completionStamp(moving.status, moving.completedAt, newStatus) }

      const arr = tasks.filter((t) => t.id !== dragId)
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

      const above = arr[insertAt - 1]
      const below = arr[insertAt]
      const ai = typeof above?.sortIndex === 'number' ? above.sortIndex : null
      const bi = typeof below?.sortIndex === 'number' ? below.sortIndex : null
      let newIndex = null
      if (ai !== null && bi !== null) {
        if (bi - ai > 1e-6) newIndex = (ai + bi) / 2
      } else if (ai !== null && !below) newIndex = ai + 1
      else if (bi !== null && !above) newIndex = bi - 1

      const prev = tasks

      if (newIndex !== null) {
        const changes = { ...statusPatch, ...patch, sortIndex: newIndex }
        const updated = { ...moving, ...changes }
        setTasks([...arr.slice(0, insertAt), updated, ...arr.slice(insertAt)])
        try {
          await backend.update('tasks', dragId, changes)
        } catch {
          setTasks(prev)
          toast.error('Couldn’t move the task')
        }
        return
      }

      // Fallback: rewrite the whole order (replace re-stamps sortIndex by position).
      const updated = { ...moving, ...statusPatch, ...patch }
      const reordered = [...arr.slice(0, insertAt), updated, ...arr.slice(insertAt)]
      setTasks(reordered.map((t, i) => ({ ...t, sortIndex: i })))
      try {
        await backend.replace('tasks', reordered)
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
      createTask,
      updateTask,
      removeTask,
      clearTasks,
      updateSeries,
      deleteSeries,
      moveTask,
      moveWithin,
      reorderTask,
      rescheduleTask,
      createProject,
      updateProject,
      removeProject,
      createMember,
      updateMember,
      removeMember,
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
      createTask,
      updateTask,
      removeTask,
      clearTasks,
      updateSeries,
      deleteSeries,
      moveTask,
      moveWithin,
      reorderTask,
      rescheduleTask,
      createProject,
      updateProject,
      removeProject,
      createMember,
      updateMember,
      removeMember,
      openNewTask,
      openEditTask,
      closeModal,
    ],
  )

  return (
    <DataContext.Provider value={value}>
      <BusyContext.Provider value={busyCount > 0}>
        <ModalContext.Provider value={modal}>{children}</ModalContext.Provider>
      </BusyContext.Provider>
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}

// The save-in-progress flag — read only by the global progress bar so a save
// doesn't re-render every data consumer.
export function useBusy() {
  return useContext(BusyContext)
}

// The shared task-editor modal state — read only by the modal itself.
export function useModal() {
  return useContext(ModalContext)
}

export const projectMeta = (projects, id) => projects.find((p) => p.id === id) || null
