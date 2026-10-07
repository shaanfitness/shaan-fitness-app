// The app's data layer. Every screen reads and writes through these functions.
// Today they run on the demo store; when Supabase is connected, the same
// functions will call the database (see supabase/migrations for the tables).
import { addDays, daysBetween, isoWeekday, minutesOf, todayISO } from '../lib/format'
import { buildDemo, DEMO_IDS } from './demo'
import type {
  Attendance, AttendanceStatus, CycleOverview, FollowUp, Lead, Member, MemberHealth,
  PaymentMethod, Plan, Role, SessionUser, Slot, Staff,
} from './types'

let db = buildDemo()
export const resetDemo = () => { db = buildDemo() }

const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60))
const nid = (p: string) => `${p}-${++db.counters.id}`

// ---------------------------------------------------------------------------
// Sign-in (demo): pick who you are
// ---------------------------------------------------------------------------
export const demoUsers: Array<SessionUser & { label: string }> = [
  { label: 'Owner', role: 'owner', name: 'Sabir Rasool', initials: 'SR', staffId: DEMO_IDS.sabirOwner },
  { label: 'Front desk', role: 'front_desk', name: 'Front desk', initials: 'FD', staffId: DEMO_IDS.desk },
  { label: 'Coach', role: 'coach', name: 'Second coach', initials: 'SC', staffId: DEMO_IDS.coach2 },
  { label: 'Doctor', role: 'doctor', name: 'Studio doctor', initials: 'DR', staffId: DEMO_IDS.doctor },
  { label: 'Member', role: 'member', name: 'Ananya Reddy', initials: 'AR', memberId: DEMO_IDS.ananya },
]
export const homeFor = (role: Role) =>
  ({ owner: '/dashboard', front_desk: '/today', coach: '/coach', doctor: '/doctor', member: '/home' })[role]

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------
export const getStudio = () => wait(db.studio)
export const getPlans = () => wait(db.plans.filter((p) => p.active))
export const getStaff = () => wait(db.staff)
const staffName = (id?: string | null) => db.staff.find((s) => s.id === id)?.full_name ?? '—'
const memberById = (id: string) => db.members.find((m) => m.id === id)!

function overview(cycleId: string): CycleOverview {
  const c = db.cycles.find((x) => x.id === cycleId)!
  const plan = db.plans.find((p) => p.id === c.plan_id)!
  const end = addDays(c.start_date, c.duration_days - 1 + c.extension_days + c.frozen_days)
  const paid = db.payments.filter((p) => p.cycle_id === c.id).reduce((s, p) => s + p.amount, 0)
  return {
    ...c,
    end_date: end,
    plan_name: plan.name,
    plan_tier: plan.tier,
    sessions_left: Math.max((c.sessions_total ?? 0) - c.sessions_used, 0),
    days_left: daysBetween(todayISO(), end),
    amount_paid: paid,
    amount_due: c.price - c.discount_amount - paid,
  }
}

export function currentCycle(memberId: string): CycleOverview | null {
  const list = db.cycles.filter((c) => c.member_id === memberId).map((c) => overview(c.id))
  const today = todayISO()
  const live = list.find((c) => c.start_date <= today && c.end_date >= today && ['active', 'frozen'].includes(c.status))
  if (live) return live
  return list.sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
}

export type RiskLevel = 'red' | 'amber' | 'green'
export interface Risk { level: RiskLevel; reason?: string }

