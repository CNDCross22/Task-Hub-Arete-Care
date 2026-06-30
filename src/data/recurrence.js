// Pure recurrence + completion logic, extracted from the store so it can be
// unit-tested without React. The provider just wires these to backend + state.
import { addDays, addMonths } from '@/lib/dates'
import { uid, nowIso } from '@/lib/id'

// Keep completedAt in sync with status: stamp on entering 'completed', clear on
// leaving it. Powers the weekly report's "what got done" view.
export function completionStamp(prevStatus, prevCompletedAt, nextStatus) {
  if (nextStatus === 'completed') return prevCompletedAt || nowIso()
  return null
}

// Recurrence: the date N intervals after a fixed anchor. Computed from the
// original anchor (not chained occurrence-to-occurrence) so a monthly task on
// the 31st returns to the 31st in long months instead of drifting to the 28th.
export const RECUR_DAYS = { daily: 1, weekly: 7, biweekly: 14 }
export const addRecurrence = (key, recurrence, n) => {
  if (!key) return key
  if (recurrence === 'monthly') return addMonths(key, n)
  return addDays(key, (RECUR_DAYS[recurrence] || 7) * n)
}

// Fields that stay per-occurrence and are never copied across a series edit.
export const SERIES_SKIP = ['id', 'seriesId', 'startDate', 'dueDate', 'status', 'completedAt', 'createdAt', 'sortIndex']

// How many upcoming occurrences to pre-build per frequency — enough runway for
// each cadence without flooding (daily ≈ 6 weeks, weekly ≈ 3 months, bi-weekly/
// monthly ≈ 6 months). A 1-year horizon is a hard backstop.
export const SERIES_COUNT = { daily: 30, weekly: 12, biweekly: 12, monthly: 6 }

// Pre-build the upcoming occurrences of a recurring task so they're all visible.
export function buildSeries(task) {
  const anchor = task.dueDate || task.startDate
  if (!task.recurring || !anchor) return []
  const horizon = addDays(anchor, 370)
  const max = SERIES_COUNT[task.recurrence] || 12
  const { id, createdAt, sortIndex, ...rest } = task
  const out = []
  for (let i = 1; i <= max; i++) {
    const s = task.startDate ? addRecurrence(task.startDate, task.recurrence, i) : ''
    const d = task.dueDate ? addRecurrence(task.dueDate, task.recurrence, i) : ''
    const probe = d || s
    if (!probe || probe > horizon) break
    out.push({
      ...rest,
      id: uid('t'),
      createdAt: nowIso(),
      startDate: s,
      dueDate: d,
      completedAt: null,
      status: 'pending',
    })
  }
  return out
}
