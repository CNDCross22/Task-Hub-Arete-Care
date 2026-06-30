import { useState } from 'react'
import { Plus, Trash2, FolderKanban, Tag, Flag, AlertTriangle } from 'lucide-react'
import { useData, BACKEND_MODE } from '@/data/store'
import { STATUSES, PRIORITIES, TONE } from '@/data/config'

const COLORS = ['blue', 'emerald', 'amber', 'rose', 'slate']

export default function Settings() {
  const { projects, tasks, createProject, removeProject, resetData, loading } = useData()
  const [name, setName] = useState('')
  const [color, setColor] = useState('blue')

  const addProject = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    createProject({ name: name.trim(), color })
    setName('')
    setColor('blue')
  }

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  return (
    <div className="max-w-3xl space-y-6">
      {/* Projects */}
      <Section icon={FolderKanban} title="Projects" subtitle="Group tasks into projects.">
        <ul className="divide-y divide-slate-100">
          {projects.map((p) => {
            const count = tasks.filter((t) => t.projectId === p.id).length
            return (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className={`h-3 w-3 rounded-full ${TONE[p.color]?.dot || TONE.slate.dot}`} />
                <span className="flex-1 text-sm font-medium text-slate-700">{p.name}</span>
                <span className="text-xs text-slate-400">{count} task{count === 1 ? '' : 's'}</span>
                <button
                  onClick={() => removeProject(p.id)}
                  className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Delete project"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            )
          })}
          {projects.length === 0 && <li className="py-3 text-sm text-slate-400">No projects yet.</li>}
        </ul>

        <form onSubmit={addProject} className="mt-3 flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full ${TONE[c].dot} ${color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                title={c}
              />
            ))}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} />
            Add
          </button>
        </form>
      </Section>

      {/* Statuses + Priorities */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Section icon={Tag} title="Statuses">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <span key={s.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONE[s.tone].badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${TONE[s.tone].dot}`} />
                {s.label}
              </span>
            ))}
          </div>
        </Section>
        <Section icon={Flag} title="Priorities">
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((p) => (
              <span key={p.key} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE[p.tone].badge}`}>
                {p.label}
              </span>
            ))}
          </div>
        </Section>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 text-rose-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rose-700">Reset all data</h3>
            <p className="mt-1 text-sm text-rose-600/80">
              Clears local data and restores the sample tasks. This cannot be undone.
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Reset all local data back to the sample set?')) resetData()
            }}
            className="shrink-0 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Reset Data
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        {BACKEND_MODE === 'edge'
          ? 'Secured via Supabase Edge Function (database locked down with RLS).'
          : BACKEND_MODE === 'supabase'
            ? 'Connected to Supabase — data syncs to the cloud.'
            : 'Data is stored locally in your browser. Add Supabase keys to .env.local to sync.'}
      </p>
    </div>
  )
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon size={18} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}
