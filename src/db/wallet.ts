import { supabase } from '../lib/supabase'
import { throwIf } from './studio'

// Wallet (supabase/migrations/20261012000017_wallet_store.sql): categories, activity plans and each client's entries.

export interface WalletCategory { id: string; studio_id: string; name: string; code: string; description: string | null; active: boolean; created_by: string | null; created_at: string }
export interface WalletActivity {
  id: string; studio_id: string; category_id: string; name: string; code: string; price: number; description: string | null
  one_time: boolean; duration_hours: number | null; active: boolean; created_by: string | null; created_at: string
}
export type WalletSource = 'top_up' | 'reward' | 'activity' | 'refund' | 'adjustment'
export interface WalletEntry {
  id: string; studio_id: string; member_id: string; kind: 'credit' | 'debit'; source: WalletSource; amount: number
  activity_id: string | null; activity_name: string | null; category_name: string | null; started_at: string | null; ended_at: string | null; minutes: number | null
  payment_method: string | null; note: string | null; txn_date: string; client_rep: string | null; balance_after: number; created_by: string | null; created_at: string
  member_name: string; client_code: string | null; member_gender: string | null; client_rep_name: string | null; created_by_name: string | null
  activity_one_time: boolean | null; activity_duration_hours: number | null
}
export interface WalletBalance { member_id: string; balance: number; credited: number; spent: number; last_at: string }

export const SOURCE_LABEL: Record<WalletSource, string> = { top_up: 'Money added', reward: 'Reward', activity: 'Activity', refund: 'Refund', adjustment: 'Adjustment' }

export async function walletCategories(studioId: string) {
  return throwIf(await supabase.from('wallet_categories').select('*').eq('studio_id', studioId).order('name')) as WalletCategory[]
}
export async function walletActivities(studioId: string) {
  return throwIf(await supabase.from('wallet_activities').select('*').eq('studio_id', studioId).order('name')) as WalletActivity[]
}
export async function walletBalance(memberId: string) {
  const res = await supabase.from('wallet_balances').select('*').eq('member_id', memberId).maybeSingle()
  return (throwIf(res) as WalletBalance | null) ?? { member_id: memberId, balance: 0, credited: 0, spent: 0, last_at: '' }
}
export async function walletEntries(a: { studioId: string; memberId?: string; from?: string; to?: string; source?: WalletSource; rep?: string }) {
  let q = supabase.from('wallet_overview').select('*').eq('studio_id', a.studioId)
  if (a.memberId) q = q.eq('member_id', a.memberId)
  if (a.from) q = q.gte('txn_date', a.from)
  if (a.to) q = q.lte('txn_date', a.to)
  if (a.source) q = q.eq('source', a.source)
  if (a.rep) q = q.eq('client_rep', a.rep)
  return throwIf(await q.order('created_at', { ascending: false }).limit(5000)) as WalletEntry[]
}
export async function addWalletEntry(v: {
  memberId: string; source: WalletSource; amount?: number | null; activityId?: string | null; startedAt?: string | null; endedAt?: string | null
  paymentMethod?: string | null; note?: string | null; kind?: 'credit' | 'debit'
}) {
  const row = {
    member_id: v.memberId, source: v.source, amount: v.amount ?? null, activity_id: v.activityId ?? null, started_at: v.startedAt ?? null, ended_at: v.endedAt ?? null,
    payment_method: v.paymentMethod ?? null, note: v.note?.trim() || null, kind: v.kind ?? null,
  }
  return throwIf(await supabase.from('wallet_transactions').insert(row).select('id,amount,balance_after').single()) as { id: string; amount: number; balance_after: number }
}
export async function deleteWalletEntry(id: string) {
  throwIf(await supabase.from('wallet_transactions').delete().eq('id', id).select('id'))
}

/** What an activity costs: its price once, or per started block of hours. */
export function activityCost(a: Pick<WalletActivity, 'price' | 'one_time' | 'duration_hours'>, minutes: number | null) {
  if (a.one_time) return Number(a.price)
  if (!minutes || minutes <= 0 || !a.duration_hours) return null
  return Math.ceil(minutes / (Number(a.duration_hours) * 60)) * Number(a.price)
}
export const durationText = (minutes: number | null) => {
  if (!minutes) return '-'
  const h = Math.floor(minutes / 60), m = minutes % 60
  return h ? `${h} hr${m ? ` ${m} min` : ''}` : `${m} min`
}
export const activityDuration = (a: Pick<WalletActivity, 'one_time' | 'duration_hours'>) =>
  a.one_time ? 'One time' : `Per ${Number(a.duration_hours)} ${Number(a.duration_hours) === 1 ? 'hour' : 'hours'}`
