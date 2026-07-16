import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Calendar as CalIcon, Repeat, SlidersHorizontal } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, PRIORITIES, DEPARTMENTS, COMPANIES, statusMeta, priorityMeta, statusRank } from '@/data/config'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'
import Pagination from '@/components/Pagination'
import Select from '@/components/Select'
import OrderArrows from '@/components/OrderArrows'
import { isOverdue, medDate } from '@/lib/dates'
import { byManualOrder } from '@/lib/order'
import { mergeVisibleIntoGroup } from '@/lib/reorder'
import { useReorder } from '@/lib/useReorder'
import { collapseSeries } from '@/lib/series'

export default function Tasks() {
  const { tasks, openNewTask, openEditTask, moveWithin, commitOrder, loading } = useData()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [department, setDepartment] = useState('all')
  const [company, setCompany] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showFilters, setShowFilters] = useState(false)

  const filterDefs = [
    { value: status, onChange: setStatus, all: 'All statuses', options: STATUSES },
    { value: priority, onChange: setPriority, all: 'All priorities', options: PRIORITIES },
    { value: department, onChange: setDepartment, all: 'All departments', options: DEPARTMENTS.map((d) => ({ key: d, label: d })) },
    { value: company, onChange: setCompany, all: 'All companies', options: COMPANIES.map((c) => ({ key: c, label: c })) },
  ]
  const activeFilters = filterDefs.filter((f) => f.value !== 'all').length
  const clearFilters = () => {
    setStatus('all')
    setPriority('all')
    setDepartment('all')
    setCompany('all')
  }

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

  // Group by status — Pending on top, Completed at the bottom — keeping the
  // manual arrangement inside each group. Completing a task drops it to the
  // bottom on its own.
  const ordered = useMemo(
    () => [...collapsed].sort((a, b) => statusRank(a.status) - statusRank(b.status) || byManualOrder(a, b)),
    [collapsed],
  )

  // Each row's position within its own status group, so the arrows know when
  // they've hit the top/bottom of that group.
  const slot = useMemo(() => {
    const seen = {}
    const pos = {}
    for (const t of ordered) {
      seen[t.status] = seen[t.status] || 0
      pos[t.id] = seen[t.status]++
    }
    return { pos, size: seen }
  }, [ordered])

  // Reorder against the whole filtered group, not just this page, so moving a
  // row off the top of a page lands it on the previous one.
  const nudge = (t, dir) =>
    moveWithin(
      t.id,
      dir,
      ordered.filter((x) => x.status === t.status).map((x) => x.id),
    )

  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize))
  const paged = useMemo(
    () => ordered.slice((page - 1) * pageSize, page * pageSize),
    [ordered, page, pageSize],
  )

  // Drag-to-reorder (alongside the arrows). Restricted to within a status group;
  // the dropped order of the visible page is folded back into the full group so
  // sortIndex neighbours at page boundaries stay correct.
  const tById = useMemo(() => new Map(paged.map((t) => [t.id, t])), [paged])
  const dragCommit = (newVisibleIds, movedId) => {
    const st = tById.get(movedId)?.status
    const fullGroup = ordered.filter((t) => t.status === st).map((t) => t.id)
    const newVisible = newVisibleIds.filter((id) => tById.get(id)?.status === st)
    commitOrder(movedId, mergeVisibleIntoGroup(fullGroup, newVisible))
  }
  const sort = useReorder(paged.map((t) => t.id), dragCommit, (id) => tById.get(id)?.status)

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="space-y-2">
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

          {/* Phone: toggle the filter panel; from sm up the selects sit inline */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 sm:hidden"
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilters > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-100 px-1 text-xs font-semibold text-brand-700">
                {activeFilters}
              </span>
            )}
          </button>

          <div className="hidden sm:contents">
            {filterDefs.map((f, i) => (
              <FilterSelect key={i} value={f.value} onChange={f.onChange} all={f.all} options={f.options} />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {ordered.length} row{ordered.length === 1 ? '' : 's'}
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

        {/* Phone-only expandable filter panel */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            {filterDefs.map((f, i) => (
              <FilterSelect key={i} value={f.value} onChange={f.onChange} all={f.all} options={f.options} className="w-full" />
            ))}
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
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
            {sort.order.map((id) => {
              const t = tById.get(id)
              if (!t) return null
              const sm = statusMeta(t.status)
              const pm = priorityMeta(t.priority)
              const overdue = isOverdue(t)
              return (
                <tr
                  key={t.id}
                  {...sort.dragProps(t.id)}
                  onClick={() => openEditTask(t)}
                  className={`cursor-pointer select-none transition-colors hover:bg-slate-50 ${
                    sort.dragId === t.id ? 'opacity-40' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <OrderArrows
                        compact
                        canUp={slot.pos[t.id] > 0}
                        canDown={slot.pos[t.id] < slot.size[t.status] - 1}
                        onUp={() => nudge(t, -1)}
                        onDown={() => nudge(t, 1)}
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
          total={ordered.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>

      {/* Cards (mobile / tablet) — two columns once there's tablet width */}
      <div className="space-y-2 lg:hidden">
        <div className="grid gap-2 sm:grid-cols-2">
          {sort.order.map((id) => {
            const t = tById.get(id)
            if (!t) return null
            return (
              <TaskCard
                key={t.id}
                t={t}
                onClick={() => openEditTask(t)}
                dragProps={sort.dragProps(t.id)}
                dragging={sort.dragId === t.id}
                canUp={slot.pos[t.id] > 0}
                canDown={slot.pos[t.id] < slot.size[t.status] - 1}
                onUp={() => nudge(t, -1)}
                onDown={() => nudge(t, 1)}
              />
            )
          })}
        </div>
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-400">
            No tasks match your filters.
          </div>
        )}
        {ordered.length > pageSize && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <Pagination
              page={page}
              pageCount={pageCount}
              total={ordered.length}
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

function TaskCard({ t, onClick, canUp, canDown, onUp, onDown, dragProps, dragging }) {
  const sm = statusMeta(t.status)
  const pm = priorityMeta(t.priority)
  const overdue = isOverdue(t)
  return (
    <div
      {...dragProps}
      className={`flex select-none items-start gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      {/* The card body is the tap target; the arrows sit outside it (a button
          can't be nested inside another button). */}
      <button onClick={onClick} className="flex min-w-0 flex-1 flex-col gap-2 text-left active:opacity-70">
        <span className="flex w-full items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            {t.title}
            {t.recurring && <Repeat size={12} className="shrink-0 text-brand-500" />}
          </span>
          <Badge tone={pm.tone}>{pm.label}</Badge>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <Badge tone={sm.tone} dot>{sm.label}</Badge>
          {t.company && <span>{t.company}</span>}
          {t.dueDate && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'text-rose-600' : ''}`}>
              <CalIcon size={12} />
              {medDate(t.dueDate)}
            </span>
          )}
        </span>
        <Assignees ids={t.assignees} />
      </button>
      <OrderArrows canUp={canUp} canDown={canDown} onUp={onUp} onDown={onDown} />
    </div>
  )
}

function FilterSelect({ value, onChange, all, options, className = 'w-40' }) {
  const opts = [{ value: 'all', label: all }, ...options.map((o) => ({ value: o.key, label: o.label }))]
  return (
    <div className={className}>
      <Select value={value} onChange={onChange} options={opts} />
    </div>
  )
}
