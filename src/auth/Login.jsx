import { Boxes } from 'lucide-react'
import AccessCodeForm from './AccessCodeForm'

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Boxes size={26} />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Operations Task Hub</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your access code to continue</p>

        <div className="mt-6 text-left">
          <AccessCodeForm autoFocus />
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Don't have a code? Ask your administrator.
        </p>
      </div>
    </div>
  )
}
