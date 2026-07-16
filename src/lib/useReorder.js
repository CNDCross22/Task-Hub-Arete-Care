import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Drag-to-reorder for a vertical list that sits happily alongside other controls
// (row click, the arrow buttons). As you drag a row over another, the list
// reorders live so the rest shift out of the way, and those shifts are
// FLIP-animated. On drop, `onCommit(newIds, movedId)` fires — only if the order
// actually changed.
//
// Two things keep it from jittering:
//  1. Directional midpoint hysteresis — a row is only crossed once the pointer
//     passes its middle in the direction of travel, so hovering a boundary can't
//     ping-pong the order back and forth.
//  2. Interruption-safe FLIP — transforms are cleared before measuring, and only
//     one animation frame is ever pending, so a fast drag can't stack half-done
//     animations on top of each other.
//
// `ids`      committed order of the group (from data).
// `onCommit` persist the new order.
// `groupOf`  optional: restrict dragging to items in the same group (e.g. status).
export function useReorder(ids, onCommit, groupOf) {
  const [order, setOrder] = useState(ids)
  const [dragId, setDragId] = useState(null)
  const dragging = useRef(false)
  const els = useRef(new Map()) // id -> element
  const refFns = useRef(new Map()) // id -> stable ref callback (no churn between renders)
  const firstTops = useRef(null) // id -> top before a reorder (for FLIP)
  const raf = useRef(0)

  // Adopt the committed order whenever it changes and we're not mid-drag
  // (data refresh, an arrow move, a rolled-back save).
  const key = ids.join('|')
  useEffect(() => {
    if (!dragging.current) setOrder(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // FLIP: after the order changes, jump each moved row back to where it visually
  // was and let it transition to its settled spot.
  useLayoutEffect(() => {
    const firsts = firstTops.current
    if (!firsts) return
    firstTops.current = null
    const moved = []
    for (const [id, el] of els.current) {
      const before = firsts.get(id)
      if (before == null) continue
      // Clear any in-flight animation so we read the *settled* layout position,
      // not a transformed mid-animation one (that was the source of the jitter).
      el.style.transition = 'none'
      el.style.transform = ''
      const delta = before - el.getBoundingClientRect().top
      if (delta) {
        el.style.transform = `translateY(${delta}px)`
        moved.push(el)
      }
    }
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      for (const el of moved) {
        el.style.transition = 'transform 150ms ease'
        el.style.transform = ''
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

  const measure = () => {
    const tops = new Map()
    for (const [id, el] of els.current) tops.set(id, el.getBoundingClientRect().top)
    firstTops.current = tops
  }

  const reorderOver = (overId, clientY) => {
    if (!dragId || overId === dragId) return
    if (groupOf && groupOf(overId) !== groupOf(dragId)) return // stay within the group
    const from = order.indexOf(dragId)
    const to = order.indexOf(overId)
    if (from === -1 || to === -1 || from === to) return

    // Hysteresis: only move once the pointer crosses the target's midpoint in
    // the direction we're dragging. Without this, the swap immediately puts a
    // new row under the cursor and the order oscillates.
    const el = els.current.get(overId)
    if (el) {
      const rect = el.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      const movingDown = to > from
      if (movingDown ? clientY < midpoint : clientY > midpoint) return
    }

    measure()
    const next = order.slice()
    next.splice(from, 1)
    next.splice(to, 0, dragId)
    setOrder(next)
  }

  const finish = () => {
    dragging.current = false
    const moved = dragId
    setDragId(null)
    if (moved && order.join('|') !== ids.join('|')) onCommit(order, moved)
  }

  const getRef = (id) => {
    let fn = refFns.current.get(id)
    if (!fn) {
      fn = (el) => {
        if (el) els.current.set(id, el)
        else els.current.delete(id)
      }
      refFns.current.set(id, fn)
    }
    return fn
  }

  // Spread onto each draggable row. `id` is that row's task id.
  const dragProps = (id) => ({
    ref: getRef(id),
    draggable: true,
    onDragStart: (e) => {
      dragging.current = true
      setDragId(id)
      e.dataTransfer.effectAllowed = 'move'
      try {
        e.dataTransfer.setData('text/plain', id)
      } catch {
        /* some browsers require a set; ignore if it throws */
      }
    },
    onDragEnter: (e) => e.preventDefault(),
    onDragOver: (e) => {
      e.preventDefault()
      reorderOver(id, e.clientY)
    },
    onDragEnd: finish,
    onDrop: (e) => {
      e.preventDefault()
      finish()
    },
  })

  return { order, dragId, dragProps }
}
