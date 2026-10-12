import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useMe } from '../auth'
import { fmtClock } from '../lib/dates'
import { throwIf } from './studio'

// Batches & Classes, appointments, programs and attendance reports (YDL "Batches & Classes",
// "Daily Booking Appointment", "Attendance Reports"). The rules live in the database
// (capacity, waiting list, plan limits, who may book); these are thin wrappers.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** YDL writes the days out in full, comma separated. */
export const daysLabel = (days: number[] | null | undefined, short = false) =>
  !days?.length ? '—' : days.length === 7 ? 'All days' : [...days].sort().map((d) => (short ? DAY_SHORT : DAY_NAMES)[d - 1]).join(', ')
export const timeRange = (a: string | null | undefined, b: string | null | undefined) => `${fmtClock(a)} - ${fmtClock(b)}`
export const GENDER_LABEL: Record<string, string> = { all: 'Unisex', male: 'Men', female: 'Women' }
/** ISO weekday (1 = Monday) of a YYYY-MM-DD date. */
export const isoDow = (d: string) => { const n = new Date(`${d}T00:00:00`).getDay(); return n === 0 ? 7 : n }

export interface BatchRow {
  id: string; studio_id: string; batch_code: string | null; name: string; info: string | null; capacity: number | null; room: string | null
  trainer_ids: string[]; service_ids: string[]; start_date: string | null; end_date: string | null; days: number[]
  start_time: string; end_time: string; gender: 'all' | 'male' | 'female'; photo_url: string | null; active: boolean
  trainer_names: string | null; service_names: string | null; member_count: number; in_use: boolean; created_at: string
}

export interface ClassSlot {
  batch_id: string; class_date: string; batch_code: string | null; batch_name: string; title: string; info: string | null; room: string | null
  start_time: string; end_time: string; trainer_ids: string[]; trainer_names: string | null; service_ids: string[]
  capacity: number | null; gender: string; days: number[]; booked: number; waiting: number; enrolled: number; changed: boolean
}

export type BookingState = 'booked' | 'approved' | 'pending' | 'rejected' | 'cancelled' | 'deleted'
export interface BookingRow {
  id: string; studio_id: string; batch_id: string; member_id: string; subscription_id: string | null; class_date: string
  status: 'booked' | 'waiting' | 'rejected'; from_waiting_list: boolean; token: string; source: string; booked_by: string | null
  attendance_id: string | null; cancelled_at: string | null; cancel_source: string | null; deleted_at: string | null; delete_source: string | null
  created_at: string; member_name: string; client_code: string | null; member_country_code: string; member_phone: string | null
  member_email: string | null; member_gender: string | null; batch_code: string | null; batch_name: string; class_name: string
  start_time: string; end_time: string; days: number[]; service_ids: string[]; trainer_ids: string[]; trainer_names: string | null
  service_names: string | null; plan_name: string | null; subscription_end_date: string | null; payment_status: string | null
  subscription_state: string | null; booked_by_name: string | null; cancelled_by_name: string | null; deleted_by_name: string | null
  check_in: string | null; check_out: string | null; booking_state: BookingState
}

export interface CheckinRow {
  id: string; member_id: string; subscription_id: string | null; batch_id: string | null; date: string; check_in: string; check_out: string | null
  source: string; status: string; member_name: string; client_code: string | null; member_country_code: string; member_phone: string | null
  member_email: string | null; member_gender: string | null; member_level: string | null; member_photo: string | null; member_age: number | null
  checkin_hour: number; batch_name: string | null; batch_code: string | null; batch_service_ids: string[] | null; conducted_by: string | null
  batch_service_names: string | null; plan_id: string | null; plan_name: string | null; plan_service_ids: string[] | null
  subscription_end_date: string | null; payment_status: string | null; subscription_state: string | null; trainer_name: string | null
}

export interface Program {
  id: string; studio_id: string; name: string; meeting_link: string; days: number[]; gender: 'all' | 'male' | 'female'
  start_time: string; end_time: string; audience: string; trainer_ids: string[]; service_ids: string[]; live: boolean; active: boolean
  created_at: string; trainer_names?: string | null; attendance_count?: number
}
export const AUDIENCE: [string, string][] = [
  ['all', 'All Clients'], ['paid', 'Only Paid Clients'], ['trial', 'Only Free Trial Clients'], ['paid_trial', 'Only Paid & Trial Clients'],
  ['enquiry', 'Only Prospects/Enquiries'], ['enquiry_trial', 'Only Prospects/Enquiries & Trial Clients'], ['expired_trial', 'Only Expired & Trial Clients'],
  ['expired', 'Only Expired'],
]
export const audienceLabel = (a: string) => AUDIENCE.find(([k]) => k === a)?.[1] ?? a

