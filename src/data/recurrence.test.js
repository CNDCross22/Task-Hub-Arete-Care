import { describe, it, expect } from 'vitest'
import { addRecurrence, buildSeries, completionStamp, SERIES_COUNT } from '@/data/recurrence'

describe('addRecurrence (anchor-based, no drift)', () => {
  it('monthly returns to the original day-of-month in long months', () => {
    // The bug we fixed: chaining drifted Jan 31 → Feb 28 → 28 forever.
    const got = [1, 2, 3, 4, 5, 6].map((n) => addRecurrence('2026-01-31', 'monthly', n))
    expect(got).toEqual(['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31'])
  })
  it('weekly advances by 7 days per step', () => {
    expect(addRecurrence('2026-06-30', 'weekly', 1)).toBe('2026-07-07')
    expect(addRecurrence('2026-06-30', 'weekly', 2)).toBe('2026-07-14')
  })
  it('daily advances by 1 day per step', () => {
    expect(addRecurrence('2026-06-30', 'daily', 1)).toBe('2026-07-01')
    expect(addRecurrence('2026-06-30', 'daily', 3)).toBe('2026-07-03')
  })
  it('biweekly advances by 14 days per step', () => {
    expect(addRecurrence('2026-06-30', 'biweekly', 1)).toBe('2026-07-14')
  })
  it('passes an empty key through', () => {
    expect(addRecurrence('', 'daily', 1)).toBe('')
  })
})

describe('buildSeries', () => {
  it('returns nothing for a non-recurring task', () => {
    expect(buildSeries({ recurring: false, dueDate: '2026-06-30' })).toEqual([])
  })
  it('returns nothing when there is no anchor date', () => {
    expect(buildSeries({ recurring: true, recurrence: 'daily' })).toEqual([])
  })

  it('builds the per-cadence count of occurrences', () => {
    const daily = buildSeries({ recurring: true, recurrence: 'daily', dueDate: '2026-06-30' })
    expect(daily).toHaveLength(SERIES_COUNT.daily) // 30
    expect(daily[0].dueDate).toBe('2026-07-01')
    expect(daily[29].dueDate).toBe('2026-07-30')

    const weekly = buildSeries({ recurring: true, recurrence: 'weekly', dueDate: '2026-06-30' })
    expect(weekly).toHaveLength(SERIES_COUNT.weekly) // 12
    expect(weekly[0].dueDate).toBe('2026-07-07')
  })

  it('keeps monthly occurrences anchored to the original day', () => {
    const monthly = buildSeries({ recurring: true, recurrence: 'monthly', dueDate: '2026-01-31' })
    expect(monthly).toHaveLength(SERIES_COUNT.monthly) // 6
    expect(monthly.map((o) => o.dueDate)).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2026-07-31',
    ])
  })

  it('inherits series fields but gives each occurrence a fresh id + pending status', () => {
    const occ = buildSeries({
      id: 't_orig',
      recurring: true,
      recurrence: 'weekly',
      dueDate: '2026-06-30',
      seriesId: 's_1',
      company: 'TFO PH',
      title: 'Standup',
      assignees: ['m1'],
      status: 'in_progress',
      completedAt: '2026-06-01T00:00:00Z',
    })
    for (const o of occ) {
      expect(o.seriesId).toBe('s_1')
      expect(o.company).toBe('TFO PH')
      expect(o.title).toBe('Standup')
      expect(o.assignees).toEqual(['m1'])
      expect(o.status).toBe('pending') // reset, not inherited
      expect(o.completedAt).toBeNull()
      expect(o.id).not.toBe('t_orig')
    }
    // ids are unique across the series
    expect(new Set(occ.map((o) => o.id)).size).toBe(occ.length)
  })
})

describe('completionStamp', () => {
  it('stamps a time when entering completed', () => {
    expect(completionStamp('pending', null, 'completed')).toBeTruthy()
  })
  it('preserves an existing completedAt when staying completed', () => {
    expect(completionStamp('completed', '2026-01-01T00:00:00Z', 'completed')).toBe('2026-01-01T00:00:00Z')
  })
  it('clears completedAt when leaving completed', () => {
    expect(completionStamp('completed', '2026-01-01T00:00:00Z', 'pending')).toBeNull()
  })
  it('stays null for non-completed transitions', () => {
    expect(completionStamp('pending', null, 'in_progress')).toBeNull()
  })
})
