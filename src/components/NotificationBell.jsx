import { useEffect, useMemo, useState } from 'react'
import { Bell, AlertTriangle, CalendarClock, BellRing } from 'lucide-react'
import { useData } from '@/data/store'
import { TONE, priorityMeta } from '@/data/config'
import { todayStr, prettyDate, isOverdue, isDueToday } from '@/lib/dates'
import { useAnimatedPresence } from '@/lib/useAnimatedPresence'

export default function NotificationBell() {
  const { tasks, openEditTask } = useData()
  const [open, setOpen] = useState(false)
  const { render, closing } = useAnimatedPresence(open)
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const today = todayStr()

  const { overdue, dueToday, count } = useMemo(() => {
    const overdue = tasks.filter(isOverdue)
    const dueToday = tasks.filter((t) => t.status !== 'completed' && isDueToday(t))
    return { overdue, dueToday, count: overdue.length + dueToday.length }
  }, [tasks, today])

  // Browser push: fire one summary desktop notification per day when granted.
  useEffect(() => {
    if (perm !== 'granted' || count === 0) return
    const key = `arete-notified:${today}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    try {
      new Notification('Operations Task Hub', {
        body: `${overdue.length} overdue · ${dueToday.length} due today`,
      })
    } catch {
      /* ignore */
    }
  }, [perm, count, today, overdue.length, dueToday.length])

  const enablePush = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPerm(result)
    if (result === 'granted') {
      try {
        new Notification('Desktop notifications enabled', {
          body: "You'll be alerted about due and overdue tasks.",
        })
      } catch {
        /* ignore */
      }
    }
  }

  const onOpen = (t) => {
    setOpen(false)
    openEditTask(t)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {render && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg ${
              closing ? 'animate-scale-out' : 'animate-scale-in'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              <span className="text-xs text-slate-400">{count} active</span>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <Group title="Overdue" icon={AlertTriangle} iconClass="text-rose-500" dotTone="rose" items={overdue} onOpen={onOpen} />
              <Group title="Due Today" icon={CalendarClock} iconClass="text-amber-500" dotTone="amber" items={dueToday} onOpen={onOpen} />
              {count === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up.</p>}
            </div>

            <div className="border-t border-slate-100 px-3 py-2">
              {perm === 'granted' ? (
                <span className="flex items-center gap-1.5 px-1 text-xs font-medium text-emerald-600">
                  <BellRing size={14} /> Desktop alerts on
                </span>
              ) : perm === 'unsupported' || perm === 'denied' ? (
                <span className="px-1 text-xs text-slate-400">
                  {perm === 'denied' ? 'Desktop alerts blocked in browser settings' : 'Desktop alerts not supported'}
                </span>
              ) : (
                <button
                  onClick={enablePush}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  <BellRing size={14} /> Enable desktop notifications
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Group({ title, icon: Icon, iconClass, dotTone, items, onOpen }) {
  if (items.length === 0) return null
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon size={13} className={iconClass} /> {title} ({items.length})
      </div>
      {items.map((t) => {
        const pm = priorityMeta(t.priority)
        return (
          <button
            key={t.id}
            onClick={() => onOpen(t)}
            className="flex w-full items-start gap-2 px-4 py-2 text-left hover:bg-slate-50"
          >
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${TONE[dotTone].dot}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-slate-700">{t.title}</span>
              <span className="text-xs text-slate-400">
                {t.company ? `${t.company} · ` : ''}
                {prettyDate(t.dueDate)}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TONE[pm.tone].badge}`}>
              {pm.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
