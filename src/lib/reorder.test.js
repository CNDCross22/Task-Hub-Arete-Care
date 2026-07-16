import { describe, it, expect } from 'vitest'
import { planReorder, mergeVisibleIntoGroup } from './reorder'

const idxMap = (m) => (id) => (id in m ? m[id] : null)

describe('planReorder', () => {
  it('slots a fractional index between numbered neighbours (single write)', () => {
    // Desired order a, moved, b  where a=10 and b=11.
    const changes = planReorder(['a', 'moved', 'b'], 'moved', idxMap({ a: 10, b: 11, moved: 99 }))
    expect(changes).toEqual([{ id: 'moved', sortIndex: 10.5 }])
  })

  it('appends past the last row (moved to the bottom)', () => {
    const changes = planReorder(['a', 'moved'], 'moved', idxMap({ a: 4, moved: 1 }))
    expect(changes).toEqual([{ id: 'moved', sortIndex: 5 }])
  })

  it('prepends before the first row (moved to the top)', () => {
    const changes = planReorder(['moved', 'b'], 'moved', idxMap({ b: 3, moved: 9 }))
    expect(changes).toEqual([{ id: 'moved', sortIndex: 2 }])
  })

  it('falls back to renumbering when a neighbour has no index', () => {
    // `b` is unnumbered, so no fractional slot exists — renumber by position,
    // returning only the rows whose index actually changes.
    const changes = planReorder(['a', 'moved', 'b'], 'moved', idxMap({ a: 0, moved: 5 }))
    expect(changes).toEqual([
      { id: 'moved', sortIndex: 1 },
      { id: 'b', sortIndex: 2 },
    ])
  })

  it('falls back when the gap between neighbours is exhausted', () => {
    const changes = planReorder(['a', 'moved', 'b'], 'moved', idxMap({ a: 1, b: 1, moved: 9 }))
    expect(changes.map((c) => c.id)).toEqual(['a', 'moved', 'b'])
  })

  it('returns nothing when the id is not in the order', () => {
    expect(planReorder(['a', 'b'], 'ghost', idxMap({ a: 0, b: 1 }))).toEqual([])
  })
})

describe('mergeVisibleIntoGroup', () => {
  it('folds a reordered page back into the full group order', () => {
    // Full group across pages; only c,d,e are on screen and got reordered.
    const full = ['a', 'b', 'c', 'd', 'e', 'f']
    const newVisible = ['e', 'c', 'd'] // user dragged e above c,d
    expect(mergeVisibleIntoGroup(full, newVisible)).toEqual(['a', 'b', 'e', 'c', 'd', 'f'])
  })

  it('leaves the full order untouched when the visible order is unchanged', () => {
    const full = ['a', 'b', 'c', 'd']
    expect(mergeVisibleIntoGroup(full, ['b', 'c'])).toEqual(['a', 'b', 'c', 'd'])
  })
})
