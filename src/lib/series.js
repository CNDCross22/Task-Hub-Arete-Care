// Collapse recurring occurrences into one row per series, keeping a count.
// Non-recurring tasks pass through unchanged (with a count of 1). The shown
// representative for a series is the earliest still-active occurrence (falling
// back to the earliest). Pure + side-effect free so it can be unit-tested.
export function collapseSeries(list) {
  const result = []
  const repIndex = new Map()
  for (const t of list) {
    // Only collapse tasks that belong to a recurring series.
    if (!t.seriesId) {
      result.push({ ...t, _count: 1 })
      continue
    }
    const key = t.seriesId
    if (!repIndex.has(key)) {
      repIndex.set(key, result.length)
      result.push({ ...t, _count: 1 })
    } else {
      const idx = repIndex.get(key)
      const rep = result[idx]
      const count = rep._count + 1
      const better =
        t.status !== 'completed' &&
        (rep.status === 'completed' || (t.dueDate || '9999') < (rep.dueDate || '9999'))
      result[idx] = better ? { ...t, _count: count } : { ...rep, _count: count }
    }
  }
  return result
}
