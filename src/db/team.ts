import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../lib/supabase'
import type { StaffRole } from './types'

// Staff and trainers, access control, leave, targets, payroll, coupons, combo offers,
// transformations, expenses and vendors (YDL Staff, Trainers, Accounts, Memberships).

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export interface StaffRow {
  id: string; studio_id: string; user_id: string | null; role: StaffRole; staff_code: string | null; first_name: string; last_name: string | null
  full_name: string; email: string | null; country_code: string; phone: string | null; emergency_phone: string | null; date_of_birth: string | null
  gender: string | null; employee_type: string | null; designation: string | null; title: string | null; years_experience: number | null
  client_limit: number | null; show_in_member_app: boolean; service_type: 'both' | 'online' | 'offline'; service_ids: string[]; working_days: number[]
  photo_url: string | null; street1: string | null; street2: string | null; city: string | null; state: string | null; country: string | null; pincode: string | null
  star_trainer: boolean; registration_number: string | null; permissions: Record<string, boolean>; active: boolean; access_type: string | null
  shift_start: string | null; shift_end: string | null; created_at: string
  has_login?: boolean; today_check_in?: string | null; today_check_out?: string | null; client_count?: number
}

export const TRAINER_SWITCHES: [string, string][] = [
  ['allow_workout', 'Allow Workout in Coach App'], ['allow_diet', 'Allow Diet in Coach App'], ['allow_followups', 'Allow Followups in Coach App'],
  ['allow_appointments', 'Allow Appointments in Coach App'], ['assign_subscription', 'Assign Subscription'], ['view_subscription', 'View Subscription'],
  ['view_membership_plan', 'View Membership Plan'], ['create_membership_plan', 'Create Membership Plan'], ['view_programs', 'View Programs'],
  ['create_programs', 'Create Programs'], ['view_all_batches', 'View All Batches'], ['view_self_batches', 'View Self Batches'],
  ['create_self_batches', 'Create Self Batches'], ['create_all_batches', 'Create All Batches'],
]
export const STAFF_SWITCHES: [string, string][] = [
  ['allow_discounting', 'Allow Discounting'], ['only_his_clients', 'Can see only his clients'], ['auto_allocate_leads', 'Auto Allocate Leads'],
]

/**
 * Makes the login for a new staff member or trainer (email and password), without signing the
 * owner out: a separate, throw-away session is used. Supabase emails them a link to confirm.
 */
export async function createLogin(email: string, password: string, name: string) {
  const temp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sf-new-login' } })
  const { error } = await temp.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/login` } })
  if (error && !/already/i.test(error.message)) throw new Error(`The login couldn't be made: ${error.message}`)
}
export const linkStaffLogin = (id: string) => rpc<boolean>('link_staff_login', { p_staff: id })
export const sendPasswordReset = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
  if (error) throw new Error(error.message)
}
export const staffCheckTime = (id: string, checkIn: string, checkOut: string | null) =>
  rpc<string>('staff_add_time', { p_staff: id, p_in: checkIn, p_out: checkOut })
export const deleteStaff = (id: string, to: string | null) => rpc<void>('delete_staff', { p_staff: id, p_to: to })
export const saveAccessControl = (studioId: string, acl: Record<string, unknown>) => rpc<void>('save_access_control', { p_studio: studioId, p_acl: acl })
export const accessControl = (studioId: string) => rpc<Record<string, unknown> | null>('my_access', { p_studio: studioId })

// Leave ------------------------------------------------------------------------------------------
export interface LeaveRow {
  id: string; staff_id: string; start_date: string; end_date: string; mode: 'full' | 'morning_half' | 'evening_half'; days: number
  paid: boolean | null; status: 'pending' | 'approved' | 'rejected'; reason: string | null; cancelled: boolean; created_at: string
  staff_name: string; staff_code: string | null; staff_role: string; staff_phone: string | null; staff_email: string | null; decided_by_name: string | null; decided_at: string | null
}
export const LEAVE_MODE: Record<string, string> = { full: 'Full day', morning_half: 'Morning half day', evening_half: 'Evening half day' }
export const decideLeave = (ids: string[], status: 'approved' | 'rejected', paid?: boolean) => rpc<number>('decide_leave', { p_ids: ids, p_status: status, p_paid: paid ?? null })
export const cancelLeave = (id: string) => rpc<void>('cancel_leave', { p_id: id })

