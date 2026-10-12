import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, type ComponentType, type ReactNode } from 'react'
import { AppShell, StaffMenu } from './components/AppShell'
import { homeFor, useAuth } from './auth'
import type { Role } from './db/types'
import { ALL_PAGES, pageFor } from './nav'
import { useAccess } from './access'
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
import { ComboForm, ComboList, CouponForm, CouponList } from './screens/staff/Offers'
import { PeopleList, PersonForm } from './screens/staff/People'
import { AccessControl, LeaveRequests, Targets, Transformations } from './screens/staff/TeamExtras'
import { PayrollCalculator, PayrollRegister } from './screens/staff/Payroll'
import { ExpenseList, VendorList } from './screens/staff/Expenses'
import { CheckinLeaderboard, ClientTraffic, StaffAttendance } from './screens/staff/AttendanceReports'
import MemberHome from './screens/member/Home'
import CoachHome from './screens/coach/Home'
import DoctorHome from './screens/doctor/Home'
import More from './screens/More'
import ComingSoon from './screens/ComingSoon'
import { PageHeader } from './components/ui'
import { MemberShell } from './components/MemberShell'
import Website from './site/Website'
import Privacy from './site/Privacy'
import { ForgotPassword, Join, Login, ResetPassword } from './site/Auth'
import WebsiteSettings from './screens/staff/WebsiteSettings'
import { BiometricManager, CenterEdit, CenterList, CenterView, CurrencySetting, EmailManager, InvoiceSettings, OtpManager } from './screens/staff/Center'
import { AppPermissions, CenterSettings, MeasurementSettings } from './screens/staff/CenterSettings'
import { Equipment, FeedbackList, Holidays, Notices, Rules } from './screens/staff/CenterLists'
import { ActionForm, ActionList, BannerForm, BannerList, GalleryForm, GalleryList, ServicesList, SocialLinks } from './screens/staff/AppContent'
import { AppCoaches, AppContact, AppFeedback, AppNotices, AppPlans, AppResults } from './screens/member/AppPages'
import { prettyPhone, telLink, useSite } from './db/site'
import { Notice } from './components/controls'

// The analysis reports load on first visit, so the member app and other pages stay light.
const people = () => import('./screens/staff/analysis/People')
const money = () => import('./screens/staff/analysis/Money')
type Mod = Record<string, ComponentType>
const page = (load: () => Promise<unknown>, name: string) => lazy(() => load().then((m) => ({ default: (m as Mod)[name] })))
const AN = {
  traffic: page(people, 'TrafficAnalysis'), members: page(people, 'MembersAnalysis'), stages: page(people, 'EnquiryStageAnalysis'),
  followUps: page(people, 'FollowUpAnalysis'), conversion: page(people, 'ConversionAnalysis'), enquiries: page(people, 'EnquiryAnalysis'),
  enquiryConversion: page(people, 'EnquiryConversionReport'), leadSources: page(people, 'LeadSourceAnalysis'), weightLoss: page(people, 'WeightLossAnalysis'),
  collection: page(money, 'CollectionAnalysis'), subscriptions: page(money, 'SubscriptionsAnalysis'), expenses: page(money, 'ExpenseAnalysis'),
  profitLoss: page(money, 'ProfitLossAnalysis'), billing: page(money, 'BillingAnalysis'), sales: page(money, 'SalesLeaderboard'),
  daily: page(money, 'DailyCollectionAnalysis'), pt: page(money, 'PtAnalysis'), leaderboard: page(money, 'Leaderboard'),
  forecast: page(money, 'RevenueForecast'), branches: page(money, 'BranchAnalysis'),
}
const workouts = () => import('./screens/staff/training/Workouts')
const diets = () => import('./screens/staff/training/Diets')
const library = () => import('./screens/staff/training/Library')
const TR = {
  workoutList: page(workouts, 'WorkoutPlanList'), workoutForm: page(workouts, 'WorkoutPlanForm'), workoutDays: page(workouts, 'WorkoutPlanDays'),
  printWorkout: page(workouts, 'PrintWorkout'), dietList: page(diets, 'DietPlanList'), dietForm: page(diets, 'DietPlanForm'), dietMeals: page(diets, 'DietPlanMeals'),
  printDiet: page(diets, 'PrintDiet'), exercises: page(library, 'ExerciseList'), foods: page(library, 'FoodList'), recipes: page(library, 'RecipeList'),
  recipeVerify: page(library, 'RecipeVerify'), memberPlan: lazy(() => import('./screens/member/Plan')),
}
const whatsapp = () => import('./screens/staff/messages/WhatsApp')
const sms = () => import('./screens/staff/messages/Sms')
const email = () => import('./screens/staff/messages/Email')
const MSG = {
  notify: page(email, 'SendNotification'), qr: page(whatsapp, 'QrManager'), waSettings: page(whatsapp, 'WhatsAppSettings'), waHistory: page(whatsapp, 'WhatsAppHistory'),
  smsBalance: page(sms, 'SmsBalance'), smsSettings: page(sms, 'SmsSettings'), smsBulk: page(sms, 'SmsBulk'), smsHistory: page(sms, 'SmsHistory'),
  smsCampaigns: page(sms, 'CampaignHistory'), smsRecharges: page(sms, 'RechargeHistory'), email: page(email, 'EmailListing'),
  memberNotifications: lazy(() => import('./screens/member/Notifications')),
}
function Lazy({ c: C }: { c: ComponentType }) {
  return <Suspense fallback={<div className="px-5 py-10 text-center text-[14px] text-muted lg:px-8" role="status">Loading…</div>}><C /></Suspense>
}

