import { NavLink } from 'react-router-dom'
import { Boxes } from 'lucide-react'
import { navItems } from '@/navigation'
import { useAuth } from '@/auth/AuthProvider'

export default function Sidebar() {
  const { isAdmin } = useAuth()
  const items = navItems.filter((n) => !n.adminOnly || isAdmin)
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Boxes size={20} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-900">Operations</p>
          <p className="text-xs font-medium text-slate-500">Task Hub</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ key, label, path, icon: Icon }) => (
          <NavLink
            key={key}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-400">AI-enhanced task suite</p>
      </div>
    </aside>
  )
}
