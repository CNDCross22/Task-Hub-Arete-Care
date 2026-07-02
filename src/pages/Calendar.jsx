import { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Plus, X, GripVertical } from 'lucide-react'
import { useData } from '@/data/store'
import { statusMeta, priorityMeta, TONE } from '@/data/config'
import { toKey, MONTHS, WEEKDAYS, prettyDate, longDate, medDate } from '@/lib/dates'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'
import ActionSheet from '@/components/ActionSheet'
import { useIsDesktop } from '@/lib/useIsDesktop'

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
// Drag-and-drop: chips carry their task id; a day cell/column is a drop target
// that reschedules the dropped task onto its date.
const DRAG_MIME = 'text/task-id'
const dragProps = (t, setDragOver) => ({
  draggable: true,
  onDragStart: (e) => {
    e.dataTransfer.setData(DRAG_MIME, t.id)
    e.dataTransfer.effectAllowed = 'move'
  },
  onDragEnd: () => setDragOver(null),
})
const dropProps = (key, setDragOver, onReschedule) => ({
  onDragOver: (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(key)
  },
  onDrop: (e) => {
    e.preventDefault()
    const id = e.dataTransfer.getData(DRAG_MIME)
    setDragOver(null)
    if (id) onReschedule?.(id, key)
  },
})
// A chip that is BOTH draggable and a drop target (drop onto it = reorder before
// it). stopPropagation so the day cell's own drop (reschedule) doesn't also fire.
const chipProps = (t, setDragOver, onChipDrop) => ({
  ...dragProps(t, setDragOver),
  onDragOver: (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(t.dueDate)
  },
  onDrop: (e) => {
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData(DRAG_MIME)
    setDragOver(null)
    if (id) onChipDrop?.(id, t)
  },
})

// Floating panel listing every task on a day (opened from "+N more"). No
// blocking backdrop, so tasks can still be dragged out of it onto other days.
function DayTasksPopover({ open, tasksByDay, openEditTask, setDragOver, onChipDrop, onClose }) {
  const panelRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    const onKey = (e) => e.key === 'Escape' && onClose()
    // Note: intentionally NOT closing on scroll — scrolling the month grid (or
    // the popover's own list) should keep it open. Close via click-out/Esc/X.
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
    }
  }, [open, onClose])

  if (!open) return null
  const items = tasksByDay[open.key] || []
  const width = 244
  const left = Math.max(8, Math.min(open.rect.left, window.innerWidth - width - 8))
  const top = Math.max(8, Math.min(open.rect.bottom + 4, window.innerHeight - 340))

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', left, top, width }}
      className="z-[80] flex max-h-80 flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <span className="text-xs font-semibold text-slate-700">{longDate(open.key)}</span>
        <button onClick={onClose} title="Close" className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((t) => (
          <TaskChip
            key={t.id}
            t={t}
            showTime
            onClick={() => {
              onClose()
              openEditTask(t)
            }}
            {...chipProps(t, setDragOver, onChipDrop)}
          />
        ))}
        {items.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No tasks.</p>}
      </div>
      <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">Drag a task onto a day to move it.</p>
    </div>,
    document.body,
  )
}

