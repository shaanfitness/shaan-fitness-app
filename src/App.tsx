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
import ClientList from './screens/staff/ClientList'
import ClientProfile from './screens/staff/ClientProfile'
import PaymentDetails from './screens/staff/PaymentDetails'
import { PlanForm, PlanList } from './screens/staff/Plans'
import Subscriptions from './screens/staff/Subscriptions'
import QuickBilling from './screens/staff/QuickBilling'
import { ClientReferrals, OtherBranchMembers } from './screens/staff/Referrals'
import Print, { PrintReport } from './screens/Print'
import * as R from './screens/staff/registers'
import { CollectionReport, SessionRegisterRoute } from './screens/staff/RegisterExtras'
import { BatchForm, BatchList } from './screens/staff/Batches'
import { CapacityInfo, ClassBookings, ClassCalendar } from './screens/staff/Classes'
import { ProgramForm, ProgramList } from './screens/staff/Programs'
import { DailyAppointments } from './screens/staff/Appointments'
import ClassFeedback from './screens/staff/ClassFeedback'
import * as CR from './screens/staff/classRegisters'
import { CheckinLeaderboard, ClientTraffic, StaffAttendance } from './screens/staff/AttendanceReports'
import MemberHome from './screens/member/Home'
import CoachHome from './screens/coach/Home'
import DoctorHome from './screens/doctor/Home'
import More from './screens/More'
import ComingSoon from './screens/ComingSoon'
import { PageHeader } from './components/ui'
import { Notice } from './components/controls'

