import { useMemo } from 'react'
import { CheckCircle2, Circle, AlertTriangle, CalendarClock, Inbox } from 'lucide-react'
import { useData } from '@/data/store'
import { priorityMeta } from '@/data/config'
import { todayStr, addDays, prettyDate, isOverdue, isDueToday, todayForCompany } from '@/lib/dates'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'

export default function DailyOps() {
  const { tasks, updateTask, openEditTask, openNewTask, loading } = useData()

  const groups = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'completed')
    // "Due this week" = after today through 7 days out, in the company's own zone.
    const dueThisWeek = (t) => {
      if (!t.dueDate) return false
      const ct = todayForCompany(t.company)
      return t.dueDate > ct && t.dueDate <= addDays(ct, 7)
    }
    return [
      {
        key: 'overdue',
        title: 'Overdue',
        icon: AlertTriangle,
        iconClass: 'text-rose-500',
        items: active.filter(isOverdue),
      },
      {
        key: 'today',
        title: 'Due Today',
        icon: CalendarClock,
        iconClass: 'text-amber-500',
        items: active.filter(isDueToday),
      },
      {
        key: 'week',
        title: 'Due This Week',
        icon: CalendarClock,
        iconClass: 'text-blue-500',
        items: active.filter(dueThisWeek),
      },
      {
        key: 'backlog',
        title: 'No Due Date',
        icon: Inbox,
        iconClass: 'text-slate-400',
        items: active.filter((t) => !t.dueDate),
      },
    ]
  }, [tasks])

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  const totalActive = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {totalActive} active task{totalActive === 1 ? '' : 's'} to coordinate today
        </p>
        <button
          onClick={() => openNewTask({ dueDate: todayStr() })}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Add for Today
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {groups.map((g) => {
          const Icon = g.icon
          return (
            <section key={g.key} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <Icon size={16} className={g.iconClass} />
                <h3 className="text-sm font-semibold text-slate-800">{g.title}</h3>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {g.items.length}
                </span>
              </header>
              <ul className="divide-y divide-slate-100">
                {g.items.map((t) => {
                  const pm = priorityMeta(t.priority)
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <button
                        onClick={() => updateTask(t.id, { status: 'completed' }).catch(() => {})}
                        title="Mark complete"
                        className="text-slate-300 hover:text-emerald-500"
                      >
                        <Circle size={18} />
                      </button>
                      <button
                        onClick={() => openEditTask(t)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-medium text-slate-700">{t.title}</span>
                        <span className="text-xs text-slate-400">
                          {t.department}
                          {t.company ? ` · ${t.company}` : ''}
                        </span>
                      </button>
                      <Badge tone={pm.tone}>{pm.label}</Badge>
                      {t.dueDate && (
                        <span className="hidden text-xs text-slate-400 sm:inline">{prettyDate(t.dueDate)}</span>
                      )}
                      <Assignees ids={t.assignees} max={2} size={24} />
                    </li>
                  )
                })}
                {g.items.length === 0 && (
                  <li className="flex items-center gap-2 px-4 py-6 text-sm text-slate-400">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    All clear
                  </li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
