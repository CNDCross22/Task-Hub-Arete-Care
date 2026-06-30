import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Both env vars present → the app talks to Supabase instead of localStorage.
export const hasSupabaseConfig = Boolean(url && anon)

export const supabase = hasSupabaseConfig ? createClient(url, anon) : null
