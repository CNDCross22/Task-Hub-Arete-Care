import { useMemo } from 'react'
import { FolderKanban, Plus } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, TONE, priorityMeta } from '@/data/config'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'

export default function Projects() {
  const { tasks, projects, openNewTask, openEditTask, loading } = useData()

  const summaries = useMemo(
    () =>
      projects.map((p) => {
        const items = tasks.filter((t) => t.projectId === p.id)
        const done = items.filter((t) => t.status === 'completed').length
        const pct = items.length ? Math.round((done / items.length) * 100) : 0
        const byStatus = STATUSES.map((s) => ({
          ...s,
          count: items.filter((t) => t.status === s.key).length,
        }))
        return { project: p, items, done, pct, byStatus }
      }),
    [tasks, projects],
  )

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {summaries.map(({ project, items, done, pct, byStatus }) => (
        <div key={project.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start gap-3 border-b border-slate-100 p-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONE[project.color]?.soft || TONE.slate.soft}`}>
              <FolderKanban size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900">{project.name}</h3>
              <p className="truncate text-sm text-slate-500">{project.description || 'No description'}</p>
            </div>
            <button
              onClick={() => openNewTask({ projectId: project.id })}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Add task to project"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="p-5">
            {/* Progress */}
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Progress</span>
              <span className="text-slate-400">{done}/{items.length} done · {pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
            </div>

            {/* Status chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {byStatus.map((s) => (
                <span key={s.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[s.tone].badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${TONE[s.tone].dot}`} />
                  {s.label} {s.count}
                </span>
              ))}
            </div>

            {/* Task list */}
            <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto">
              {items.length === 0 && <li className="py-3 text-sm text-slate-400">No tasks yet.</li>}
              {items.map((t) => {
                const pm = priorityMeta(t.priority)
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => openEditTask(t)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[STATUSES.find((s) => s.key === t.status)?.tone || 'slate'].dot}`} />
                      <span className={`min-w-0 flex-1 truncate text-sm ${t.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {t.title}
                      </span>
                      <Badge tone={pm.tone}>{pm.label}</Badge>
                      <Assignees ids={t.assignees} max={2} size={20} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ))}

      {projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          No projects yet. Add one in Settings.
        </div>
      )}
    </div>
  )
}
