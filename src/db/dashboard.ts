import { supabase } from '../lib/supabase'
import { throwIf } from './studio'
import type { BatchSummaryRow, DashboardSummary, MemberOverview, SubscriptionOverview } from './types'

export async function dashboardSummary(studioId: string) {
  const res = await supabase.rpc('dashboard_summary', { p_studio: studioId })
  if (res.error) throw new Error(res.error.message)
  return res.data as DashboardSummary
}

export async function batchSummary(studioId: string, from: string, to: string) {
  return throwIf(await supabase.rpc('batch_attendance_summary', { p_studio: studioId, p_from: from, p_to: to })) as BatchSummaryRow[]
}

export async function expiredSubscriptions(studioId: string, today: string, limit = 8) {
  const since = new Date(Date.parse(today) - 30 * 86400_000).toISOString().slice(0, 10)
  return throwIf(await supabase.from('subscription_overview').select('*').eq('studio_id', studioId).eq('state', 'expired')
    .in('kind', ['gym', 'pt']).gte('end_date', since).order('end_date', { ascending: false }).limit(limit)) as SubscriptionOverview[]
}

export async function upcomingRenewals(studioId: string, today: string, days: number, limit = 8) {
  const until = new Date(Date.parse(today) + days * 86400_000).toISOString().slice(0, 10)
  return throwIf(await supabase.from('subscription_overview').select('*').eq('studio_id', studioId).in('state', ['active', 'frozen'])
    .in('kind', ['gym', 'pt']).gte('end_date', today).lte('end_date', until).order('end_date').limit(limit)) as SubscriptionOverview[]
}

export async function celebrations(studioId: string, today: string) {
  const md = today.slice(5)
  const [b, a] = await Promise.all([
    supabase.from('member_overview').select('id,full_name,country_code,phone,client_code,kind,date_of_birth').eq('studio_id', studioId).eq('active', true).eq('birthday_md', md).limit(30),
    supabase.from('member_overview').select('id,full_name,country_code,phone,client_code,kind,joined_on').eq('studio_id', studioId).eq('active', true).eq('kind', 'member').eq('anniversary_md', md).lt('joined_on', today).limit(30),
  ])
  if (b.error) throw new Error(b.error.message)
  if (a.error) throw new Error(a.error.message)
  return { birthdays: (b.data ?? []) as Partial<MemberOverview>[], anniversaries: (a.data ?? []) as Partial<MemberOverview>[] }
}
