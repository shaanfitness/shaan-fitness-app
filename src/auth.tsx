import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import type { Role, StaffRole } from './db/types'

// Who is signed in, and as what. One login can hold several roles
// (Sabir is owner and coach); the app opens the highest one and lets them switch.
export interface RoleRecord { role: Role; studioId: string; staffId?: string; memberId?: string; name: string }
export interface SessionUser {
  userId: string
  email: string | null
  name: string
  role: Role
  studioId: string
  staffId?: string
  memberId?: string
  roles: RoleRecord[]
}

const PRIORITY: Role[] = ['owner', 'front_desk', 'coach', 'doctor', 'member']

async function loadRoles(userId: string): Promise<RoleRecord[]> {
  // Wait until the client holds the new session's token, so the first reads after signing in
  // aren't sent with the signed-out key.
  await supabase.auth.getSession()
  const [staff, members] = await Promise.all([
    supabase.from('staff').select('id,studio_id,role,full_name,active').eq('user_id', userId).eq('active', true),
    supabase.from('members').select('id,studio_id,full_name').eq('user_id', userId).is('deleted_at', null),
  ])
  if (staff.error) throw staff.error
  if (members.error) throw members.error
  const out: RoleRecord[] = [
    ...(staff.data ?? []).map((s) => ({ role: s.role as StaffRole, studioId: s.studio_id, staffId: s.id, name: s.full_name })),
    ...(members.data ?? []).map((m) => ({ role: 'member' as const, studioId: m.studio_id, memberId: m.id, name: m.full_name })),
  ]
  return out.sort((a, b) => PRIORITY.indexOf(a.role) - PRIORITY.indexOf(b.role))
}

interface AuthValue {
  ready: boolean
  session: Session | null
  user: SessionUser | null
  rolesError: string | null
  noAccess: boolean
  switchRole: (role: Role) => void
  signOut: () => Promise<void>
}
const AuthContext = createContext<AuthValue | null>(null)

const readRole = (): Role | null => { try { return localStorage.getItem('sf.role') as Role | null } catch { return null } }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [preferred, setPreferred] = useState<Role | null>(readRole)
  const qc = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setSessionReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const roles = useQuery({ queryKey: ['roles', userId], enabled: !!userId, queryFn: () => loadRoles(userId!), staleTime: 5 * 60_000 })

  const user = useMemo<SessionUser | null>(() => {
    if (!session || !roles.data?.length) return null
    const pick = roles.data.find((r) => r.role === preferred) ?? roles.data[0]
    return {
      userId: session.user.id, email: session.user.email ?? null, name: pick.name, role: pick.role,
      studioId: pick.studioId, staffId: pick.staffId, memberId: pick.memberId, roles: roles.data,
    }
  }, [session, roles.data, preferred])

  const value: AuthValue = {
    ready: sessionReady && (!userId || !roles.isLoading),
    session,
    user,
    rolesError: roles.error ? (roles.error as Error).message : null,
    noAccess: !!session && roles.isSuccess && roles.data.length === 0,
    switchRole: (role) => { setPreferred(role); try { localStorage.setItem('sf.role', role) } catch { /* this visit only */ } },
    signOut: async () => {
      await supabase.auth.signOut()
      qc.clear()
      try { localStorage.removeItem('sf.role') } catch { /* nothing stored */ }
      setPreferred(null)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** The signed-in user; only use inside pages that require a login. */
export function useMe(): SessionUser {
  const { user } = useAuth()
  if (!user) throw new Error('Not signed in')
  return user
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', front_desk: 'Front desk', coach: 'Coach', doctor: 'Doctor', member: 'Member' }
export const homeFor = (role: Role) =>
  role === 'owner' || role === 'front_desk' ? '/dashboard' : role === 'coach' ? '/coach' : role === 'doctor' ? '/doctor' : '/app'
