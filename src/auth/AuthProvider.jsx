import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasSupabaseConfig } from '@/data/backend/supabaseClient'
import { hasEdgeConfig, loginWithCode } from '@/data/backend/edgeBackend'

const AuthContext = createContext(null)
const SESSION_KEY = 'arete-session'

// Login is enforced only when Supabase is configured AND the flag is on.
// Keeping the flag off lets the app stay usable while access codes are set up.
const requireAuth = hasSupabaseConfig && import.meta.env.VITE_REQUIRE_LOGIN === 'true'

const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [member, setMember] = useState(loadSession)

  // Re-validate the stored member against the table (catches deactivation /
  // deletion / role change since last login). Runs quietly in the background.
  useEffect(() => {
    const stored = loadSession()
    if (!stored) return
    let active = true

    // Re-validate the stored session against the source of truth.
    const revalidate = hasEdgeConfig
      ? loginWithCode(stored.accessCode).catch(() => null)
      : supabase
        ? supabase.from('members').select('*').eq('id', stored.id).maybeSingle().then(({ data }) => data)
        : Promise.resolve(stored)

    Promise.resolve(revalidate).then((data) => {
      if (!active) return
      if (data && data.active !== false) {
        setMember(data)
        localStorage.setItem(SESSION_KEY, JSON.stringify(data))
      } else {
        localStorage.removeItem(SESSION_KEY)
        setMember(null)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const signInWithCode = async (code) => {
    const trimmed = (code || '').trim()
    if (!trimmed) throw new Error('Enter your access code.')

    let data
    if (hasEdgeConfig) {
      data = await loginWithCode(trimmed)
      if (!data) throw new Error('Invalid or inactive access code.')
    } else {
      if (!supabase) throw new Error('Sign-in requires the Supabase connection.')
      const res = await supabase
        .from('members')
        .select('*')
        .eq('accessCode', trimmed)
        .eq('active', true)
        .maybeSingle()
      if (res.error) throw new Error('Could not verify the code. Is the members table set up?')
      if (!res.data) throw new Error('Invalid or inactive access code.')
      data = res.data
    }

    // Keep the code in the session so edge requests can re-send it.
    const session = { ...data, accessCode: trimmed }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setMember(session)
    return session
  }

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY)
    setMember(null)
  }

  const value = {
    enabled: hasSupabaseConfig,
    requireAuth,
    member,
    isAdmin: member?.role === 'admin',
    signInWithCode,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export const memberName = (m) => m?.name || 'Account'

export const memberInitials = (m) => {
  const name = memberName(m)
  const parts = name.trim().split(/\s+/)
  return (
    ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() ||
    name.slice(0, 2).toUpperCase()
  )
}