const STAFF: Role[] = ['owner', 'front_desk', 'coach', 'doctor']
const DESK: Role[] = ['owner', 'front_desk']
const DC: Role[] = ['owner', 'front_desk', 'coach']

function Only({ roles, children, right }: { roles: Role[]; children: ReactNode; right?: [string, string] }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <Rights right={right}>{children}</Rights>
}

// Front-desk staff also need the right YDL's access control gives their employee type.
function Rights({ right, children }: { right?: [string, string]; children: ReactNode }) {
  const { pathname } = useLocation()
  const access = useAccess()
  const page = pageFor(pathname)
  if (!access.ready) return null
  const ok = right ? access.can(right[0], right[1]) : !page || access.page(page)
  if (ok) return <>{children}</>
  return (
    <>
      <PageHeader title={page?.label ?? 'No access'} />
      <div className="px-5 pt-5 lg:px-8"><Notice>Your account doesn’t have access to this page. The owner can change it in Staff › Staff Access Control.</Notice></div>
    </>
  )
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
  '/plans/new': { el: <PlanForm key="new" />, roles: DESK },
  '/plans': { el: <PlanList />, roles: DESK },
  '/subscriptions': { el: <Subscriptions />, roles: DESK },
  '/quick-billing': { el: <QuickBilling />, roles: DESK },
  '/analysis/traffic': { el: <Lazy c={AN.traffic} />, roles: DESK },
  '/analysis/members': { el: <Lazy c={AN.members} />, roles: DESK },
  '/analysis/enquiry-stages': { el: <Lazy c={AN.stages} />, roles: DESK },
  '/analysis/collection': { el: <Lazy c={AN.collection} />, roles: ['owner'] },
  '/analysis/subscriptions': { el: <Lazy c={AN.subscriptions} />, roles: ['owner'] },
  '/analysis/follow-ups': { el: <Lazy c={AN.followUps} />, roles: DESK },
  '/analysis/conversion': { el: <Lazy c={AN.conversion} />, roles: DESK },
  '/analysis/enquiries': { el: <Lazy c={AN.enquiries} />, roles: DESK },
  '/analysis/enquiry-conversion': { el: <Lazy c={AN.enquiryConversion} />, roles: ['owner'] },
  '/analysis/expenses': { el: <Lazy c={AN.expenses} />, roles: ['owner'] },
  '/analysis/profit-loss': { el: <Lazy c={AN.profitLoss} />, roles: ['owner'] },
  '/analysis/billing': { el: <Lazy c={AN.billing} />, roles: ['owner'] },
  '/analysis/sales-leaderboard': { el: <Lazy c={AN.sales} />, roles: ['owner'] },
  '/analysis/daily-collection': { el: <Lazy c={AN.daily} />, roles: DESK },
  '/analysis/pt': { el: <Lazy c={AN.pt} />, roles: ['owner'] },
  '/analysis/leaderboard': { el: <Lazy c={AN.leaderboard} />, roles: ['owner'] },
  '/analysis/revenue-forecast': { el: <Lazy c={AN.forecast} />, roles: ['owner'] },
  '/analysis/weight-loss': { el: <Lazy c={AN.weightLoss} />, roles: DC },
  '/analysis/lead-sources': { el: <Lazy c={AN.leadSources} />, roles: ['owner'] },
  '/analysis/branches': { el: <Lazy c={AN.branches} />, roles: ['owner'] },
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
  // Memberships › Coupon and Combo Offer
  '/coupons/new': { el: <CouponForm key="new" />, roles: DESK },
  '/coupons': { el: <CouponList />, roles: DESK },
  '/combos/new': { el: <ComboForm key="new" />, roles: DESK },
  '/combos': { el: <ComboList />, roles: DESK },
  // Trainers and Staff
  '/trainers/new': { el: <PersonForm key="trainer-new" kind="trainer" />, roles: DESK },
  '/trainers': { el: <PeopleList key="trainers" kind="trainer" />, roles: DESK },
  '/trainers/transformations': { el: <Transformations />, roles: DC },
  '/trainers/leave': { el: <LeaveRequests />, roles: DC },
  '/staff/new': { el: <PersonForm key="staff-new" kind="staff" />, roles: DESK },
  '/staff': { el: <PeopleList key="staff" kind="staff" />, roles: DESK },
  '/staff/access': { el: <AccessControl />, roles: ['owner'] },
  '/staff/targets': { el: <Targets />, roles: DESK },
  // Accounts › Payroll and Expense
  '/payroll': { el: <PayrollCalculator />, roles: DESK },
  '/payroll/register': { el: <PayrollRegister />, roles: DESK },
  '/expenses': { el: <ExpenseList />, roles: ['owner'] },
  '/vendors': { el: <VendorList />, roles: ['owner'] },
  // Fitness Center
  '/centers': { el: <CenterList />, roles: DESK },
  '/centers/settings': { el: <CenterSettings />, roles: DESK },
  '/centers/invoice-settings': { el: <InvoiceSettings />, roles: DESK },
  '/centers/biometric': { el: <BiometricManager key="bio" />, roles: DESK },
  '/centers/biometric-extended': { el: <BiometricManager key="bio-x" extended />, roles: DESK },
  '/centers/otp': { el: <OtpManager />, roles: ['owner'] },
  '/centers/email': { el: <EmailManager />, roles: ['owner'] },
  '/centers/holidays': { el: <Holidays />, roles: DESK },
  '/centers/equipment': { el: <Equipment />, roles: DESK },
  '/centers/notices': { el: <Notices />, roles: DESK },
  '/centers/rules': { el: <Rules />, roles: DESK },
  '/centers/currency': { el: <CurrencySetting />, roles: ['owner'] },
  '/centers/feedback': { el: <FeedbackList />, roles: DESK },
  // App Settings
  '/app-settings/permissions': { el: <AppPermissions />, roles: DESK },
  '/app-settings/services': { el: <ServicesList />, roles: DESK },
  '/app-settings/gallery/new': { el: <GalleryForm key="new" />, roles: DESK },
  '/app-settings/gallery': { el: <GalleryList />, roles: DESK },
  '/app-settings/actions/new': { el: <ActionForm key="a-new" kind="action" />, roles: DESK },
  '/app-settings/actions': { el: <ActionList kind="action" />, roles: DESK },
  '/app-settings/quick-actions/new': { el: <ActionForm key="q-new" kind="quick" />, roles: DESK },
  '/app-settings/quick-actions': { el: <ActionList kind="quick" />, roles: DESK },
  '/app-settings/banners/new': { el: <BannerForm key="new" />, roles: DESK },
  '/app-settings/banners': { el: <BannerList />, roles: DESK },
  '/app-settings/social': { el: <SocialLinks />, roles: DESK },
  '/app-settings/measurements': { el: <MeasurementSettings />, roles: DESK },
  // App Settings › Workouts & Diet
  '/workouts': { el: <Lazy c={TR.workoutList} />, roles: DC },
  '/workouts/new': { el: <Lazy key="wp-new" c={TR.workoutForm} />, roles: DC },
  '/diets': { el: <Lazy c={TR.dietList} />, roles: DC },
  '/diets/new': { el: <Lazy key="dp-new" c={TR.dietForm} />, roles: DC },
  '/diets/foods': { el: <Lazy c={TR.foods} />, roles: DC },
  '/recipes/verify': { el: <Lazy c={TR.recipeVerify} />, roles: DC },
  '/recipes': { el: <Lazy c={TR.recipes} />, roles: DC },
  '/exercises': { el: <Lazy c={TR.exercises} />, roles: DC },
  // Notification & WhatsApp
  '/notifications/send': { el: <Lazy c={MSG.notify} />, roles: DESK },
  '/whatsapp/qr': { el: <Lazy c={MSG.qr} />, roles: ['owner'] },
  '/whatsapp/settings': { el: <Lazy c={MSG.waSettings} />, roles: ['owner'] },
  '/whatsapp/history': { el: <Lazy c={MSG.waHistory} />, roles: DESK },
  '/sms/balance': { el: <Lazy c={MSG.smsBalance} />, roles: ['owner'] },
  '/sms/settings': { el: <Lazy c={MSG.smsSettings} />, roles: ['owner'] },
  '/sms/bulk': { el: <Lazy c={MSG.smsBulk} />, roles: DESK },
  '/sms/history': { el: <Lazy c={MSG.smsHistory} />, roles: DESK },
  '/sms/campaigns': { el: <Lazy c={MSG.smsCampaigns} />, roles: DESK },
  '/sms/recharges': { el: <Lazy c={MSG.smsRecharges} />, roles: ['owner'] },
  '/email': { el: <Lazy c={MSG.email} />, roles: DESK },
  // Shaan Fitness additions
  '/settings/website': { el: <WebsiteSettings />, roles: ['owner'] },
}

