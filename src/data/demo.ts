// Demo data: a believable Shaan Fitness, generated around today's date so every
// screen looks live. Used until the app is connected to the real database.
// All names and numbers here are made up.
import { addDays, isoWeekday, minutesOf, todayISO } from '../lib/format'
import type {
  Attendance, Banner, Booking, CareLink, Cycle, FollowUp, Lead, Member, MemberHealth,
  Payment, PaymentMethod, Plan, Slot, Staff, Studio,
} from './types'

// Small seeded random generator so the demo is the same on every load.
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface DemoStore {
  studio: Studio
  staff: Staff[]
  members: Member[]
  care: CareLink[]
  health: MemberHealth[]
  plans: Plan[]
  cycles: Cycle[]
  slots: Slot[]
  bookings: Booking[]
  attendance: Attendance[]
  payments: Payment[]
  leads: Lead[]
  followUps: FollowUp[]
  banners: Banner[]
  counters: { receipt: number; member: number; id: number }
}

const STUDIO_ID = 'studio-shaan'
export const DEMO_IDS = {
  sabirOwner: 'staff-sabir-owner',
  sabirCoach: 'staff-sabir-coach',
  coach2: 'staff-coach-2',
  desk: 'staff-desk',
  doctor: 'staff-doctor',
  ananya: 'member-ananya',
}

type Seed = { name: string; tier: 'group' | 'semi_private' | 'elite'; slot: string; reliability: number; gender: 'female' | 'male'; started: number; risk?: 'red' | 'amber'; due?: number; lang?: 'en' | 'te' }

// started = days ago the current 28-day cycle began
const MEMBERS: Seed[] = [
  { name: 'Ananya Reddy', tier: 'semi_private', slot: '08:30', reliability: 1, gender: 'female', started: 24 },
  { name: 'Ravi K.', tier: 'semi_private', slot: '08:30', reliability: 0.9, gender: 'male', started: 10 },
  { name: 'Mounika S.', tier: 'semi_private', slot: '17:30', reliability: 0.88, gender: 'female', started: 6, lang: 'te' },
  { name: 'Aditya R.', tier: 'semi_private', slot: '17:30', reliability: 0.8, gender: 'male', started: 15 },
  { name: 'Rohit Chowdary', tier: 'elite', slot: '10:00', reliability: 0.95, gender: 'male', started: 12 },
  { name: 'Priya Nair', tier: 'elite', slot: '20:30', reliability: 0.92, gender: 'female', started: 26 },
  { name: 'Kiran M.', tier: 'group', slot: '07:00', reliability: 0.9, gender: 'male', started: 14 },
  { name: 'Pooja S.', tier: 'group', slot: '07:00', reliability: 0.85, gender: 'female', started: 9 },
  { name: 'Arjun T.', tier: 'group', slot: '07:00', reliability: 0.95, gender: 'male', started: 25 },
  { name: 'Vikram P.', tier: 'group', slot: '07:00', reliability: 0.5, gender: 'male', started: 18, risk: 'red' },
  { name: 'Divya N.', tier: 'group', slot: '07:00', reliability: 0.85, gender: 'female', started: 19 },
  { name: 'Sai Teja K.', tier: 'group', slot: '07:00', reliability: 0.9, gender: 'male', started: 3, lang: 'te' },
  { name: 'Lakshmi P.', tier: 'group', slot: '07:00', reliability: 0.8, gender: 'female', started: 22, lang: 'te' },
  { name: 'Meghana S.', tier: 'group', slot: '05:30', reliability: 0.85, gender: 'female', started: 3, due: 2000 },
  { name: 'Srinivas G.', tier: 'group', slot: '05:30', reliability: 0.9, gender: 'male', started: 23, lang: 'te' },
  { name: 'Bhavana T.', tier: 'group', slot: '05:30', reliability: 0.75, gender: 'female', started: 11 },
  { name: 'Charan D.', tier: 'group', slot: '05:30', reliability: 0.6, gender: 'male', started: 16, risk: 'amber' },
  { name: 'Anusha M.', tier: 'group', slot: '05:30', reliability: 0.92, gender: 'female', started: 7 },
  { name: 'Harsha V.', tier: 'group', slot: '16:00', reliability: 0.8, gender: 'male', started: 13 },
  { name: 'Kavya R.', tier: 'group', slot: '16:00', reliability: 0.55, gender: 'female', started: 17, risk: 'amber' },
  { name: 'Nikhil B.', tier: 'group', slot: '16:00', reliability: 0.88, gender: 'male', started: 5 },
  { name: 'Swathi R.', tier: 'group', slot: '16:00', reliability: 0.9, gender: 'female', started: 20, due: 1500 },
  { name: 'Manoj K.', tier: 'group', slot: '16:00', reliability: 0.45, gender: 'male', started: 21, risk: 'red' },
  { name: 'Praveen L.', tier: 'group', slot: '19:00', reliability: 0.9, gender: 'male', started: 24 },
  { name: 'Deepika V.', tier: 'group', slot: '19:00', reliability: 0.95, gender: 'female', started: 8 },
  { name: 'Tejaswi N.', tier: 'group', slot: '19:00', reliability: 0.82, gender: 'female', started: 26, due: 999 },
  { name: 'Gopi Krishna', tier: 'group', slot: '19:00', reliability: 0.5, gender: 'male', started: 12, risk: 'red' },
  { name: 'Sneha P.', tier: 'group', slot: '19:00', reliability: 0.9, gender: 'female', started: 2 },
]

