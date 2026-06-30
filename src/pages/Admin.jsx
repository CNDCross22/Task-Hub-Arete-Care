import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, UserPlus, Trash2, RefreshCw, Copy, Check, Lock, AlertTriangle } from 'lucide-react'
import { useData } from '@/data/store'
import { useAuth } from '@/auth/AuthProvider'
import { DEPARTMENTS } from '@/data/config'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const genCode = () =>
  'ARETE-' + Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')

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
    if (members.some((m) => m.accessCode === form.accessCode.trim()))
      return setError('That access code is already in use.')
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
    <div className="max-w-4xl space-y-6">
      {/* Add person */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <UserPlus size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Add Person</h3>
            <p className="text-xs text-slate-500">They sign in with the access code you set.</p>
          </div>
        </div>

        <form onSubmit={addPerson} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Full name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:col-span-2"
          />
          <select
            value={form.department}
            onChange={(e) => set('department', e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:col-span-3"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:col-span-2"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex items-center gap-1 sm:col-span-3">
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

      {/* People list */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
                all={members}
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

      <p className="text-center text-xs text-slate-400">
        Access codes are how people sign in. Keep them private; regenerate any that leak.
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

function MemberRow({ m, all, isSelf, onUpdate, onRemove }) {
  const [name, setName] = useState(m.name)
  const [code, setCode] = useState(m.accessCode)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  // Re-sync drafts if the underlying record changes.
  useEffect(() => {
    setName(m.name)
    setCode(m.accessCode)
  }, [m.name, m.accessCode])

  const saveName = () => {
    const v = name.trim()
    if (!v) return setName(m.name)
    if (v !== m.name) onUpdate(m.id, { name: v })
  }

  const saveCode = () => {
    const v = code.trim()
    if (!v) return setErr('Code required')
    if (v === m.accessCode) return setErr('')
    if (all.some((x) => x.id !== m.id && x.accessCode === v)) return setErr('Code already in use')
    setErr('')
    onUpdate(m.id, { accessCode: v })
  }

  const copy = () => {
    navigator.clipboard?.writeText(m.accessCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
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
            className="w-40 rounded border border-transparent px-1.5 py-1 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-brand-400 focus:bg-white focus:outline-none"
          />
          {isSelf && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">You</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <select
          value={m.role}
          onChange={(e) => onUpdate(m.id, { role: e.target.value })}
          disabled={isSelf}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs capitalize outline-none focus:border-brand-400 disabled:opacity-60"
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <select
          value={m.department || ''}
          onChange={(e) => onUpdate(m.id, { department: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand-400"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={saveCode}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className={`w-32 rounded border px-2 py-1 font-mono text-xs outline-none focus:ring-2 focus:ring-brand-100 ${
              err ? 'border-rose-300 bg-rose-50' : 'border-slate-200 focus:border-brand-400'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              const taken = new Set(all.filter((x) => x.id !== m.id).map((x) => x.accessCode))
              let next = genCode()
              while (taken.has(next)) next = genCode()
              setCode(next)
              setErr('')
              onUpdate(m.id, { accessCode: next })
            }}
            title="Generate new code"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <RefreshCw size={14} />
          </button>
          <button onClick={copy} title="Copy" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        {err && <p className="mt-1 text-[11px] text-rose-600">{err}</p>}
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
