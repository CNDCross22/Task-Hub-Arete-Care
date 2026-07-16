import { ChevronUp, ChevronDown } from 'lucide-react'

// Reordering without drag-and-drop: nudge a row up or down one slot within its
// own group. Stops propagation so it never opens the row's task editor.
// `compact` is for dense table rows; the default size suits cards and touch.
export default function OrderArrows({ canUp, canDown, onUp, onDown, compact = false }) {
  const cls = `rounded ${
    compact ? 'p-0.5' : 'p-1.5'
  } text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400`
  const press = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }
  return (
    // draggable=false so pressing an arrow inside a draggable row never starts a drag
    <span draggable={false} className="flex shrink-0 flex-col leading-none">
      <button type="button" onClick={press(onUp)} disabled={!canUp} className={cls} title="Move up">
        <ChevronUp size={compact ? 13 : 16} />
      </button>
      <button type="button" onClick={press(onDown)} disabled={!canDown} className={cls} title="Move down">
        <ChevronDown size={compact ? 13 : 16} />
      </button>
    </span>
  )
}
