import { useState } from 'react'
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import Popover from './Popover'
import { toKey, fromKey, MONTHS, WEEKDAYS, longDate } from '@/lib/dates'

const triggerCls =
  'flex w-full items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-left text-sm outline-none hover:border-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

export default function DatePicker({ value, onChange, placeholder = 'Select date' }) {
  return (
    <Popover
      width={264}
      renderTrigger={({ open }) => (
        <button type="button" onClick={open} className={triggerCls}>
          <CalIcon size={15} className="shrink-0 text-slate-400" />
          {value ? (
            <span className="text-slate-800">{longDate(value)}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <CalendarPanel
          value={value}
          onSelect={(d) => {
            onChange(d)
            close()
          }}
          onClear={() => {
            onChange('')
            close()
          }}
        />
      )}
    </Popover>
  )
}

function CalendarPanel({ value, onSelect, onClear }) {
  const [view, setView] = useState(() => (value ? fromKey(value) : new Date()))
  const year = view.getFullYear()
  const month = view.getMonth()
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = toKey(new Date())

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w[0]}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const key = toKey(d)
          const selected = key === value
          const isToday = key === today
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(key)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors ${
                selected
                  ? 'bg-brand-600 font-semibold text-white'
                  : isToday
                    ? 'font-semibold text-brand-700 ring-1 ring-inset ring-brand-200'
                    : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => onSelect(today)}
          className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
        >
          Today
        </button>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
