// Talks to the Supabase Edge Function instead of the database directly.
// Implements the same interface as localBackend / supabaseBackend
// (getAll / create / update / remove / replace) so it's a drop-in swap.
//
// The access code (the caller's credential) is read from the stored session
// and sent with every request; the function validates it server-side.

const URL = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTION_URL = `${URL}/functions/v1/data`
const SESSION_KEY = 'arete-session'

export const hasEdgeConfig = import.meta.env.VITE_USE_EDGE === 'true' && Boolean(URL && ANON)

const currentCode = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))?.accessCode || ''
  } catch {
    return ''
  }
}

async function call(action, body = {}, code) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
    },
    body: JSON.stringify({ code: code ?? currentCode(), action, ...body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export function createEdgeBackend() {
  return {
    async getAll() {
      const { projects, tasks, members } = await call('getAll')
      return { projects: projects || [], tasks: tasks || [], members: members || [] }
    },
    async create(collection, item) {
      await call('create', { collection, item })
      return item
    },
    async update(collection, id, patch) {
      await call('update', { collection, id, patch })
      return { id, ...patch }
    },
    async remove(collection, id) {
      await call('remove', { collection, id })
    },
    async replace(collection, items) {
      await call('replace', { collection, items })
      return items
    },
  }
}

// Auth: validate a code and return the member (used by the login screen).
export async function loginWithCode(code) {
  const { member } = await call('login', {}, code)
  return member
}
