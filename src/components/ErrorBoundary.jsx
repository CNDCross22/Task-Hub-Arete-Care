import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Catches render-time errors anywhere below it so one bad record can't leave the
// user staring at a blank white page. Reloading re-runs the whole app cleanly.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface for debugging; in a larger app this would go to an error reporter.
    console.error('App crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <AlertTriangle size={24} />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800">Something went wrong</p>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            The app hit an unexpected error and stopped. Reloading usually fixes it.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <RefreshCw size={16} />
          Reload
        </button>
      </div>
    )
  }
}
