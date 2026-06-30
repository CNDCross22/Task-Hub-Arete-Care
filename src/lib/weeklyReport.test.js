import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildWeeklySnapshot } from '@/lib/weeklyReport'
import { workWeekRange } from '@/lib/dates'

afterEach(() => vi.useRealTimers())

describe('buildWeeklySnapshot', () => {
  it('includes only tasks completed within the report week, grouped by dept → company', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    const { startKey, endKey } = workWeekRange(0)

    const tasks = [
      { status: 'completed', completedAt: `${startKey}T09:00:00Z`, department: 'IT', company: 'TFO PH', title: 'A' },
      { status: 'completed', completedAt: `${endKey}T18:00:00Z`, department: 'Marketing', company: 'Arete Care', title: 'B' },
      { status: 'completed', completedAt: '2026-01-01T09:00:00Z', department: 'IT', company: 'TFO PH', title: 'Old' }, // before the week
      { status: 'pending', completedAt: `${startKey}T09:00:00Z`, department: 'IT', company: 'TFO PH', title: 'NotDone' }, // not completed
    ]

    const snap = buildWeeklySnapshot(tasks, [], 0)

    expect(snap.totalCompleted).toBe(2)
    expect(snap.byDepartment.IT['TFO PH']).toHaveLength(1)
    expect(snap.byDepartment.IT['TFO PH'][0].title).toBe('A')
    expect(snap.byDepartment.Marketing['Arete Care']).toHaveLength(1)
    expect(snap.departmentsPresent).toEqual(['IT', 'Marketing'])
  })

  it('returns an empty snapshot when nothing was completed in the week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    const snap = buildWeeklySnapshot(
      [{ status: 'completed', completedAt: '2020-01-01T00:00:00Z', department: 'IT', company: 'TFO PH', title: 'Ancient' }],
      [],
      0,
    )
    expect(snap.totalCompleted).toBe(0)
    expect(snap.departmentsPresent).toEqual([])
  })
})
