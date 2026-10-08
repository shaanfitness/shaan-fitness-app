import { supabase } from '../lib/supabase'
import { throwIf } from './studio'

// Subscriptions, receipts and the membership actions on a client's profile (YDL).

export type SubState = 'pending' | 'active' | 'frozen' | 'expired' | 'used' | 'cancelled' | 'deleted' | 'transferred' | 'upgraded' | 'downgraded'

export interface Sub {
  id: string
  studio_id: string
  member_id: string
  plan_id: string
  kind: 'gym' | 'pt' | 'trial'
  invoice_no: string | null
  invoice_date: string
  is_renewal: boolean
  start_date: string
  base_end_date: string
  end_date: string
  extension_days: number
  frozen_days: number
  sessions_total: number | null
  sessions_used: number
  sessions_left: number | null
  pt_points: number | null
  trainer_id: string | null
  second_trainer_ids: string[]
  group_member_ids: string[]
  base_price: number
  selling_price: number
  sign_up_fee: number
  coupon_code: string | null
  coupon_discount: number
  gst_rate: number
  igst: boolean
  net_amount: number
  gst_amount: number
  total_amount: number
  paid_amount: number
  written_off_amount: number
  balance_amount: number
  payment_status: 'paid' | 'pending'
  balance_due_date: string | null
  status: 'live' | 'transferred' | 'upgraded' | 'downgraded'
  state: SubState
  mark_used: boolean
  batch_id: string | null
  bill_rep_id: string | null
  client_rep_id: string | null
  note: string | null
  customer_address: string | null
  previous_subscription_id: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  deleted_at: string | null
  delete_reason: string | null
  created_at: string
  plan_name: string
  plan_code: string | null
  plan_service_ids: string[]
  plan_tenure_value: number
  plan_tenure_unit: 'days' | 'months' | 'years'
  plan_freeze_days: number
  member_name: string
  member_country_code: string
  member_phone: string | null
  member_email: string | null
  member_gender: string | null
  member_kind: 'enquiry' | 'member'
  member_date_of_birth: string | null
  client_code: string | null
  trainer_name: string | null
  bill_rep_name: string | null
  client_rep_name: string | null
  created_by_name: string | null
  days_left: number
}

export interface Receipt {
  id: string
  member_id: string
  subscription_id: string | null
  kind: 'payment' | 'write_off' | 'refund'
  purpose: string
  receipt_no: string | null
  receipt_date: string
  amount: number
  mode: string | null
  status: 'paid' | 'cancelled'
  reference: string | null
  note: string | null
  cancel_reason: string | null
  created_at: string
  added_by_name: string | null
  bill_rep_name: string | null
  plan_name: string | null
  invoice_no: string | null
  member_name: string
  client_code: string | null
}

export const STATE_LABEL: Record<SubState, string> = {
  pending: 'Pending', active: 'Active', frozen: 'Frozen', expired: 'Expired', used: 'Used', cancelled: 'Cancelled',
  deleted: 'Deleted', transferred: 'Transferred', upgraded: 'Upgraded', downgraded: 'Downgraded',
}
export const stateChip = (s: SubState) =>
  s === 'active' ? 'chip-green' : s === 'pending' || s === 'frozen' ? 'chip-amber' : s === 'expired' || s === 'used' ? 'chip-muted' : 'chip-red'

/** Is this subscription still open for membership actions? */
export const isOpen = (s: Pick<Sub, 'state'>) => ['pending', 'active', 'frozen', 'expired', 'used'].includes(s.state)

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const memberSubscriptions = async (memberId: string) =>
  throwIf(await supabase.from('subscription_overview').select('*').eq('member_id', memberId)
    .order('start_date', { ascending: false }).order('created_at', { ascending: false })) as Sub[]

export const getSubscription = async (id: string) =>
  throwIf(await supabase.from('subscription_overview').select('*').eq('id', id).single()) as Sub

export const subscriptionReceipts = async (subId: string) =>
  throwIf(await supabase.from('payment_overview').select('*').eq('subscription_id', subId).order('receipt_date').order('created_at')) as Receipt[]

export const memberReceipts = async (memberId: string) =>
  throwIf(await supabase.from('payment_overview').select('*').eq('member_id', memberId).order('receipt_date', { ascending: false })) as Receipt[]

export interface SellItem {
  plan_id: string
  start_date: string
  end_date: string
  base_price?: number
  selling_price: number
  sign_up_fee?: number
  coupon_code?: string
  trainer_id?: string
  second_trainer_ids?: string[]
  pt_points?: number
  sessions_total?: number | null
  kind?: 'trial'
}
export interface SellPayload {
  member_id: string
  items: SellItem[]
  group_member_ids?: string[]
  divide_sessions?: boolean
  batch_ids?: string[]
  invoice_date?: string
  bill_rep_id?: string
  client_rep_id?: string
  note?: string
  paid_amount?: number
  mode?: string
  receipt_date?: string
  receipt_no?: string
  reference?: string
  balance_due_date?: string
}
export const sellSubscriptions = (p: SellPayload) => rpc<string[]>('sell_subscriptions', { p })

