// The manual arrangement order, mirroring exactly what the Edge Function's
// getAll returns:  .order('sortIndex', { ascending: true, nullsFirst: true })
//                  .order('createdAt', { ascending: false })
//
// Views must sort with this rather than leaning on the tasks array's incoming
// order: an optimistic reorder only changes sortIndex values, so a view that
// relies on array position won't move until the next fetch (i.e. you'd have to
// reload to see your own change). Matching the server also means the list never
// jumps when a refetch lands.
//
// Tasks with no sortIndex yet (freshly created) sort first, newest first —
// which is why a new task appears at the top.
export function byManualOrder(a, b) {
  const an = typeof a.sortIndex === 'number'
  const bn = typeof b.sortIndex === 'number'
  if (an !== bn) return an ? 1 : -1
  if (an && bn && a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex
  return (b.createdAt || '').localeCompare(a.createdAt || '')
}
