import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Boxes, Search, X } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import TaskModal from './TaskModal'
import MobileNav from './MobileNav'
import NotificationBell from './NotificationBell'
import SearchBox from './SearchBox'
import { navItems } from '@/navigation'
import { useBusy } from '@/data/store'
import { useIsDesktop } from '@/lib/useIsDesktop'

const BusyBar = () => (
  <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-brand-100">
    <div className="h-full w-1/3 animate-progress-slide rounded-full bg-brand-600" />
  </div>
)

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const busy = useBusy()
  const isDesktop = useIsDesktop()
  const active =
    navItems.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path))) ||
    navItems[0]

  // --- Mobile / tablet shell: bottom tab bar, condensed top bar, FAB ---
  if (!isDesktop) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
        {busy && <BusyBar />}
        <MobileTopbar title={active.label} />
        <main key={pathname} className="flex-1 animate-fade-in overflow-y-auto px-3 py-4 pb-24">
          {children}
        </main>
        <MobileNav />
        <TaskModal />
      </div>
    )
  }

  // --- Desktop shell (unchanged) ---
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {busy && <BusyBar />}
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={active.label} />
        <main key={pathname} className="flex-1 animate-fade-in overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <TaskModal />
    </div>
  )
}

function MobileTopbar({ title }) {
  const [searchOpen, setSearchOpen] = useState(false)
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Boxes size={18} />
          </span>
          <h1 className="truncate text-base font-semibold text-slate-900">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen((o) => !o)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Search"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
          <NotificationBell />
        </div>
      </div>
      {searchOpen && (
        <div className="border-t border-slate-100 p-2">
          <SearchBox mobile autoFocus />
        </div>
      )}
    </header>
  )
}
