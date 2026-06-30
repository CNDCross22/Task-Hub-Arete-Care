import { useEffect, useState } from 'react'
import { ChevronUp, Trash2, X, Plus } from 'lucide-react'
import { useData } from '@/data/store'
import { STATUSES, PRIORITIES, DEPARTMENTS, COMPANIES, RECURRENCES } from '@/data/config'
import { todayStr } from '@/lib/dates'

const empty = {
  title: '',
  description: '',
  assignees: [],
  department: 'IT',
  company: 'Arete Care',
  priority: 'medium',
  status: 'pending',
  startDate: '',
  dueDate: '',
  startTime: '',
  endTime: '',
  notes: '',
  recurring: false,
  recurrence: 'weekly',
}

export default function TaskModal() {
  const { modal, closeModal, createTask, updateTask, removeTask, members } = useData()
  const [form, setForm] = useState(empty)
  const [closing, setClosing] = useState(false)
  const memberById = (id) => members.find((m) => m.id === id) || null

  const isEdit = modal.mode === 'edit'

  useEffect(() => {
    if (!modal.open) return
    setClosing(false)
    const today = todayStr()
    setForm({ ...empty, startDate: today, dueDate: today, ...(modal.task || {}) })
  }, [modal.open, modal.task])

  if (!modal.open) return null

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Play the exit animation, then actually close.
  const requestClose = () => {
    setClosing(true)
    window.setTimeout(closeModal, 160)
  }

  const addAssignee = (id) => {
    if (!id) return
    setForm((f) => (f.assignees.includes(id) ? f : { ...f, assignees: [...f.assignees, id] }))
  }
  const removeAssignee = (id) =>
    setForm((f) => ({ ...f, assignees: f.assignees.filter((a) => a !== id) }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const payload = { ...form, title: form.title.trim() }
    if (isEdit && form.id) await updateTask(form.id, payload)
    else await createTask(payload)
    requestClose()
  }

  const handleDelete = async () => {
    if (form.id) await removeTask(form.id)
    requestClose()
  }

  // Admins manage the system and aren't assignable — only active members.
  const available = members.filter(
    (m) => m.active !== false && m.role !== 'admin' && !form.assignees.includes(m.id),
  )

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm sm:p-8 ${
        closing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
    >
      <form
        onSubmit={handleSave}
        className={`my-2 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-2 ring-slate-900/80 ${
          closing ? 'animate-scale-out' : 'animate-scale-in'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Task' : 'Create Task'}</h2>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Close"
          >
            <ChevronUp size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pb-2 pt-2">
          {/* Title */}
          <Field label="Task Title" required>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Enter task title"
              className={input}
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Describe the task..."
              className={`${input} resize-y`}
            />
          </Field>

          {/* Assigned To + Department */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Assigned To">
              <div className="rounded-lg border border-slate-300 px-2 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  {form.assignees.map((id) => {
                    const m = memberById(id)
                    if (!m) return null
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2 pr-1 text-xs font-medium text-brand-700"
                      >
                        {m.name}
                        <button
                          type="button"
                          onClick={() => removeAssignee(id)}
                          className="rounded-full p-0.5 hover:bg-brand-100"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )
                  })}
                  <select
                    value=""
                    onChange={(e) => addAssignee(e.target.value)}
                    className="min-w-[7rem] flex-1 bg-transparent py-1 text-sm text-slate-500 outline-none"
                  >
                    <option value="">
                      {form.assignees.length ? 'Add more…' : 'Add assignees...'}
                    </option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Field>

            <Field label="Department" required>
              <Select value={form.department} onChange={(v) => set('department', v)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Company + Priority + Status */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Company" required>
              <Select value={form.company} onChange={(v) => set('company', v)}>
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(v) => set('priority', v)}>
                {PRIORITIES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(v) => set('status', v)}>
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Dates + Times */}
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Field label="Start Date">
              <input type="date" value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} className={input} />
            </Field>
            <Field label="Due Date">
              <input type="date" value={form.dueDate || ''} onChange={(e) => set('dueDate', e.target.value)} className={input} />
            </Field>
            <Field label="Start Time">
              <input type="time" value={form.startTime || ''} onChange={(e) => set('startTime', e.target.value)} className={input} />
            </Field>
            <Field label="End Time">
              <input type="time" value={form.endTime || ''} onChange={(e) => set('endTime', e.target.value)} className={input} />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Additional notes..."
              className={`${input} resize-y`}
            />
          </Field>

          {/* Recurring */}
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Recurring Task</span>
              <Toggle on={form.recurring} onChange={(v) => set('recurring', v)} />
            </div>
            {form.recurring && (
              <div className="mt-3">
                <Select value={form.recurrence} onChange={(v) => set('recurrence', v)}>
                  {RECURRENCES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={16} />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {!isEdit && <Plus size={16} />}
              {isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  )
}

function Select({ value, onChange, children }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${input} bg-white`}>
      {children}
    </select>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? 'bg-brand-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