export default function Calendar() {
  const { tasks, openNewTask, openEditTask, rescheduleTask, reorderTask, loading } = useData()

  // Drop a task onto another task: reposition it before that task. If they're on
  // different days it also moves to that day; same day = pure reorder.
  const onChipDrop = (dragId, target) => {
    const m = tasks.find((x) => x.id === dragId)
    if (!m || m.id === target.id) return
    const dateKey = target.dueDate || target.startDate
    const sameDay = m.dueDate === dateKey
    reorderTask(dragId, m.status, target.id, sameDay ? null : { startDate: dateKey, dueDate: dateKey })
  }
  const [mode, setMode] = useState('week') // 'day' | 'week' | 'month'
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const tasksByDay = useMemo(() => {
    const map = {}
    // Keep each day in the tasks' own order (manual arrangement / sortIndex), so
    // drag-to-reorder within a day is reflected and persists.
    for (const t of tasks) {
      if (!t.dueDate) continue
      ;(map[t.dueDate] ||= []).push(t)
    }
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

  const isDesktop = useIsDesktop()
  if (loading) return <div className="text-sm text-slate-400">Loading…</div>
  if (!isDesktop)
    return (
      <MobileCalendar
        tasks={tasks}
        openNewTask={openNewTask}
        openEditTask={openEditTask}
        rescheduleTask={rescheduleTask}
      />
    )

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
        <DayView
          dayKey={toKey(cursor)}
          tasksByDay={tasksByDay}
          openNewTask={openNewTask}
          openEditTask={openEditTask}
          onChipDrop={onChipDrop}
        />
      )}
      {mode === 'week' && (
        <WeekView
          cursor={cursor}
          tasksByDay={tasksByDay}
          openNewTask={openNewTask}
          openEditTask={openEditTask}
          onReschedule={rescheduleTask}
          onChipDrop={onChipDrop}
        />
      )}
      {mode === 'month' && (
        <MonthView
          cursor={cursor}
          tasksByDay={tasksByDay}
          openNewTask={openNewTask}
          openEditTask={openEditTask}
          onReschedule={rescheduleTask}
          onChipDrop={onChipDrop}
        />
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
function DayView({ dayKey, tasksByDay, openNewTask, openEditTask, onChipDrop }) {
  const items = tasksByDay[dayKey] || []
  const [overId, setOverId] = useState(null)
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
            <AgendaRow
              key={t.id}
              t={t}
              onClick={() => openEditTask(t)}
              dragOver={overId === t.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, t.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => setOverId(null)}
              onDragOver={(e) => {
                e.preventDefault()
                if (overId !== t.id) setOverId(t.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData(DRAG_MIME)
                setOverId(null)
                if (id && id !== t.id) onChipDrop?.(id, t)
              }}
            />
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

function AgendaRow({ t, onClick, dragOver, ...dnd }) {
  const sm = statusMeta(t.status)
  const pm = priorityMeta(t.priority)
  const time = t.startTime ? `${fmtTime(t.startTime)}${t.endTime ? ` – ${fmtTime(t.endTime)}` : ''}` : 'All day'
  return (
    <button
      onClick={onClick}
      {...dnd}
      className={`flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left hover:bg-slate-50 ${
        dragOver ? 'border-brand-400 ring-1 ring-inset ring-brand-300' : 'border-slate-200'
      } ${dnd.draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <GripVertical size={14} className="shrink-0 text-slate-300" />
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
function WeekView({ cursor, tasksByDay, openNewTask, openEditTask, onReschedule, onChipDrop }) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDate(start, i))
  const tKey = todayKey()
  const [dragOver, setDragOver] = useState(null)
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
            {...dropProps(key, setDragOver, onReschedule)}
            className={`flex min-h-0 flex-col border-r border-slate-100 last:border-r-0 ${
              dragOver === key ? 'bg-brand-50 ring-2 ring-inset ring-brand-400' : ''
            }`}
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
                <TaskChip
                  key={t.id}
                  t={t}
                  showTime
                  onClick={() => openEditTask(t)}
                  {...chipProps(t, setDragOver, onChipDrop)}
                />
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
function MonthView({ cursor, tasksByDay, openNewTask, openEditTask, onReschedule, onChipDrop }) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const tKey = todayKey()
  const [dragOver, setDragOver] = useState(null)
  const [more, setMore] = useState(null) // { key, rect } — expanded day popover
  // Rescheduling (incl. dragging out of the "more" popover) also closes it.
  const reschedule = (id, key) => {
    setMore(null)
    onReschedule?.(id, key)
  }

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
                {...dropProps(key, setDragOver, reschedule)}
                className={`group flex min-h-0 flex-col border-b border-r border-slate-100 p-1.5 ${
                  dragOver === key ? 'bg-brand-50 ring-2 ring-inset ring-brand-400' : ''
                }`}
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
                    className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                    title="Add task on this day"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((t) => (
                    <TaskChip
                      key={t.id}
                      t={t}
                      onClick={() => openEditTask(t)}
                      {...chipProps(t, setDragOver, onChipDrop)}
                    />
                  ))}
                  {items.length > 3 && (
                    <button
                      onClick={(e) => setMore({ key, rect: e.currentTarget.getBoundingClientRect() })}
                      className="w-full rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                    >
                      +{items.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <DayTasksPopover
        open={more}
        tasksByDay={tasksByDay}
        openEditTask={openEditTask}
        setDragOver={setDragOver}
        onChipDrop={onChipDrop}
        onClose={() => setMore(null)}
      />
    </div>
  )
}

/* ---------- shared ---------- */
function TaskChip({ t, onClick, showTime, ...dnd }) {
  const tone = statusMeta(t.status).tone
  return (
    <button
      onClick={onClick}
      {...dnd}
      className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-[11px] font-medium ${TONE[tone].soft} hover:opacity-80 ${
        dnd.draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[tone].dot}`} />
      {showTime && t.startTime && <span className="shrink-0 tabular-nums opacity-70">{fmtTime(t.startTime)}</span>}
      <span className="truncate">{t.title}</span>
    </button>
  )
}

/* ---------- Mobile: one-day agenda + tap-to-move date ---------- */
function MobileCalendar({ tasks, openNewTask, openEditTask, rescheduleTask }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [moveTarget, setMoveTarget] = useState(null)
  const dayKey = toKey(cursor)
  const tKey = todayKey()
  const items = tasks.filter((t) => t.dueDate === dayKey)
  const shift = (n) =>
    setCursor((c) => {
      const d = new Date(c)
      d.setDate(d.getDate() + n)
      return d
    })
  const goToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setCursor(d)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-2">
        <button onClick={goToday} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600">
          Today
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronLeft size={18} />
          </button>
          <span className={`min-w-[8.5rem] text-center text-sm font-semibold ${dayKey === tKey ? 'text-brand-700' : 'text-slate-800'}`}>
            {WEEKDAYS[cursor.getDay()]}, {medDate(dayKey)}
          </span>
          <button onClick={() => shift(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <button
        onClick={() => openNewTask({ startDate: dayKey, dueDate: dayKey })}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500"
      >
        <Plus size={16} /> Add task
      </button>

      <div className="space-y-2">
        {items.map((t) => {
          const sm = statusMeta(t.status)
          const pm = priorityMeta(t.priority)
          const time = t.startTime ? `${fmtTime(t.startTime)}${t.endTime ? ` – ${fmtTime(t.endTime)}` : ''}` : 'All day'
          return (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <button onClick={() => openEditTask(t)} className="flex w-full items-start gap-2 text-left">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${TONE[sm.tone].dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800">{t.title}</span>
                  <span className="text-xs text-slate-400">
                    {time}
                    {t.company ? ` · ${t.company}` : ''}
                  </span>
                </span>
                <Badge tone={pm.tone}>{pm.label}</Badge>
              </button>
              <div className="mt-2 flex items-center justify-between">
                <Assignees ids={t.assignees} max={3} size={20} />
                <button
                  onClick={() => setMoveTarget(t)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
                >
                  Move date
                </button>
              </div>
            </div>
          )
        })}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400">
            No tasks due this day.
          </div>
        )}
      </div>

      <ActionSheet open={!!moveTarget} title="Move to date…" onClose={() => setMoveTarget(null)}>
        <input
          type="date"
          defaultValue={moveTarget?.dueDate || dayKey}
          onChange={(e) => {
            if (e.target.value && moveTarget) {
              rescheduleTask(moveTarget.id, e.target.value)
              setMoveTarget(null)
            }
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </ActionSheet>
    </div>
  )
}
