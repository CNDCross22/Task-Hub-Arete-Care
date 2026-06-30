import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import TaskModal from './TaskModal'
import { navItems } from '@/navigation'

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const active =
    navItems.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path))) ||
    navItems[0]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={active.label} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Keyed by route so each page fades in on navigation */}
          <div key={pathname} className="h-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <TaskModal />
    </div>
  )
}
