import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell, StaffMenu } from './components/AppShell'
import { homeFor, useAuth } from './auth'
import type { Role } from './db/types'
import { ALL_PAGES } from './nav'
import Login from './screens/Login'
import Dashboard from './screens/staff/Dashboard'
import Enquiries from './screens/staff/Enquiries'
import EnquiryForm from './screens/staff/EnquiryForm'
import FollowUps from './screens/staff/FollowUps'
import Lists from './screens/staff/Lists'
import InProgress from './screens/staff/InProgress'
import MemberHome from './screens/member/Home'
import CoachHome from './screens/coach/Home'
import DoctorHome from './screens/doctor/Home'
import More from './screens/More'
import ComingSoon from './screens/ComingSoon'
import { PageHeader } from './components/ui'
import { Notice } from './components/controls'

const STAFF: Role[] = ['owner', 'front_desk', 'coach', 'doctor']
const DESK: Role[] = ['owner', 'front_desk']

function Only({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}

// The pages that are live; every other menu page shows what's being built.
const BUILT: Record<string, { el: ReactNode; roles: Role[] }> = {
  '/dashboard': { el: <Dashboard />, roles: DESK },
  '/enquiries': { el: <Enquiries />, roles: DESK },
  '/enquiries/new': { el: <EnquiryForm />, roles: DESK },
  '/follow-ups': { el: <FollowUps />, roles: ['owner', 'front_desk', 'coach'] },
  '/settings/lists': { el: <Lists />, roles: ['owner'] },
}

function Splash() {
  return <div className="flex min-h-dvh items-center justify-center"><img src="/icon-192.png" alt="Shaan Fitness" width="72" height="72" className="animate-pulse rounded-[18px]" /></div>
}

function NoAccess() {
  const { signOut, session, rolesError } = useAuth()
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-6">
      <img src="/icon-192.png" alt="" width="64" height="64" className="rounded-[16px]" />
      <h1 className="title text-[32px]">This login isn’t linked yet</h1>
      {rolesError
        ? <Notice tone="error">{rolesError}</Notice>
        : <p className="m-0 text-[15px] text-muted">{session?.user.email ?? 'This account'} signed in, but no staff or member record uses this email or mobile number. Ask the owner to add it, then sign in again.</p>}
      <button type="button" className="btn" onClick={() => signOut()}>Sign out</button>
    </div>
  )
}

export default function App() {
  const { ready, session, user, noAccess, rolesError } = useAuth()
  if (!ready) return <Splash />
  if (session && (noAccess || (rolesError && !user))) return <NoAccess />
  if (session && !user) return <Splash />
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route index element={user ? <Navigate to={homeFor(user.role)} replace /> : null} />
        {Object.entries(BUILT).map(([path, b]) => <Route key={path} path={path} element={<Only roles={b.roles}>{b.el}</Only>} />)}
        <Route path="/clients/:id/edit" element={<Only roles={DESK}><EnquiryForm /></Only>} />
        {ALL_PAGES.filter((p) => !BUILT[p.path]).map((p) => <Route key={p.path} path={p.path} element={<Only roles={p.roles}><InProgress /></Only>} />)}
        <Route path="/menu" element={<Only roles={STAFF}><PageHeader title="Menu" /><div className="px-3 pt-3"><StaffMenu /></div></Only>} />
        <Route path="/coach" element={<Only roles={['coach']}><CoachHome /></Only>} />
        <Route path="/doctor" element={<Only roles={['doctor']}><DoctorHome /></Only>} />
        <Route path="/home" element={<Only roles={['member']}><MemberHome /></Only>} />
        <Route path="/book" element={<Only roles={['member']}><ComingSoon title="Book" note="Booking, moving and cancelling sessions from the app comes with the member app." /></Only>} />
        <Route path="/plan" element={<Only roles={['member']}><ComingSoon title="Plan" note="Workout and diet plans from your coach come with the member app." /></Only>} />
        <Route path="/chat" element={<Only roles={['member', 'doctor']}><ComingSoon title="Chat" note="Care chat between members, coaches and doctors comes next, with online status and phone notifications." /></Only>} />
        <Route path="/more" element={<Only roles={[...STAFF, 'member']}><More /></Only>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
