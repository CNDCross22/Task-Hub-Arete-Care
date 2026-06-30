import { resolveAssignees } from '@/data/config'

// Overlapping avatar stack for a task's assignees. `max` caps shown avatars.
export default function Assignees({ ids, max = 3, size = 24 }) {
  const members = resolveAssignees(ids)
  if (members.length === 0)
    return <span className="text-xs text-slate-400">Unassigned</span>

  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  const dim = `${size}px`

  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((m) => (
        <span
          key={m.id}
          title={m.name}
          style={{ width: dim, height: dim }}
          className="flex items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 ring-2 ring-white"
        >
          {m.initials}
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{ width: dim, height: dim }}
          className="flex items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white"
        >
          +{extra}
        </span>
      )}
    </div>
  )
}
