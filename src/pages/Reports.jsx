import { useMemo, useState } from 'react'
import { Download, CheckCircle2, ListTodo, AlertTriangle, Activity, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, PRIORITIES, MEMBERS, TONE, memberMeta } from '@/data/config'
import { todayStr } from '@/lib/dates'
import { generateInsights, isAIConfigured } from '@/lib/gemini'
import Markdownish from '@/components/Markdownish'
import WeeklyReport from '@/components/WeeklyReport'

export default function Reports() {
  const { tasks, projects, loading } = useData()

  // AI insights (Gemini)
  const [ai, setAi] = useState({ text: '', loading: false, error: '' })
  const runInsights = async () => {
    setAi({ text: '', loading: true, error: '' })
    try {
      const text = await generateInsights(tasks)
      setAi({ text, loading: false, error: '' })
    } catch (e) {
      setAi({ text: '', loading: false, error: e.message || 'Something went wrong.' })
    }
  }

  const metrics = useMemo(() => {
    const today = todayStr()
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'completed').length
    const overdue = tasks.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate < today).length
    const completion = total ? Math.round((done / total) * 100) : 0

    const byStatus = STATUSES.map((s) => ({ label: s.label, tone: s.tone, count: tasks.filter((t) => t.status === s.key).length }))
    const byPriority = PRIORITIES.map((p) => ({ label: p.label, tone: p.tone, count: tasks.filter((t) => t.priority === p.key).length }))
    const byAssignee = MEMBERS.map((m) => {
      const items = tasks.filter((t) => (t.assignees || []).includes(m.id))
      return { label: m.name, initials: m.initials, count: items.length, done: items.filter((t) => t.status === 'completed').length }
    }).filter((m) => m.count > 0)
    const byProject = projects.map((p) => ({
      label: p.name,
      tone: p.color,
      count: tasks.filter((t) => t.projectId === p.id).length,
    }))

    return { total, done, overdue, completion, byStatus, byPriority, byAssignee, byProject }
  }, [tasks, projects])

  const exportCsv = () => {
    const headers = ['Title', 'Status', 'Priority', 'Assignees', 'Department', 'Company', 'Start Date', 'Due Date', 'Notes']
    const rows = tasks.map((t) => [
      t.title,
      t.status,
      t.priority,
      (t.assignees || []).map((id) => memberMeta(id)?.name || '').filter(Boolean).join('; '),
      t.department || '',
      t.company || '',
      t.startDate || '',
      t.dueDate || '',
      t.notes || '',
    ])
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tasks-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  const kpis = [
    { label: 'Total Tasks', value: metrics.total, icon: ListTodo, tone: 'blue' },
    { label: 'Completed', value: metrics.done, icon: CheckCircle2, tone: 'emerald' },
    { label: 'Completion Rate', value: `${metrics.completion}%`, icon: Activity, tone: 'amber' },
    { label: 'Overdue', value: metrics.overdue, icon: AlertTriangle, tone: 'rose' },
  ]

  const maxAssignee = Math.max(1, ...metrics.byAssignee.map((m) => m.count))

  return (
    <div className="space-y-6">
      <WeeklyReport />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Analytics across all tasks and projects</p>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONE[tone].soft}`}>
              <Icon size={20} />
            </span>
            <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">AI Insights</h3>
              <p className="text-xs text-slate-500">Gemini-generated summary of your current tasks</p>
            </div>
          </div>
          <button
            onClick={runInsights}
            disabled={ai.loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {ai.loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : ai.text ? (
              <RefreshCw size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {ai.loading ? 'Analyzing…' : ai.text ? 'Regenerate' : 'Generate Insights'}
          </button>
        </div>

        <div className="mt-4">
          {!isAIConfigured() && !ai.text && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Add your Gemini API key to <code className="rounded bg-amber-100 px-1">.env.local</code> as{' '}
              <code className="rounded bg-amber-100 px-1">VITE_GEMINI_API_KEY</code> and restart the dev
              server to enable AI insights. See <code className="rounded bg-amber-100 px-1">.env.example</code>.
            </div>
          )}
          {ai.error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {ai.error}
            </div>
          )}
          {ai.loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Generating insights from {metrics.total} tasks…
            </div>
          )}
          {ai.text && !ai.loading && (
            <div className="rounded-lg bg-slate-50 p-4">
              <Markdownish text={ai.text} />
            </div>
          )}
          {!ai.text && !ai.loading && !ai.error && isAIConfigured() && (
            <p className="text-sm text-slate-400">
              Click <span className="font-medium text-slate-600">Generate Insights</span> for an AI summary of
              risks, bottlenecks, and recommendations across your companies.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarCard title="By Status" rows={metrics.byStatus} total={metrics.total} />
        <BarCard title="By Priority" rows={metrics.byPriority} total={metrics.total} />
        <BarCard title="By Project" rows={metrics.byProject} total={metrics.total} />

        {/* Workload by assignee */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Workload by Assignee</h3>
          <div className="mt-4 space-y-3">
            {metrics.byAssignee.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {m.initials}
                </span>
                <span className="w-28 shrink-0 truncate text-sm text-slate-700">{m.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(m.count / maxAssignee) * 100}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-slate-400">{m.done}/{m.count} done</span>
              </div>
            ))}
            {metrics.byAssignee.length === 0 && <p className="text-sm text-slate-400">No assigned tasks.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function BarCard({ title, rows, total }) {
  const denom = total || 1
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-600">{r.label}</span>
              <span className="text-slate-400">{r.count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${TONE[r.tone]?.bar || 'bg-brand-500'}`}
                style={{ width: `${Math.round((r.count / denom) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">No data.</p>}
      </div>
    </div>
  )
}
