import { Fragment, useState } from 'react'
import { Plus, Calendar as CalIcon, ArrowRightLeft } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, priorityMeta, TONE } from '@/data/config'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'
import ActionSheet from '@/components/ActionSheet'
import { isOverdue, medDate } from '@/lib/dates'
import { useIsDesktop } from '@/lib/useIsDesktop'

export default function Kanban() {
  const { tasks, reorderTask, moveTask, openNewTask, openEditTask, loading } = useData()
  const isDesktop = useIsDesktop()
  const [dragId, setDragId] = useState(null)
  // Where the card would land: { colKey, beforeId } — beforeId null means end of column.
  const [drop, setDrop] = useState(null)

  const clear = () => {
    setDragId(null)
    setDrop(null)
  }

  const commitDrop = (colKey) => {
    if (dragId) {
      const beforeId = drop && drop.colKey === colKey ? drop.beforeId : null
      reorderTask(dragId, colKey, beforeId)
    }
    clear()
  }

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>
  if (!isDesktop)
    return (
      <MobileKanban tasks={tasks} openNewTask={openNewTask} openEditTask={openEditTask} moveTask={moveTask} />
    )

  const Indicator = () => <div className="mx-1 my-1 h-1 rounded-full bg-brand-400" />

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-2">
      {STATUSES.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key)
        const isOver = drop?.colKey === col.key
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault()
              // Fires for empty space in the column (cards stop propagation).
              setDrop({ colKey: col.key, beforeId: null })
            }}
            onDrop={(e) => {
              e.preventDefault()
              commitDrop(col.key)
            }}
            className={`flex min-w-[15rem] flex-1 flex-col rounded-xl border bg-slate-100/60 ${
              isOver ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-200'
            }`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${TONE[col.tone].dot}`} />
                <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => openNewTask({ status: col.key })}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                title={`Add to ${col.label}`}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-3">
              {colTasks.map((t, i) => {
                const pm = priorityMeta(t.priority)
                const overdue = isOverdue(t)
                const nextId = colTasks[i + 1]?.id ?? null
                const showBefore = isOver && drop.beforeId === t.id && dragId !== t.id
                return (
                  <Fragment key={t.id}>
                    {showBefore && <Indicator />}
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        setDragId(t.id)
                      }}
                      onDragEnd={clear}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        const before = e.clientY - rect.top < rect.height / 2
                        setDrop({ colKey: col.key, beforeId: before ? t.id : nextId })
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        commitDrop(col.key)
                      }}
                      onClick={() => openEditTask(t)}
                      className={`cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md ${
                        dragId === t.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">{t.title}</p>
                        <Badge tone={pm.tone}>{pm.label}</Badge>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {t.department && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            {t.department}
                          </span>
                        )}
                        {t.company && <span className="text-[11px] text-slate-400">{t.company}</span>}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {t.dueDate ? (
                          <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                            <CalIcon size={12} />
                            {medDate(t.dueDate)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <Assignees ids={t.assignees} max={3} size={22} />
                      </div>
                    </div>
                  </Fragment>
                )
              })}

              {/* Drop indicator at the end of the column */}
              {isOver && drop.beforeId === null && colTasks.length > 0 && <Indicator />}

              {colTasks.length === 0 && (
                <div
                  className={`rounded-lg border border-dashed py-8 text-center text-xs ${
                    isOver ? 'border-brand-300 text-brand-500' : 'border-slate-300 text-slate-400'
                  }`}
                >
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Mobile: status tabs + cards + tap-to-move ---------- */
function MobileKanban({ tasks, openNewTask, openEditTask, moveTask }) {
  const [status, setStatus] = useState(STATUSES[0].key)
  const [moveTarget, setMoveTarget] = useState(null)
  const colTasks = tasks.filter((t) => t.status === status)
  const label = STATUSES.find((s) => s.key === status)?.label

  return (
    <div className="space-y-3">
      {/* Status tabs — stay pinned while the card list scrolls */}
      <div className="sticky top-0 z-10 -mx-3 -mt-4 flex gap-2 overflow-x-auto bg-slate-50 px-3 pb-2 pt-4">
        {STATUSES.map((s) => {
          const count = tasks.filter((t) => t.status === s.key).length
          const active = s.key === status
          return (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${TONE[s.tone].dot}`} />
              {s.label}
              <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-brand-100' : 'bg-slate-100'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => openNewTask({ status })}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500"
      >
        <Plus size={16} /> Add to {label}
      </button>

      <div className="grid gap-2 sm:grid-cols-2">
        {colTasks.map((t) => {
          const pm = priorityMeta(t.priority)
          const overdue = isOverdue(t)
          return (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => openEditTask(t)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-slate-800">{t.title}</p>
                </button>
                <Badge tone={pm.tone}>{pm.label}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {t.dueDate && (
                    <span className={`inline-flex items-center gap-1 ${overdue ? 'text-rose-600' : ''}`}>
                      <CalIcon size={12} /> {medDate(t.dueDate)}
                    </span>
                  )}
                  <Assignees ids={t.assignees} max={3} size={20} />
                </div>
                <button
                  onClick={() => setMoveTarget(t)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
                >
                  <ArrowRightLeft size={13} /> Move
                </button>
              </div>
            </div>
          )
        })}
        {colTasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400 sm:col-span-2">
            No tasks in {label}.
          </div>
        )}
      </div>

      <ActionSheet open={!!moveTarget} title="Move to…" onClose={() => setMoveTarget(null)}>
        <div className="space-y-1.5">
          {STATUSES.map((s) => {
            const current = moveTarget?.status === s.key
            return (
              <button
                key={s.key}
                disabled={current}
                onClick={() => {
                  moveTask(moveTarget.id, s.key)
                  setMoveTarget(null)
                  setStatus(s.key)
                }}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium ${
                  current ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-slate-200 text-slate-700'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${TONE[s.tone].dot}`} />
                {s.label}
                {current && <span className="ml-auto text-xs">current</span>}
              </button>
            )
          })}
        </div>
      </ActionSheet>
    </div>
  )
}
