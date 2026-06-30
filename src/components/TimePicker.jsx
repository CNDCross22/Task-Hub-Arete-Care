import { useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import Popover from './Popover'

const pad = (n) => String(n).padStart(2, '0')

// "09:30" -> "9:30 AM"
export const fmtTime = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return ''
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,…,55

const triggerCls =
  'flex w-full items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-left text-sm outline-none hover:border-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

export default function TimePicker({ value, onChange, placeholder = '--:-- --' }) {
  return (
    <Popover
      width={208}
      renderTrigger={({ open }) => (
        <button type="button" onClick={open} className={triggerCls}>
          <Clock size={15} className="shrink-0 text-slate-400" />
          <span className={`min-w-0 truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>
            {value ? fmtTime(value) : placeholder}
          </span>
        </button>
      )}
    >
      {() => <TimePanel value={value} onChange={onChange} onClear={() => onChange('')} />}
    </Popover>
  )
}

function TimePanel({ value, onChange, onClear }) {
  const has = Boolean(value)
  const [h24, min] = has ? value.split(':').map(Number) : [9, 0]
  const hour12 = h24 % 12 || 12
  const ampm = h24 < 12 ? 'AM' : 'PM'

  const commit = (h, m, ap) => onChange(`${pad((h % 12) + (ap === 'PM' ? 12 : 0))}:${pad(m)}`)

  return (
    <div className="p-2">
      <div className="flex gap-1">
        <Col label="Hr" items={HOURS} selected={has ? hour12 : null} onPick={(v) => commit(v, min, ampm)} />
        <Col
          label="Min"
          items={MINUTES}
          selected={has ? min : null}
          render={pad}
          onPick={(v) => commit(hour12, v, ampm)}
        />
        <div className="flex w-12 shrink-0 flex-col">
          <div className="pb-1 text-center text-[10px] font-semibold uppercase text-slate-400">&nbsp;</div>
          <div className="space-y-1">
            {['AM', 'PM'].map((ap) => (
              <button
                key={ap}
                type="button"
                onClick={() => commit(hour12, min, ap)}
                className={`block w-full rounded-md py-1.5 text-center text-sm transition-colors ${
                  has && ampm === ap
                    ? 'bg-brand-600 font-medium text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {ap}
              </button>
            ))}
          </div>
        </div>
      </div>

      {has && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 block w-full rounded-md border-t border-slate-100 py-1.5 text-center text-xs text-slate-500 hover:bg-slate-100"
        >
          Clear
        </button>
      )}
    </div>
  )
}

function Col({ label, items, selected, render, onPick }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current?.querySelector('[data-sel="true"]')
    if (el) el.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="pb-1 text-center text-[10px] font-semibold uppercase text-slate-400">{label}</div>
      <div ref={ref} className="max-h-44 space-y-0.5 overflow-y-auto pr-0.5">
        {items.map((it) => (
          <button
            key={it}
            type="button"
            data-sel={selected === it}
            onClick={() => onPick(it)}
            className={`block w-full rounded-md py-1 text-center text-sm transition-colors ${
              selected === it ? 'bg-brand-600 font-medium text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {render ? render(it) : it}
          </button>
        ))}
      </div>
    </div>
  )
}
