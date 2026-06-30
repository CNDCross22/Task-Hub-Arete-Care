import { useState } from 'react'
import { FileText, Loader2, RefreshCw, Sparkles, FileType2, FileDown } from 'lucide-react'
import { useData } from '@/data/store'
import { generateWeeklyReport } from '@/lib/weeklyReport'
import { isAIConfigured } from '@/lib/gemini'
import { parseBlocks, downloadDocx, downloadPdf } from '@/lib/exporters'
import { longDate, workWeekRange } from '@/lib/dates'
import Markdownish from '@/components/Markdownish'

const TITLE = 'IT & Marketing Weekly Report'

export default function WeeklyReport() {
  const { tasks, members } = useData()
  const [week, setWeek] = useState(0) // 0 = this week, -1 = last week
  const [state, setState] = useState({ text: '', loading: false, error: '', range: null })
  const [exporting, setExporting] = useState('')

  const preview = workWeekRange(week)
  const activeRange = state.range || preview
  const subtitle = `Date Covered: ${longDate(activeRange.startKey || activeRange.from)} – ${longDate(
    activeRange.endKey || activeRange.to,
  )}`

  const generate = async () => {
    setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const { text, range } = await generateWeeklyReport(tasks, { offsetWeeks: week, members })
      setState({ text, loading: false, error: '', range })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Something went wrong.' }))
    }
  }

  const handleExport = async (kind) => {
    if (!state.text) return
    setExporting(kind)
    try {
      const blocks = parseBlocks(state.text)
      const stamp = new Date().toISOString().slice(0, 10)
      const payload = { title: TITLE, subtitle, blocks, filename: `weekly-report-${stamp}.${kind}` }
      if (kind === 'docx') await downloadDocx(payload)
      else await downloadPdf(payload)
    } catch (e) {
      setState((s) => ({ ...s, error: `Export failed: ${e.message || e}` }))
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FileText size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Weekly Report</h3>
            <p className="text-xs text-slate-500">A humanized summary of the week's task activity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            {[
              { v: 0, l: 'This Week' },
              { v: -1, l: 'Last Week' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => {
                  if (week !== o.v) {
                    setWeek(o.v)
                    setState({ text: '', loading: false, error: '', range: null })
                  }
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  week === o.v ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          {state.text && !state.loading && (
            <>
              <button
                onClick={() => handleExport('docx')}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {exporting === 'docx' ? <Loader2 size={16} className="animate-spin" /> : <FileType2 size={16} />}
                DOCX
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                PDF
              </button>
            </>
          )}
          <button
            onClick={generate}
            disabled={state.loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {state.loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : state.text ? (
              <RefreshCw size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {state.loading ? 'Writing…' : state.text ? 'Regenerate' : 'Generate Weekly Report'}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {!isAIConfigured() && !state.text && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Add your Gemini API key to <code className="rounded bg-amber-100 px-1">.env.local</code> to enable
            report generation.
          </div>
        )}
        {state.error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{state.error}</div>
        )}
        {state.loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Writing this week's report from {tasks.length} tasks…
          </div>
        )}

        {state.text && !state.loading && (
          /* Document-style preview */
          <div className="mx-auto mt-2 max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">{TITLE}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            <hr className="my-5 border-slate-200" />
            <Markdownish text={state.text} />
          </div>
        )}

        {!state.text && !state.loading && !state.error && isAIConfigured() && (
          <p className="text-sm text-slate-400">
            Generates a report of completed work for{' '}
            <span className="font-medium text-slate-600">
              {longDate(preview.startKey)} – {longDate(preview.endKey)}
            </span>
            , grouped by department, company, and category. Save as DOCX or PDF.
          </p>
        )}
      </div>
    </div>
  )
}