const STAFF: Role[] = ['owner', 'front_desk', 'coach', 'doctor']
const DESK: Role[] = ['owner', 'front_desk']
const DC: Role[] = ['owner', 'front_desk', 'coach']

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
  '/members/new': { el: <EnquiryForm key="member" mode="member" />, roles: DESK },
  '/members/quick': { el: <EnquiryForm key="quick" mode="quick" />, roles: DESK },
  '/members': { el: <ClientList key="members" variant="members" />, roles: ['owner', 'front_desk', 'coach'] },
  '/clients': { el: <ClientList key="database" variant="database" />, roles: DESK },
  '/clients/referrals': { el: <ClientReferrals />, roles: DESK },
  '/members/birthdays': { el: <ClientList key="birthdays" variant="birthdays" />, roles: DESK },
  '/members/other-branches': { el: <OtherBranchMembers />, roles: DESK },
  '/plans/new': { el: <PlanForm key="new" />, roles: ['owner'] },
  '/plans': { el: <PlanList />, roles: DESK },
  '/subscriptions': { el: <Subscriptions />, roles: DESK },
  '/quick-billing': { el: <QuickBilling />, roles: DESK },
  '/registers/collection': { el: <CollectionReport />, roles: DESK },
  '/registers/receipts': { el: <R.RegisterPage def={R.receiptRegister} />, roles: DESK },
  '/registers/subscriptions': { el: <R.RegisterPage def={R.subscriptionsRegister} />, roles: DESK },
  '/registers/cash': { el: <R.RegisterPage def={R.cashRegister} />, roles: DESK },
  '/registers/sessions': { el: <SessionRegisterRoute />, roles: DESK },
  '/registers/recorded-sessions': { el: <R.RegisterPage def={R.recordedSessions} />, roles: DESK },
  '/registers/deleted-sessions': { el: <R.RegisterPage def={R.deletedSessions} />, roles: DESK },
  '/registers/coupons': { el: <R.RegisterPage def={R.couponRegister} />, roles: DESK },
  '/registers/expired': { el: <R.RegisterPage def={R.expiredRegister} />, roles: DESK },
  '/registers/expired-sessions': { el: <R.RegisterPage def={R.expiredSessions} />, roles: DESK },
  '/registers/balance-due': { el: <R.RegisterPage def={R.balanceDue} />, roles: DESK },
  '/registers/tax': { el: <R.RegisterPage def={R.taxRegister} />, roles: ['owner'] },
  '/registers/write-offs': { el: <R.RegisterPage def={R.writeOffRegister} />, roles: ['owner'] },
  '/registers/deleted-subscriptions': { el: <R.RegisterPage def={R.deletedSubs} />, roles: ['owner'] },
  '/registers/trials': { el: <R.RegisterPage def={R.trialRegister} />, roles: DESK },
  '/registers/cancelled': { el: <R.RegisterPage def={R.cancelledSubs} />, roles: DESK },
  '/registers/transfers': { el: <R.RegisterPage def={R.transferRegister} />, roles: DESK },
  '/registers/freezes': { el: <R.RegisterPage def={R.freezeRegister} />, roles: DESK },
  '/registers/upgrades': { el: <R.RegisterPage def={R.upgradeRegister} />, roles: DESK },
  '/registers/extensions': { el: <R.RegisterPage def={R.extensionRegister} />, roles: DESK },
  '/registers/downgrades': { el: <R.RegisterPage def={R.downgradeRegister} />, roles: DESK },
  '/registers/course-orders': { el: <R.RegisterPage def={R.courseOrders} />, roles: DESK },
  '/registers/receipt-log': { el: <R.RegisterPage def={R.receiptLog} />, roles: ['owner'] },
  '/registers/recurring': { el: <R.RegisterPage def={R.recurringRegister} />, roles: DESK },
  // Batches & Classes
  '/batches/new': { el: <BatchForm key="new" />, roles: DESK },
  '/batches': { el: <BatchList />, roles: DC },
  '/classes/bookings': { el: <ClassBookings />, roles: DC },
  '/classes/calendar': { el: <ClassCalendar />, roles: DC },
  '/programs/new': { el: <ProgramForm key="new" />, roles: DESK },
  '/programs': { el: <ProgramList />, roles: DC },
  '/programs/attendance': { el: <R.RegisterPage def={CR.programAttendance} />, roles: DC },
  '/classes/capacity': { el: <CapacityInfo />, roles: DC },
  '/batches/attendance': { el: <R.RegisterPage def={CR.batchwiseAttendance} />, roles: DC },
  '/classes/waiting-list': { el: <R.RegisterPage def={CR.waitingList} />, roles: DC },
  '/classes/attendance': { el: <R.RegisterPage def={CR.classAttendance} />, roles: DC },
  '/classes/cancelled': { el: <R.RegisterPage def={CR.cancelledClasses} />, roles: DESK },
  '/classes/deleted': { el: <R.RegisterPage def={CR.deletedClasses} />, roles: DESK },
  '/classes/feedback': { el: <ClassFeedback />, roles: DC },
  '/appointments/daily': { el: <DailyAppointments />, roles: DC },
  // Attendance Reports
  '/attendance/staff': { el: <StaffAttendance />, roles: DESK },
  '/attendance/clients': { el: <ClientTraffic />, roles: DC },
  '/attendance/leaderboard': { el: <CheckinLeaderboard />, roles: DC },
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
      <Route path="/print/invoice/:id" element={<Only roles={DESK}><Print kind="invoice" /></Only>} />
      <Route path="/print/receipt/:id" element={<Only roles={DESK}><Print kind="receipt" /></Only>} />
      <Route path="/print/collection" element={<Only roles={DESK}><PrintReport kind="collection" /></Only>} />
      <Route path="/print/sales" element={<Only roles={DESK}><PrintReport kind="sales" /></Only>} />
      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route index element={user ? <Navigate to={homeFor(user.role)} replace /> : null} />
        {Object.entries(BUILT).map(([path, b]) => <Route key={path} path={path} element={<Only roles={b.roles}>{b.el}</Only>} />)}
        <Route path="/clients/:id/edit" element={<Only roles={DESK}><EnquiryForm /></Only>} />
        <Route path="/clients/:id/payments/:subId" element={<Only roles={DESK}><PaymentDetails /></Only>} />
        <Route path="/clients/:id" element={<Only roles={['owner', 'front_desk', 'coach']}><ClientProfile /></Only>} />
        <Route path="/clients/:id/:tab" element={<Only roles={['owner', 'front_desk', 'coach']}><ClientProfile /></Only>} />
        <Route path="/plans/:id/edit" element={<Only roles={['owner']}><PlanForm /></Only>} />
        <Route path="/batches/:id/edit" element={<Only roles={DESK}><BatchForm /></Only>} />
        <Route path="/programs/:id/edit" element={<Only roles={DESK}><ProgramForm /></Only>} />
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
