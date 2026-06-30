import { Loader2 } from 'lucide-react'

// Full-screen branded loader shown while the initial data fetch is in flight.
export default function LoadingScreen({ label = 'Loading your workspace…' }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-200">
        <Loader2 size={24} className="animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}
