import { createContext, useContext, useState, type ReactNode } from 'react'
import type { SessionUser } from './data/types'

interface SessionValue {
  user: SessionUser | null
  signIn: (u: SessionUser) => void
  signOut: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

function load(): SessionUser | null {
  try {
    const raw = localStorage.getItem('sf.session')
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(load)
  const signIn = (u: SessionUser) => {
    setUser(u)
    try { localStorage.setItem('sf.session', JSON.stringify(u)) } catch { /* keep in memory only */ }
  }
  const signOut = () => {
    setUser(null)
    try { localStorage.removeItem('sf.session') } catch { /* nothing stored */ }
  }
  return <SessionContext.Provider value={{ user, signIn, signOut }}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
