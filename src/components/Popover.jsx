import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnimatedPresence } from '@/lib/useAnimatedPresence'

// A popover whose panel is rendered through a portal at fixed coordinates, so
// it is never clipped by a scrolling/overflow parent (e.g. inside the modal).
// Flips above the trigger when there isn't room below.
//
//   <Popover width={264} renderTrigger={({ open }) => <button onClick={open}/>}>
//     {({ close }) => <Panel onSelect={() => close()} />}
//   </Popover>
// width: a number (fixed px) or 'trigger' to match the trigger element's width.
export default function Popover({ renderTrigger, children, width = 'trigger', align = 'left' }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState(null)
  const { render, closing } = useAnimatedPresence(open)

  const place = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const w = typeof width === 'number' ? width : Math.max(r.width, 140)
    const left = Math.max(8, Math.min(align === 'right' ? r.right - w : r.left, window.innerWidth - w - 8))
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < 300 && r.top > spaceBelow
    setStyle(
      openUp
        ? { position: 'fixed', bottom: window.innerHeight - r.top + 6, left, width: w, maxHeight: r.top - 16 }
        : { position: 'fixed', top: r.bottom + 6, left, width: w, maxHeight: spaceBelow - 16 },
    )
  }

  const openIt = () => {
    place()
    setOpen(true)
  }

  return (
    <>
      <span ref={ref} className="block">
        {renderTrigger({ open: openIt, isOpen: open })}
      </span>
      {render &&
        style &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onMouseDown={() => setOpen(false)} />
            <div
              style={style}
              className={`z-[61] origin-top overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl ${
                closing ? 'animate-scale-out' : 'animate-scale-in'
              }`}
            >
              {children({ close: () => setOpen(false) })}
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
