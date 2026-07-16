import { describe, it, expect } from 'vitest'
import { byManualOrder } from './order'

// The comparator has to mirror the Edge Function's getAll ordering:
//   .order('sortIndex', { ascending: true, nullsFirst: true })
//   .order('createdAt', { ascending: false })
// If it drifts, rows jump around the moment a refetch lands.
const sorted = (rows) => [...rows].sort(byManualOrder).map((r) => r.id)

describe('byManualOrder', () => {
  it('orders numbered tasks ascending by sortIndex', () => {
    expect(sorted([{ id: 'c', sortIndex: 2 }, { id: 'a', sortIndex: 0 }, { id: 'b', sortIndex: 1 }])).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('handles fractional indexes (how a single-row reorder is written)', () => {
    expect(sorted([{ id: 'a', sortIndex: 0 }, { id: 'b', sortIndex: 1 }, { id: 'mid', sortIndex: 0.5 }])).toEqual([
      'a',
      'mid',
      'b',
    ])
  })

  it('puts unnumbered (new) tasks first, matching nullsFirst', () => {
    const rows = [
      { id: 'numbered', sortIndex: 0, createdAt: '2026-01-01' },
      { id: 'fresh', createdAt: '2026-01-02' },
    ]
    expect(sorted(rows)).toEqual(['fresh', 'numbered'])
  })

  it('breaks ties between unnumbered tasks by newest first', () => {
    const rows = [
      { id: 'older', createdAt: '2026-01-01' },
      { id: 'newest', createdAt: '2026-03-01' },
      { id: 'middle', createdAt: '2026-02-01' },
    ]
    expect(sorted(rows)).toEqual(['newest', 'middle', 'older'])
  })

  it('breaks ties on equal sortIndex by newest first', () => {
    const rows = [
      { id: 'old', sortIndex: 1, createdAt: '2026-01-01' },
      { id: 'new', sortIndex: 1, createdAt: '2026-02-01' },
    ]
    expect(sorted(rows)).toEqual(['new', 'old'])
  })

  it('treats sortIndex 0 as numbered, not as missing', () => {
    // A falsy-check bug here would send index 0 to the top with the new tasks.
    const rows = [
      { id: 'zero', sortIndex: 0, createdAt: '2026-01-01' },
      { id: 'fresh', createdAt: '2026-01-02' },
    ]
    expect(sorted(rows)).toEqual(['fresh', 'zero'])
  })
})