const EXPIRED = [
  { name: 'Suresh B.', tier: 'group' as const, endedAgo: 6 },
  { name: 'Haritha K.', tier: 'semi_private' as const, endedAgo: 12 },
  { name: 'Venkat R.', tier: 'group' as const, endedAgo: 19 },
]

const LEADS: Array<Omit<Lead, 'id' | 'created_at'> & { daysAgo: number }> = [
  { full_name: 'Rahul Varma', phone: '+91 98480 11223', source: 'Instagram', stage: 'trial_done', temperature: 'hot', daysAgo: 3, notes: 'Trial done yesterday; wants evening group' },
  { full_name: 'Sravani K.', phone: '+91 98490 22334', source: 'Walk-in', stage: 'trial_booked', temperature: 'warm', daysAgo: 2 },
  { full_name: 'Ajay M.', phone: '+91 99890 33445', source: 'Referral', stage: 'contacted', temperature: 'warm', daysAgo: 5 },
  { full_name: 'Keerthi L.', phone: '+91 90000 44556', source: 'Google', stage: 'new', temperature: 'warm', daysAgo: 0 },
  { full_name: 'Naveen P.', phone: '+91 90100 55667', source: 'Instagram', stage: 'negotiating', temperature: 'hot', daysAgo: 6, notes: 'Asked about Semi-Private with a friend' },
  { full_name: 'Jyothi S.', phone: '+91 90200 66778', source: 'Walk-in', stage: 'lost', temperature: 'cold', daysAgo: 20, notes: 'Price; may return after Diwali' },
]

