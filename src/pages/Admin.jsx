import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, UserPlus, Trash2, RefreshCw, Copy, Check, Lock, AlertTriangle, X, KeyRound } from 'lucide-react'
import { useData } from '@/data/store'
import { useAuth } from '@/auth/AuthProvider'
import { DEPARTMENTS } from '@/data/config'
import Select from '@/components/Select'

// Long, crypto-random codes. 15 chars from a 32-symbol alphabet ≈ 32^15
// possibilities, so guessing is infeasible even without the rate limit. (256 is
// a multiple of 32, so `% length` is bias-free.)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const genCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(15))
  const body = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
  return 'ARETE-' + body.replace(/(.{5})(.{5})(.{5})/, '$1-$2-$3')
}

export default function Admin() {
  const { members, createMember, updateMember, removeMember, loading } = useData()
  const { isAdmin, member: me, enabled } = useAuth()

  if (!enabled) {
    return (
      <Locked
        title="Admin needs Supabase"
        body="The admin portal manages cloud-stored people and access codes. Connect Supabase to use it."
      />
    )
  }
  // Non-admins (e.g. after a different user signs in on a leftover /admin URL)
  // are sent to the dashboard rather than shown a dead-end "Admins only" wall.
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <AdminBody members={members} me={me} loading={loading} createMember={createMember} updateMember={updateMember} removeMember={removeMember} />
}

