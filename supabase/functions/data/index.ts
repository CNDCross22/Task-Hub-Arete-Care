// Secure data gateway for the Arete Task Hub.
//
// The browser never touches the database directly. It calls this function with
// an access code; the function validates the code and performs the operation
// using the SERVICE ROLE key (server-side only, bypasses RLS). With RLS enabled
// on the tables, the public publishable key is useless on its own.
//
// Deploy:  supabase functions deploy data --no-verify-jwt
// (we do our own auth via the access code, not Supabase Auth JWTs)
//
// Secret needed for the AI proxy (Dashboard → Edge Functions → Secrets, or
// `supabase secrets set GEMINI_API_KEY=...`):  GEMINI_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS: echo the request Origin only if it's a known app origin, else fall back
// to the production site so other origins get a mismatch and are blocked.
const ALLOWED_ORIGINS = new Set([
  'https://cndcross22.github.io', // GitHub Pages (production)
  'http://localhost:5173', // Vite dev
  'http://localhost:4173', // Vite preview
])
const corsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') || ''
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://cndcross22.github.io'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

// Brute-force throttle on FAILED access-code attempts, keyed by client IP. State
// lives in a shared DB table (auth_throttle) so it works across ALL function
// isolates (an in-memory counter doesn't — Supabase spreads requests around).
// Only failed auths count, so legitimate users are never throttled.
const RL_WINDOW_MS = 60_000
const RL_MAX_FAILS = 10
const clientIp = (req: Request) =>
  (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'

// Only these tables may ever be addressed by the client. Without this, the
// caller-supplied `collection` would flow straight into admin.from(collection),
// letting any member read/write arbitrary tables the service role can reach.
const ALLOWED_COLLECTIONS = new Set(['projects', 'tasks', 'members'])

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const throttleExpired = (windowStart: string) =>
  Date.now() - new Date(windowStart).getTime() > RL_WINDOW_MS

// True if this IP has hit the failed-attempt cap within the current window.
async function isThrottled(ip: string): Promise<boolean> {
  const { data } = await admin.from('auth_throttle').select('fails, window_start').eq('ip', ip).maybeSingle()
  if (!data || throttleExpired(data.window_start)) return false
  return data.fails >= RL_MAX_FAILS
}

// Count one failed attempt for this IP (starting a fresh window if needed).
async function recordFail(ip: string): Promise<void> {
  const { data } = await admin.from('auth_throttle').select('fails, window_start').eq('ip', ip).maybeSingle()
  if (!data || throttleExpired(data.window_start)) {
    await admin.from('auth_throttle').upsert({ ip, fails: 1, window_start: new Date().toISOString() })
  } else {
    await admin.from('auth_throttle').update({ fails: data.fails + 1 }).eq('ip', ip)
  }
}

// Access codes are stored only as a keyed hash. HMAC-SHA256(code, pepper) → hex,
// the same algorithm pgcrypto used for the backfill, so a typed code hashes to
// the stored value at login. The pepper is a server-only secret, so a DB leak
// reveals nothing usable.
const PEPPER = Deno.env.get('ACCESS_CODE_PEPPER') || ''
const te = new TextEncoder()
async function hashCode(code: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', te.encode(PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, te.encode(code))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// If a members payload carries a plain accessCode, store only its hash.
async function withHashedCode<T extends Record<string, any>>(obj: T): Promise<T> {
  if (obj && typeof obj === 'object' && obj.accessCode) {
    const { accessCode: _c, ...rest } = obj
    return { ...rest, accessCodeHash: await hashCode(String(obj.accessCode)) } as T
  }
  return obj
}

// Never return the code or its hash to any client.
const stripSecret = (m: Record<string, unknown>) => {
  const { accessCode: _c, accessCodeHash: _h, ...rest } = m
  return rest
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Throttle IPs that have recently failed auth too many times.
  const ip = clientIp(req)
  if (await isThrottled(ip)) return json({ error: 'Too many attempts. Please wait a minute and try again.' }, 429)

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }

  const { code, action, collection, id, item, patch, items } = payload || {}

  // --- Authenticate the caller by hashed access code ---
  const accessCode = String(code || '').trim()
  if (!accessCode) return json({ error: 'Missing access code' }, 401)

  const codeHash = await hashCode(accessCode)
  let caller: any = null
  let cErr: any = null
  {
    const r = await admin.from('members').select('*').eq('accessCodeHash', codeHash).eq('active', true).maybeSingle()
    caller = r.data
    cErr = r.error
  }
  // Transitional fallback: a row not yet hashed still matches by plaintext.
  if (!cErr && !caller) {
    const r = await admin.from('members').select('*').eq('accessCode', accessCode).eq('active', true).maybeSingle()
    caller = r.data
    cErr = r.error
  }
  if (cErr) return json({ error: cErr.message }, 500)
  if (!caller) {
    await recordFail(ip) // count the bad code toward this IP's throttle
    return json({ error: 'Invalid or inactive access code' }, 401)
  }

  const isAdmin = caller.role === 'admin'
  // Managing people requires admin.
  const needsAdmin = collection === 'members'
  const guard = () => needsAdmin && !isAdmin
  // Reject any collection that isn't an explicitly allowed table.
  const badCollection = () => !ALLOWED_COLLECTIONS.has(collection)

  try {
    switch (action) {
      case 'login':
        return json({ member: stripSecret(caller) })

      case 'getAll': {
        const [proj, task, mem] = await Promise.all([
          admin.from('projects').select('*').order('name'),
          admin
            .from('tasks')
            .select('*')
            .order('sortIndex', { ascending: true, nullsFirst: true })
            .order('createdAt', { ascending: false }),
          admin.from('members').select('*').order('name'),
        ])
        if (proj.error) throw proj.error
        if (task.error) throw task.error
        const members = (mem.error ? [] : mem.data || []).map(stripSecret)
        return json({ projects: proj.data || [], tasks: task.data || [], members })
      }

      case 'create': {
        if (badCollection()) return json({ error: 'Unknown collection' }, 400)
        if (guard()) return json({ error: 'Admin only' }, 403)
        if (!item || typeof item !== 'object') return json({ error: 'Invalid item' }, 400)
        const row = collection === 'members' ? await withHashedCode(item) : item
        const { error } = await admin.from(collection).insert(row)
        if (error) throw error
        return json({ ok: true })
      }

      case 'createMany': {
        if (badCollection()) return json({ error: 'Unknown collection' }, 400)
        if (guard()) return json({ error: 'Admin only' }, 403)
        if (!Array.isArray(items) || items.length === 0) return json({ error: 'items must be a non-empty array' }, 400)
        const rows = collection === 'members' ? await Promise.all(items.map(withHashedCode)) : items
        const { error } = await admin.from(collection).insert(rows)
        if (error) throw error
        return json({ ok: true })
      }

      case 'update': {
        if (badCollection()) return json({ error: 'Unknown collection' }, 400)
        if (guard()) return json({ error: 'Admin only' }, 403)
        if (!patch || typeof patch !== 'object') return json({ error: 'Invalid patch' }, 400)
        const p = collection === 'members' ? await withHashedCode(patch) : patch
        const { error } = await admin.from(collection).update(p).eq('id', id)
        if (error) throw error
        return json({ ok: true })
      }

      case 'remove': {
        if (badCollection()) return json({ error: 'Unknown collection' }, 400)
        if (guard()) return json({ error: 'Admin only' }, 403)
        const { error } = await admin.from(collection).delete().eq('id', id)
        if (error) throw error
        return json({ ok: true })
      }

      case 'replace': {
        if (badCollection()) return json({ error: 'Unknown collection' }, 400)
        if (guard()) return json({ error: 'Admin only' }, 403)
        if (!Array.isArray(items)) return json({ error: 'items must be an array' }, 400)
        let rows = collection === 'tasks' ? items.map((it: any, i: number) => ({ ...it, sortIndex: i })) : items
        if (collection === 'members') rows = await Promise.all(rows.map(withHashedCode))
        const { error } = await admin.from(collection).upsert(rows)
        if (error) throw error
        return json({ ok: true })
      }

      case 'ai': {
        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiKey) return json({ error: 'AI is not configured on the server.' }, 500)
        const model = payload.model || 'gemini-2.5-flash'
        const generationConfig: Record<string, unknown> = { temperature: 0.4, maxOutputTokens: 2048 }
        if (String(model).includes('2.5')) generationConfig.thinkingConfig = { thinkingBudget: 0 }

        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
            body: JSON.stringify({ contents: [{ parts: [{ text: payload.prompt }] }], generationConfig }),
          },
        )
        if (!r.ok) {
          let detail = ''
          try {
            detail = (await r.json())?.error?.message || ''
          } catch {
            /* ignore */
          }
          return json({ error: `Gemini error ${r.status}${detail ? `: ${detail}` : ''}` }, 502)
        }
        const d = await r.json()
        const text = d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') || ''
        if (!text) return json({ error: 'Gemini returned no text.' }, 502)
        return json({ text })
      }

      default:
        return json({ error: 'Unknown action' }, 400)
    }
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500)
  }
})
