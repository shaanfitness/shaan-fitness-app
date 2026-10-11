import { supabase } from '../lib/supabase'

// The analysis reports (supabase/migrations/20261011000013_analysis.sql). Each returns its page's
// numbers as one JSON object; amounts arrive as JSON numbers.

export async function report<T>(fn: string, args: Record<string, unknown>) {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

type N = number
export interface Gender { male: N; female: N; other: N }
export interface GenderTotal extends Gender { total: N }
export interface Split { label: string; total: N; male: N; female: N; other: N }
export interface Labeled { label: string; amount?: N; n?: N }
export interface AmountN { amount: N; n: N }

export interface Traffic {
  today: string
  present: GenderTotal
  capacity: N | null
  all_total: N; all_unique: N; range_total: N; range_unique: N; days: N
  daily: { date: string; n: N }[]
  parts: { morning: N; afternoon: N; evening: N; late_night: N }
  gender: Gender & { unknown: N }
  ages: Split[]
  levels: Split[]
  week_start: string
  week: { date: string; total: N; male: N; female: N; other: N; unknown: N }[]
}

export interface MembersInsight {
  today: string
  members: GenderTotal
  live: GenderTotal
  bounced: { d7: N; d15: N; d30: N; over30: N }
  new_30: N
  status: Record<'active' | 'inactive' | 'never', GenderTotal>
  ages: Split[]
  levels: Split[]
  year: N
  months: { month: N; new_active: N; all_active: N }[]
}

export interface EnquiryStages {
  enquiries: GenderTotal
  stages: Record<'followup' | 'trial' | 'expected', GenderTotal>
  not_interested: N
  new_30: N
  ages: Split[]
  levels: Split[]
}

export interface Collection {
  services: { gym_new: N; gym_renewal: N; pt_new: N; pt_renewal: N; other: N; total: N; receipts: N }
  modes: Labeled[]
  promotion: Labeled[]
}

export interface PlanRow { plan_id: string; name: string; subscriptions: N; active: N; pending: N; inactive: N; billing?: N; received?: N; balance?: N; new?: N; renewal?: N; paid?: N; bill?: N }
export interface SubscriptionsInsight {
  year: N; months_elapsed: N
  months: { month: N; gym: N; pt: N; total: N }[]
  average: { total: N; gym: N; pt: N }
  max: { month: N; total: N }
  plans: PlanRow[]
}

export interface FollowUpInsight {
  status: { open: N; successful: N; not_interested: N; done: N; total: N }
  types: Record<string, N>
  staff: { staff_id: string | null; name: string; open: N; successful: N; not_interested: N; done: N; total: N }[]
}

export interface ConversionYear {
  year: N
  ratio: { enquiries: N; converted: N }
  months: { month: N; enquiries: N; same_month: AmountN; overall: AmountN; gym: AmountN; pt: AmountN }[]
}
export interface Buckets { b0_1: N; b2_5: N; b6_10: N; over10: N }
export interface ConversionSide { total: N; male: N; female: N; other: N; sources: Labeled[]; followups: Buckets }

export interface EnquiryYear {
  year: N; months_elapsed: N
  total: N; open: N; not_interested: N
  bounced: { d15_30: N; d30_60: N; d60_90: N; over90: N }
  new_30: N
  gender: Record<'total' | 'open' | 'not_interested', Gender>
  months: { month: N; n: N }[]
  average: N
}
export interface EnquirySide { total: N; male: N; female: N; other: N; converted: N; sources: Labeled[]; followups: Buckets; locations: Labeled[] }

export interface StaffConversion {
  staff_id: string | null; name: string; staff_code: string | null
  enquiries: N; conversions: N; units: N; pt_units: N; pt_amount: N; gym_units: N; gym_amount: N; sale: N; received: N; balance: N
}

export interface ExpenseYear {
  year: N
  months: { month: N; amount: N; n: N }[]
  year_avg: { amount: N; n: N }
  quarters: { quarter: N; amount: N; n: N }[]
}
export interface ExpenseSide {
  salary: N; vendor: N; total: N; trainer: N; staff: N; unlinked: N
  staff_types: Labeled[]; trainer_types: Labeled[]; vendors: Labeled[]; non_registered: N; categories: Labeled[]
}

export interface ProfitLoss {
  year: N
  months: { month: N; new: N; renewal: N; other: N; collection: N; salary: N; vendor: N; expense: N; profit: N }[]
  totals: { collection: N; expense: N; profit: N }
}

export interface StaffSplit { staff_id: string | null; name: string; staff_code: string | null; role: string | null; pt_renewal: N; pt_new: N; gym_renewal: N; gym_new: N; other: N; total: N; highest?: N | null; pct?: N | null }
export interface TargetRow { staff_id: string; name: string; staff_code: string | null; role: string; year: N; month: N; target_type: string | null; achieved: N; tier_reached: N | null; commission: N; targets: N[]; highest: N }
export interface Billing extends Collection {
  plans: PlanRow[]
  billing: N
  balance: N
  bill_rep: StaffSplit[]
  client_rep: StaffSplit[]
  created_by: StaffSplit[]
  targets: TargetRow[]
}

export interface DailyRow {
  d: string; enquiries: N; billing: N; received: N; spot: AmountN; conv_gym: N; conv_pt: N
  new_gym: AmountN; new_pt: AmountN; ren_gym: AmountN; ren_pt: AmountN
}
export interface DailyCollection {
  from: string; to: string
  summary: { enquiries: N; open_enquiries: N; billing: N; received: N; conv_gym: N; conv_pt: N; new_gym: AmountN; new_pt: AmountN; ren_gym: AmountN; ren_pt: AmountN }
  days: DailyRow[]
}

export interface PtInsight {
  total: N; active: N; inactive: N; new_30: N
  bounced: { d0_15: N; d15_30: N; d30_60: N; d60_90: N; over90: N }
  gender: Record<'total' | 'active' | 'inactive', Gender>
  trainers: { staff_id: string | null; name: string; staff_code: string | null; current: boolean; total: N; active: N; inactive: N }[]
}

export interface Leaderboard {
  from: string; to: string
  board: { staff_id: string; name: string; staff_code: string | null; sales: N; pt_renewal: N; pt_new: N; gym_renewal: N; gym_new: N }[]
  targets: TargetRow[]
}

export interface Forecast {
  categories: { id: string; name: string }[]
  months: { month: string; renewal: AmountN; balance: AmountN; by_category: Record<string, AmountN> }[]
}

export interface LeadSourceRow { source: string; total: N; open: N; not_interested: N; spot: N; followup: N; conversions: N; pct: N | null; base_price: N; sale_price: N }
export interface LeadSources { rows: LeadSourceRow[]; total: Omit<LeadSourceRow, 'source'> }

export interface BranchRow {
  studio_id: string; name: string; branch: string | null; area: string | null
  open_enquiries: N; enquiries_today: N; enquiries_yesterday: N; collection_today: N; collection_yesterday: N; collection: N; balance: N; billing: N
}