// Rule-based for now; the AI risk score replaces this in wave 2.
export function riskOf(memberId: string): Risk {
  const c = currentCycle(memberId)
  if (!c || c.status !== 'active' || c.end_date < todayISO()) return { level: 'green' }
  const hold = db.health.find((h) => h.member_id === memberId && h.doctor_decision === 'hold')
  if (hold) return { level: 'red', reason: 'Doctor hold' }
  const past = db.attendance
    .filter((a) => a.member_id === memberId && a.date < todayISO())
    .sort((a, b) => b.date.localeCompare(a.date))
  if (past.length >= 2 && past[0].status === 'absent' && past[1].status === 'absent') {
    return { level: 'red', reason: 'Missed the last 2 sessions' }
  }
  const elapsed = daysBetween(c.start_date, todayISO())
  let workdays = 0
  for (let d = 0; d < elapsed; d++) if (isoWeekday(addDays(c.start_date, d)) <= 6) workdays++
  if (workdays < 4) return { level: 'green' }
  const expected = workdays * ((c.sessions_total ?? 24) / 24)
  const ratio = c.sessions_used / expected
  const reason = `${c.sessions_used} of ${c.sessions_total} sessions by day ${elapsed + 1}`
  if (ratio < 0.65) return { level: 'red', reason }
  if (ratio < 0.85) return { level: 'amber', reason }
  return { level: 'green' }
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export interface MemberRow {
  member: Member
  cycle: CycleOverview | null
  coach: string
  risk: Risk
}

export type MemberFilter = 'active' | 'ending' | 'dues' | 'at_risk' | 'expired' | 'all'

export function memberRows(filter: MemberFilter = 'active', search = '', onlyFor?: string[]): Promise<MemberRow[]> {
  const q = search.trim().toLowerCase()
  const rows = db.members
    .filter((m) => !onlyFor || onlyFor.includes(m.id))
    .filter((m) => !q || m.full_name.toLowerCase().includes(q) || m.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '~') || m.member_code.toLowerCase().includes(q))
    .map((m) => ({
      member: m,
      cycle: currentCycle(m.id),
      coach: staffName(db.care.find((c) => c.member_id === m.id && c.role === 'coach')?.staff_id),
      risk: riskOf(m.id),
    }))
    .filter((r) => {
      switch (filter) {
        case 'active': return r.member.status === 'active'
        case 'ending': return r.member.status === 'active' && !!r.cycle && r.cycle.days_left >= 0 && r.cycle.days_left <= 7
        case 'dues': return !!r.cycle && r.cycle.amount_due > 0
        case 'at_risk': return r.risk.level !== 'green'
        case 'expired': return r.member.status === 'expired'
        default: return true
      }
    })
    .sort((a, b) => a.member.full_name.localeCompare(b.member.full_name))
  return wait(rows)
}

// Members a coach or doctor looks after (the database applies the same rule).
export const careMemberIds = (staffId: string) =>
  db.care.filter((c) => c.staff_id === staffId).map((c) => c.member_id)

export function addLead(input: { full_name: string; phone: string; source?: string; planId?: string; notes?: string }) {
  const lead: Lead = {
    id: nid('lead'), full_name: input.full_name, phone: input.phone, source: input.source, stage: 'new', temperature: 'warm',
    interested_plan_id: input.planId, created_at: todayISO(), notes: input.notes,
  }
  db.leads.push(lead)
  db.followUps.push({ id: nid('fu'), lead_id: lead.id, type: 'enquiry', due_at: `${todayISO()}T18:00:00`, assigned_to: 'staff-desk', status: 'open', notes: input.notes || 'New enquiry · call back today' })
  return wait(lead)
}

export function addMember(input: {
  full_name: string; phone: string; gender?: Member['gender']; planId: string; startDate: string
  discount: number; paid: number; method: PaymentMethod; slotTime?: string; language: 'en' | 'te'
}) {
  db.counters.member++
  const member: Member = {
    id: nid('member'), member_code: `${db.studio.settings.member_code_prefix}${String(db.counters.member).padStart(4, '0')}`,
    full_name: input.full_name, phone: input.phone, gender: input.gender, preferred_language: input.language,
    status: 'active', joined_on: input.startDate,
  }
  db.members.push(member)
  const plan = db.plans.find((p) => p.id === input.planId)!
  if (input.slotTime) {
    for (const s of db.slots.filter((x) => x.start_time === input.slotTime && x.tier === plan.tier)) {
      db.bookings.push({ id: nid('booking'), member_id: member.id, slot_id: s.id, booking_date: null, status: 'booked' })
      if (s.coach_id && !db.care.some((c) => c.member_id === member.id && c.staff_id === s.coach_id)) {
        db.care.push({ member_id: member.id, staff_id: s.coach_id, role: 'coach', is_primary: true })
      }
    }
  }
  return renewMember({ memberId: member.id, planId: input.planId, startDate: input.startDate, discount: input.discount, paid: input.paid, method: input.method })
    .then((r) => ({ ...r, memberId: member.id }))
}

