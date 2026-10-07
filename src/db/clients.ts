import { supabase } from '../lib/supabase'
import { throwIf } from './studio'
import type { Range } from '../lib/dates'
import type { Gender, Member, MemberBilling, MemberOverview } from './types'

export interface ClientFilters {
  kind: 'enquiry' | 'member' | 'all'
  search?: string
  range?: Range
  rangeOn?: 'enquiry_date' | 'last_follow_up_at' | 'joined_on'
  genders?: Gender[]
  leadStatus?: ('open' | 'not_interested')[]
  ages?: [number, number][]
  convertibility?: string[]
  sourcePromotion?: string
  sourceEnquiry?: string
  employmentStatus?: string
  addedBy?: string           // staff id, or 'none' for not assigned
  trainer?: string
  onTrial?: 'yes' | 'no'
  tapped?: 'tapped' | 'untapped'
  active?: boolean           // false = deactivated list
  liveStatus?: MemberOverview['live_status'][]
  hasApp?: 'yes' | 'no'
}

// Search text goes inside PostgREST's or=(...) syntax, so drop characters that would break it.
const clean = (s: string) => s.replace(/[,()*"\\]/g, ' ').trim()

export function applyClientFilters<Q extends { eq: Function; is: Function; in: Function; or: Function; gte: Function; lte: Function; not: Function; ilike: Function }>(q: Q, f: ClientFilters): Q {
  let x: any = q
  if (f.kind !== 'all') x = x.eq('kind', f.kind)
  x = x.eq('active', f.active ?? true)
  if (f.search && clean(f.search)) {
    const s = clean(f.search)
    x = x.or(`full_name.ilike.*${s}*,phone.ilike.*${s}*,email.ilike.*${s}*,client_code.ilike.*${s}*`)
  }
  const on = f.rangeOn ?? 'enquiry_date'
  if (f.range?.from) x = x.gte(on, f.range.from)
  if (f.range?.to) x = x.lte(on, on === 'last_follow_up_at' ? `${f.range.to}T23:59:59+05:30` : f.range.to)
  if (f.genders?.length) x = x.in('gender', f.genders)
  if (f.leadStatus?.length) x = x.in('lead_status', f.leadStatus)
  if (f.ages?.length) x = x.or(f.ages.map(([a, b]) => `and(age.gte.${a},age.lte.${b})`).join(','))
  if (f.convertibility?.length) x = x.in('convertibility', f.convertibility)
  if (f.sourcePromotion) x = x.eq('source_promotion', f.sourcePromotion)
  if (f.sourceEnquiry) x = x.eq('source_enquiry', f.sourceEnquiry)
  if (f.employmentStatus) x = x.eq('employment_status', f.employmentStatus)
  if (f.addedBy === 'none') x = x.is('added_by', null)
  else if (f.addedBy) x = x.eq('added_by', f.addedBy)
  if (f.trainer) x = x.eq('trainer_id', f.trainer)
  if (f.onTrial) x = x.eq('had_trial', f.onTrial === 'yes')
  if (f.tapped) x = x.eq('tapped', f.tapped === 'tapped')
  if (f.liveStatus?.length) x = x.in('live_status', f.liveStatus)
  if (f.hasApp) x = x.eq('has_app', f.hasApp === 'yes')
  return x
}

export async function listClients(studioId: string, f: ClientFilters, page: number, pageSize: number, order: string) {
  let q = supabase.from('member_overview').select('*', { count: 'exact' }).eq('studio_id', studioId)
  q = applyClientFilters(q, f)
  const [col, dir] = order.split('.')
  q = q.order(col, { ascending: dir === 'asc', nullsFirst: false }).order('created_at', { ascending: false })
  const res = await q.range(page * pageSize, page * pageSize + pageSize - 1)
  if (res.error) throw new Error(res.error.message)
  return { rows: (res.data ?? []) as MemberOverview[], total: res.count ?? 0 }
}

export async function allClients(studioId: string, f: ClientFilters) {
  let q = supabase.from('member_overview').select('*').eq('studio_id', studioId)
  q = applyClientFilters(q, f)
  return throwIf(await q.order('created_at', { ascending: false }).limit(10000)) as MemberOverview[]
}

export async function getClient(id: string) {
  const [m, b, bm] = await Promise.all([
    supabase.from('members').select('*').eq('id', id).single(),
    supabase.from('member_billing').select('*').eq('member_id', id).maybeSingle(),
    supabase.from('batch_members').select('batch_id').eq('member_id', id),
  ])
  if (m.error) throw new Error(m.error.message)
  return {
    member: m.data as Member,
    billing: (b.data ?? null) as MemberBilling | null,
    batchIds: ((bm.data ?? []) as { batch_id: string }[]).map((r) => r.batch_id),
  }
}

export async function findByPhone(studioId: string, phone: string, except?: string) {
  if (!phone || phone.replace(/\D/g, '').length < 6) return []
  const res = await supabase.rpc('find_client_by_phone', { p_studio: studioId, p_phone: phone, p_except: except ?? null })
  return (res.data ?? []) as { id: string; client_code: string; full_name: string; kind: string }[]
}

export async function findByCode(studioId: string, code: string) {
  const c = clean(code)
  if (!c) return []
  return throwIf(await supabase.from('member_overview').select('id,client_code,full_name,kind,phone')
    .eq('studio_id', studioId).or(`member_code.ilike.${c},enquiry_code.ilike.${c},phone.ilike.*${c}*`).limit(5)) as
    Pick<MemberOverview, 'id' | 'client_code' | 'full_name' | 'kind' | 'phone'>[]
}

export async function saveClient(payload: Record<string, unknown>) {
  const res = await supabase.rpc('save_client', { p: payload })
  if (res.error) throw new Error(res.error.message)
  return res.data as string
}

export async function updateClients(ids: string[], patch: Partial<Member> & { deleted_at?: string }) {
  throwIf(await supabase.from('members').update(patch).in('id', ids).select('id'))
}
