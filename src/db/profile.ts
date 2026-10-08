import { supabase } from '../lib/supabase'
import { throwIf } from './studio'
import type { MemberBilling, MemberOverview } from './types'

// Everything the client profile (YDL member page) shows besides subscriptions.

export interface Medical { member_id: string; answers: Record<string, boolean>; note: string | null; updated_at: string }
export interface AttendanceRow {
  id: string; date: string; check_in: string; check_out: string | null; source: string; status: string
  body_temperature: number | null; batch_id: string | null; subscription_id: string | null
}
export interface DocumentRow { id: string; doc_type: string; file_name: string; path: string; created_at: string; uploaded_by: string | null }
export interface ReferralRow {
  id: string; client_code: string | null; referral_date: string; referral_from: string | null; referral_from_type: string
  referral_from_code: string | null; referred_to: string; country_code: string; phone: string | null; address: string | null
  has_app: boolean; referred_by_member_id: string | null; referred_by_staff_id: string | null; kind: 'enquiry' | 'member'; created_at: string
}

export async function getProfile(id: string) {
  const [o, b, med, bm] = await Promise.all([
    supabase.from('member_overview').select('*').eq('id', id).single(),
    supabase.from('member_billing').select('*').eq('member_id', id).maybeSingle(),
    supabase.from('member_medical').select('*').eq('member_id', id).maybeSingle(),
    supabase.from('batch_members').select('batch_id').eq('member_id', id),
  ])
  if (o.error) throw new Error(o.error.code === 'PGRST116' ? 'This client was not found, or you don’t have access to them.' : o.error.message)
  return {
    client: o.data as MemberOverview,
    billing: (b.data ?? null) as MemberBilling | null,
    medical: (med.data ?? null) as Medical | null,
    batchIds: ((bm.data ?? []) as { batch_id: string }[]).map((r) => r.batch_id),
  }
}

export const memberAttendance = async (memberId: string, from?: string, to?: string, source?: string) => {
  let q = supabase.from('attendance').select('*').eq('member_id', memberId)
  if (from) q = q.gte('date', from)
  if (to) q = q.lte('date', to)
  if (source) q = q.eq('source', source)
  return throwIf(await q.order('check_in', { ascending: false }).limit(500)) as AttendanceRow[]
}

export const memberDocuments = async (memberId: string) =>
  throwIf(await supabase.from('member_documents').select('*').eq('member_id', memberId).order('created_at', { ascending: false })) as DocumentRow[]

export async function uploadDocument(studioId: string, memberId: string, docType: string, file: File) {
  const safe = file.name.replace(/[^\w.-]+/g, '_').slice(-80)
  const path = `${studioId}/${memberId}/${crypto.randomUUID()}-${safe}`
  const up = await supabase.storage.from('member-files').upload(path, file, { contentType: file.type, upsert: false })
  if (up.error) throw new Error(up.error.message)
  throwIf(await supabase.from('member_documents').insert({ studio_id: studioId, member_id: memberId, doc_type: docType, file_name: file.name, path }).select('id'))
}

export async function openDocument(path: string) {
  const res = await supabase.storage.from('member-files').createSignedUrl(path, 120)
  if (res.error) throw new Error(res.error.message)
  window.open(res.data.signedUrl, '_blank', 'noopener')
}

export async function deleteDocument(doc: DocumentRow) {
  await supabase.storage.from('member-files').remove([doc.path])
  throwIf(await supabase.from('member_documents').delete().eq('id', doc.id).select('id'))
}

export async function uploadPhoto(studioId: string, memberId: string, file: Blob) {
  const path = `${studioId}/${memberId}/photo-${Date.now()}.jpg`
  const up = await supabase.storage.from('member-files').upload(path, file, { contentType: 'image/jpeg', upsert: true })
  if (up.error) throw new Error(up.error.message)
  throwIf(await supabase.from('members').update({ photo_url: path }).eq('id', memberId).select('id'))
}

export async function photoUrl(path: string | null) {
  if (!path) return null
  if (/^https?:/.test(path)) return path
  const res = await supabase.storage.from('member-files').createSignedUrl(path, 3600)
  return res.error ? null : res.data.signedUrl
}

export const referralsBy = async (memberId: string) =>
  throwIf(await supabase.from('referral_overview').select('*').eq('referred_by_member_id', memberId).order('referral_date', { ascending: false })) as ReferralRow[]

export const listReferrals = async (studioId: string, search: string, from?: string | null, to?: string | null) => {
  let q = supabase.from('referral_overview').select('*').eq('studio_id', studioId)
  const s = search.replace(/[,()*"\\]/g, ' ').trim()
  if (s) q = q.or(`referred_to.ilike.*${s}*,phone.ilike.*${s}*,referral_from.ilike.*${s}*,client_code.ilike.*${s}*`)
  if (from) q = q.gte('referral_date', from)
  if (to) q = q.lte('referral_date', to)
  return throwIf(await q.order('referral_date', { ascending: false }).limit(2000)) as ReferralRow[]
}

export interface Device { id: string; serial: string; name: string; device_type: string; active: boolean }
export const listDevices = async (studioId: string) =>
  throwIf(await supabase.from('biometric_devices').select('*').eq('studio_id', studioId).eq('active', true).order('name')) as Device[]

export async function queueDeviceCommand(row: {
  studio_id: string; device_id: string | null; member_id?: string; staff_id?: string; command: string; method?: string | null
  biometric_code?: string | null; rfid?: string | null; expiry_date?: string | null
}) {
  throwIf(await supabase.from('device_commands').insert(row).select('id'))
}
