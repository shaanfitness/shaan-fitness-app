import { supabase } from '../lib/supabase'
import { throwIf } from './studio'
import type { SubscriptionOverview } from './types'
import type { Receipt } from './billing'

// The member app (supabase/migrations/20261016000018_member_app.sql): classes, memberships and freezes,
// attendance, gym traffic, referrals, coaches; and the gym's notifications.

const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export type Blocked = 'gender' | 'no_membership' | 'frozen' | null
export interface MyClass {
  batch_id: string; class_date: string; title: string; info: string | null; room: string | null; start_time: string; end_time: string
  trainer_names: string | null; service_names: string | null; capacity: number | null; booked: number; waiting: number
  booking_id: string | null; booking_status: 'booked' | 'waiting' | null; attended: boolean; blocked: Blocked
}
export const myClasses = (from: string, to: string) => rpc<MyClass[]>('my_classes', { p_from: from, p_to: to })

export interface Program {
  id: string; name: string; meeting_link: string; days: number[]; gender: string; start_time: string; end_time: string; audience: string; live: boolean; active: boolean
}
export async function livePrograms(studioId: string) {
  return throwIf(await supabase.from('programs').select('id,name,meeting_link,days,gender,start_time,end_time,audience,live,active').eq('studio_id', studioId).eq('active', true).order('start_time')) as Program[]
}
export async function joinProgram(studioId: string, programId: string, memberId: string, date: string) {
  const res = await supabase.from('program_attendance').upsert({ studio_id: studioId, program_id: programId, member_id: memberId, date }, { onConflict: 'program_id,member_id,date', ignoreDuplicates: true })
  if (res.error) throw new Error(res.error.message)
}

export async function mySubscriptions(memberId: string) {
  return throwIf(await supabase.from('subscription_overview').select('*').eq('member_id', memberId).order('start_date', { ascending: false }).limit(50)) as SubscriptionOverview[]
}
export async function myPayments(memberId: string) {
  return throwIf(await supabase.from('payment_overview').select('*').eq('member_id', memberId).order('receipt_date', { ascending: false }).limit(100)) as Receipt[]
}
export interface Freeze { id: string; subscription_id: string; start_date: string; end_date: string; days: number; status: 'requested' | 'approved' | 'rejected'; note: string | null; created_at: string }
export async function myFreezes(memberId: string) {
  return throwIf(await supabase.from('freezes').select('id,subscription_id,start_date,end_date,days,status,note,created_at').eq('member_id', memberId).order('created_at', { ascending: false })) as Freeze[]
}
export const requestFreeze = (subscriptionId: string, start: string, days: number, note: string) =>
  rpc<string>('request_freeze', { p_subscription: subscriptionId, p_start: start, p_days: days, p_note: note || null })

export interface Visit { id: string; date: string; check_in: string; check_out: string | null; source: string }
export async function myVisits(memberId: string, from: string, to: string) {
  return throwIf(await supabase.from('attendance').select('id,date,check_in,check_out,source').eq('member_id', memberId).eq('status', 'present')
    .gte('date', from).lte('date', to).order('check_in')) as Visit[]
}

export interface Traffic { now: number; today: number; hours: { h: number; avg: number }[] }
export const gymTraffic = (studioId: string) => rpc<Traffic | null>('gym_traffic', { p_studio: studioId })

export const referFriend = (name: string, phone: string, note: string) => rpc<string>('refer_friend', { p_name: name, p_phone: phone, p_note: note || null })
export const myReferrals = () => rpc<{ id: string; name: string; created_at: string; joined: boolean }[]>('my_referrals', {})

export interface Coach {
  id: string; name: string; designation: string; photo_url: string | null; services: string | null; years_experience: number | null
  phone: string | null; can_call: boolean; can_whatsapp: boolean; can_book: boolean
}
export const myCoaches = () => rpc<Coach[]>('my_coaches', {})

// The gym's notifications -----------------------------------------------------------------------------------------------
export type AlertKind = 'signup' | 'trial' | 'callback' | 'plan' | 'referral' | 'feedback' | 'appointment' | 'order' | 'post' | 'freeze' | 'extension'
export interface StaffAlert { id: string; studio_id: string; kind: AlertKind; member_id: string | null; title: string; body: string | null; link: string | null; created_at: string; done_at: string | null; done_by: string | null }
export const ALERT_LABEL: Record<AlertKind, string> = {
  signup: 'New sign-up', trial: 'Trial request', callback: 'Call back', plan: 'Wants to join', referral: 'Referral', feedback: 'Feedback',
  appointment: 'Appointment request', order: 'App order', post: 'Post to check', freeze: 'Freeze request', extension: 'Extension request',
}
export async function staffAlerts(studioId: string, open: boolean) {
  let q = supabase.from('staff_alerts').select('*').eq('studio_id', studioId)
  if (open) q = q.is('done_at', null)
  return throwIf(await q.order('created_at', { ascending: false }).limit(300)) as StaffAlert[]
}
export async function openAlertCount(studioId: string) {
  const res = await supabase.from('staff_alerts').select('id', { count: 'exact', head: true }).eq('studio_id', studioId).is('done_at', null)
  if (res.error) throw new Error(res.error.message)
  return res.count ?? 0
}
export const markAlertsDone = (studioId: string, ids?: string[]) => rpc<number>('mark_alerts_done', { p_studio: studioId, p_ids: ids ?? null })
