// Shapes of the rows the app reads from the database (tables and views).
export type StaffRole = 'owner' | 'front_desk' | 'coach' | 'doctor'
export type Role = StaffRole | 'member'
export type Gender = 'male' | 'female' | 'other'

export interface Studio {
  id: string
  name: string
  branch_name: string | null
  slug: string
  tag_line: string | null
  description: string | null
  email: string | null
  mobile: string | null
  landline: string | null
  street1: string | null
  street2: string | null
  city: string | null
  state: string | null
  country: string
  pincode: string | null
  capacity: number | null
  facilities: string[]
  logo_url: string | null
  default_language: string
  timezone: string
  currency: string
  tax_label: string
  settings: StudioSettings
}

export interface NumberingSettings { mode?: 'automatic' | 'manual'; start?: number; width?: number; zero_fill?: boolean; applicable_from?: string | null; restart?: 'year' | 'financial_year' | 'month' | null; prefix?: string; suffix?: string }
export interface StudioSettings {
  member_code: NumberingSettings
  enquiry_code: NumberingSettings
  invoice: NumberingSettings
  receipt: NumberingSettings
  gst: { enabled: boolean; rate: number; number: string | null }
  about_to_expire_days: number
  irregular_after_days: number
  themes: { staff: string; member: string; doctor: string }
  [key: string]: unknown
}

export interface ListItem { id: string; studio_id: string; list: string; label: string; kind: string | null; sort: number; active: boolean }
export interface Service { id: string; name: string; custom_name: string | null; show_in_app: boolean; navigate_to: string | null; sort: number; active: boolean }

export interface Staff {
  id: string
  studio_id: string
  user_id: string | null
  role: StaffRole
  staff_code: string | null
  first_name: string
  last_name: string | null
  full_name: string
  email: string | null
  phone: string | null
  employee_type: string | null
  title: string | null
  permissions: Record<string, boolean>
  active: boolean
}

export interface Plan {
  id: string
  studio_id: string
  name: string
  plan_code: string | null
  kind: 'gym' | 'pt'
  service_ids: string[]
  show_in_app: boolean
  trainer_ids: string[]
  terms: string | null
  session_count: number | null
  unlimited_sessions: boolean
  disable_messages_followups: boolean
  price: number
  discount_price: number | null
  total_price: number
  tenure_value: number
  tenure_unit: 'days' | 'months' | 'years'
  is_one_time: boolean
  freeze_days: number
  weekly_class_limit: number | null
  is_free_trial: boolean
  app_sequence: number
  image_url: string | null
  appointment_type: string | null
  tier: string | null
  includes_personal_coach: boolean
  includes_doctor: boolean
  description: string | null
  faqs: string | null
  guidelines: string | null
  dos_donts: string | null
  shopping_list: string | null
  snack_list: string | null
  activities: string | null
  other_text: string | null
  active: boolean
  created_by: string | null
  created_at: string
}

export interface Batch {
  id: string
  batch_code: string | null
  name: string
  capacity: number | null
  trainer_ids: string[]
  service_ids: string[]
  days: number[]
  start_time: string
  end_time: string
  active: boolean
}

export interface Member {
  id: string
  studio_id: string
  user_id: string | null
  kind: 'enquiry' | 'member'
  enquiry_code: string | null
  member_code: string | null
  first_name: string
  last_name: string | null
  full_name: string
  email: string | null
  country_code: string
  phone: string | null
  phone_withheld: boolean
  alt_country_code: string | null
  alt_phone: string | null
  guardian_phone: string | null
  date_of_birth: string | null
  gender: Gender | null
  enquiry_date: string
  added_by: string | null
  ref_no: string | null
  trainer_id: string | null
  source_promotion: string | null
  source_enquiry: string | null
  primary_tag: string | null
  secondary_tag: string | null
  employment_status: string | null
  occupation: string | null
  referred_by_staff_id: string | null
  referred_by_member_id: string | null
  third_party_referral: string | null
  interested_service_ids: string[]
  street1: string | null
  street2: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  emergency_first_name: string | null
  emergency_last_name: string | null
  emergency_email: string | null
  emergency_phone: string | null
  emergency_relationship: string | null
  notes: string | null
  lead_status: 'open' | 'not_interested'
  convertibility: string | null
  tapped: boolean
  level: string | null
  photo_url: string | null
  app_installed_at: string | null
  biometric_code: number | null
  rfid: string | null
  active: boolean
  joined_on: string | null
  created_at: string
}

export interface MemberOverview extends Member {
  client_code: string | null
  added_by_name: string | null
  trainer_name: string | null
  trainer_code: string | null
  age: number | null
  birthday_md: string | null
  anniversary_md: string | null
  live_status: 'active' | 'pending' | 'inactive' | 'none'
  current_subscription_id: string | null
  current_plan_id: string | null
  current_service_ids: string[] | null
  current_start_date: string | null
  current_plan_name: string | null
  current_end_date: string | null
  subscription_count: number
  had_trial: boolean
  on_trial: boolean
  last_check_in: string | null
  checkins_total: number
  checked_in_now: boolean
  last_follow_up_note: string | null
  last_follow_up_at: string | null
  next_follow_up_at: string | null
  has_app: boolean
}

export interface MemberBilling { member_id: string; company_name: string | null; gst_number: string | null; pan: string | null; aadhaar_last4: string | null }

export type FollowUpStatus = 'open' | 'done' | 'successful' | 'not_interested'
export interface FollowUpOverview {
  id: string
  studio_id: string
  member_id: string
  type: string
  due_at: string
  due_date: string
  assigned_to: string | null
  status: FollowUpStatus
  convertibility: string | null
  expected_date: string | null
  expected_amount: number | null
  contact_type: string | null
  notes: string | null
  response: string | null
  response_kind: string | null
  response_note: string | null
  responded_at: string | null
  responded_by: string | null
  source: 'manual' | 'system'
  created_by: string | null
  created_at: string
  member_name: string
  member_country_code: string
  member_phone: string | null
  member_gender: Gender | null
  member_kind: 'enquiry' | 'member'
  member_lead_status: string
  member_added_by: string | null
  client_code: string | null
  assigned_name: string | null
  created_by_name: string | null
  responded_by_name: string | null
}

export interface SubscriptionOverview {
  id: string
  member_id: string
  plan_id: string
  kind: 'gym' | 'pt' | 'trial'
  invoice_no: string | null
  invoice_date: string
  start_date: string
  end_date: string
  total_amount: number
  paid_amount: number
  balance_amount: number
  payment_status: 'paid' | 'pending'
  state: string
  plan_name: string
  member_name: string
  member_country_code: string
  member_phone: string | null
  client_code: string | null
  days_left: number
  sessions_total: number | null
  sessions_used: number
  balance_due_date: string | null
}

export interface DashboardSummary {
  today: string
  today_collection: number
  month_collection: number
  year_collection: number
  balance_amount: number
  balance_clients: number
  active_gym: number
  expired_gym: number
  active_pt: number
  expired_pt: number
  open_enquiries: number
  active_members: number
  present_checkins: number
  checkins_today: number
  app_installs: number
  expired_recent: number
  about_to_expire: number
}

export interface BatchSummaryRow {
  batch_id: string
  batch_code: string | null
  name: string
  trainer_names: string | null
  start_time: string
  end_time: string
  check_ins: number
  active_members: number
  expired_members: number
  not_assigned: number
}

export type DoctorDecisionValue = 'pending' | 'approved' | 'approved_with_limits' | 'hold'
