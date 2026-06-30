import { Check, ChevronDown } from 'lucide-react'
import Popover from './Popover'

// Custom animated single-select dropdown (replaces native <select>).
//   options: [{ value, label }]
export default function Select({ value, onChange, options, placeholder = 'Select', size = 'md' }) {
  const current = options.find((o) => o.value === value)
  const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'

  return (
    <Popover
      renderTrigger={({ open, isOpen }) => (
        <button
          type="button"
          onClick={open}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white text-left outline-none hover:border-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${pad}`}
        >
          <span className={`truncate ${current ? 'text-slate-800' : 'text-slate-400'}`}>
            {current ? current.label : placeholder}
          </span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                close()
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                o.value === value ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}
