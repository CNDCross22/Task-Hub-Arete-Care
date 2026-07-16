import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Drag-to-reorder for a vertical list that sits happily alongside other controls
// (row click, the arrow buttons). As you drag a row over another, the list
// reorders live so the rest shift out of the way, and those shifts are
// FLIP-animated. On drop, `onCommit(newIds, movedId)` fires — only if the order
// actually changed.
//
// `ids`      committed order of the group (from data).
// `onCommit` persist the new order.
// `groupOf`  optional: restrict dragging to items in the same group (e.g. status),
//            so a task can't be dragged out of its status section.
export function useReorder(ids, onCommit, groupOf) {
  const [order, setOrder] = useState(ids)
  const [dragId, setDragId] = useState(null)
  const dragging = useRef(false)
  const els = useRef(new Map()) // id -> element, for FLIP measurement
  const firstTops = useRef(null) // id -> top before a reorder

  // Adopt the committed order whenever it changes and we're not mid-drag
  // (data refresh, an arrow move, a rolled-back save).
  const key = ids.join('|')
  useEffect(() => {
    if (!dragging.current) setOrder(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // FLIP: after the order changes, jump each moved row back to where it was and
  // let it transition to its new spot.
  useLayoutEffect(() => {
    const firsts = firstTops.current
    if (!firsts) return
    firstTops.current = null
    for (const [id, el] of els.current) {
      const before = firsts.get(id)
      if (before == null) continue
      const delta = before - el.getBoundingClientRect().top
      if (!delta) continue
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 160ms ease'
        el.style.transform = ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

  const measure = () => {
    const tops = new Map()
    for (const [id, el] of els.current) tops.set(id, el.getBoundingClientRect().top)
    firstTops.current = tops
  }

  const reorderOver = (overId) => {
    if (!dragId || overId === dragId) return
    if (groupOf && groupOf(overId) !== groupOf(dragId)) return // stay within the group
    const from = order.indexOf(dragId)
    const to = order.indexOf(overId)
    if (from === -1 || to === -1 || from === to) return
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

  // Spread onto each draggable row. `id` is that row's task id.
  const dragProps = (id) => ({
    ref: (el) => {
      if (el) els.current.set(id, el)
      else els.current.delete(id)
    },
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
      reorderOver(id)
    },
    onDragEnd: finish,
    onDrop: (e) => {
      e.preventDefault()
      finish()
    },
  })

  return { order, dragId, dragProps }
}