// Targets -----------------------------------------------------------------------------------------
export interface TargetRow {
  id: string; staff_id: string; year: number; month: number; target_type: string | null; commission_type: 'flat' | 'percentage' | null
  tiers: { target: number; commission: number | null }[]; created_at: string; staff_name: string; staff_code: string | null; staff_role: string
  created_by_name: string | null; achieved: number; tier_reached: number | null; commission_earned: number
}
export const TARGET_TYPES: [string, string][] = [
  ['pt', 'Personal Training'], ['general', 'General Training'], ['both', 'Both'], ['new_pt', 'New Personal Training'], ['new_general', 'New General Training'],
  ['renew_pt', 'Renew Personal Training'], ['renew_general', 'Renew General Training'],
]
export const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']

// Payroll -----------------------------------------------------------------------------------------
export interface PayrollRow {
  staff_id: string; full_name: string; staff_code: string | null; role: string; pay_per: string; basic_pay: number; calendar_days: number
  working_days: number; holidays: number; present_days: number; paid_leaves: number; unpaid_leaves: number; absent_days: number; late_days: number
  paid_days: number; basic_salary: number; pt_commission: number; sales_commission: number; deduction: number; payable: number
}
export interface PayrollEntry extends Omit<PayrollRow, 'full_name' | 'role' | 'pay_per' | 'basic_pay' | 'calendar_days' | 'working_days' | 'unpaid_leaves'> {
  id: string; from_date: string; to_date: string; paid_date: string; bonus: number; mode: string | null; expense_id: string | null; note: string | null
  created_at: string; staff_name: string; staff_role: string; created_by_name: string | null
}
export const payrollCalculate = (studioId: string, from: string, to: string) => rpc<PayrollRow[]>('payroll_calculate', { p_studio: studioId, p_from: from, p_to: to })
export const addPayroll = (studioId: string, p: Record<string, unknown>) => rpc<number>('add_payroll', { p_studio: studioId, p })
export const savePayrollSettings = (studioId: string, trainer: number, staff: number) =>
  rpc<void>('save_payroll_settings', { p_studio: studioId, p_trainer_grace: trainer, p_staff_grace: staff })
export const decideRequest = (kind: 'freeze' | 'extension', id: string, approve: boolean) => rpc<void>('decide_request', { p_kind: kind, p_id: id, p_approve: approve })

// Coupons and combo offers -------------------------------------------------------------------------
export interface CouponRow {
  id: string; studio_id: string; name: string; code: string; type: string; discount: number; service_id: string | null; plan_id: string | null
  member_id: string | null; who_can_use: 'new' | 'existing' | 'both'; start_date: string | null; expiry_date: string | null; max_redemptions: number | null
  max_per_user: number | null; min_order: number | null; max_order: number | null; max_discount: number | null; terms: string | null
  installments: number | null; installment_interval: number | null; installment_unit: string | null; interest_rate: number | null; active: boolean
  created_at: string; service_name?: string | null; plan_name?: string | null; member_name?: string | null; member_code?: string | null
  created_by_name?: string | null; used_count?: number
}
export const COUPON_TYPES: [string, string][] = [
  ['flat', 'Flat Value'], ['percentage', 'Percentage Discount'], ['installments', 'Payment Installments'],
  ['flat_installments', 'Flat value & Payment Installments'], ['percentage_installments', 'Percentage Discount & Payment Installments'],
]
export const couponTypeLabel = (t: string) => COUPON_TYPES.find(([k]) => k === t)?.[1] ?? t
export interface ComboRow { id: string; studio_id: string; name: string; plan_ids: string[]; plan_prices: Record<string, number>; active: boolean; created_at: string }

// Transformations ----------------------------------------------------------------------------------
export interface TransformationRow {
  id: string; studio_id: string; image_url: string | null; client_name: string; member_id: string | null; period_value: number
  period_unit: 'days' | 'weeks' | 'months' | 'years'; trainer_id: string | null; title: string; description: string; consent: boolean
  show_in_app: boolean; created_at: string; trainer_name: string | null; trainer_code: string | null
}

// Expenses and vendors ----------------------------------------------------------------------------
export interface VendorRow { id: string; studio_id: string; name: string; contact_name: string; phone1: string | null; phone2: string | null; gst_no: string | null; note: string | null; active: boolean; created_at: string }
export interface ExpenseRow {
  id: string; studio_id: string; title: string; vendor_id: string | null; category: string; expense_date: string; payment_type: string
  amount: number; gst_amount: number; final_amount: number; gst_no: string | null; note: string | null; created_by: string | null; created_at: string
}
