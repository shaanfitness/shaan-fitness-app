import { supabase } from '../lib/supabase'
import { throwIf } from './studio'

// The coach app (supabase/migrations/20261016000020_coach_app.sql): the coach's day, class rosters,
// PT sessions, appointments and leave.

export interface CoachDay {
  date: string
  staff: { id: string; name: string }
  shift: { check_in: string; check_out: string | null } | null
  classes: { id: string; name: string; start_time: string; end_time: string; capacity: number | null; expected: number; present: number }[]
  pt: { subscription_id: string; member_id: string; name: string; plan_name: string; sessions_total: number | null; sessions_used: number; end_date: string; done_today: boolean; last_session: string | null }[]
  appointments: { id: string; title: string; start_time: string; end_time: string; status: string; member_id: string | null; member_name: string | null; room_no: string | null }[]
  leave: { id: string; start_date: string; end_date: string; mode: 'full' | 'morning_half' | 'evening_half'; days: number; status: 'pending' | 'approved' | 'rejected'; reason: string | null }[]
}
export interface RosterRow { member_id: string; name: string; code: string | null; booked: boolean; in_batch: boolean; present: boolean; check_in: string | null }

const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const coachDay = () => rpc<CoachDay>('coach_day', {})
export const coachRoster = (batchId: string, date: string) => rpc<RosterRow[]>('coach_roster', { p_batch: batchId, p_date: date })
export const recordSession = (p: { subscription_id: string; show: 'show' | 'no_show_deduct' | 'no_show'; activity?: string }) => rpc<string>('record_session', { p })
export const setAppointmentStatus = (id: string, status: string) => rpc<string>('save_appointment', { p: { id, status } })
export async function askLeave(studioId: string, staffId: string, v: { start: string; end: string; mode: string; reason: string }) {
  throwIf(await supabase.from('leave_requests').insert({ studio_id: studioId, staff_id: staffId, start_date: v.start, end_date: v.end, mode: v.mode, reason: v.reason.trim() || null }).select('id'))
}
