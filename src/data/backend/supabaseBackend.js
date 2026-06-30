// Supabase (Postgres) backend — implements the SAME interface as localBackend:
//   getAll / create / update / remove / replace
// so swapping it in requires no component changes.
//
// Ordering: tasks carry a numeric `sortIndex` (kept in sync by `replace`, which
// the Kanban drag-and-drop calls with the full ordered list). Rows without a
// sortIndex (freshly created) float to the top until the next reorder.

import { supabase } from './supabaseClient'

const orderTasks = (q) =>
  q.order('sortIndex', { ascending: true, nullsFirst: true }).order('createdAt', { ascending: false })

export function createSupabaseBackend(seed) {
  return {
    async getAll() {
      const [proj, task, mem] = await Promise.all([
        supabase.from('projects').select('*').order('name'),
        orderTasks(supabase.from('tasks').select('*')),
        supabase.from('members').select('*').order('name'),
      ])
      if (proj.error) throw proj.error
      if (task.error) throw task.error

      let projects = proj.data || []
      let tasks = task.data || []
      // members table may not exist yet (before supabase-members.sql is run) —
      // don't let that break the app.
      const members = mem.error ? [] : mem.data || []

      // First run against a fresh database — load the sample data so the app
      // isn't empty (mirrors localBackend's seed-on-first-run behavior).
      if (projects.length === 0 && tasks.length === 0 && seed) {
        const seededTasks = seed.tasks.map((t, i) => ({ ...t, sortIndex: i }))
        const r1 = await supabase.from('projects').insert(seed.projects)
        if (r1.error) throw r1.error
        const r2 = await supabase.from('tasks').insert(seededTasks)
        if (r2.error) throw r2.error
        projects = seed.projects
        tasks = seededTasks
      }

      return { projects, tasks, members }
    },

    async create(collection, item) {
      const { error } = await supabase.from(collection).insert(item)
      if (error) throw error
      return item
    },

    async update(collection, id, patch) {
      const { error } = await supabase.from(collection).update(patch).eq('id', id)
      if (error) throw error
      return { id, ...patch }
    },

    async remove(collection, id) {
      const { error } = await supabase.from(collection).delete().eq('id', id)
      if (error) throw error
    },

    // Persist a whole collection's order. For tasks, stamp sortIndex = position.
    async replace(collection, items) {
      const rows = collection === 'tasks' ? items.map((it, i) => ({ ...it, sortIndex: i })) : items
      const { error } = await supabase.from(collection).upsert(rows)
      if (error) throw error
      return rows
    },
  }
}
