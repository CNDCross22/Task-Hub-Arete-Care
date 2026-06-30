const pad = (n) => String(n).padStart(2, '0')

// "09:30" -> "9:30 AM" (kept for any callers that want a formatted label)
export const fmtTime = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return ''
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}

// Native time input — familiar, accessible, shows AM/PM per the user's locale,
// and stores the same "HH:MM" 24h value the rest of the app uses.
export default function TimePicker({ value, onChange }) {
  return (
    <input
      type="time"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
    />
  )
}