export interface PaymentPayload {
  subscription_id: string
  amount?: number
  mode?: string
  status?: 'paid' | 'write_off'
  receipt_date?: string
  reference?: string
  receipt_no?: string
  next_due_date?: string | null
  bill_rep_id?: string
  invoice_date?: string
  igst?: boolean
  note?: string
  customer_address?: string
}
export const recordPayment = (p: PaymentPayload) => rpc<string | null>('record_payment', { p })
export const freezeSubscription = (p: { subscription_id: string; start_date: string; days: number; fee?: number; mode?: string; note?: string }) => rpc<string>('freeze_subscription', { p })
export const extendSubscription = (p: { subscription_id: string; days: number; fee?: number; mode?: string; note?: string }) => rpc<string>('extend_subscription', { p })
export const transferSubscription = (p: { subscription_id: string; to_member_id: string; start_date: string; fee?: number; mode?: string }) => rpc<string>('transfer_subscription', { p })
export const upgradeSubscription = (p: { subscription_id: string; plan_id: string; end_date: string; selling_price: number; coupon_code?: string; group?: boolean; trainer_id?: string }) => rpc<string>('upgrade_subscription', { p })
export const downgradeSubscription = (p: { subscription_id: string; plan_id: string; start_date: string; end_date: string; selling_price: number; note?: string; group?: boolean; trainer_id?: string }) => rpc<string>('downgrade_subscription', { p })
export const editSubscription = (p: { subscription_id: string; start_date?: string; end_date?: string; trainer_id?: string | null; second_trainer_ids?: string[]; sessions_total?: number | null; invoice_date?: string; invoice_no?: string }) =>
  rpc<void>('edit_subscription', { p })
export const cancelSubscription = (id: string, reason: string, cancelReceipts: boolean) => rpc<void>('cancel_subscription', { p_id: id, p_reason: reason, p_cancel_receipts: cancelReceipts })
export const deleteSubscription = (id: string, reason: string) => rpc<void>('delete_subscription', { p_id: id, p_reason: reason })
export const editBillAmount = (id: string, price: number) => rpc<void>('edit_bill_amount', { p_id: id, p_price: price })
export const markUsed = (id: string, used: boolean) => rpc<void>('mark_subscription_used', { p_id: id, p_used: used })
export const checkCoupon = (studioId: string, code: string, planId: string, memberId: string, amount: number) =>
  rpc<{ ok: boolean; message: string; discount?: number; coupon_id?: string }>('check_coupon', { p_studio: studioId, p_code: code, p_plan: planId, p_member: memberId, p_amount: amount })

export const saveMedical = (memberId: string, answers: Record<string, boolean>, note: string) =>
  rpc<void>('save_medical', { p_member: memberId, p_answers: answers, p_note: note })
export const sendNotification = (memberIds: string[], title: string, body: string) =>
  rpc<number>('send_notification', { p_member_ids: memberIds, p_title: title, p_body: body })
export const checkInClient = (memberId: string, out = false) => rpc<string>('check_in_client', { p_member: memberId, p_out: out })

export const freezeHistory = async (subId: string) =>
  throwIf(await supabase.from('freezes').select('*').eq('subscription_id', subId).order('start_date', { ascending: false })) as
    { id: string; start_date: string; end_date: string; days: number; fee: number; note: string | null; status: string; created_at: string }[]

// YDL's medical history questions, in order.
export const PAR_Q: [string, string][] = [
  ['heart_problem', 'Does s/he have a heart condition?'],
  ['diabetes', 'Does s/he have Diabetes?'],
  ['chest_pain_while_exercise', 'Does s/he ever experience pain in his Chest when exercising or resting?'],
  ['feel_faint', 'Does s/he ever feel faint or dizzy spells?'],
  ['back_pain_or_joints_pain', 'Does s/he have a back pain or joint pains?'],
  ['asthma', 'Does s/he have Asthma?'],
  ['medication', 'Is s/he taking any medications?'],
  ['any_surgery', 'Have s/he had any surgery that may affect his physical activity?'],
  ['any_reason_to_modify_exercise', 'Does s/he have any injury or a reason to change his exercise regime?'],
  ['pregnant', 'Is she Pregnant? Or given birth in past 7 weeks?'],
  ['allergies', 'Does s/he have any allergies?'],
  ['medical_problem', "s/he don't have any medical problem?"],
]

export const DOCUMENT_TYPES = ['PAN Card', 'Aadhaar Card', 'Voting Card', 'Ration Card', 'Driving License', 'Medical History', 'KYC', 'Passport', 'CLIENT FITNESS DOCUMENTS', 'LEGAL ID']

const two = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Money as YDL bills show it: 8,000.00 */
export const amt = (n: number | null | undefined) => two.format(Number(n ?? 0))
