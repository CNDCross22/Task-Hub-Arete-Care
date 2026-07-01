import { Fragment, useState } from 'react'
import { Plus, Calendar as CalIcon } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, priorityMeta, TONE } from '@/data/config'
import Badge from '@/components/Badge'
import Assignees from '@/components/Assignees'
import { isOverdue, medDate } from '@/lib/dates'

export default function Kanban() {
  const { tasks, reorderTask, openNewTask, openEditTask, loading } = useData()
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
