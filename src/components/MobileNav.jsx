import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Plus, MoreHorizontal, LogOut, X, Download } from 'lucide-react'
import { navItems } from '@/navigation'
import { useAuth, memberName, memberInitials } from '@/auth/AuthProvider'
import { useData } from '@/data/store'
import { useAnimatedPresence } from '@/lib/useAnimatedPresence'
import { usePWAInstall } from '@/lib/usePWAInstall'

// The four operational views live in the bottom bar; everything else is behind "More".
const PRIMARY = ['daily-ops', 'tasks', 'kanban', 'calendar']
const shortLabel = (l) => l.replace(' Boards', '').replace(' Board', '')

export default function MobileNav() {
  const { isAdmin, member, signOut } = useAuth()
  const { openNewTask } = useData()
  const { canInstall, install } = usePWAInstall()
  const [moreOpen, setMoreOpen] = useState(false)
  const { render, closing } = useAnimatedPresence(moreOpen)

  const visible = navItems.filter((n) => !n.adminOnly || isAdmin)
  const primary = PRIMARY.map((k) => visible.find((n) => n.key === k)).filter(Boolean)
  const rest = visible.filter((n) => !PRIMARY.includes(n.key))

  return (
    <>
      {/* Floating New Task */}
      <button
        onClick={() => openNewTask()}
        aria-label="New task"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-300 active:scale-95"
      >
        <Plus size={26} />
      </button>

      {/* Bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {primary.map(({ key, label, path, icon: Icon }) => (
          <NavLink
            key={key}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
                isActive ? 'text-brand-600' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            <span className="truncate">{shortLabel(label)}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
            moreOpen ? 'text-brand-600' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* More sheet */}
      {render && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-slate-900/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={() => setMoreOpen(false)}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white p-4 shadow-2xl ${
              closing ? 'animate-sheet-down' : 'animate-sheet-up'
            }`}
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {memberInitials(member)}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{memberName(member)}</p>
                  <p className="text-xs capitalize text-slate-500">{member?.role}</p>
                </div>
              </div>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {rest.map(({ key, label, path, icon: Icon }) => (
                <NavLink
                  key={key}
                  to={path}
                  end={path === '/'}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium ${
                      isActive ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span className="text-center leading-tight">{label}</span>
                </NavLink>
              ))}
            </div>

            {canInstall && (
              <button
                onClick={install}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white"
              >
                <Download size={16} /> Install app
              </button>
            )}

            {member && (
              <button
                onClick={() => {
                  setMoreOpen(false)
                  signOut()
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
              >
                <LogOut size={16} /> Sign out
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}
