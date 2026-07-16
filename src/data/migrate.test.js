import { describe, it, expect } from 'vitest'

// Mirrors the Edge Function's `replace` contract for tasks:
//   items.map((it, i) => ({ ...it, sortIndex: i }))
// i.e. it re-stamps EVERY row's sortIndex by array position. That's why the
// load-time back-fill must not go through replace().
const replaceContract = (items) => items.map((it, i) => ({ ...it, sortIndex: i }))

// The back-fill decision, extracted from migrateTasks so it can be pinned down.
const needsBackfill = (t) => {
  if (t.status === 'completed' && !t.completedAt) return Boolean(t.dueDate || t.createdAt)
  return false
}

describe('load-time back-fill', () => {
  it('replace() would clobber a just-saved reorder — so we must not use it', () => {
    // What the server holds right after someone nudged a task to 13.5.
    const saved = [
      { id: 'b', sortIndex: 13 },
      { id: 'a', sortIndex: 13.5 },
      { id: 'c', sortIndex: 14 },
    ]
    // A stale in-flight back-fill built from the pre-reorder snapshot.
    const stale = [
      { id: 'a', sortIndex: 13 },
      { id: 'b', sortIndex: 13.5 },
      { id: 'c', sortIndex: 14 },
    ]
    const written = replaceContract(stale)
    // The reorder is silently undone: 'a' is back above 'b'.
    expect(written.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(written.find((r) => r.id === 'a').sortIndex).toBe(0)
    expect(saved.find((r) => r.id === 'a').sortIndex).toBe(13.5)
  })

  it('a completed task with no dates does not mark the migration dirty forever', () => {
    // Would otherwise set completedAt = undefined, never persist, and re-run
    // the back-fill on every single load.
    expect(needsBackfill({ status: 'completed' })).toBe(false)
    expect(needsBackfill({ status: 'completed', dueDate: '2026-01-01' })).toBe(true)
    expect(needsBackfill({ status: 'completed', createdAt: '2026-01-01' })).toBe(true)
    expect(needsBackfill({ status: 'completed', completedAt: '2026-01-01' })).toBe(false)
    expect(needsBackfill({ status: 'pending' })).toBe(false)
  })
})