export interface MemberDetail {
  member: Member
  cycle: CycleOverview | null
  history: CycleOverview[]
  payments: typeof db.payments
  attendance: Array<Attendance & { time?: string }>
  coaches: Staff[]
  doctor?: Staff
  health?: MemberHealth
  standing: Slot[]
  risk: Risk
}

export function getMember(id: string): Promise<MemberDetail> {
  const member = memberById(id)
  const history = db.cycles.filter((c) => c.member_id === id).map((c) => overview(c.id)).sort((a, b) => b.start_date.localeCompare(a.start_date))
  const links = db.care.filter((c) => c.member_id === id)
  const standingSlotIds = db.bookings.filter((b) => b.member_id === id && b.booking_date === null && b.status === 'booked').map((b) => b.slot_id)
  const standing = db.slots.filter((s) => standingSlotIds.includes(s.id))
  return wait({
    member,
    cycle: currentCycle(id),
    history,
    payments: db.payments.filter((p) => p.member_id === id).sort((a, b) => b.paid_on.localeCompare(a.paid_on)),
    attendance: db.attendance
      .filter((a) => a.member_id === id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((a) => ({ ...a, time: db.slots.find((s) => s.id === a.slot_id)?.start_time })),
    coaches: links.filter((l) => l.role === 'coach').map((l) => db.staff.find((s) => s.id === l.staff_id)!),
    doctor: db.staff.find((s) => s.id === links.find((l) => l.role === 'doctor')?.staff_id),
    health: db.health.find((h) => h.member_id === id),
    standing,
    risk: riskOf(id),
  })
}

export function recordPayment(input: { memberId: string; cycleId: string | null; amount: number; method: PaymentMethod }) {
  db.counters.receipt++
  const receipt = `${db.studio.settings.receipt_prefix}${String(db.counters.receipt).padStart(5, '0')}`
  db.payments.push({ id: nid('pay'), member_id: input.memberId, cycle_id: input.cycleId, amount: input.amount, method: input.method, paid_on: todayISO(), receipt_number: receipt })
  // A cleared balance closes its follow-up.
  const c = input.cycleId ? overview(input.cycleId) : null
  if (c && c.amount_due <= 0) {
    db.followUps.filter((f) => f.member_id === input.memberId && f.type === 'balance_due' && f.status === 'open')
      .forEach((f) => { f.status = 'done'; f.outcome = 'Paid'; f.done_at = new Date().toISOString() })
  }
  return wait({ receipt })
}

export function renewMember(input: { memberId: string; planId: string; startDate: string; discount: number; paid: number; method: PaymentMethod }) {
  const plan = db.plans.find((p) => p.id === input.planId)!
  const cycle = {
    id: nid('cycle'), member_id: input.memberId, plan_id: plan.id, start_date: input.startDate, duration_days: plan.duration_days,
    extension_days: 0, frozen_days: 0, sessions_total: plan.sessions, sessions_used: 0, price: plan.price,
    discount_amount: input.discount, status: (input.startDate > todayISO() ? 'upcoming' : 'active') as 'upcoming' | 'active', autopay: false,
  }
  db.cycles.push(cycle)
  const m = memberById(input.memberId)
  m.status = 'active'
  db.followUps.filter((f) => f.member_id === input.memberId && f.type === 'renewal' && f.status === 'open')
    .forEach((f) => { f.status = 'done'; f.outcome = 'Renewed'; f.done_at = new Date().toISOString() })
  if (input.paid > 0) return recordPayment({ memberId: input.memberId, cycleId: cycle.id, amount: input.paid, method: input.method })
  return wait({ receipt: null as string | null })
}

// ---------------------------------------------------------------------------
// Slots and attendance
// ---------------------------------------------------------------------------
export interface SlotBooking {
  member: Member
  cycle: CycleOverview | null
  attendance?: Attendance
  risk: Risk
}
export interface DaySlot {
  slot: Slot
  coach: string
  state: 'done' | 'live' | 'upcoming'
  people: SlotBooking[]
  present: number
}

export function slotState(date: string, start: string): DaySlot['state'] {
  const today = todayISO()
  if (date < today) return 'done'
  if (date > today) return 'upcoming'
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  const s = minutesOf(start)
  if (now >= s + 60) return 'done'
  if (now >= s) return 'live'
  return 'upcoming'
}

export function daySlots(date: string, coachId?: string): Promise<DaySlot[]> {
  const wd = isoWeekday(date)
  const list = db.slots
    .filter((s) => s.weekday === wd && (!coachId || s.coach_id === coachId))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((slot) => {
      const ids = new Set(db.bookings.filter((b) => b.slot_id === slot.id && b.status === 'booked' && (b.booking_date === null || b.booking_date === date)).map((b) => b.member_id))
      const people = [...ids]
        .map((id) => memberById(id))
        .filter((m) => m.status === 'active')
        .map((m) => ({
          member: m,
          cycle: currentCycle(m.id),
          attendance: db.attendance.find((a) => a.member_id === m.id && a.date === date && a.slot_id === slot.id),
          risk: riskOf(m.id),
        }))
        .sort((a, b) => a.member.full_name.localeCompare(b.member.full_name))
      return {
        slot,
        coach: staffName(slot.coach_id),
        state: slotState(date, slot.start_time),
        people,
        present: people.filter((p) => p.attendance?.status === 'present').length,
      }
    })
  return wait(list)
}

export function markAttendance(input: { memberId: string; slotId: string; date: string; status: AttendanceStatus | null }) {
  const existing = db.attendance.find((a) => a.member_id === input.memberId && a.slot_id === input.slotId && a.date === input.date)
  const cycle = currentCycle(input.memberId)
  if (existing && input.status === null) db.attendance.splice(db.attendance.indexOf(existing), 1)
  else if (existing && input.status) existing.status = input.status
  else if (input.status) db.attendance.push({ id: nid('att'), member_id: input.memberId, cycle_id: cycle?.id ?? null, slot_id: input.slotId, date: input.date, status: input.status })
  // Keep the session count in step, as the database trigger does.
  if (cycle) {
    const c = db.cycles.find((x) => x.id === cycle.id)!
    c.sessions_used = db.attendance.filter((a) => a.cycle_id === c.id && a.status === 'present').length
  }
  return wait(true)
}

export function coachLoad(weekStart: string) {
  const coaches = db.staff.filter((s) => s.role === 'coach' && s.active)
  return wait(coaches.map((c) => {
    let booked = 0, capacity = 0
    for (let d = 0; d < 6; d++) {
      const wd = isoWeekday(addDays(weekStart, d))
      for (const s of db.slots.filter((x) => x.weekday === wd && x.coach_id === c.id)) {
        capacity += s.capacity
        booked += db.bookings.filter((b) => b.slot_id === s.id && b.status === 'booked').length
      }
    }
    return { coach: c, booked, capacity }
  }))
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------
export interface FollowUpRow {
  followUp: FollowUp
  name: string
  phone: string
  memberId?: string
  context: string
  bucket: 'overdue' | 'today' | 'upcoming'
}

function followUpContext(f: FollowUp): { name: string; phone: string; context: string; memberId?: string } {
  if (f.member_id) {
    const m = memberById(f.member_id)
    const c = currentCycle(m.id)
    let context = f.notes ?? ''
    if (f.type === 'renewal' && c) context = `${c.plan_name.split(' (')[0]} · ${c.days_left >= 0 ? `ends ${c.end_date === todayISO() ? 'today' : new Date(c.end_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}` : `ended ${-c.days_left} days ago`} · ${c.sessions_used} of ${c.sessions_total} used`
    if (f.type === 'balance_due' && c) context = `${c.amount_due > 0 ? `₹${c.amount_due.toLocaleString('en-IN')} due` : 'Paid'} · ${c.plan_name.split(' (')[0]}`
    if (f.type === 'at_risk') context = riskOf(m.id).reason ?? f.notes ?? ''
    return { name: m.full_name, phone: m.phone, context, memberId: m.id }
  }
  const l = db.leads.find((x) => x.id === f.lead_id) as Lead
  return { name: l.full_name, phone: l.phone, context: f.notes ?? `${l.source ?? 'Enquiry'} · ${l.stage.replace('_', ' ')}` }
}

export function followUps(opts: { assignedTo?: string; includeDone?: boolean } = {}): Promise<FollowUpRow[]> {
  const today = todayISO()
  const rows = db.followUps
    .filter((f) => (opts.includeDone ? true : f.status === 'open'))
    .filter((f) => !opts.assignedTo || f.assigned_to === opts.assignedTo)
    .map((f) => {
      const day = f.due_at.slice(0, 10)
      return { followUp: f, ...followUpContext(f), bucket: (day < today ? 'overdue' : day === today ? 'today' : 'upcoming') as FollowUpRow['bucket'] }
    })
    .sort((a, b) => a.followUp.due_at.localeCompare(b.followUp.due_at))
  return wait(rows)
}

export function completeFollowUp(id: string, outcome: string) {
  const f = db.followUps.find((x) => x.id === id)!
  f.status = 'done'; f.outcome = outcome; f.done_at = new Date().toISOString()
  return wait(true)
}

// ---------------------------------------------------------------------------
// Home screens
// ---------------------------------------------------------------------------
export async function todaySummary() {
  const today = todayISO()
  const slots = await daySlots(today)
  const live = slots.find((s) => s.state === 'live') ?? null
  const next = slots.find((s) => s.state === 'upcoming') ?? null
  const active = db.members.filter((m) => m.status === 'active').map((m) => m.id)
  const atRisk = active.filter((id) => riskOf(id).level === 'red').length
  const renewals = active.map((id) => currentCycle(id)).filter((c) => c && c.days_left >= 0 && c.days_left <= 7).length
  const balances = db.cycles.map((c) => overview(c.id)).filter((c) => c.amount_due > 0).length
  const due = (await followUps()).filter((r) => r.bucket !== 'upcoming')
  return { live, next, atRisk, renewals, balances, due }
}

export async function ownerKpis() {
  const today = todayISO()
  const month = today.slice(0, 7)
  const collectedToday = db.payments.filter((p) => p.paid_on === today).reduce((s, p) => s + p.amount, 0)
  const collectedMonth = db.payments.filter((p) => p.paid_on.startsWith(month)).reduce((s, p) => s + p.amount, 0)
  const all = db.cycles.map((c) => overview(c.id))
  const dues = all.reduce((s, c) => s + Math.max(c.amount_due, 0), 0)
  const activeMembers = db.members.filter((m) => m.status === 'active')
  const byTier = { group: 0, semi_private: 0, elite: 0 } as Record<string, number>
  for (const m of activeMembers) { const c = currentCycle(m.id); if (c) byTier[c.plan_tier] = (byTier[c.plan_tier] ?? 0) + 1 }
  const renewing = activeMembers.map((m) => currentCycle(m.id)!).filter((c) => c && c.days_left >= 0 && c.days_left <= 7)
  const red = activeMembers.filter((m) => riskOf(m.id).level === 'red')
  const atRiskValue = red.reduce((s, m) => s + (currentCycle(m.id)?.price ?? 0), 0)
  // Daily collections for the last 30 days.
  const daily = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(today, i - 29)
    return { date: d, amount: db.payments.filter((p) => p.paid_on === d).reduce((s, p) => s + p.amount, 0) }
  })
  const recent = [...db.payments].sort((a, b) => b.paid_on.localeCompare(a.paid_on) || b.receipt_number.localeCompare(a.receipt_number)).slice(0, 6)
    .map((p) => ({ ...p, name: memberById(p.member_id).full_name }))
  return wait({
    collectedToday, collectedMonth, dues, active: activeMembers.length, byTier,
    renewals: renewing.length, renewalValue: renewing.reduce((s, c) => s + c.price, 0),
    atRiskCount: red.length, atRiskValue, daily, recent,
    leadsOpen: db.leads.filter((l) => !['won', 'lost'].includes(l.stage)).length,
    risky: red.map((m) => ({ member: m, risk: riskOf(m.id), coach: staffName(db.care.find((c) => c.member_id === m.id && c.role === 'coach')?.staff_id) })),
  })
}

export async function memberHome(memberId: string) {
  const d = await getMember(memberId)
  const today = todayISO()
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  // Next standing slot from now.
  let next: { date: string; slot: Slot } | null = null
  for (let i = 0; i < 8 && !next; i++) {
    const date = addDays(today, i)
    const s = d.standing.find((x) => x.weekday === isoWeekday(date) && (i > 0 || minutesOf(x.start_time) > now))
    if (s) next = { date, slot: s }
  }
  const plan = d.cycle ? db.plans.find((p) => p.id === d.cycle!.plan_id) as Plan : null
  return { ...d, next, coach: d.coaches[0], plan, banners: db.banners.filter((b) => b.active) }
}

export async function coachHome(staffId: string) {
  const today = todayISO()
  const mine = db.care.filter((c) => c.staff_id === staffId && c.role === 'coach').map((c) => c.member_id)
  const sessions = await daySlots(today, staffId)
  const attention = mine
    .map((id) => ({ member: memberById(id), risk: riskOf(id), health: db.health.find((h) => h.member_id === id) }))
    .filter((x) => x.member.status === 'active' && (x.risk.level !== 'green'))
    .sort((a, b) => (a.risk.level === 'red' ? -1 : 1) - (b.risk.level === 'red' ? -1 : 1))
  const plansToWrite = mine
    .map((id) => ({ member: memberById(id), health: db.health.find((h) => h.member_id === id) }))
    .filter((x) => x.health && ['approved', 'approved_with_limits'].includes(x.health.doctor_decision))
  let weekBooked = 0
  for (let d = 0; d < 6; d++) {
    const wd = isoWeekday(addDays(today, d - isoWeekday(today) + 1))
    for (const s of db.slots.filter((x) => x.weekday === wd && x.coach_id === staffId)) weekBooked += db.bookings.filter((b) => b.slot_id === s.id && b.status === 'booked').length
  }
  return { sessions, attention, plansToWrite, members: mine.length, weekBooked }
}

export async function doctorHome(staffId: string) {
  const mine = db.care.filter((c) => c.staff_id === staffId && c.role === 'doctor').map((c) => c.member_id)
  const rows = mine.map((id) => ({
    member: memberById(id),
    health: db.health.find((h) => h.member_id === id),
    coach: staffName(db.care.find((c) => c.member_id === id && c.role === 'coach')?.staff_id),
    plan: currentCycle(id)?.plan_name.split(' (')[0],
  })).filter((r) => r.member.status === 'active')
  return {
    holds: rows.filter((r) => r.health?.doctor_decision === 'hold'),
    pending: rows.filter((r) => !r.health || r.health.doctor_decision === 'pending'),
    reviewed: rows.filter((r) => r.health && ['approved', 'approved_with_limits'].includes(r.health.doctor_decision)),
  }
}

export function recordDecision(memberId: string, decision: MemberHealth['doctor_decision'], limits?: string) {
  let h = db.health.find((x) => x.member_id === memberId)
  if (!h) { h = { member_id: memberId, doctor_decision: 'pending' }; db.health.push(h) }
  h.doctor_decision = decision
  h.doctor_limits = limits
  h.decided_at = todayISO()
  return wait(true)
}