function AdminBody({ members, me, loading, createMember, updateMember, removeMember }) {
  const [form, setForm] = useState({ name: '', department: 'IT', role: 'member', accessCode: genCode() })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addPerson = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Enter a name.')
    if (!form.accessCode.trim()) return setError('Set an access code.')
    // Codes are stored hashed, so the client can't compare them; a duplicate is
    // rejected server-side by the unique index (surfaced as an error toast).
    setBusy(true)
    try {
      await createMember({ ...form, name: form.name.trim(), accessCode: form.accessCode.trim() })
      setForm({ name: '', department: 'IT', role: 'member', accessCode: genCode() })
    } catch (err) {
      setError(err.message || 'Could not add the person.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>

  return (
    <div className="space-y-6">
      {/* Add person */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <UserPlus size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Add Person</h3>
            <p className="text-xs text-slate-500">
              They sign in with the access code you set. Copy it now — it's stored hashed and can't be shown again.
            </p>
          </div>
        </div>

        <form onSubmit={addPerson} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Full name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:col-span-3"
          />
          <div className="sm:col-span-3">
            <Select
              value={form.department}
              onChange={(v) => set('department', v)}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Select
              value={form.role}
              onChange={(v) => set('role', v)}
              options={[
                { value: 'member', label: 'Member' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </div>
          <div className="flex items-center gap-1 sm:col-span-2">
            <input
              value={form.accessCode}
              onChange={(e) => set('accessCode', e.target.value)}
              placeholder="Access code"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={() => set('accessCode', genCode())}
              title="Generate code"
              className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
          >
            Add
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </div>

      {/* People list — table (desktop) */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Dept</th>
              <th className="px-4 py-3">Access Code</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                m={m}
                isSelf={m.id === me?.id}
                onUpdate={updateMember}
                onRemove={removeMember}
              />
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No people yet. Add someone above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* People list — cards (mobile / tablet), two columns on tablet width */}
      <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
        {members.map((m) => (
          <MobileMemberCard
            key={m.id}
            m={m}
            isSelf={m.id === me?.id}
            onUpdate={updateMember}
            onRemove={removeMember}
          />
        ))}
        {members.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400 sm:col-span-2">
            No people yet. Add someone above.
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Access codes are stored hashed, so they can't be shown after creation. Copy a code when you set it; if
        one is forgotten or leaks, just set a new one.
      </p>

      <DangerZone />
    </div>
  )
}

function DangerZone() {
  const { tasks, clearTasks } = useData()
  const [busy, setBusy] = useState(false)

  const onClear = async () => {
    if (!tasks.length) return
    if (!window.confirm(`Delete all ${tasks.length} task(s)? This cannot be undone.`)) return
    setBusy(true)
    try {
      await clearTasks()
    } catch {
      /* error surfaced via toast */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-500" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-rose-700">Clear all tasks</h3>
          <p className="mt-1 text-sm text-rose-600/80">
            Deletes every task in the database — handy during testing to wipe end-user data.
            People and projects are kept. This cannot be undone.
          </p>
        </div>
        <button
          onClick={onClear}
          disabled={busy || tasks.length === 0}
          className="shrink-0 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {busy ? 'Clearing…' : `Clear ${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}

function MemberRow({ m, isSelf, onUpdate, onRemove }) {
  const [name, setName] = useState(m.name)

  // Re-sync the name draft if the underlying record changes.
  useEffect(() => {
    setName(m.name)
  }, [m.name])

  const saveName = () => {
    const v = name.trim()
    if (!v) return setName(m.name)
    if (v !== m.name) onUpdate(m.id, { name: v })
  }

  return (
    <tr className="align-top hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-full min-w-[10rem] rounded border border-transparent px-1.5 py-1 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-brand-400 focus:bg-white focus:outline-none"
          />
          {isSelf && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">You</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="px-2 text-xs capitalize text-slate-500">{m.role}</span>
        ) : (
          <div className="w-28">
            <Select
              size="sm"
              value={m.role}
              onChange={(v) => onUpdate(m.id, { role: v })}
              options={[
                { value: 'member', label: 'member' },
                { value: 'admin', label: 'admin' },
              ]}
            />
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="w-48">
          <Select
            size="sm"
            value={m.department || ''}
            onChange={(v) => onUpdate(m.id, { department: v })}
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <CodeCell m={m} onUpdate={onUpdate} />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onUpdate(m.id, { active: !m.active })}
          disabled={isSelf}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 ${
            m.active ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          title={m.active ? 'Active' : 'Disabled'}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${m.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        {!isSelf && (
          <button
            onClick={() => {
              if (window.confirm(`Remove ${m.name}? They'll lose access.`)) onRemove(m.id)
            }}
            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        )}
      </td>
    </tr>
  )
}

function MobileMemberCard({ m, isSelf, onUpdate, onRemove }) {
  const [name, setName] = useState(m.name)
  useEffect(() => setName(m.name), [m.name])
  const saveName = () => {
    const v = name.trim()
    if (!v) return setName(m.name)
    if (v !== m.name) onUpdate(m.id, { name: v })
  }
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="min-w-0 flex-1 rounded border border-transparent px-1.5 py-1 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-brand-400 focus:bg-white focus:outline-none"
        />
        {isSelf ? (
          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">You</span>
        ) : (
          <button
            onClick={() => {
              if (window.confirm(`Remove ${m.name}? They'll lose access.`)) onRemove(m.id)
            }}
            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Role</p>
          {isSelf ? (
            <p className="px-1 text-sm capitalize text-slate-500">{m.role}</p>
          ) : (
            <Select
              size="sm"
              value={m.role}
              onChange={(v) => onUpdate(m.id, { role: v })}
              options={[
                { value: 'member', label: 'member' },
                { value: 'admin', label: 'admin' },
              ]}
            />
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dept</p>
          <Select
            size="sm"
            value={m.department || ''}
            onChange={(v) => onUpdate(m.id, { department: v })}
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Access code</p>
        <CodeCell m={m} onUpdate={onUpdate} />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdate(m.id, { active: !m.active })}
          disabled={isSelf}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 ${
            m.active ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              m.active ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className="text-xs text-slate-500">{m.active ? 'Active' : 'Disabled'}</span>
      </div>
    </div>
  )
}

// The stored code is a one-way hash, so it can't be displayed. Admins set a new
// code (typed or generated), which is revealed once for copying, then hidden.
function CodeCell({ m, onUpdate }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'edit' | 'shown'
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)

  const start = () => {
    setDraft(genCode())
    setMode('edit')
  }
  const save = async () => {
    const v = draft.trim()
    if (!v) return
    try {
      await onUpdate(m.id, { accessCode: v })
      setMode('shown') // reveal once so it can be copied
    } catch {
      /* error toast surfaced by the store */
    }
  }
  const copy = () => {
    navigator.clipboard?.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  if (mode === 'edit') {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="w-full min-w-[12rem] rounded border border-slate-200 px-2 py-1 font-mono text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <button type="button" onClick={() => setDraft(genCode())} title="Generate" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <RefreshCw size={14} />
        </button>
        <button type="button" onClick={save} className="rounded bg-brand-600 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-700">
          Save
        </button>
        <button type="button" onClick={() => setMode('idle')} title="Cancel" className="rounded p-1 text-slate-400 hover:bg-slate-100">
          <X size={14} />
        </button>
      </div>
    )
  }

  if (mode === 'shown') {
    return (
      <div className="flex items-center gap-1.5">
        <code className="rounded bg-slate-100 px-1.5 py-1 font-mono text-xs text-slate-700">{draft}</code>
        <button type="button" onClick={copy} title="Copy" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
        <span className="text-[10px] font-medium text-amber-600">copy now — hidden after</span>
        <button type="button" onClick={() => { setDraft(''); setMode('idle') }} className="rounded px-1.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-slate-400" title="Codes are stored hashed and can't be shown">
        ••••••••
      </span>
      <button
        type="button"
        onClick={start}
        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        <KeyRound size={12} /> Set code
      </button>
    </div>
  )
}

function Locked({ title, body }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Lock size={24} />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">{body}</p>
    </div>
  )
}
