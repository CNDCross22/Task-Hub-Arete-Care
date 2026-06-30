import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

// Lightweight global toast system. Mount <ToastProvider> high in the tree and
// call useToast() anywhere: toast.success('Saved'), toast.error('Failed'), …
const ToastContext = createContext(null)

const META = {
  success: { icon: CheckCircle2, accent: 'text-emerald-500' },
  error: { icon: AlertCircle, accent: 'text-rose-500' },
  info: { icon: Info, accent: 'text-brand-500' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
    // Fade out first, then unmount.
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 160)
  }, [])

  const notify = useCallback(
    (message, type = 'info', duration) => {
      const id = ++idRef.current
      const ms = duration ?? (type === 'error' ? 5000 : 2800)
      setToasts((list) => [...list, { id, message, type }])
      if (ms > 0) timers.current[id] = window.setTimeout(() => dismiss(id), ms)
      return id
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      notify,
      success: (m, d) => notify(m, 'success', d),
      error: (m, d) => notify(m, 'error', d),
      info: (m, d) => notify(m, 'info', d),
      dismiss,
    }),
    [notify, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(<Toaster toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  )
}

function Toaster({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const meta = META[t.type] || META.info
        const Icon = meta.icon
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg ${
              t.leaving ? 'animate-fade-out' : 'animate-fade-in-up'
            }`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${meta.accent}`} />
            <p className="min-w-0 flex-1 text-sm text-slate-700">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
