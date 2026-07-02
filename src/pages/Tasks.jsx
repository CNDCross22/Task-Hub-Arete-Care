import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Calendar as CalIcon, Repeat, GripVertical } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, PRIORITIES, DEPARTMENTS, COMPANIES, statusMeta, priorityMeta } from '@/data/config'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'
import Pagination from '@/components/Pagination'
import Select from '@/components/Select'
import { isOverdue, medDate } from '@/lib/dates'
import { collapseSeries } from '@/lib/series'

export default function Tasks() {
  const { tasks, openNewTask, openEditTask, reorderTask, loading } = useData()
  const [q, setQ] = useState('')
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [department, setDepartment] = useState('all')
  const [company, setCompany] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  // Collapse each recurring series into a single row (the next active occurrence)
  // with a count, so pre-generated occurrences don't flood the list.
  const collapsed = useMemo(() => collapseSeries(filtered), [filtered])

  const pageCount = Math.max(1, Math.ceil(collapsed.length / pageSize))
  const paged = useMemo(
    () => collapsed.slice((page - 1) * pageSize, page * pageSize),
    [collapsed, page, pageSize],
  )

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:w-56"
          />
        </div>

        <FilterSelect value={status} onChange={setStatus} all="All statuses" options={STATUSES} />
        <FilterSelect value={priority} onChange={setPriority} all="All priorities" options={PRIORITIES} />
        <FilterSelect value={department} onChange={setDepartment} all="All departments" options={DEPARTMENTS.map((d) => ({ key: d, label: d }))} />
        <FilterSelect value={company} onChange={setCompany} all="All companies" options={COMPANIES.map((c) => ({ key: c, label: c }))} />

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {collapsed.length} row{collapsed.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => openNewTask()}
            className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:inline-flex"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
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
              const overdue = isOverdue(t)
              return (
                <tr
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/task-id', t.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setDragId(t.id)
                  }}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverId(null)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (overId !== t.id) setOverId(t.id)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/task-id')
                    setOverId(null)
                    setDragId(null)
                    if (id && id !== t.id) {
                      const moving = tasks.find((x) => x.id === id)
                      reorderTask(id, moving?.status, t.id)
                    }
                  }}
                  onClick={() => openEditTask(t)}
                  className={`cursor-pointer transition-colors ${dragId === t.id ? 'opacity-40' : ''} ${
                    overId === t.id && dragId && dragId !== t.id ? 'bg-brand-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GripVertical
                        size={14}
                        className="shrink-0 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                      />
                      <span className="font-medium text-slate-800">{t.title}</span>
                      {t.recurring && (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700"
                          title={`Recurring · ${t._count} occurrence${t._count === 1 ? '' : 's'}`}
                        >
                          <Repeat size={11} />
                          {t._count > 1 ? `×${t._count}` : ''}
                        </span>
                      )}
                    </div>
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
                        {medDate(t.dueDate)}
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
          total={collapsed.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>

      {/* Cards (mobile / tablet) */}
      <div className="space-y-2 lg:hidden">
        {paged.map((t) => (
          <TaskCard key={t.id} t={t} onClick={() => openEditTask(t)} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-400">
            No tasks match your filters.
          </div>
        )}
        {collapsed.length > pageSize && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <Pagination
              page={page}
              pageCount={pageCount}
              total={collapsed.length}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function TaskCard({ t, onClick }) {
  const sm = statusMeta(t.status)
  const pm = priorityMeta(t.priority)
  const overdue = isOverdue(t)
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium text-slate-800">
          {t.title}
          {t.recurring && <Repeat size={12} className="shrink-0 text-brand-500" />}
        </span>
        <Badge tone={pm.tone}>{pm.label}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <Badge tone={sm.tone} dot>{sm.label}</Badge>
        {t.company && <span>{t.company}</span>}
        {t.dueDate && (
          <span className={`inline-flex items-center gap-1 ${overdue ? 'text-rose-600' : ''}`}>
            <CalIcon size={12} />
            {medDate(t.dueDate)}
          </span>
        )}
      </div>
      <Assignees ids={t.assignees} />
    </button>
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
