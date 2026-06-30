// Small date helpers working in local time, using YYYY-MM-DD strings.

import { BOARD_TZ } from '@/data/config'

// Viewer's local YYYY-MM-DD (used only for calendar rendering internals).
export const todayStr = () => toKey(new Date())

// --- One fixed board timezone (Melbourne) ---------------------------------
// Every "today / overdue / due" decision is made in the team's timezone so it's
// the same for everyone regardless of their device. Intl handles DST.
const _tzFmt = {}
const tzFormatter = (tz) =>
  (_tzFmt[tz] ||= new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }))

// Today's YYYY-MM-DD in a given IANA timezone.
export const todayInZone = (tz) => {
  const parts = tzFormatter(tz).formatToParts(new Date())
  const get = (t) => parts.find((p) => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

// Today on the board's fixed timezone — the single source of truth for "today".
export const todayOnBoard = () => todayInZone(BOARD_TZ)

export const isOverdue = (task) =>
  task.status !== 'completed' && !!task.dueDate && task.dueDate < todayOnBoard()
export const isDueToday = (task) => !!task.dueDate && task.dueDate === todayOnBoard()

export const toKey = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const addDays = (key, n) => {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

// Add months, clamping to the last valid day so end-of-month dates don't
// overflow (Jan 31 + 1 month → Feb 28/29, not Mar 3).
export const addMonths = (key, n) => {
  const d = fromKey(key)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return toKey(d)
}

export const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const prettyDate = (key) => {
  if (!key) return ''
  const d = fromKey(key)
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

// "June 22, 2026"
export const longDate = (key) => {
  if (!key) return ''
  const d = fromKey(key)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// "Jun 22, 2026" — compact, fits narrow fields on one line
export const medDate = (key) => {
  if (!key) return ''
  const d = fromKey(key)
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`
}

// Monday–Friday of the work week containing today, shifted by offsetWeeks
// (0 = this week, -1 = last week). Returns local YYYY-MM-DD keys.
export const workWeekRange = (offsetWeeks = 0) => {
  const base = new Date()
  const mondayIndex = (base.getDay() + 6) % 7 // 0=Mon … 6=Sun
  const monday = new Date(base)
  monday.setDate(base.getDate() - mondayIndex + offsetWeeks * 7)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return { startKey: toKey(monday), endKey: toKey(friday) }
}
