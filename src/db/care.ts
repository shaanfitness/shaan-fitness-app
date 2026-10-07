import { supabase } from '../lib/supabase'
import { throwIf } from './studio'
import type { Batch, DoctorDecisionValue, FollowUpOverview, MemberOverview, SubscriptionOverview } from './types'

// Coach, doctor and member home screens.

export async function coachToday(studioId: string, staffId: string, today: string) {
  const weekday = ((new Date(`${today}T00:00:00`).getDay() + 6) % 7) + 1
  const [batches, members, followUps, progress] = await Promise.all([
    supabase.from('batches').select('*').eq('studio_id', studioId).eq('active', true).contains('trainer_ids', [staffId]).order('start_time'),
    supabase.from('member_overview').select('id,full_name,client_code,live_status,current_plan_name,current_end_date,last_check_in,country_code,phone')
      .eq('studio_id', studioId).eq('trainer_id', staffId).eq('active', true).order('full_name'),
    supabase.from('follow_up_overview').select('*', { count: 'exact' }).eq('studio_id', studioId).eq('assigned_to', staffId).eq('status', 'open')
      .lte('due_at', `${today}T23:59:59+05:30`).order('due_at').limit(20),
    supabase.rpc('care_progress'),
  ])
  // Coaches can't read subscriptions (money); care_progress gives them plan progress only.
  const plans = (progress.data ?? []) as { member_id: string; plan_name: string; end_date: string; state: string; sessions_total: number | null; sessions_used: number }[]
  const planFor = (id: string) => plans.filter((p) => p.member_id === id && ['active', 'frozen', 'pending'].includes(p.state)).sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
  const todays = (throwIf(batches) as Batch[]).filter((b) => b.days.includes(weekday))
  const ids = todays.map((b) => b.id)
  const att = ids.length
    ? (throwIf(await supabase.from('attendance').select('batch_id,status').in('batch_id', ids).eq('date', today)) as { batch_id: string; status: string }[])
    : []
  return {
    batches: todays.map((b) => ({ ...b, present: att.filter((a) => a.batch_id === b.id && a.status === 'present').length })),
    members: (throwIf(members) as Pick<MemberOverview, 'id' | 'full_name' | 'client_code' | 'live_status' | 'current_plan_name' | 'current_end_date' | 'last_check_in' | 'country_code' | 'phone'>[])
      .map((m) => { const p = planFor(m.id); return { ...m, current_plan_name: p?.plan_name ?? null, current_end_date: p?.end_date ?? null, sessions: p && p.sessions_total ? `${p.sessions_used}/${p.sessions_total}` : null } }),
    followUps: (followUps.data ?? []) as FollowUpOverview[],
    followUpCount: followUps.count ?? 0,
  }
}

export interface DoctorRow {
  memberId: string
  name: string
  plan: string | null
  decision: DoctorDecisionValue
  limits: string | null
  conditions: string | null
  hasHealthRow: boolean
}

export async function doctorPatients(studioId: string, staffId: string): Promise<DoctorRow[]> {
  const links = throwIf(await supabase.from('care_team').select('member_id').eq('studio_id', studioId).eq('staff_id', staffId).eq('role', 'doctor')) as { member_id: string }[]
  const ids = links.map((l) => l.member_id)
  if (!ids.length) return []
  const [members, health, progress] = await Promise.all([
    supabase.from('members').select('id,full_name').in('id', ids),
    supabase.from('member_health').select('member_id,doctor_decision,doctor_limits,conditions').in('member_id', ids),
    supabase.rpc('care_progress'),
  ])
  const h = (throwIf(health) as { member_id: string; doctor_decision: DoctorDecisionValue; doctor_limits: string | null; conditions: string | null }[])
  const p = ((progress.data ?? []) as { member_id: string; plan_name: string; state: string }[])
  return (throwIf(members) as { id: string; full_name: string }[]).map((m) => {
    const row = h.find((x) => x.member_id === m.id)
    return {
      memberId: m.id, name: m.full_name,
      plan: p.find((x) => x.member_id === m.id && (x.state === 'active' || x.state === 'pending'))?.plan_name ?? null,
      decision: row?.doctor_decision ?? 'pending', limits: row?.doctor_limits ?? null, conditions: row?.conditions ?? null, hasHealthRow: !!row,
    }
  })
}

export async function recordDecision(studioId: string, memberId: string, decision: DoctorDecisionValue, limits: string | null, exists: boolean) {
  if (exists) throwIf(await supabase.from('member_health').update({ doctor_decision: decision, doctor_limits: limits }).eq('member_id', memberId).select('member_id'))
  else throwIf(await supabase.from('member_health').insert({ member_id: memberId, studio_id: studioId, doctor_decision: decision, doctor_limits: limits }).select('member_id'))
}

export async function memberHome(memberId: string) {
  const [subs, batches] = await Promise.all([
    supabase.from('subscription_overview').select('*').eq('member_id', memberId).in('state', ['active', 'frozen', 'pending']).order('end_date', { ascending: false }),
    supabase.from('batch_members').select('batch_id').eq('member_id', memberId),
  ])
  const ids = ((batches.data ?? []) as { batch_id: string }[]).map((b) => b.batch_id)
  const myBatches = ids.length ? (throwIf(await supabase.from('batches').select('*').in('id', ids).order('start_time')) as Batch[]) : []
  return { subscriptions: throwIf(subs) as SubscriptionOverview[], batches: myBatches }
}
