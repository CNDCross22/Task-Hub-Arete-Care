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

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Hide other people's access codes from non-admins.
const stripCode = (m: Record<string, unknown>) => {
  const { accessCode: _omit, ...rest } = m
  return rest
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Bad JSON' }, 400)
  }

  const { code, action, collection, id, item, patch, items } = payload || {}

  // --- Authenticate the caller by access code ---
  const accessCode = String(code || '').trim()
  if (!accessCode) return json({ error: 'Missing access code' }, 401)

  const { data: caller, error: cErr } = await admin
    .from('members')
    .select('*')
    .eq('accessCode', accessCode)
    .eq('active', true)
    .maybeSingle()
  if (cErr) return json({ error: cErr.message }, 500)
  if (!caller) return json({ error: 'Invalid or inactive access code' }, 401)

  const isAdmin = caller.role === 'admin'
  // Managing people requires admin.
  const needsAdmin = collection === 'members'
  const guard = () => needsAdmin && !isAdmin

  try {
    switch (action) {
      case 'login':
        return json({ member: caller })

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
        const members = (mem.error ? [] : mem.data || []).map((m) => (isAdmin ? m : stripCode(m)))
        return json({ projects: proj.data || [], tasks: task.data || [], members })
      }

      case 'create': {
        if (guard()) return json({ error: 'Admin only' }, 403)
        const { error } = await admin.from(collection).insert(item)
        if (error) throw error
        return json({ ok: true })
      }

      case 'update': {
        if (guard()) return json({ error: 'Admin only' }, 403)
        const { error } = await admin.from(collection).update(patch).eq('id', id)
        if (error) throw error
        return json({ ok: true })
      }

      case 'remove': {
        if (guard()) return json({ error: 'Admin only' }, 403)
        const { error } = await admin.from(collection).delete().eq('id', id)
        if (error) throw error
        return json({ ok: true })
      }

      case 'replace': {
        if (guard()) return json({ error: 'Admin only' }, 403)
        const rows = collection === 'tasks' ? items.map((it: any, i: number) => ({ ...it, sortIndex: i })) : items
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
