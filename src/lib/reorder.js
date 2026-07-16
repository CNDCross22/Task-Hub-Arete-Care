// Pure helpers behind drag/arrow reordering. Kept out of the store so the
// fiddly index maths can be unit-tested on its own.

// Decide the minimal sortIndex writes to make `movedId` land where `orderedIds`
// (the desired final order of a group) puts it.
//   Fast path — slot a fractional index between the new neighbours and write
//   that one row.
//   Fallback — a neighbour has no numeric index yet, or the gap is used up:
//   renumber the whole group by position, returning only the rows that changed.
// `sortIndexOf(id)` returns the row's current sortIndex, or null/undefined.
export function planReorder(orderedIds, movedId, sortIndexOf) {
  const idx = orderedIds.indexOf(movedId)
  if (idx === -1) return []
  const num = (id) => {
    const v = sortIndexOf(id)
    return typeof v === 'number' ? v : null
  }
  const above = idx > 0 ? orderedIds[idx - 1] : null
  const below = idx < orderedIds.length - 1 ? orderedIds[idx + 1] : null
  const ai = above !== null ? num(above) : null
  const bi = below !== null ? num(below) : null

  let newIndex = null
  if (ai !== null && bi !== null) {
    if (bi - ai > 1e-6) newIndex = (ai + bi) / 2
  } else if (ai !== null && below === null) {
    newIndex = ai + 1
  } else if (bi !== null && above === null) {
    newIndex = bi - 1
  }

  if (newIndex !== null) return [{ id: movedId, sortIndex: newIndex }]

  return orderedIds
    .map((id, pos) => ({ id, sortIndex: pos }))
    .filter(({ id, sortIndex }) => num(id) !== sortIndex)
}

// The visible list is only one page of a status group. Fold the new order of
// the visible rows back into the full group order (which spans all pages), so
// neighbour indices at page edges stay correct. `newVisibleOrder` must be a
// permutation of the group's visible ids.
export function mergeVisibleIntoGroup(fullGroupIds, newVisibleOrder) {
  const visible = new Set(newVisibleOrder)
  let p = 0
  return fullGroupIds.map((id) => (visible.has(id) ? newVisibleOrder[p++] : id))
}
