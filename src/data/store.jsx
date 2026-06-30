import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createLocalBackend } from './backend/localBackend'
import { createSupabaseBackend } from './backend/supabaseBackend'
import { hasSupabaseConfig } from './backend/supabaseClient'
import { seedData } from './seed'
import { TASK_DEFAULTS } from './config'

// Auto-select the backend: Supabase when its env vars are present, else local.
// Both implement the same getAll/create/update/remove/replace interface.
const backend = hasSupabaseConfig ? createSupabaseBackend(seedData) : createLocalBackend(seedData)
export const BACKEND_MODE = hasSupabaseConfig ? 'supabase' : 'local'

const DataContext = createContext(null)

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`
const nowIso = () => new Date().toISOString()

// Keep completedAt in sync with status: stamp on entering 'completed',
// clear on leaving it. Powers the weekly report's "what got done" view.
function completionStamp(prevStatus, prevCompletedAt, nextStatus) {
  if (nextStatus === 'completed') return prevCompletedAt || nowIso()
  return null
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
      ...TASK_DEFAULTS,
      ...data,
    }
    const item = {
      ...base,
      completedAt: base.status === 'completed' ? base.completedAt || nowIso() : null,
    }
    await backend.create('tasks', item)
    setTasks((t) => [item, ...t])
    return item
  }, [])

  const updateTask = useCallback(
    async (id, patch) => {
      let finalPatch = patch
      if ('status' in patch) {
        const existing = tasks.find((t) => t.id === id)
        finalPatch = {
          ...patch,
          completedAt: completionStamp(existing?.status, existing?.completedAt, patch.status),
        }
      }
      await backend.update('tasks', id, finalPatch)
      setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...finalPatch } : x)))
    },
    [tasks],
  )

  const removeTask = useCallback(async (id) => {
    await backend.remove('tasks', id)
    setTasks((t) => t.filter((x) => x.id !== id))
  }, [])

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

  const resetData = useCallback(() => {
    try {
      localStorage.removeItem('arete-task-hub:v3')
    } catch {
      /* ignore */
    }
    window.location.reload()
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
      moveTask,
      reorderTask,
      createProject,
      updateProject,
      removeProject,
      createMember,
      updateMember,
      removeMember,
      resetData,
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
      moveTask,
      reorderTask,
      createProject,
      updateProject,
      removeProject,
      createMember,
      updateMember,
      removeMember,
      resetData,
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
