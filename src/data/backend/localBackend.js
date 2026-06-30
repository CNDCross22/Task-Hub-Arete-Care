// localStorage-backed data store.
//
// This implements the backend interface the rest of the app depends on:
//   getAll()                  -> { projects, tasks, ... }
//   create(collection, item)  -> item
//   update(collection, id, patch) -> updated item
//   remove(collection, id)    -> void
//
// To move to Supabase later, create a supabaseBackend.js with the SAME methods
// (backed by Postgres tables via the supabase-js client) and swap the import in
// store.jsx. No component code needs to change.

const KEY = 'arete-task-hub:v3'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // ignore quota / private-mode errors
  }
}

const clone = (v) =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))

export function createLocalBackend(seed) {
  let db = load() || clone(seed)
  persist(db)

  return {
    async getAll() {
      return clone(db)
    },
    async create(collection, item) {
      db = { ...db, [collection]: [item, ...(db[collection] || [])] }
      persist(db)
      return item
    },
    async update(collection, id, patch) {
      db = {
        ...db,
        [collection]: (db[collection] || []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }
      persist(db)
      return (db[collection] || []).find((x) => x.id === id)
    },
    async remove(collection, id) {
      db = { ...db, [collection]: (db[collection] || []).filter((x) => x.id !== id) }
      persist(db)
    },
    // Overwrite a whole collection — used to persist drag-and-drop ordering.
    // (For Supabase later, this maps to writing an `order` column per row.)
    async replace(collection, items) {
      db = { ...db, [collection]: items }
      persist(db)
      return items
    },
  }
}
