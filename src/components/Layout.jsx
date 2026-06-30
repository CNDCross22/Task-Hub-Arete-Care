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
        {/* Keyed by route so each page fades in on navigation; keeps p-6 on all sides */}
        <main key={pathname} className="flex-1 animate-fade-in overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <TaskModal />
    </div>
  )
}
