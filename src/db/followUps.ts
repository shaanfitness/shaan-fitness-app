import { supabase } from '../lib/supabase'
import { throwIf } from './studio'
import type { FollowUpOverview, Gender } from './types'

export interface FollowUpPayload {
  member_id?: string
  follow_up_id?: string
  type: string
  assigned_to: string
  response: string
  convertibility?: string
  expected_date?: string
  expected_amount?: number | null
  next_at?: string
  contact_type?: string
  notes?: string
}

export async function addFollowUp(p: FollowUpPayload) {
  const res = await supabase.rpc('add_follow_up', { p })
  if (res.error) {
    if (/follow_ups_no_dupes|duplicate key/.test(res.error.message)) {
      throw new Error('There is already an open follow-up of this type for this client on that day.')
    }
    throw new Error(res.error.message)
  }
  return res.data as string
}

export interface FollowUpFilters {
  mode: 'due' | 'done' | 'expected' | 'all'
  from?: string | null
  to?: string | null
  status?: string            // open | done | not_interested | successful
  assignedTo?: string        // staff id | 'system'
  createdBy?: string         // staff id | 'system'
  clientRep?: string         // member.added_by
  type?: string
  types?: string[]
  clientKind?: 'enquiry' | 'member'
  gender?: Gender
  convertibility?: string[]
  search?: string
  memberId?: string
  expectedOnly?: boolean
}

export function followUpQuery(studioId: string, f: FollowUpFilters, count = false) {
  let q: any = supabase.from('follow_up_overview').select('*', count ? { count: 'exact' } : undefined).eq('studio_id', studioId)
  const end = f.to ? `${f.to}T23:59:59.999+05:30` : null
  const start = f.from ? `${f.from}T00:00:00+05:30` : null
  if (f.mode === 'due') {
    q = q.eq('status', 'open')
    if (start) q = q.gte('due_at', start)
    if (end) q = q.lte('due_at', end)
  } else if (f.mode === 'done') {
    q = q.neq('status', 'open')
    if (start) q = q.gte('responded_at', start)
    if (end) q = q.lte('responded_at', end)
  } else if (f.mode === 'expected') {
    q = q.eq('status', 'open').gt('expected_amount', 0)
    if (f.from) q = q.gte('expected_date', f.from)
    if (f.to) q = q.lte('expected_date', f.to)
  }
  if (f.status) q = q.eq('status', f.status)
  if (f.assignedTo === 'system') q = q.is('assigned_to', null)
  else if (f.assignedTo) q = q.eq('assigned_to', f.assignedTo)
  if (f.createdBy === 'system') q = q.eq('source', 'system')
  else if (f.createdBy) q = q.eq('created_by', f.createdBy)
  if (f.clientRep) q = q.eq('member_added_by', f.clientRep)
  if (f.type) q = q.eq('type', f.type)
  if (f.types?.length) q = q.in('type', f.types)
  if (f.clientKind) q = q.eq('member_kind', f.clientKind)
  if (f.gender) q = q.eq('member_gender', f.gender)
  if (f.convertibility?.length) q = q.in('convertibility', f.convertibility)
  if (f.memberId) q = q.eq('member_id', f.memberId)
  if (f.search) {
    const s = f.search.replace(/[,()*"\\]/g, ' ').trim()
    if (s) q = q.or(`member_name.ilike.*${s}*,member_phone.ilike.*${s}*,client_code.ilike.*${s}*`)
  }
  return q
}

export async function listFollowUps(studioId: string, f: FollowUpFilters, page = 0, pageSize = 50) {
  const order = f.mode === 'done' ? 'responded_at' : f.mode === 'expected' ? 'expected_date' : 'due_at'
  const res = await followUpQuery(studioId, f, true)
    .order(order, { ascending: f.mode !== 'done' })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  if (res.error) throw new Error(res.error.message)
  return { rows: (res.data ?? []) as FollowUpOverview[], total: (res.count ?? 0) as number }
}

export async function followUpHistory(studioId: string, memberId: string) {
  return throwIf(await supabase.from('follow_up_overview').select('*').eq('studio_id', studioId).eq('member_id', memberId)
    .order('created_at', { ascending: false })) as FollowUpOverview[]
}

export async function transferFollowUps(studioId: string, from: string, to: string) {
  const res = await supabase.rpc('transfer_follow_ups', { p_studio: studioId, p_from: from, p_to: to })
  if (res.error) throw new Error(res.error.message)
  return res.data as number
}

export async function deleteFollowUps(ids: string[]) {
  throwIf(await supabase.from('follow_ups').delete().in('id', ids).select('id'))
}
