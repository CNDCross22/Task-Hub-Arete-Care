import { describe, it, expect } from 'vitest'
import { collapseSeries } from '@/lib/series'

describe('collapseSeries', () => {
  it('passes non-recurring tasks through with a count of 1, preserving order', () => {
    const out = collapseSeries([
      { id: 'a' },
      { id: 'b' },
    ])
    expect(out).toEqual([
      { id: 'a', _count: 1 },
      { id: 'b', _count: 1 },
    ])
  })

  it('collapses a series to one row counting every occurrence', () => {
    const out = collapseSeries([
      { id: 't1', seriesId: 's1', status: 'completed', dueDate: '2026-06-01' },
      { id: 't2', seriesId: 's1', status: 'pending', dueDate: '2026-06-08' },
      { id: 't3', seriesId: 's1', status: 'pending', dueDate: '2026-06-15' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0]._count).toBe(3)
    // representative is the earliest still-active occurrence (t2, not the completed t1)
    expect(out[0].id).toBe('t2')
  })

  it('picks the earliest active occurrence even when it appears later in the list', () => {
    const out = collapseSeries([
      { id: 't3', seriesId: 's1', status: 'pending', dueDate: '2026-06-15' },
      { id: 't2', seriesId: 's1', status: 'pending', dueDate: '2026-06-08' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('t2')
    expect(out[0]._count).toBe(2)
  })

  it('keeps non-recurring and series rows in first-seen order', () => {
    const out = collapseSeries([
      { id: 'A' },
      { id: 's1a', seriesId: 's1', status: 'pending', dueDate: '2026-06-01' },
      { id: 's1b', seriesId: 's1', status: 'pending', dueDate: '2026-06-08' },
      { id: 'B' },
    ])
    expect(out.map((t) => t.id)).toEqual(['A', 's1a', 'B'])
    expect(out.map((t) => t._count)).toEqual([1, 2, 1])
  })
})
