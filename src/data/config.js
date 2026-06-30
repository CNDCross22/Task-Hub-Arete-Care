// Shared domain config: statuses, priorities, departments, companies, members.
// Tone classes are written out in full so Tailwind keeps them during purge.

export const STATUSES = [
  { key: 'pending', label: 'Pending', tone: 'slate' },
  { key: 'in_progress', label: 'In Progress', tone: 'blue' },
  { key: 'review', label: 'Review', tone: 'amber' },
  { key: 'completed', label: 'Completed', tone: 'emerald' },
]

export const PRIORITIES = [
  { key: 'low', label: 'Low', tone: 'slate' },
  { key: 'medium', label: 'Medium', tone: 'blue' },
  { key: 'high', label: 'High', tone: 'amber' },
  { key: 'urgent', label: 'Urgent', tone: 'rose' },
]

// Cross-company operations: tasks belong to a company and a department.
export const COMPANIES = ['Arete Care', 'TFO PH', 'TFO India', 'Mamta Face Yoga', 'Raaehi']

// The whole team works to one clock — their computers are set to Melbourne —
// so "today / overdue / due this week" is always judged in Melbourne's day
// (DST handled by the Intl API), regardless of the viewer's device timezone.
export const BOARD_TZ = 'Australia/Melbourne'

export const DEPARTMENTS = ['IT', 'Marketing', 'Community Partnership']

export const RECURRENCES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-weekly' },
  { key: 'monthly', label: 'Monthly' },
]

// Defaults that mirror the Create Task form.
export const TASK_DEFAULTS = {
  status: 'pending',
  priority: 'medium',
  company: 'Arete Care',
  department: 'IT',
}

// Full static class strings per tone so Tailwind's content scan keeps them.
export const TONE = {
  slate: { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400', bar: 'bg-slate-400', soft: 'bg-slate-50 text-slate-600' },
  blue: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', bar: 'bg-blue-500', soft: 'bg-blue-50 text-blue-600' },
  amber: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-500', soft: 'bg-amber-50 text-amber-600' },
  emerald: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-600' },
  rose: { badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', bar: 'bg-rose-500', soft: 'bg-rose-50 text-rose-600' },
}

export const statusMeta = (key) => STATUSES.find((s) => s.key === key) || STATUSES[0]
export const priorityMeta = (key) => PRIORITIES.find((p) => p.key === key) || PRIORITIES[1]
