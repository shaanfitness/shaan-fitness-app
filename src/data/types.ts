// Shapes of the data the app works with. They mirror the database tables in
// supabase/migrations, so the demo data and the live database look the same.

export type StaffRole = 'owner' | 'front_desk' | 'coach' | 'doctor'
export type Role = StaffRole | 'member'
export type PlanTier = 'group' | 'semi_private' | 'elite' | 'custom'
export type MemberStatus = 'active' | 'inactive' | 'frozen' | 'expired'
export type CycleStatus = 'upcoming' | 'active' | 'frozen' | 'completed' | 'expired' | 'cancelled'
export type AttendanceStatus = 'present' | 'absent' | 'late_cancel'
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'razorpay' | 'other'
export type LeadStage = 'new' | 'contacted' | 'trial_booked' | 'trial_done' | 'negotiating' | 'won' | 'lost'
export type DoctorDecision = 'pending' | 'approved' | 'approved_with_limits' | 'hold'
export type FollowUpType = 'renewal' | 'balance_due' | 'trial' | 'enquiry' | 'at_risk' | 'birthday' | 'feedback'

export interface StudioSettings {
  receipt_prefix: string
  member_code_prefix: string
  gst: { enabled: boolean; rate: number; number: string | null }
  unused_sessions: { mode: 'expire' | 'carry' | 'extend'; carry_cap: number }
  extensions: { max_per_cycle: number; days: number; fee: number }
  freeze: { max_days: number; fee: number; needs_approval: boolean }
  trials: { free_sessions: number }
  renewal_reminders: { days_before: number[]; sessions_left: number | null }
  booking: { cancel_cutoff_hours: number; advance_days: number }
  working_days: number[]
}

export interface Studio {
  id: string
  name: string
  timezone: string
  currency: string
  settings: StudioSettings
}

export interface Staff {
  id: string
  role: StaffRole
  full_name: string
  phone: string
  title?: string
  level?: string
  registration_number?: string
  active: boolean
}

export interface Member {
  id: string
  member_code: string
  full_name: string
  phone: string
  email?: string
  gender?: 'female' | 'male' | 'other'
  date_of_birth?: string
  preferred_language: 'en' | 'te'
  status: MemberStatus
  joined_on: string
  lead_source?: string
  notes?: string
}

export interface CareLink {
  member_id: string
  staff_id: string
  role: 'coach' | 'doctor'
  is_primary: boolean
}

export interface MemberHealth {
  member_id: string
  conditions?: string
  injuries?: string
  doctor_decision: DoctorDecision
  doctor_limits?: string
  decided_at?: string
}

export interface Plan {
  id: string
  name: string
  tier: PlanTier
  price: number
  sessions: number | null
  duration_days: number
  includes_personal_coach: boolean
  includes_doctor: boolean
  active: boolean
}

export interface Cycle {
  id: string
  member_id: string
  plan_id: string
  start_date: string
  duration_days: number
  extension_days: number
  frozen_days: number
  sessions_total: number | null
  sessions_used: number
  price: number
  discount_amount: number
  status: CycleStatus
  autopay: boolean
}

// What the cycle_overview view adds on top of a cycle.
export interface CycleOverview extends Cycle {
  end_date: string
  plan_name: string
  plan_tier: PlanTier
  sessions_left: number
  days_left: number
  amount_paid: number
  amount_due: number
}

export interface Slot {
  id: string
  weekday: number // ISO: 1 = Monday
  start_time: string // 'HH:MM'
  duration_minutes: number
  capacity: number
  tier: PlanTier
  coach_id: string | null
}

export interface Booking {
  id: string
  member_id: string
  slot_id: string
  booking_date: string | null // null = standing slot
  status: 'booked' | 'cancelled'
}

export interface Attendance {
  id: string
  member_id: string
  cycle_id: string | null
  slot_id: string | null
  date: string
  status: AttendanceStatus
}

export interface Payment {
  id: string
  member_id: string
  cycle_id: string | null
  amount: number
  method: PaymentMethod
  paid_on: string
  receipt_number: string
}

export interface Lead {
  id: string
  full_name: string
  phone: string
  source?: string
  stage: LeadStage
  temperature: 'hot' | 'warm' | 'cold'
  interested_plan_id?: string
  created_at: string
  notes?: string
}

export interface FollowUp {
  id: string
  member_id?: string
  lead_id?: string
  type: FollowUpType
  due_at: string
  assigned_to?: string
  status: 'open' | 'done' | 'cancelled'
  outcome?: string
  notes?: string
  done_at?: string
}

export interface Banner {
  id: string
  title: string
  details?: string
  image_url?: string
  link_type?: 'plan' | 'coupon' | 'class' | 'event' | 'url'
  ends_on?: string
  active: boolean
}

// Who is signed in, and as what.
export interface SessionUser {
  role: Role
  name: string
  initials: string
  staffId?: string
  memberId?: string
}
