import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useAnimatedPresence } from '@/lib/useAnimatedPresence'

// A bottom sheet for touch actions (e.g. tap-to-move). Backdrop click closes.
export default function ActionSheet({ open, title, onClose, children }) {
  const { render, closing } = useAnimatedPresence(!!open)
  if (!render) return null
  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[70] bg-slate-900/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[71] max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl ${
          closing ? 'animate-sheet-down' : 'animate-sheet-up'
        }`}
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body,
  )
}
