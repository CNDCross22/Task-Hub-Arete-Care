import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createLocalBackend } from './backend/localBackend'
import { createSupabaseBackend } from './backend/supabaseBackend'
import { createEdgeBackend, hasEdgeConfig } from './backend/edgeBackend'
import { hasSupabaseConfig } from './backend/supabaseClient'
import { seedData } from './seed'
import { TASK_DEFAULTS } from './config'
import { addDays, addMonths } from '@/lib/dates'

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

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`
const nowIso = () => new Date().toISOString()

// Keep completedAt in sync with status: stamp on entering 'completed',
// clear on leaving it. Powers the weekly report's "what got done" view.
function completionStamp(prevStatus, prevCompletedAt, nextStatus) {
  if (nextStatus === 'completed') return prevCompletedAt || nowIso()
  return null
}

// Recurrence: advance a date by one interval.
const RECUR_DAYS = { daily: 1, weekly: 7, biweekly: 14 }
const nextDate = (key, recurrence) => {
  if (!key) return key
  if (recurrence === 'monthly') return addMonths(key, 1)
  return addDays(key, RECUR_DAYS[recurrence] || 7)
}

// Fields that stay per-occurrence and are never copied across a series edit.
const SERIES_SKIP = ['id', 'seriesId', 'startDate', 'dueDate', 'status', 'completedAt', 'createdAt', 'sortIndex']

// Pre-build the upcoming occurrences of a recurring task so they're all visible.
// Caps at 12 occurrences and ~6 months out.
function buildSeries(task) {
  const anchor = task.dueDate || task.startDate
  if (!task.recurring || !anchor) return []
  const horizon = addDays(anchor, 180)
  const { id, createdAt, sortIndex, ...rest } = task
  const out = []
  let s = task.startDate
  let d = task.dueDate
  for (let i = 0; i < 12; i++) {
    s = s ? nextDate(s, task.recurrence) : ''
    d = d ? nextDate(d, task.recurrence) : ''
    const probe = d || s
    if (!probe || probe > horizon) break
    out.push({
      ...rest,
      id: `t_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      startDate: s,
      dueDate: d,
      completedAt: null,
      status: 'pending',
    })
  }
  return out
}

export function DataProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // Shared task editor modal state (used by Topbar, Tasks, Kanban, etc.)
  const [modal, setModal] = useState({ open: false, mode: 'create', task: null })

  useEffect(() => {
    let active = true
    backend.getAll().then((db) => {
      if (!active) return
      // Backfill completedAt for previously-completed tasks (one-time migration).
      const raw = db.tasks || []
      let changed = false
      const migrated = raw.map((t) => {
        if (t.status === 'completed' && !t.completedAt) {
          changed = true
          return { ...t, completedAt: t.dueDate || t.createdAt }
        }
        return t
      })
      setProjects(db.projects || [])
      setTasks(migrated)
      setMembers(db.members || [])
      setLoading(false)
      if (changed) backend.replace('tasks', migrated)
    })
    return () => {
      active = false
    }
  }, [])

  const createTask = useCallback(async (data) => {
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
  }, [])

  const updateTask = useCallback(
    async (id, patch) => {
      const existing = tasks.find((t) => t.id === id)
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
    [tasks],
  )

  const removeTask = useCallback(async (id) => {
    await backend.remove('tasks', id)
    setTasks((t) => t.filter((x) => x.id !== id))
  }, [])

  // Delete every task (used by the Admin "clear tasks" tool during testing).
  const clearTasks = useCallback(async () => {
    const ids = tasks.map((t) => t.id)
    if (ids.length === 0) return
    await Promise.all(ids.map((id) => backend.remove('tasks', id)))
    setTasks([])
  }, [tasks])

  // Apply an "all occurrences" edit to a series.
  //   - Detail change only → patch every occurrence, keep each one's own date.
  //   - Frequency change → keep the edited task as the anchor, drop the future
  //     occurrences, and rebuild them with the new spacing (so weekly→daily
  //     actually re-spaces the dates instead of just relabeling them).
  const updateSeries = useCallback(
    async (seriesId, patch) => {
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
    [tasks],
  )

  const deleteSeries = useCallback(
    async (seriesId) => {
      const ids = tasks.filter((t) => t.seriesId === seriesId).map((t) => t.id)
      await Promise.all(ids.map((id) => backend.remove('tasks', id)))
      setTasks((ts) => ts.filter((t) => t.seriesId !== seriesId))
    },
    [tasks],
  )

  const moveTask = useCallback((id, status) => updateTask(id, { status }), [updateTask])

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

      setTasks(arr)
      await backend.replace('tasks', arr)
    },
    [tasks],
  )

  const createProject = useCallback(async (data) => {
    const item = { id: uid('p'), color: 'blue', description: '', ...data }
    await backend.create('projects', item)
    setProjects((p) => [...p, item])
    return item
  }, [])

  const updateProject = useCallback(async (id, patch) => {
    await backend.update('projects', id, patch)
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])

  const removeProject = useCallback(async (id) => {
    await backend.remove('projects', id)
    setProjects((p) => p.filter((x) => x.id !== id))
    // Detach tasks from the deleted project (keep the tasks themselves).
    setTasks((ts) => ts.map((t) => (t.projectId === id ? { ...t, projectId: '' } : t)))
    const affected = tasks.filter((t) => t.projectId === id)
    await Promise.all(affected.map((t) => backend.update('tasks', t.id, { projectId: '' })))
  }, [tasks])

  const createMember = useCallback(async (data) => {
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
  }, [])

  const updateMember = useCallback(async (id, patch) => {
    await backend.update('members', id, patch)
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])

  const removeMember = useCallback(async (id) => {
    await backend.remove('members', id)
    setMembers((m) => m.filter((x) => x.id !== id))
  }, [])

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
      createTask,
      updateTask,
      removeTask,
      clearTasks,
      updateSeries,
      deleteSeries,
      moveTask,
      reorderTask,
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
      createTask,
      updateTask,
      removeTask,
      clearTasks,
      updateSeries,
      deleteSeries,
      moveTask,
      reorderTask,
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
