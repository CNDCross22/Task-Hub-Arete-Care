import { useState } from 'react'
import { Search, Bell, Plus, Sparkles, LogOut, KeyRound } from 'lucide-react'
import { useData } from '@/data/store'
import { useAuth, memberName, memberInitials } from '@/auth/AuthProvider'
import AccessCodeForm from '@/auth/AccessCodeForm'

export default function Topbar({ title }) {
  const { openNewTask } = useData()
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search tasks, projects…"
            className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
          <Sparkles size={16} className="text-brand-600" />
          <span className="hidden lg:inline">AI Assist</span>
        </button>

        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <button
          onClick={() => openNewTask()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Task</span>
        </button>

        <UserMenu />
      </div>
    </header>
  )
}

function UserMenu() {
  const { enabled, member, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  // Signed in — avatar with a dropdown.
  if (member) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 hover:ring-2 hover:ring-brand-200"
          title={memberName(member)}
        >
          {memberInitials(member)}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-800">{memberName(member)}</p>
                <p className="truncate text-xs capitalize text-slate-500">
                  {member.role}
                  {member.department ? ` · ${member.department}` : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setOpen(false)
                  signOut()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Supabase configured but not signed in — offer access-code sign-in.
  if (enabled) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <KeyRound size={16} />
          Sign in
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <AccessCodeForm autoFocus onDone={() => setOpen(false)} />
            </div>
          </>
        )}
      </div>
    )
  }

  // Local mode — no auth.
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
      AC
    </div>
  )
}
