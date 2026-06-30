import { Construction } from 'lucide-react'

// Temporary scaffold shown until each screen is built from the reference screenshots.
export default function Placeholder({ title, description }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Construction size={24} />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      <p className="mt-6 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
        Awaiting reference screenshot
      </p>
    </div>
  )
}
