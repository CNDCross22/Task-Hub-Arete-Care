import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useData } from '@/data/store'
import { statusMeta, priorityMeta, TONE } from '@/data/config'
import { useAnimatedPresence } from '@/lib/useAnimatedPresence'

export default function SearchBox({ mobile = false, autoFocus = false }) {
  const { tasks, openEditTask } = useData()
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return tasks
      .filter((t) =>
        `${t.title} ${t.description || ''} ${(t.tags || []).join(' ')} ${t.company || ''} ${t.department || ''}`
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8)
  }, [q, tasks])

  const select = (t) => {
    openEditTask(t)
    setQ('')
    setFocused(false)
  }

  const showDropdown = focused && q.trim().length > 0
  const { render, closing } = useAnimatedPresence(showDropdown)

  return (
    <div className={`relative ${mobile ? '' : 'hidden sm:block'}`}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder="Search tasks…"
        className={`${mobile ? 'w-full' : 'w-64'} rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100`}
      />

      {render && (
        <div
          className={`absolute left-0 right-0 z-20 mt-2 origin-top overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${
            closing ? 'animate-fade-out' : 'animate-fade-in-up'
          }`}
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No tasks match “{q.trim()}”.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((t) => {
                const sm = statusMeta(t.status)
                const pm = priorityMeta(t.priority)
                return (
                  <li key={t.id}>
                    {/* onMouseDown fires before the input's blur, so the click registers */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault()
                        select(t)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[sm.tone].dot}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-700">{t.title}</span>
                        <span className="text-xs text-slate-400">
                          {[t.department, t.company].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TONE[pm.tone].badge}`}>
                        {pm.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
