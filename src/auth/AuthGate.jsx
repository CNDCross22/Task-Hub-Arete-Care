import { useAuth } from './AuthProvider'
import Login from './Login'

// Login required & no member signed in -> Login screen. Otherwise the app.
export default function AuthGate({ children }) {
  const { requireAuth, member } = useAuth()
  if (requireAuth && !member) return <Login />
  return children
}