function Splash() {
  return <div className="flex min-h-dvh items-center justify-center"><img src="/icon-192.png" alt="Shaan Fitness" width="72" height="72" className="animate-pulse rounded-[18px]" /></div>
}

function NoAccess() {
  const { signOut, session, rolesError } = useAuth()
  const { data: site } = useSite()
  const phone = site?.studio.mobile
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-6">
      <img src="/icon-192.png" alt="" width="64" height="64" className="rounded-[16px]" />
      <h1 className="title text-[32px]">This login isn’t linked yet</h1>
      {rolesError
        ? <Notice tone="error">{rolesError}</Notice>
        : <p className="m-0 text-[15px] leading-relaxed text-muted">{session?.user.email ?? 'This account'} is signed in, but no member or staff record uses this email yet. If you just joined, give it a minute and sign in again. Otherwise ask the front desk to add this email to your record{phone ? <>: <a href={telLink(phone) ?? undefined}>{prettyPhone(phone)}</a></> : ''}.</p>}
      <div className="flex flex-wrap gap-2.5">
        <button type="button" className="btn" onClick={() => signOut()}>Sign out</button>
        <Link to="/" className="btn">Website</Link>
      </div>
    </div>
  )
}

// Pages behind a login wait until we know who is signed in.
function Gate() {
  const { ready, session, user, noAccess, rolesError } = useAuth()
  if (!ready) return <Splash />
  if (session && (noAccess || (rolesError && !user))) return <NoAccess />
  if (session && !user) return <Splash />
  return <Outlet />
}

function SignedOutOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <Navigate to={homeFor(user.role)} replace /> : <>{children}</>
}

// A new page starts at the top (links to #sections on the same page still scroll to them).
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

// One address for everything:
//   /              the public website (plans, timings, coaches, contact, Log in and Join)
//   /login, /join  one sign-in for all; afterwards each person lands on their own place
//   /app           the member app (phone-first, installable)
//   /coach, /doctor the coach's and doctor's day
//   /dashboard …   the CRM for the owner and front desk
export default function App() {
  const { user } = useAuth()
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Website />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Gate />}>
        <Route path="/login" element={<SignedOutOnly><Login /></SignedOutOnly>} />
        <Route path="/join" element={<SignedOutOnly><Join /></SignedOutOnly>} />
        <Route path="/forgot-password" element={<SignedOutOnly><ForgotPassword /></SignedOutOnly>} />
        <Route path="/print/invoice/:id" element={<Only roles={DESK}><Print kind="invoice" /></Only>} />
        <Route path="/print/receipt/:id" element={<Only roles={DESK}><Print kind="receipt" /></Only>} />
        <Route path="/print/collection" element={<Only roles={DESK}><PrintReport kind="collection" /></Only>} />
        <Route path="/print/sales" element={<Only roles={DESK}><PrintReport kind="sales" /></Only>} />
        <Route path="/print/workout/:id" element={<Only roles={[...STAFF, 'member']}><Lazy c={TR.printWorkout} /></Only>} />
        <Route path="/print/diet/:id" element={<Only roles={[...STAFF, 'member']}><Lazy c={TR.printDiet} /></Only>} />

        {/* The member app */}
        <Route path="/app" element={!user ? <Navigate to="/login" replace /> : user.role !== 'member' ? <Navigate to={homeFor(user.role)} replace /> : <MemberShell />}>
          <Route index element={<MemberHome />} />
          <Route path="book" element={<ComingSoon title="Book" note="Booking, moving and cancelling sessions from the app comes with the member app." />} />
          <Route path="plan" element={<Lazy c={TR.memberPlan} />} />
          <Route path="notifications" element={<Lazy c={MSG.memberNotifications} />} />
          <Route path="chat" element={<ComingSoon title="Chat" note="Care chat between members, coaches and doctors comes next, with online status and phone notifications." />} />
          <Route path="profile" element={<More />} />
          <Route path="notices" element={<AppNotices key="notices" kind="notices" />} />
          <Route path="rules" element={<AppNotices key="rules" kind="rules" />} />
          <Route path="feedback" element={<AppFeedback />} />
          <Route path="plans" element={<AppPlans />} />
          <Route path="coaches" element={<AppCoaches />} />
          <Route path="contact" element={<AppContact />} />
          <Route path="results" element={<AppResults />} />
        </Route>
        <Route path="/home" element={<Navigate to="/app" replace />} />
        <Route path="/book" element={<Navigate to="/app/book" replace />} />
        <Route path="/plan" element={<Navigate to="/app/plan" replace />} />

        {/* The CRM, and the coach's and doctor's pages */}
        <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
          {Object.entries(BUILT).map(([path, b]) => <Route key={path} path={path} element={<Only roles={b.roles}>{b.el}</Only>} />)}
          <Route path="/clients/:id/edit" element={<Only roles={DESK}><EnquiryForm /></Only>} />
          <Route path="/clients/:id/payments/:subId" element={<Only roles={DESK}><PaymentDetails /></Only>} />
          <Route path="/clients/:id" element={<Only roles={['owner', 'front_desk', 'coach']}><ClientProfile /></Only>} />
          <Route path="/clients/:id/:tab" element={<Only roles={['owner', 'front_desk', 'coach']}><ClientProfile /></Only>} />
          <Route path="/plans/:id/edit" element={<Only roles={DESK} right={['plans', 'edit']}><PlanForm /></Only>} />
          <Route path="/workouts/:id/edit" element={<Only roles={DC}><Lazy c={TR.workoutForm} /></Only>} />
          <Route path="/workouts/:id/exercises" element={<Only roles={DC}><Lazy c={TR.workoutDays} /></Only>} />
          <Route path="/diets/:id/edit" element={<Only roles={DC}><Lazy c={TR.dietForm} /></Only>} />
          <Route path="/diets/:id/meals" element={<Only roles={DC}><Lazy c={TR.dietMeals} /></Only>} />
          <Route path="/coupons/:id/edit" element={<Only roles={DESK} right={['coupons', 'on']}><CouponForm /></Only>} />
          <Route path="/combos/:id/edit" element={<Only roles={DESK} right={['plans', 'add']}><ComboForm /></Only>} />
          <Route path="/trainers/:id/edit" element={<Only roles={DESK} right={['trainers', 'edit']}><PersonForm kind="trainer" /></Only>} />
          <Route path="/staff/:id/edit" element={<Only roles={DESK} right={['staff_accounts', 'edit']}><PersonForm kind="staff" /></Only>} />
          <Route path="/batches/:id/edit" element={<Only roles={DESK} right={['batches', 'edit']}><BatchForm /></Only>} />
          <Route path="/programs/:id/edit" element={<Only roles={DESK} right={['programs', 'edit']}><ProgramForm /></Only>} />
          <Route path="/centers/:id" element={<Only roles={DESK} right={['fitness_center', 'view']}><CenterView /></Only>} />
          <Route path="/centers/:id/edit" element={<Only roles={DESK} right={['fitness_center', 'edit']}><CenterEdit /></Only>} />
          <Route path="/app-settings/gallery/:id/edit" element={<Only roles={DESK} right={['app_settings', 'on']}><GalleryForm /></Only>} />
          <Route path="/app-settings/actions/:id/edit" element={<Only roles={DESK} right={['app_settings', 'on']}><ActionForm kind="action" /></Only>} />
          <Route path="/app-settings/quick-actions/:id/edit" element={<Only roles={DESK} right={['app_settings', 'on']}><ActionForm kind="quick" /></Only>} />
          <Route path="/app-settings/banners/:id/edit" element={<Only roles={DESK} right={['app_settings', 'on']}><BannerForm /></Only>} />
          {ALL_PAGES.filter((p) => !BUILT[p.path]).map((p) => <Route key={p.path} path={p.path} element={<Only roles={p.roles}><InProgress /></Only>} />)}
          <Route path="/menu" element={<Only roles={STAFF}><PageHeader title="Menu" /><div className="px-3 pt-3"><StaffMenu /></div></Only>} />
          <Route path="/coach" element={<Only roles={['coach']}><CoachHome /></Only>} />
          <Route path="/doctor" element={<Only roles={['doctor']}><DoctorHome /></Only>} />
          <Route path="/chat" element={<Only roles={['doctor']}><ComingSoon title="Chat" note="Care chat between members, coaches and doctors comes next, with online status and phone notifications." /></Only>} />
          <Route path="/more" element={<Only roles={STAFF}><More /></Only>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
