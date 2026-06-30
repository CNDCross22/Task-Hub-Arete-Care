import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useData } from '@/data/store'
import { TONE, statusMeta } from '@/data/config'
import { toKey, todayStr, MONTHS, WEEKDAYS } from '@/lib/dates'

export default function Calendar() {
  const { tasks, openNewTask, openEditTask, loading } = useData()
  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const tasksByDay = useMemo(() => {
    const map = {}
    for (const t of tasks) {
      if (!t.dueDate) continue
      ;(map[t.dueDate] ||= []).push(t)
    }
    return map
  }, [tasks])

  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1)
    const startWeekday = first.getDay()
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
    const grid = []
    for (let i = 0; i < startWeekday; i++) grid.push(null)
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(view.year, view.month, d))
    while (grid.length % 7 !== 0) grid.push(null)
    return grid
  }, [view])

  const prev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }))
  const next = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }))
  const goToday = () => setView({ year: now.getFullYear(), month: now.getMonth() })

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  const today = todayStr()

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-base font-semibold text-slate-900">
          {MONTHS[view.month]} {view.year}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="mr-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Today
          </button>
          <button onClick={prev} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronLeft size={18} />
          </button>
          <button onClick={next} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2">{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="border-b border-r border-slate-100 bg-slate-50/50" />
          const key = toKey(date)
          const dayTasks = tasksByDay[key] || []
          const isToday = key === today
          return (
            <div
              key={i}
              className="group flex min-h-0 flex-col border-b border-r border-slate-100 p-1.5"
              onDoubleClick={() => openNewTask({ dueDate: key })}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? 'bg-brand-600 text-white' : 'text-slate-500'
                  }`}
                >
                  {date.getDate()}
                </span>
                <button
                  onClick={() => openNewTask({ dueDate: key })}
                  className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-brand-600"
                  title="Add task"
                >
                  +
                </button>
              </div>
              <div className="space-y-1 overflow-y-auto">
                {dayTasks.slice(0, 4).map((t) => {
                  const tone = statusMeta(t.status).tone
                  return (
                    <button
                      key={t.id}
                      onClick={() => openEditTask(t)}
                      className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${TONE[tone].soft} hover:opacity-80`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[tone].dot}`} />
                      <span className="truncate">{t.title}</span>
                    </button>
                  )
                })}
                {dayTasks.length > 4 && (
                  <span className="px-1.5 text-[11px] text-slate-400">+{dayTasks.length - 4} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
