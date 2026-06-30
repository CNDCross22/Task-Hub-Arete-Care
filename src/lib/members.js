// Resolve task assignee ids against the real members list (from the database).
// Replaces the old hardcoded config.MEMBERS sample people.

export const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  const ini = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
  return ini || String(name).slice(0, 2).toUpperCase() || '?'
}

// Returns member objects for the given ids (skips ids with no matching member).
export const resolveMembers = (ids, members) => {
  const map = new Map((members || []).map((m) => [m.id, m]))
  return (ids || []).map((id) => map.get(id)).filter(Boolean)
}

// Returns just the display names for the given ids.
export const memberNames = (ids, members) => resolveMembers(ids, members).map((m) => m.name)
