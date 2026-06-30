import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Boxes, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { navItems } from '@/navigation'
import { useAuth } from '@/auth/AuthProvider'

const KEY = 'sidebar-collapsed'

export default function Sidebar() {
  const { isAdmin } = useAuth()
  const items = navItems.filter((n) => !n.adminOnly || isAdmin)

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center py-5 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-5'}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Boxes size={20} />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">Operations</p>
            <p className="text-xs font-medium text-slate-500">Task Hub</p>
          </div>
        )}
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
                'group relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : 'gap-3',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && label}

            {/* Hover tooltip — shows the title when collapsed */}
            {collapsed && (
              <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse / expand toggle */}
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 ${
            collapsed ? 'justify-center' : 'gap-3'
          }`}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}
