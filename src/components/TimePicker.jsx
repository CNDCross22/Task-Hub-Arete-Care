import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const pad = (n) => String(n).padStart(2, '0')

// "09:30" -> "9:30 AM"
export const fmtTime = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return ''
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}

// Forgiving parse of free-typed input -> 24h "HH:MM".
//   ''        -> '' (cleared)
//   invalid   -> null (caller reverts)
// Accepts: "9", "930", "9:30", "9:30pm", "0930", "21:30", "9 pm", "1.30pm"
function parse(raw) {
  const s = String(raw).trim().toLowerCase()
  if (!s) return ''
  const pm = /p/.test(s)
  const am = /a/.test(s)
  const digits = s.replace(/[^0-9]/g, '')
  if (!digits) return null

  let h
  let m
  if (s.includes(':') || s.includes('.')) {
    const [a, b = ''] = s.split(/[:.]/)
    h = parseInt(a.replace(/[^0-9]/g, ''), 10)
    m = parseInt(b.replace(/[^0-9]/g, '') || '0', 10)
  } else if (digits.length <= 2) {
    h = parseInt(digits, 10)
    m = 0
  } else if (digits.length === 3) {
    h = parseInt(digits.slice(0, 1), 10)
    m = parseInt(digits.slice(1), 10)
  } else {
    h = parseInt(digits.slice(0, 2), 10)
    m = parseInt(digits.slice(2, 4), 10)
  }

  if (Number.isNaN(h) || Number.isNaN(m) || m > 59) return null

  if (am || pm) {
    if (h < 1 || h > 12) return null
    if (am && h === 12) h = 0
    if (pm && h !== 12) h += 12
  }
  if (h > 23) return null
  return `${pad(h)}:${pad(m)}`
}

export default function TimePicker({ value, onChange, placeholder = '--:-- --' }) {
  const [text, setText] = useState(fmtTime(value))

  useEffect(() => {
    setText(fmtTime(value))
  }, [value])

  const commit = () => {
    const parsed = parse(text)
    if (parsed === '') {
      onChange('')
      return
    }
    if (parsed === null) {
      setText(fmtTime(value)) // invalid — revert to last good value
      return
    }
    onChange(parsed)
    setText(fmtTime(parsed))
  }

  return (
    <div className="relative">
      <Clock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  )
}
