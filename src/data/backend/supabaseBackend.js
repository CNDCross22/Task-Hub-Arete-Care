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

export function createSupabaseBackend() {
  return {
    async getAll() {
      const [proj, task, mem] = await Promise.all([
        supabase.from('projects').select('*').order('name'),
        orderTasks(supabase.from('tasks').select('*')),
        supabase.from('members').select('*').order('name'),
      ])
      if (proj.error) throw proj.error
      if (task.error) throw task.error

      // No seeding — the app reflects exactly what is in the database.
      const projects = proj.data || []
      const tasks = task.data || []
      // members table may not exist yet — don't let that break the app.
      const members = mem.error ? [] : mem.data || []

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