export type AppointmentStatus = 'open' | 'no_action' | 'attended' | 'no_show' | 'cancelled' | 'rescheduled' | 'confirmed' | 'wait_list' | 'other'
/** YDL Schedule Appointment's statuses (Rescheduled when editing; Confirmed and Wait List for members' requests). */
export const APPOINTMENT_STATUS: [AppointmentStatus, string][] = [
  ['open', 'Open'], ['no_action', 'No Action'], ['attended', 'Attended'], ['no_show', 'No Show'], ['cancelled', 'Cancelled'],
  ['rescheduled', 'Rescheduled'], ['confirmed', 'Confirmed'], ['wait_list', 'Wait List'], ['other', 'Other'],
]
export const APPOINTMENT_CHIP: Record<AppointmentStatus, string> = {
  open: 'chip-info', no_action: 'chip-muted', attended: 'chip-green', no_show: 'chip-red', cancelled: 'chip-muted', rescheduled: 'chip-amber', confirmed: 'chip-green',
  wait_list: 'chip-amber', other: 'chip-muted',
}
export interface Appointment {
  id: string; studio_id: string; title: string; batch_id: string | null; appointment_date: string; start_time: string; end_time: string
  member_id: string; handled_by: string | null; room_no: string | null; status: AppointmentStatus; notify_client: boolean; created_at: string
  purpose: string | null; comments: string | null; requested_by_member: boolean
  member_name: string; client_code: string | null; member_kind: string; member_country_code: string; member_phone: string | null
  handled_by_name: string | null; handled_by_photo: string | null; created_by_name: string | null; batch_name: string | null
}

export interface StaffSummaryRow {
  staff_id: string; staff_code: string | null; full_name: string; role: string; working_days: number; present_days: number; missed_days: number
  first_in: string | null; last_out: string | null
}
export interface StaffAttendanceRow {
  id: string; staff_id: string; date: string; check_in: string; check_out: string | null; source: string
  staff_name: string; staff_code: string | null; staff_role: string; marked_by_name: string | null
}
export interface LeaderRow {
  member_id: string; member_name: string; client_code: string | null; member_gender: string | null; member_country_code: string
  member_phone: string | null; member_email: string | null; total: number; latest_in: string | null; latest_out: string | null
  live_status: string; current_plan_name: string | null; current_end_date: string | null
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export function useBatchList() {
  const { studioId } = useMe()
  return useQuery({
    queryKey: ['batch-overview', studioId],
    queryFn: async () => throwIf(await supabase.from('batch_overview').select('*').eq('studio_id', studioId).order('start_time').order('name')) as BatchRow[],
  })
}

export function useSchedule(from: string, to: string, enabled = true) {
  const { studioId } = useMe()
  return useQuery({
    queryKey: ['class-schedule', studioId, from, to], enabled: enabled && !!from && !!to, placeholderData: (p) => p,
    queryFn: () => rpc<ClassSlot[]>('class_schedule', { p_studio: studioId, p_from: from, p_to: to }),
  })
}

export async function classBookings(batchId: string, date: string) {
  return throwIf(await supabase.from('class_booking_overview').select('*').eq('batch_id', batchId).eq('class_date', date)
    .is('deleted_at', null).is('cancelled_at', null).order('created_at')) as BookingRow[]
}

// ---------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------
export const bookClass = (p: { batch_id: string; class_date: string; member_id?: string; client_code?: string; source?: 'crm' | 'calendar'; waiting_list?: boolean }) =>
  rpc<string>('book_class', { p })
export const cancelBookings = (ids: string[], source?: string) => rpc<number>('cancel_class_bookings', { p_ids: ids, p_source: source ?? null })
export const deleteBookings = (ids: string[], source = 'CRM') => rpc<number>('delete_class_bookings', { p_ids: ids, p_source: source })
export const decideWaiting = (ids: string[], approve: boolean) => rpc<number>('decide_waiting_list', { p_ids: ids, p_approve: approve })
export const classCheckIn = (batchId: string, date: string, memberIds: string[]) =>
  rpc<number>('class_check_in', { p_batch: batchId, p_date: date, p_member_ids: memberIds })
export const saveClassSession = (p: { batch_id: string; class_date: string; title?: string; start_time?: string; end_time?: string; trainer_ids?: string[] }) =>
  rpc<void>('save_class_session', { p })
export const saveAppointment = (p: Record<string, unknown>) => rpc<string>('save_appointment', { p })
export const staffCheckIn = (staffId: string, out = false) => rpc<string>('staff_check_in', { p_staff: staffId, p_out: out })
export const staffAttendanceSummary = (studioId: string, group: 'trainer' | 'staff', from: string, to: string) =>
  rpc<StaffSummaryRow[]>('staff_attendance_summary', { p_studio: studioId, p_group: group, p_from: from, p_to: to })
export const checkinLeaderboard = (studioId: string, from: string, to: string) =>
  rpc<LeaderRow[]>('checkin_leaderboard', { p_studio: studioId, p_from: from, p_to: to })

/** Batch banner pictures go to the public "studio-media" bucket. */
export async function uploadStudioMedia(studioId: string, folder: string, file: File) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${studioId}/${folder}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('studio-media').upload(path, file, { contentType: file.type, upsert: false })
  if (up.error) throw new Error(`The picture couldn't be uploaded: ${up.error.message}`)
  return supabase.storage.from('studio-media').getPublicUrl(path).data.publicUrl
}
