import {
  LayoutDashboard,
  ClipboardList,
  ListTodo,
  KanbanSquare,
  FolderKanban,
  CalendarDays,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react'

// Single source of truth for the sidebar + routing.
// Mirrors the 8 sections found on the original Operations Task Hub.
export const navItems = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'daily-ops', label: 'Daily Ops Board', path: '/daily-ops', icon: ClipboardList },
  { key: 'tasks', label: 'Tasks', path: '/tasks', icon: ListTodo },
  { key: 'kanban', label: 'Kanban Boards', path: '/kanban', icon: KanbanSquare },
  { key: 'projects', label: 'Project Board', path: '/projects', icon: FolderKanban },
  { key: 'calendar', label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { key: 'reports', label: 'Reports', path: '/reports', icon: BarChart3 },
  { key: 'admin', label: 'Admin', path: '/admin', icon: ShieldCheck, adminOnly: true },
  { key: 'settings', label: 'Settings', path: '/settings', icon: Settings },
]
