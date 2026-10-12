import { supabase } from '../lib/supabase'
import { throwIf } from './studio'

// Notifications, WhatsApp, SMS and email (supabase/migrations/20261011000015_messaging.sql).

export type Channel = 'whatsapp' | 'sms' | 'email'
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'failed'
export type MessageSource = 'birthday' | 'balance_due' | 'on_expiry' | 'before_expiry' | 'after_expiry' | 'irregular' | 'enquiry' | 'bill' | 'paid_balance' | 'bulk' | 'test' | 'single'

export interface Message {
  id: string; studio_id: string; channel: Channel; member_id: string | null; to_name: string | null; to_address: string; subject: string | null; body: string
  source: MessageSource; campaign_id: string | null; template_id: string | null; status: MessageStatus; error: string | null; attempts: number
  sent_at: string | null; created_at: string
}
export interface Campaign {
  id: string; title: string | null; body: string; template_id: string | null; audience: string | null; total: number; sent: number; failed: number; waiting: number
  created_at: string; created_by_name: string | null
}
export interface MessageStats { today_total: number; today_sent: number; today_failed: number; week_total: number; week_sent: number; week_failed: number; queued: number; sms_credits: number; sms_used: number }
export interface SmsRecharge { id: string; credits: number; amount: number; paid_on: string; reference: string | null; note: string | null; created_at: string }
export interface SmsTemplate { name: string; template_id: string; text: string }
export interface Notification { id: string; member_id: string; title: string; body: string; created_at: string; read_at: string | null }

/** YDL's names for where a message came from (Messages History "SOURCE"). */
export const SOURCE_LABEL: Record<MessageSource, string> = {
  birthday: 'SYSTEM - ON BIRTHDAY', balance_due: 'SYSTEM - BALANCE DUE', on_expiry: 'SYSTEM - ON EXPIRY', before_expiry: 'SYSTEM - BEFORE EXPIRY',
  after_expiry: 'SYSTEM - AFTER EXPIRY', irregular: 'SYSTEM - IRREGULAR MEMBER', enquiry: 'MESSAGE ON ENQUIRY', bill: 'ON BILL CREATION - ADMIN',
  paid_balance: 'ON PAID BALANCE', bulk: 'BULK MESSAGE', test: 'TEST MESSAGE', single: 'SENT FROM THE APP',
}
/** YDL's status words. */
export const STATUS_LABEL: Record<MessageStatus, string> = { queued: 'WAITING', sending: 'SENDING', sent: 'SUCCESS', failed: 'FAILURE' }

/** YDL "Select Group Of User" (Notification) and "Members Status" (Email, SMS). */
export const NOTIFY_GROUPS = [
  ['enquiry', 'All Enquires'], ['enquiry_male', 'All Male Enquires'], ['enquiry_female', 'All Female Enquiries'], ['members', 'All Members'],
  ['male', 'All Male Members'], ['female', 'All Female Members'], ['expired_membership', 'Expired Membership'],
].map(([value, label]) => ({ value, label }))
export const MEMBER_STATUS = [
  ['all', 'All'], ['active', 'Active'], ['expired_membership', 'Expired'], ['enquiry_open', 'Enquiry Open'], ['enquiry_not_interested', 'Enquiry Not Interested'],
].map(([value, label]) => ({ value, label }))

const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const saveMessageSettings = (studioId: string, channel: 'whatsapp' | 'sms', p: Record<string, unknown>) =>
  rpc<void>('save_message_settings', { p_studio: studioId, p_channel: channel, p })
export const notifyGroup = (studioId: string, group: string, service: string | null, title: string, body: string, dry = false) =>
  rpc<number>('notify_group', { p_studio: studioId, p_group: group, p_service: service || null, p_title: title, p_body: body, p_dry: dry })
export const sendNotification = (memberIds: string[], title: string, body: string) =>
  rpc<number>('send_notification', { p_member_ids: memberIds, p_title: title, p_body: body })
export const queueMessages = (studioId: string, a: { channel: Channel; memberIds?: string[]; group?: string; body: string; subject?: string; templateId?: string; dry?: boolean }) =>
  rpc<{ queued?: number; skipped?: number; campaign_id?: string | null; total?: number; reachable?: number }>('queue_messages', {
    p_studio: studioId, p_channel: a.channel, p_member_ids: a.memberIds ?? null, p_body: a.body, p_subject: a.subject || null,
    p_template_id: a.templateId || null, p_group: a.group || null, p_dry: !!a.dry,
  })
export const sendTestMessage = (studioId: string, channel: Channel, to: string, body: string) =>
  rpc<string>('send_test_message', { p_studio: studioId, p_channel: channel, p_to: to, p_body: body })
export const resendMessages = (studioId: string, channel: Channel, scope: 'selected' | 'today' | 'yesterday' | 'failed', ids?: string[]) =>
  rpc<number>('resend_messages', { p_studio: studioId, p_channel: channel, p_scope: scope, p_ids: ids ?? null })
export const messageStats = (studioId: string, channel: Channel) => rpc<MessageStats>('message_stats', { p_studio: studioId, p_channel: channel })
export const campaigns = (studioId: string, channel: Channel) => rpc<Campaign[]>('message_campaign_list', { p_studio: studioId, p_channel: channel })

export interface HistoryFilter { from: string; to: string; source?: string; status?: string; bulk?: boolean }
export async function messageHistory(studioId: string, channel: Channel, f: HistoryFilter) {
  let q = supabase.from('messages').select('*').eq('studio_id', studioId).eq('channel', channel)
    .gte('created_at', `${f.from}T00:00:00+05:30`).lte('created_at', `${f.to}T23:59:59+05:30`)
  if (f.source) q = q.eq('source', f.source)
  if (f.status) q = q.in('status', f.status === 'queued' ? ['queued', 'sending'] : [f.status])
  if (f.bulk === false) q = q.neq('source', 'bulk')
  return throwIf(await q.order('created_at', { ascending: false }).limit(2000)) as Message[]
}

export async function smsRecharges(studioId: string) {
  return throwIf(await supabase.from('sms_recharges').select('*').eq('studio_id', studioId).order('paid_on', { ascending: false }).order('created_at', { ascending: false }).limit(500)) as SmsRecharge[]
}
export async function addSmsRecharge(studioId: string, v: { credits: number; amount: number; paid_on: string; reference?: string; note?: string }) {
  throwIf(await supabase.from('sms_recharges').insert({ ...v, studio_id: studioId }).select('id'))
}
export async function deleteSmsRecharge(id: string) {
  throwIf(await supabase.from('sms_recharges').delete().eq('id', id).select('id'))
}

// The member app's notifications.
export async function myNotifications(memberId: string) {
  return throwIf(await supabase.from('notifications').select('id,member_id,title,body,created_at,read_at').eq('member_id', memberId)
    .order('created_at', { ascending: false }).limit(200)) as Notification[]
}
export const markNotificationsRead = (ids?: string[]) => rpc<number>('mark_notifications_read', { p_ids: ids ?? null })

/** The placeholders a message can use (YDL's names). */
export const PLACEHOLDERS = ['{cust_first_name}', '{cust_last_name}', '{fitness_center_name}', '{fitness_center_phone}', '{website_url}']
