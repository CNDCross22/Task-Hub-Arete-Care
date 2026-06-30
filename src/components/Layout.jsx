import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import TaskModal from './TaskModal'
import { navItems } from '@/navigation'
import { useData } from '@/data/store'

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const { busy } = useData()
  const active =
    navItems.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path))) ||
    navItems[0]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Thin top progress bar while any save/delete is in flight */}
      {busy && (
        <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-brand-100">
          <div className="h-full w-1/3 animate-progress-slide rounded-full bg-brand-600" />
        </div>
      )}
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
