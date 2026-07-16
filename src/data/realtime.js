import { createClient } from '@supabase/supabase-js'

// Instant cross-client updates, without weakening the security model.
//
// The database stays locked behind the Edge Function (RLS denies direct access),
// so we can't stream row changes to the browser — that would require giving the
// public anon key read access to the tables. Instead, whoever makes a change
// broadcasts a bare "something changed" ping on a Realtime channel; everyone
// else refetches through the Edge Function, which still validates the access
// code. The ping carries NO task data, so the channel being reachable with the
// public key leaks nothing.
const URL = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
const TOPIC = 'arete-hub-changes'
const EVENT = 'changed'

let channel = null
const listeners = new Set()

// One shared channel for the app's lifetime, created on first use.
function ensure() {
  if (channel) return channel
  if (!URL || !ANON) return null
  const client = createClient(URL, ANON, {
    // Realtime only — never touch auth storage (we use access codes, not GoTrue).
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'arete-realtime' },
    realtime: { params: { eventsPerSecond: 5 } },
  })
  channel = client.channel(TOPIC)
  channel.on('broadcast', { event: EVENT }, () => {
    for (const cb of listeners) cb()
  })
  channel.subscribe()
  return channel
}

// Listen for other clients' changes. Returns an unsubscribe function.
export function subscribeToChanges(cb) {
  if (!ensure()) return () => {}
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// Tell everyone else to refetch. Debounced, so a burst of writes (e.g. creating
// a recurring series) collapses into a single ping once the last one lands.
let timer = null
export function notifyChange() {
  const ch = ensure()
  if (!ch) return
  clearTimeout(timer)
  timer = setTimeout(async () => {
    try {
      await ch.send({ type: 'broadcast', event: EVENT, payload: {} })
    } catch {
      // Best-effort: if the ping fails, the periodic poll still catches up.
    }
  }, 120)
}
