import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  addDays,
  addMonths,
  toKey,
  fromKey,
  todayInZone,
  todayOnBoard,
  isOverdue,
  isDueToday,
  workWeekRange,
} from '@/lib/dates'

afterEach(() => vi.useRealTimers())

describe('addMonths (end-of-month clamp)', () => {
  it('clamps Jan 31 + 1mo to Feb 28 (non-leap)', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('clamps Jan 31 + 1mo to Feb 29 (leap year)', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  })
  it('clamps Mar 31 + 1mo to Apr 30', () => {
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30')
  })
  it('rolls over the year (Dec 31 + 1mo)', () => {
    expect(addMonths('2026-12-31', 1)).toBe('2027-01-31')
  })
  it('leaves a mid-month day untouched', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15')
  })
})

describe('addDays', () => {
  it('adds across a month boundary', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01')
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })
  it('adds a week', () => {
    expect(addDays('2026-06-30', 7)).toBe('2026-07-07')
  })
})

describe('toKey / fromKey', () => {
  it('round-trips a local date key', () => {
    expect(toKey(fromKey('2026-06-30'))).toBe('2026-06-30')
  })
})

describe('timezone-aware "today" (Melbourne board clock)', () => {
  it('rolls over to the next day in Melbourne while still yesterday in Manila', () => {
    // 14:17 UTC on Jun 30 → 00:17 Jul 1 in Melbourne (AEST +10), 22:17 Jun 30 in Manila
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-30T14:17:00Z'))
    expect(todayOnBoard()).toBe('2026-07-01')
    expect(todayInZone('Asia/Manila')).toBe('2026-06-30')
  })

  it('handles Melbourne DST (same UTC instant, different local date by season)', () => {
    vi.useFakeTimers()
    // January = AEDT (+11): 13:30 UTC → 00:30 next day
    vi.setSystemTime(new Date('2026-01-01T13:30:00Z'))
    expect(todayOnBoard()).toBe('2026-01-02')
    // July = AEST (+10): 13:30 UTC → 23:30 same day
    vi.setSystemTime(new Date('2026-07-01T13:30:00Z'))
    expect(todayOnBoard()).toBe('2026-07-01')
  })
})

describe('isOverdue / isDueToday', () => {
  it('flags a past, not-completed task as overdue (board time)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-30T14:17:00Z')) // board today = 2026-07-01
    expect(isOverdue({ status: 'pending', dueDate: '2026-06-30' })).toBe(true)
    expect(isOverdue({ status: 'completed', dueDate: '2026-06-30' })).toBe(false)
    expect(isOverdue({ status: 'pending', dueDate: '2026-07-01' })).toBe(false) // due today, not past
    expect(isOverdue({ status: 'pending', dueDate: '' })).toBe(false)
  })
  it('matches due-today against the board day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-30T14:17:00Z')) // board today = 2026-07-01
    expect(isDueToday({ dueDate: '2026-07-01' })).toBe(true)
    expect(isDueToday({ dueDate: '2026-06-30' })).toBe(false)
  })
})

describe('workWeekRange', () => {
  it('returns Monday→Friday of the current week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    const { startKey, endKey } = workWeekRange(0)
    expect(fromKey(startKey).getDay()).toBe(1) // Monday
    expect(endKey).toBe(addDays(startKey, 4)) // Friday
  })
})
