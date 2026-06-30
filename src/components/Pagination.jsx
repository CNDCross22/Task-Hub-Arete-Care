import { ChevronLeft, ChevronRight } from 'lucide-react'

// Page-number list with ellipses, e.g. 1 … 4 5 6 … 20
function pageList(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const out = [1]
  if (page > 3) out.push('…')
  for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) out.push(i)
  if (page < pageCount - 2) out.push('…')
  out.push(pageCount)
  return out
}

const SIZES = [10, 25, 50, 100]

export default function Pagination({ page, pageCount, total, pageSize, onPage, onPageSize }) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <span>
          Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
          <span className="font-medium text-slate-700">{total}</span>
        </span>
        {onPageSize && (
          <>
            <span className="text-slate-300">·</span>
            <label className="flex items-center gap-1.5">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-400"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft size={16} />
          </button>

          {pageList(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1.5 text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`h-8 min-w-[32px] rounded-lg px-2 text-sm font-medium transition-colors ${
                  p === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => onPage(page + 1)}
            disabled={page === pageCount}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
