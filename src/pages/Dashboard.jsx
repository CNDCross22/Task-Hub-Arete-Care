import { useMemo } from 'react'
import { ListTodo, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, statusMeta, priorityMeta, TONE } from '@/data/config'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function Dashboard() {
  const { tasks, openEditTask, loading } = useData()

  const stats = useMemo(() => {
    const today = todayStr()
    const open = tasks.filter((t) => t.status !== 'completed').length
    const done = tasks.filter((t) => t.status === 'completed').length
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const overdue = tasks.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate < today).length
    return [
      { label: 'Open Tasks', value: open, icon: ListTodo, tone: 'blue' },
      { label: 'Completed', value: done, icon: CheckCircle2, tone: 'emerald' },
      { label: 'In Progress', value: inProgress, icon: Clock, tone: 'amber' },
      { label: 'Overdue', value: overdue, icon: AlertTriangle, tone: 'rose' },
    ]
  }, [tasks])

  const byStatus = useMemo(
    () =>
      STATUSES.map((s) => ({
        ...s,
        count: tasks.filter((t) => t.status === s.key).length,
      })),
    [tasks],
  )

  const total = tasks.length || 1

  const recent = useMemo(
    () => [...tasks].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6),
    [tasks],
  )

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONE[tone].soft}`}
            >
              <Icon size={20} />
            </span>
            <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Tasks by Status</h3>
          <div className="mt-5 space-y-4">
            {byStatus.map((s) => (
              <div key={s.key}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{s.label}</span>
                  <span className="text-slate-400">{s.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${TONE[s.tone].bar}`}
                    style={{ width: `${Math.round((s.count / total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent tasks */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Recent Tasks</h3>
          <ul className="mt-4 divide-y divide-slate-100">
            {recent.map((t) => {
              const pm = priorityMeta(t.priority)
              return (
                <li key={t.id}>
                  <button
                    onClick={() => openEditTask(t)}
                    className="flex w-full items-center gap-3 py-2.5 text-left hover:opacity-80"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[statusMeta(t.status).tone].dot}`} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{t.title}</span>
                    <Badge tone={pm.tone}>{pm.label}</Badge>
                    <Assignees ids={t.assignees} max={2} size={24} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