export function buildDemo(): DemoStore {
  const rand = rng(20261007)
  const today = todayISO()
  let id = 0
  const nid = (p: string) => `${p}-${++id}`
  let receipt = 0

  const studio: Studio = {
    id: STUDIO_ID, name: 'Shaan Fitness', timezone: 'Asia/Kolkata', currency: 'INR',
    settings: {
      receipt_prefix: 'SF-', member_code_prefix: 'SF',
      gst: { enabled: false, rate: 18, number: null },
      unused_sessions: { mode: 'expire', carry_cap: 0 },
      extensions: { max_per_cycle: 1, days: 7, fee: 0 },
      freeze: { max_days: 0, fee: 0, needs_approval: true },
      trials: { free_sessions: 1 },
      renewal_reminders: { days_before: [5], sessions_left: null },
      booking: { cancel_cutoff_hours: 2, advance_days: 7 },
      working_days: [1, 2, 3, 4, 5, 6],
    },
  }

  const staff: Staff[] = [
    { id: DEMO_IDS.sabirOwner, role: 'owner', full_name: 'Sabir Rasool', phone: '+91 95023 18090', title: 'Head Coach', active: true },
    { id: DEMO_IDS.sabirCoach, role: 'coach', full_name: 'Sabir', phone: '+91 95023 18090', title: 'Head Coach', active: true },
    { id: DEMO_IDS.coach2, role: 'coach', full_name: 'Second coach', phone: '+91 90000 00003', title: 'Coach', level: 'Level B', active: true },
    { id: DEMO_IDS.desk, role: 'front_desk', full_name: 'Front desk', phone: '+91 90000 00002', active: true },
    { id: DEMO_IDS.doctor, role: 'doctor', full_name: 'Studio doctor', phone: '+91 90000 00004', registration_number: '[Registration no.]', active: true },
  ]

  const plans: Plan[] = [
    { id: 'plan-group', name: 'Group', tier: 'group', price: 4999, sessions: 24, duration_days: 28, includes_personal_coach: false, includes_doctor: false, active: true },
    { id: 'plan-sp', name: 'Semi-Private (Side-by-Side)', tier: 'semi_private', price: 7999, sessions: 24, duration_days: 28, includes_personal_coach: true, includes_doctor: true, active: true },
    { id: 'plan-elite', name: '1:1 Elite', tier: 'elite', price: 14999, sessions: 24, duration_days: 28, includes_personal_coach: true, includes_doctor: true, active: true },
  ]
  const planFor = (tier: string) => plans.find((p) => p.tier === tier)!

  const slotDefs: Array<[string, Slot['tier'], number, string]> = [
    ['05:30', 'group', 9, DEMO_IDS.sabirCoach],
    ['07:00', 'group', 9, DEMO_IDS.sabirCoach],
    ['08:30', 'semi_private', 2, DEMO_IDS.sabirCoach],
    ['10:00', 'elite', 1, DEMO_IDS.sabirCoach],
    ['16:00', 'group', 9, DEMO_IDS.coach2],
    ['17:30', 'semi_private', 2, DEMO_IDS.coach2],
    ['19:00', 'group', 9, DEMO_IDS.sabirCoach],
    ['20:30', 'elite', 1, DEMO_IDS.sabirCoach],
  ]
  const slots: Slot[] = []
  for (let wd = 1; wd <= 6; wd++) {
    for (const [time, tier, capacity, coach] of slotDefs) {
      slots.push({ id: `slot-${wd}-${time.replace(':', '')}-${tier}`, weekday: wd, start_time: time, duration_minutes: tier === 'group' ? 60 : 60, capacity, tier, coach_id: coach })
    }
  }
  const slotOn = (date: string, time: string, tier: string) =>
    slots.find((s) => s.weekday === isoWeekday(date) && s.start_time === time && s.tier === tier)

  const members: Member[] = []
  const care: CareLink[] = []
  const health: MemberHealth[] = []
  const cycles: Cycle[] = []
  const bookings: Booking[] = []
  const attendance: Attendance[] = []
  const payments: Payment[] = []
  const followUps: FollowUp[] = []
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const methods: PaymentMethod[] = ['upi', 'upi', 'upi', 'cash', 'card']

  let code = 0
  const addMember = (name: string, gender: 'female' | 'male', status: Member['status'], joinedAgo: number, lang: 'en' | 'te' = 'en', forcedId?: string) => {
    code++
    const m: Member = {
      id: forcedId ?? nid('member'),
      member_code: `SF${String(code).padStart(4, '0')}`,
      full_name: name,
      phone: `+91 9${String(8000000000 + Math.floor(rand() * 999999999)).slice(0, 9)}`,
      gender, preferred_language: lang, status,
      joined_on: addDays(today, -joinedAgo),
      lead_source: ['Instagram', 'Walk-in', 'Referral', 'Google'][Math.floor(rand() * 4)],
    }
    members.push(m)
    return m
  }

  for (const s of MEMBERS) {
    const m = addMember(s.name, s.gender, 'active', s.started + 28 * Math.floor(rand() * 4), s.lang, s.name === 'Ananya Reddy' ? DEMO_IDS.ananya : undefined)
    const plan = planFor(s.tier)
    const start = addDays(today, -s.started)
    const cycle: Cycle = {
      id: nid('cycle'), member_id: m.id, plan_id: plan.id, start_date: start, duration_days: plan.duration_days,
      extension_days: 0, frozen_days: 0, sessions_total: plan.sessions, sessions_used: 0,
      price: plan.price, discount_amount: 0, status: 'active', autopay: rand() > 0.7,
    }
    cycles.push(cycle)

    const slot = slots.find((x) => x.start_time === s.slot && x.tier === s.tier)!
    bookings.push({ id: nid('booking'), member_id: m.id, slot_id: slot.id.replace(/^slot-\d-/, 'slot-STANDING-'), booking_date: null, status: 'booked' })
    const coachId = slot.coach_id!
    care.push({ member_id: m.id, staff_id: coachId, role: 'coach', is_primary: true })

    // Attendance for each past working day of the cycle (and today's finished slots).
    let used = 0
    const atRiskTail = s.risk === 'red' ? 2 : 0
    for (let d = s.started; d >= 0; d--) {
      const date = addDays(today, -d)
      if (![1, 2, 3, 4, 5, 6].includes(isoWeekday(date))) continue
      const daySlot = slotOn(date, s.slot, s.tier)
      if (!daySlot) continue
      if (d === 0 && minutesOf(s.slot) > nowMinutes) continue
      if (d === 0 && minutesOf(s.slot) + 60 > nowMinutes && rand() < 0.3) continue // live slot: not all marked yet
      let present = rand() < s.reliability
      if (d <= atRiskTail && d > 0) present = false
      if (s.name === 'Ananya Reddy') present = used < 21
      if (used >= (plan.sessions ?? 99)) present = false
      attendance.push({ id: nid('att'), member_id: m.id, cycle_id: cycle.id, slot_id: daySlot.id, date, status: present ? 'present' : 'absent' })
      if (present) used++
    }
    cycle.sessions_used = used

    // Payment on the start date; a few members still owe part of it.
    const due = s.due ?? 0
    receipt++
    payments.push({
      id: nid('pay'), member_id: m.id, cycle_id: cycle.id, amount: plan.price - due,
      method: methods[Math.floor(rand() * methods.length)], paid_on: start,
      receipt_number: `SF-${String(receipt).padStart(5, '0')}`,
    })

    if (plan.includes_doctor || ['Harsha V.', 'Nikhil B.', 'Kavya R.'].includes(s.name)) {
      care.push({ member_id: m.id, staff_id: DEMO_IDS.doctor, role: 'doctor', is_primary: true })
    }
  }

  // Standing bookings point at the weekday-specific slot rows; keep one per weekday.
  const standing = bookings.splice(0)
  for (const b of standing) {
    for (let wd = 1; wd <= 6; wd++) {
      bookings.push({ ...b, id: nid('booking'), slot_id: b.slot_id.replace('STANDING', String(wd)) })
    }
  }

  for (const e of EXPIRED) {
    const m = addMember(e.name, e.name === 'Haritha K.' ? 'female' : 'male', 'expired', 120)
    const plan = planFor(e.tier)
    const start = addDays(today, -(e.endedAgo + plan.duration_days - 1))
    const c: Cycle = {
      id: nid('cycle'), member_id: m.id, plan_id: plan.id, start_date: start, duration_days: plan.duration_days,
      extension_days: 0, frozen_days: 0, sessions_total: plan.sessions, sessions_used: 18 + Math.floor(rand() * 6),
      price: plan.price, discount_amount: 0, status: 'expired', autopay: false,
    }
    cycles.push(c)
    receipt++
    payments.push({ id: nid('pay'), member_id: m.id, cycle_id: c.id, amount: plan.price, method: 'upi', paid_on: start, receipt_number: `SF-${String(receipt).padStart(5, '0')}` })
    care.push({ member_id: m.id, staff_id: DEMO_IDS.sabirCoach, role: 'coach', is_primary: true })
  }

  // Health decisions for members with a doctor.
  const byName = (n: string) => members.find((m) => m.full_name === n)!
  health.push(
    { member_id: byName('Ananya Reddy').id, doctor_decision: 'approved_with_limits', doctor_limits: 'Avoid heavy overhead pressing; lower back history', decided_at: addDays(today, -20) },
    { member_id: byName('Harsha V.').id, doctor_decision: 'hold', doctor_limits: 'Blood pressure 152/96 at check-in; no training until reviewed', decided_at: today },
    { member_id: byName('Nikhil B.').id, injuries: 'Knee history', doctor_decision: 'approved_with_limits', doctor_limits: 'No jumping or deep knee bends', decided_at: addDays(today, -1) },
    { member_id: byName('Ravi K.').id, conditions: 'LDL 162 mg/dL (lipid profile)', doctor_decision: 'pending' },
    { member_id: byName('Kavya R.').id, doctor_decision: 'approved' },
  )

  const leads: Lead[] = LEADS.map(({ daysAgo, ...l }) => ({ ...l, id: nid('lead'), created_at: addDays(today, -daysAgo) }))

  // Follow-ups: what the front desk works through.
  const at = (date: string, time = '10:00') => `${date}T${time}:00`
  for (const c of cycles.filter((x) => x.status === 'active')) {
    const end = addDays(c.start_date, c.duration_days - 1)
    const left = Math.round((Date.parse(end) - Date.parse(today)) / 86400000)
    if (left <= 7 && left >= 0) {
      followUps.push({ id: nid('fu'), member_id: c.member_id, type: 'renewal', due_at: at(addDays(end, -5) < today ? today : addDays(end, -5)), assigned_to: DEMO_IDS.desk, status: 'open' })
    }
  }
  for (const p of payments) {
    const plan = cycles.find((c) => c.id === p.cycle_id)
    if (plan && p.amount < plan.price) {
      followUps.push({ id: nid('fu'), member_id: p.member_id, type: 'balance_due', due_at: at(addDays(p.paid_on, 1) > today ? today : addDays(p.paid_on, 1)), assigned_to: DEMO_IDS.desk, status: 'open' })
    }
  }
  for (const s of MEMBERS.filter((x) => x.risk === 'red')) {
    followUps.push({ id: nid('fu'), member_id: byName(s.name).id, type: 'at_risk', due_at: at(today, '11:00'), assigned_to: DEMO_IDS.sabirCoach, status: 'open', notes: 'Missed the last 2 sessions' })
  }
  const lead = (n: string) => leads.find((l) => l.full_name === n)!
  followUps.push(
    { id: nid('fu'), lead_id: lead('Rahul Varma').id, type: 'trial', due_at: at(today, '12:00'), assigned_to: DEMO_IDS.desk, status: 'open', notes: 'Ask about joining' },
    { id: nid('fu'), lead_id: lead('Ajay M.').id, type: 'enquiry', due_at: at(addDays(today, -1), '17:00'), assigned_to: DEMO_IDS.desk, status: 'open' },
    { id: nid('fu'), lead_id: lead('Naveen P.').id, type: 'enquiry', due_at: at(addDays(today, 1), '11:00'), assigned_to: DEMO_IDS.desk, status: 'open', notes: 'Call with Semi-Private pricing for two' },
    { id: nid('fu'), lead_id: lead('Sravani K.').id, type: 'trial', due_at: at(addDays(today, 1), '07:00'), assigned_to: DEMO_IDS.desk, status: 'open', notes: 'Trial at 7:00 AM group' },
    { id: nid('fu'), member_id: byName('Haritha K.').id, type: 'renewal', due_at: at(addDays(today, -2)), assigned_to: DEMO_IDS.desk, status: 'open', notes: 'Expired 12 days ago' },
  )

  const banners: Banner[] = []

  return {
    studio, staff, members, care, health, plans, cycles, slots, bookings, attendance, payments, leads, followUps, banners,
    counters: { receipt, member: code, id },
  }
}
