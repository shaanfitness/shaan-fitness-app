import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from './components/AppShell'
import { homeFor } from './data/api'
import type { Role } from './data/types'
import { useSession } from './session'
import Login from './screens/Login'
import Today from './screens/desk/Today'
import Slots from './screens/desk/Slots'
import Members from './screens/desk/Members'
import MemberProfile from './screens/desk/MemberProfile'
import FollowUps from './screens/desk/FollowUps'
import Dashboard from './screens/owner/Dashboard'
import MemberHome from './screens/member/Home'
import CoachHome from './screens/coach/Home'
import DoctorHome from './screens/doctor/Home'
import More from './screens/More'
import ComingSoon from './screens/ComingSoon'

const STAFF: Role[] = ['owner', 'front_desk', 'coach', 'doctor']

function Only({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useSession()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useSession()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route index element={user ? <Navigate to={homeFor(user.role)} replace /> : null} />
        <Route path="/dashboard" element={<Only roles={['owner']}><Dashboard /></Only>} />
        <Route path="/today" element={<Only roles={['owner', 'front_desk']}><Today /></Only>} />
        <Route path="/slots" element={<Only roles={['owner', 'front_desk', 'coach']}><Slots /></Only>} />
        <Route path="/follow-ups" element={<Only roles={['owner', 'front_desk', 'coach']}><FollowUps /></Only>} />
        <Route path="/members" element={<Only roles={STAFF}><Members /></Only>} />
        <Route path="/members/:id" element={<Only roles={STAFF}><MemberProfile /></Only>} />
        <Route path="/coach" element={<Only roles={['coach']}><CoachHome /></Only>} />
        <Route path="/doctor" element={<Only roles={['doctor']}><DoctorHome /></Only>} />
        <Route path="/home" element={<Only roles={['member']}><MemberHome /></Only>} />
        <Route path="/book" element={<Only roles={['member']}><ComingSoon title="Book" note="Booking, moving and cancelling slots from the app comes in the next build." /></Only>} />
        <Route path="/plan" element={<Only roles={['member']}><ComingSoon title="Plan" note="Workout and diet plans from your coach come in wave 3." /></Only>} />
        <Route path="/chat" element={<Only roles={['member', 'doctor']}><ComingSoon title="Chat" note="Care chat between members, coaches and doctors comes in wave 2." /></Only>} />
        <Route path="/more" element={<Only roles={[...STAFF, 'member']}><More /></Only>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
