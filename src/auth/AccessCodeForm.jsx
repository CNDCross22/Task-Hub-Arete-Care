import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { useAuth } from './AuthProvider'

// Shared access-code entry form. Used full-width on the Login screen and
// inside the Topbar sign-in dropdown.
export default function AccessCodeForm({ autoFocus = false, onDone }) {
  const { signInWithCode } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithCode(code)
      onDone?.()
    } catch (err) {
      setError(err.message || 'Sign-in failed.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="relative">
        <KeyRound
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          autoFocus={autoFocus}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Checking…' : 'Continue'}
      </button>
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{error}</p>
      )}
    </form>
  )
}
