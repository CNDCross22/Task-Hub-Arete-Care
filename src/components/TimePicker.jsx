import { useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import Popover from './Popover'

const triggerCls =
  'flex w-full items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-left text-sm outline-none hover:border-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

// "09:30" -> "9:30 AM"
export const fmtTime = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return ''
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// 15-minute increments across the day
const SLOTS = []
for (let h = 0; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

export default function TimePicker({ value, onChange, placeholder = '--:-- --' }) {
  return (
    <Popover
      width={150}
      renderTrigger={({ open }) => (
        <button type="button" onClick={open} className={triggerCls}>
          <Clock size={15} className="shrink-0 text-slate-400" />
          {value ? (
            <span className="text-slate-800">{fmtTime(value)}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <TimeList
          value={value}
          onSelect={(t) => {
            onChange(t)
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

function TimeList({ value, onSelect, onClear }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current?.querySelector('[data-selected="true"]')
    if (el) el.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div ref={ref} className="py-1">
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="mb-1 block w-full border-b border-slate-100 px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100"
        >
          Clear
        </button>
      )}
      {SLOTS.map((s) => (
        <button
          key={s}
          type="button"
          data-selected={s === value}
          onClick={() => onSelect(s)}
          className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
            s === value ? 'bg-brand-600 font-medium text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {fmtTime(s)}
        </button>
      ))}
    </div>
  )
}
