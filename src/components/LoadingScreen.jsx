import { Loader2, WifiOff, RefreshCw } from 'lucide-react'

// Full-screen state shown before the app shell renders: a branded spinner while
// the initial data fetch is in flight, or an error + retry if it failed.
export default function LoadingScreen({ label = 'Loading your workspace…', error = null, onRetry }) {
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <WifiOff size={24} />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800">Couldn’t load your workspace</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {error.message || 'Something went wrong reaching the server.'} Check your connection and try again.
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-200">
        <Loader2 size={24} className="animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}
