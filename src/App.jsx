import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import DailyOps from '@/pages/DailyOps'
import Tasks from '@/pages/Tasks'
import Kanban from '@/pages/Kanban'
import Projects from '@/pages/Projects'
import Calendar from '@/pages/Calendar'
import Reports from '@/pages/Reports'
import Admin from '@/pages/Admin'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/daily-ops" element={<DailyOps />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
