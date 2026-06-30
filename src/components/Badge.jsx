import { TONE } from '@/data/config'

// Small pill badge. `tone` is one of the keys in TONE (slate/blue/amber/emerald/rose).
export default function Badge({ tone = 'slate', dot = false, children }) {
  const t = TONE[tone] || TONE.slate
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.badge}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  )
}
