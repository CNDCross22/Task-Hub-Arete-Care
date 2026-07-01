import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useData } from '@/data/store'
import { statusMeta, priorityMeta, TONE } from '@/data/config'
import { toKey, MONTHS, WEEKDAYS, prettyDate, longDate } from '@/lib/dates'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'

const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const todayKey = () => toKey(new Date())

const fmtTime = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return ''
  const am = h < 12
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`
}

const addDate = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const startOfWeek = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}
const byTime = (a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99')

export default function Calendar() {
  const { tasks, openNewTask, openEditTask, loading } = useData()
  const [mode, setMode] = useState('week') // 'day' | 'week' | 'month'
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const tasksByDay = useMemo(() => {
    const map = {}
    for (const t of tasks) {
      if (!t.dueDate) continue
      ;(map[t.dueDate] ||= []).push(t)
    }
    for (const k in map) map[k].sort(byTime)
    return map
  }, [tasks])

  const goToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setCursor(d)
  }
  const pickToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setCursor(d)
    setMode('day')
  }
  const shift = (dir) =>
    setCursor((c) => {
      const d = new Date(c)
      if (mode === 'day') d.setDate(d.getDate() + dir)
      else if (mode === 'week') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir, 1)
      return d
    })

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  const title =
    mode === 'day'
      ? `${WEEKDAYS_FULL[cursor.getDay()]}, ${longDate(toKey(cursor))}`
      : mode === 'week'
        ? weekTitle(cursor)
        : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToday}
            className="mr-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <button onClick={() => shift(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => shift(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronRight size={18} />
          </button>
          <h2 className="ml-1 text-base font-semibold text-slate-900">{title}</h2>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          {[
            ['day', 'Today', pickToday],
            ['week', 'Week', () => setMode('week')],
            ['month', 'Month', () => setMode('month')],
          ].map(([v, label, onClick]) => (
            <button
              key={v}
              onClick={onClick}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                mode === v ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {mode === 'day' && (
        <DayView dayKey={toKey(cursor)} tasksByDay={tasksByDay} openNewTask={openNewTask} openEditTask={openEditTask} />
      )}
      {mode === 'week' && (
        <WeekView cursor={cursor} tasksByDay={tasksByDay} openNewTask={openNewTask} openEditTask={openEditTask} />
      )}
      {mode === 'month' && (
        <MonthView cursor={cursor} tasksByDay={tasksByDay} openNewTask={openNewTask} openEditTask={openEditTask} />
      )}
    </div>
  )
}

function weekTitle(cursor) {
  const start = startOfWeek(cursor)
  const end = addDate(start, 6)
  return `${prettyDate(toKey(start))} – ${prettyDate(toKey(end))}, ${end.getFullYear()}`
}

/* ---------- Day ---------- */
function DayView({ dayKey, tasksByDay, openNewTask, openEditTask }) {
  const items = tasksByDay[dayKey] || []
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {items.length} task{items.length === 1 ? '' : 's'} due
          </span>
          <button
            onClick={() => openNewTask({ startDate: dayKey, dueDate: dayKey })}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={15} /> Add task
          </button>
        </div>
        <div className="space-y-2">
          {items.map((t) => (
            <AgendaRow key={t.id} t={t} onClick={() => openEditTask(t)} />
          ))}
          {items.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
              No tasks due this day.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AgendaRow({ t, onClick }) {
  const sm = statusMeta(t.status)
  const pm = priorityMeta(t.priority)
  const time = t.startTime ? `${fmtTime(t.startTime)}${t.endTime ? ` – ${fmtTime(t.endTime)}` : ''}` : 'All day'
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE[sm.tone].dot}`} />
      <div className="w-28 shrink-0 text-xs text-slate-500">{time}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800">{t.title}</div>
        <div className="truncate text-xs text-slate-400">
          {t.department}
          {t.company ? ` · ${t.company}` : ''}
        </div>
      </div>
      <Badge tone={pm.tone}>{pm.label}</Badge>
      <Assignees ids={t.assignees} max={3} size={22} />
    </button>
  )
}

/* ---------- Week ---------- */
function WeekView({ cursor, tasksByDay, openNewTask, openEditTask }) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDate(start, i))
  const tKey = todayKey()
  return (
    <div className="grid flex-1 grid-cols-7 overflow-hidden">
      {days.map((d, i) => {
        const key = toKey(d)
        const items = tasksByDay[key] || []
        const isToday = key === tKey
        return (
          <div
            key={i}
            onDoubleClick={() => openNewTask({ startDate: key, dueDate: key })}
            className="flex min-h-0 flex-col border-r border-slate-100 last:border-r-0"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-2 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{WEEKDAYS[d.getDay()]}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openNewTask({ startDate: key, dueDate: key })}
                  title="Add task on this day"
                  className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                >
                  <Plus size={14} />
                </button>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday ? 'bg-brand-600 text-white' : 'text-slate-600'
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
              {items.map((t) => (
                <TaskChip key={t.id} t={t} showTime onClick={() => openEditTask(t)} />
              ))}
              <button
                onClick={() => openNewTask({ startDate: key, dueDate: key })}
                className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-slate-200 py-1.5 text-[11px] font-medium text-slate-400 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
              >
                <Plus size={12} /> Add task
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Month ---------- */
function MonthView({ cursor, tasksByDay, openNewTask, openEditTask }) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const tKey = todayKey()

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const startWeekday = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const grid = []
    for (let i = 0; i < startWeekday; i++) grid.push(null)
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d))
    while (grid.length % 7 !== 0) grid.push(null)
    return grid
  }, [year, month])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2">{w}</div>
        ))}
      </div>
      {/* Fixed, compact rows so cells stay a sensible size on tall screens
          instead of stretching; the grid scrolls if a month needs more room. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(7rem, auto)' }}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="border-b border-r border-slate-100 bg-slate-50/50" />
            const key = toKey(date)
            const items = tasksByDay[key] || []
            const isToday = key === tKey
            return (
              <div
                key={i}
                onDoubleClick={() => openNewTask({ startDate: key, dueDate: key })}
                className="group flex min-h-0 flex-col border-b border-r border-slate-100 p-1.5"
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
                    onClick={() => openNewTask({ startDate: key, dueDate: key })}
                    className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                    title="Add task on this day"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((t) => (
                    <TaskChip key={t.id} t={t} onClick={() => openEditTask(t)} />
                  ))}
                  {items.length > 3 && (
                    <span className="px-1.5 text-[11px] text-slate-400">+{items.length - 3} more</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ---------- shared ---------- */
function TaskChip({ t, onClick, showTime }) {
  const tone = statusMeta(t.status).tone
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-[11px] font-medium ${TONE[tone].soft} hover:opacity-80`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[tone].dot}`} />
      {showTime && t.startTime && <span className="shrink-0 tabular-nums opacity-70">{fmtTime(t.startTime)}</span>}
      <span className="truncate">{t.title}</span>
    </button>
  )
}
