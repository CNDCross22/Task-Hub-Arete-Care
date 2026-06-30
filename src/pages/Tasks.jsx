import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Calendar as CalIcon } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, PRIORITIES, DEPARTMENTS, COMPANIES, statusMeta, priorityMeta } from '@/data/config'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'
import Pagination from '@/components/Pagination'
import Select from '@/components/Select'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function Tasks() {
  const { tasks, openNewTask, openEditTask, loading } = useData()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [department, setDepartment] = useState('all')
  const [company, setCompany] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return tasks.filter((t) => {
      if (status !== 'all' && t.status !== status) return false
      if (priority !== 'all' && t.priority !== priority) return false
      if (department !== 'all' && t.department !== department) return false
      if (company !== 'all' && t.company !== company) return false
      if (needle && !`${t.title} ${t.description || ''} ${(t.tags || []).join(' ')}`.toLowerCase().includes(needle))
        return false
      return true
    })
  }, [tasks, q, status, priority, department, company])

  // Reset to page 1 whenever the filtered set changes.
  useEffect(() => {
    setPage(1)
  }, [q, status, priority, department, company, pageSize])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  )

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <FilterSelect value={status} onChange={setStatus} all="All statuses" options={STATUSES} />
        <FilterSelect value={priority} onChange={setPriority} all="All priorities" options={PRIORITIES} />
        <FilterSelect value={department} onChange={setDepartment} all="All departments" options={DEPARTMENTS.map((d) => ({ key: d, label: d }))} />
        <FilterSelect value={company} onChange={setCompany} all="All companies" options={COMPANIES.map((c) => ({ key: c, label: c }))} />

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-400">{filtered.length} of {tasks.length}</span>
          <button
            onClick={() => openNewTask()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Assignees</th>
              <th className="px-4 py-3">Dept</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.map((t) => {
              const sm = statusMeta(t.status)
              const pm = priorityMeta(t.priority)
              const overdue = t.status !== 'completed' && t.dueDate && t.dueDate < todayStr()
              return (
                <tr key={t.id} onClick={() => openEditTask(t)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{t.title}</div>
                    {t.tags?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.tags.map((tag) => (
                          <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge tone={sm.tone} dot>{sm.label}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={pm.tone}>{pm.label}</Badge></td>
                  <td className="px-4 py-3"><Assignees ids={t.assignees} /></td>
                  <td className="px-4 py-3 text-slate-600">{t.department || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{t.company || '—'}</td>
                  <td className="px-4 py-3">
                    {t.dueDate ? (
                      <span className={`inline-flex items-center gap-1.5 ${overdue ? 'text-rose-600' : 'text-slate-600'}`}>
                        <CalIcon size={14} />
                        {t.dueDate}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                  No tasks match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageCount={pageCount}
          total={filtered.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>
    </div>
  )
}

function FilterSelect({ value, onChange, all, options }) {
  const opts = [{ value: 'all', label: all }, ...options.map((o) => ({ value: o.key, label: o.label }))]
  return (
    <div className="w-40">
      <Select value={value} onChange={onChange} options={opts} />
    </div>
  )
}
