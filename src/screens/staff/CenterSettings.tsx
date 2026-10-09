import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import { MAIN_MEASUREMENTS, MEASUREMENT_LABELS } from '../../db/center'
import { SettingsPage, saveSection, type SRow } from '../../components/settingsForm'
import { studioLine } from '../../components/crud'
import { Notice, TextInput } from '../../components/controls'
import { Loading, PageHeader } from '../../components/ui'
import { useToast } from '../../components/toast'

// YDL "Fitness Center Settings" and App Settings › "On/Off Permission" and "Measurement Settings".
const opts = (xs: (string | [string, string])[]) => xs.map((x) => (Array.isArray(x) ? { value: x[0], label: x[1] } : { value: x, label: x }))
const APP = 'With the member app'
const MSG = 'With SMS, WhatsApp and email sending'
const BIO = 'With the biometric connection'

const TRAINER_TYPES = ['Head Trainer', 'Personal Trainer', 'General Trainer', 'Senior Head Coach', 'Lead Coach', 'Group Fitness Coach', 'Postnatal Fitness Coach',
  'CrossFit Coach', 'Personal Training & Nutrition Coach', 'Pilates Teacher', 'Freelancer', 'Owner', 'Floor Manager/Fitness Manager', 'Sales',
  'Support Staff/Helper', 'Front Desk Executive', 'Manager/General Manager', 'Sales Manager', 'Admin', 'HR']

const CENTER_ROWS: SRow[] = [
  { label: 'SMS Permissions', later: MSG, items: [
    { key: 'sms_on_enquiry', type: 'check', label: 'Send Message On Enquiry' }, { key: 'sms_on_expiry', type: 'check', label: 'Send Message On Expiry' },
    { key: 'sms_on_birthday', type: 'check', label: 'Send Message On Birthday' }] },
  { label: 'Dashboard Permissions', later: MSG, items: [{ key: 'email_on_bill', type: 'check', label: 'Email On Bill Generation' }] },
  { label: 'App Permissions', later: APP, items: [
    { key: 'app_live_traffic', type: 'check', label: 'Show Live Traffic' }, { key: 'app_diet_plan', type: 'check', label: 'Allow Diet Plan' },
    { key: 'app_workout_plan', type: 'check', label: 'Allow Workout Plan' }, { key: 'app_cardio_plan', type: 'check', label: 'Allow Cardio Plan' }] },
  { label: 'Freeze Memberships With Freeze Days Max Limit', hint: 'No stops new freezes, at the desk and in the app.', items: [{ key: 'freeze_membership', type: 'yesno', label: 'Freeze Memberships' }] },
  { label: 'Multi Centre Sessions Accessibility', later: 'With a second branch', items: [{ key: 'multi_centre_sessions', type: 'yesno', label: 'Multi Centre Sessions Accessibility' }] },
  { label: 'Biometric', later: BIO, items: [
    { key: 'bio_deactivate_on_balance', type: 'yesno', label: 'Deactivate Member From Device On Balance' },
    { key: 'bio_deactivate_on_expiry', type: 'yesno', label: 'Deactivate Member From Device On Expiry' },
    { key: 'has_essl', type: 'yesno', label: 'Does Fitness Center Has ESSL Biometric Device' },
    { key: 'essl_server', type: 'select', label: 'Select Biometric Device', options: opts([['EPUSH', 'EPUSH SERVER'], ['ETIME', 'ETIME SERVER']]) },
    { key: 'bio_serial', type: 'text', label: 'Biometric Serial Number' }, { key: 'bio_serial_two', type: 'text', label: 'Second Device Serial Number' },
    { key: 'bio_email_alert', type: 'yesno', label: 'Email Alerts' }, { key: 'bio_alert_email', type: 'text', label: 'Alert Email Address' }] },
  { label: 'Vital Device Settings', later: BIO, items: [
    { key: 'vital_block_pt_expiry', type: 'yesno', label: 'Block Users On Expiry Of PT Memberships' },
    { key: 'has_vital', type: 'yesno', label: 'Does Fitness Center Has Vital Systems Door Open System' },
    { key: 'vital_device_id', type: 'text', label: 'Vital Device ID' }, { key: 'vital_mqtt_client_id', type: 'text', label: 'Vital MQTT Client ID' },
    { key: 'vital_display_message', type: 'text', label: 'Vital Display Message' }, { key: 'vital_display_ou_id', type: 'text', label: 'Vital Display OU ID' },
    { key: 'vital_device_id_two', type: 'text', label: 'Second Vital Device ID' }, { key: 'vital_mqtt_client_id_two', type: 'text', label: 'Second MQTT Client ID' },
    { key: 'vital_display_message_two', type: 'text', label: 'Second Display Message' }, { key: 'vital_display_ou_id_two', type: 'text', label: 'Second Display OU ID' }] },
  { label: 'Links', items: [
    { key: 'website_url', type: 'text', label: 'Website URL :' }, { key: 'web_app_url', type: 'text', label: 'Web App URL :' },
    { key: 'android_app_url', type: 'text', label: 'Andriod App URL :' }, { key: 'ios_app_url', type: 'text', label: 'IOS App URL :' }] },
  { label: 'Send Data Export Emails:', later: MSG, items: [{ key: 'export_emails', type: 'text', placeholder: 'email@example.com' }] },
  { label: 'Class Limiter', later: APP, items: [{ key: 'class_limiter', type: 'yesno', label: 'Show Class Limiter' }] },
  { label: 'Auto Approve', later: APP, items: [
    { key: 'auto_approve_challenge', type: 'yesno', label: 'Auto Approve ( Challenge Posts )' },
    { key: 'auto_approve_community', type: 'yesno', label: 'Auto Approve ( Community Posts )' }] },
  { label: 'Dashboard Homepage Design', hint: 'This app has one dashboard design; your choice is kept for later layouts.', items: [
    { key: 'dashboard_design', type: 'select', label: 'Design', options: opts([['D', 'Old UI/Default UI'], ['H', 'Old UI/Default UI- with Missed Follow-ups'], ['N', 'New UI'],
      ['S', 'New UI with Summaries'], ['S2', 'New UI with Summaries Type 2'], ['E', 'UI with Enquiry,Tasks,Transaction,FollowUP'], ['P', 'UI with Prospects,Trials,Paid Clients'],
      ['PI', 'Pilates UI'], ['ND', 'New Dashboard Design']]) },
    { key: 'nav_left_align', type: 'yesno', label: 'Left Align the menu bar' }] },
  { label: 'Check(IN/Out) Search By', later: BIO, items: [{ key: 'checkin_search_by', type: 'select', placeholder: 'Search By',
    options: opts([['REF', 'Reference Number'], ['CN', 'Mobile Number'], ['EM', 'Email'], ['MC', 'Member Code']]) }] },
  { label: 'Cancel/Reject/Delete PT Request Access', later: APP, items: [
    { key: 'pt_request_cancel_only', type: 'yesno', label: 'Only these can cancel' },
    { key: 'pt_cancel_access', type: 'multiselect', label: 'Who', options: opts(TRAINER_TYPES) }] },
  { label: 'Enrollment Terms', hint: 'Printed for the client to agree to when they join.', items: [{ key: 'enrollment_terms', type: 'textarea' }] },
  { label: 'Block Membership Upgrade', hint: 'Upgrades are allowed only this many days after the start. 0 means always.', items: [{ key: 'upgrade_block_days', type: 'number', label: 'After no of Days:' }] },
  { label: 'Push Notification to all Coaches', later: APP, items: [{ key: 'push_to_coaches', type: 'multiselect', label: 'Select Notification to',
    options: opts([['CLASSBOOKED', 'Class Booked'], ['CLASSCANCELLED', 'Class Cancelled'], ['WAITINGLIST', 'Waiting List'], ['FREEZED', 'Freezed Subscription'], ['MAKEPAY', 'Make Payment via APP']]) }] },
  { label: 'Exercise', later: APP, items: [
    { key: 'custom_exercise_only', type: 'yesno', label: 'Show Only Custom Exercise' }, { key: 'share_custom_exercise', type: 'yesno', label: 'Share Custom Exercise' }] },
  { label: 'Exercise Display Type', later: APP, items: [
    { key: 'exercise_coach', type: 'check', arrayValue: 'anatomy', label: 'Coach: Anatomy' }, { key: 'exercise_coach', type: 'check', arrayValue: 'youtube', label: 'Coach: YouTube' },
    { key: 'exercise_coach', type: 'check', arrayValue: 'gif', label: 'Coach: Gif' }, { key: 'exercise_customer', type: 'check', arrayValue: 'anatomy', label: 'Customer: Anatomy' },
    { key: 'exercise_customer', type: 'check', arrayValue: 'youtube', label: 'Customer: YouTube' }, { key: 'exercise_customer', type: 'check', arrayValue: 'gif', label: 'Customer: Gif' }] },
]

export function CenterSettings() {
  return <SettingsPage title="Fitness Center Settings" section="center" rows={CENTER_ROWS}
    intro={<Notice>Settings marked with a grey tag take effect when that part of the system arrives; your choices are kept until then.</Notice>} />
}

// App Settings › On/Off Permission ----------------------------------------------------------------------------
const yn = (key: string, label: string, hint?: string): SRow => ({ label, hint, items: [{ key, type: 'yesno', label }] })
const APP_ROWS: SRow[] = [
  yn('is_online_training', 'Enable Online Training Permission'), yn('allow_workout', 'Enable Workout Analysis'), yn('is_allow_cardio', 'Enable Cardio Analysis'),
  yn('volume', 'Enable Volume Graph'), yn('is_allow_PT', 'Enable Personal Training'), yn('is_QR_Tab_Allowed', 'Enable QR Code'), yn('is_Diet_PlanAllowed', 'Enable Diet Plan'),
  yn('is_woplan_allowed', 'Enable Workout Plan'),
  yn('can_view_parq_form', 'Enable PAR-Q Form', 'Includes clients medical condition which helps trainer to take into consideration during training'),
  yn('allow_recipes', 'Enable Recipe'), yn('is_show_batchInfo', 'Enable Batch Information'), yn('show_appointment', 'Enable Appointments'),
  yn('live_gym_traffic', 'Gym Live Traffic'), yn('show_diary', 'Show Diary'), yn('show_diary_video', 'Show Diary Video'),
  { label: 'Trainer Prefix Name', items: [{ key: 'trainer_prefix_name', type: 'text' }] },
  { label: 'Customer Prefix Name', items: [{ key: 'customer_prefix_name', type: 'text' }] },
  yn('fc_allow_freeze_memberships', 'Enable Freezing Of Memberships'), yn('can_add_food', 'Allow clients to add their food in diet plan?'),
  yn('can_edit_meal', 'Allow clients to edit meals in diet plan?'), yn('show_calories_breakdown', 'Show Calories breakdown/Info to clients in diet plan?'),
  yn('can_book_appointment', 'show book Appoinment button in trainer Profile?'), yn('can_trainer_call', 'show Call Button in trainer Profile?'),
  yn('can_whatsapp_trainer', 'show Whatsapp Button in trainer Profile?'), yn('can_refer_friend', 'Show Refer Friends Card'),
  { label: 'Upload Ecommerce Banner', items: [{ key: 'ecommerce_banner', type: 'image' }] },
  yn('can_sign_up', 'Can Sign Up', 'Live now: No hides “Join” on the website and closes online sign-up.'),
  yn('show_browse_planoption', 'Show Browse Plan Option?'), yn('show_slot_datewise_orderhistory', 'Show Slot DateWise Order History?'),
  yn('cartnote_address_support', 'Cart Note And Address Support To Buy Subscription?'), yn('show_subscription_price', 'Show Subscription Total Price?'),
  yn('fc_allow_link_external_check_in', 'External Link Check In From Customer App'), yn('show_challenge_player', 'Show Challenge Player Of The Day?'),
  yn('hide_pincode', 'Hide Pincode?'), yn('is_reference_code_compulsory', 'Is Reference Code Compulsory ?'),
  { label: 'Enter Your Referral Code URL', items: [{ key: 'whatsapp_link_url', type: 'text', placeholder: 'https://' }] },
  yn('allow_ecommerce', 'Allow Ecommerce in Customer App?'),
  yn('navigate_to_services_page', 'Open the Services Listing Page when the Book My Class button is clicked in the Customer App?', 'Go to the Service Listing Page to manage and control services.'),
  yn('is_signup_on_boarding_flow', 'Signup Onboarding Flow?'), yn('allow_recipe', 'Show Recipes on Home Page?'), yn('is_glucose_tracker_on', 'Glucose Tracker?'),
  yn('allow_ydl_articles', 'Articles Section?'), yn('show_class', 'Show Classes?'), yn('is_habit_tracker_on', 'Habit Tracker?'),
  yn('show_membership_plans', 'Show Membership Plans?', 'Live now: the plans list in the member app.'),
  yn('is_attendance_report_visible', 'Show Attendence Report screen in Customer App in Menu?'),
  yn('allow_expired_checkin', 'Allow Expired Members to Check-in/Check Out?'), yn('show_terms_and_condition', 'Show Terms And Condition in Customer App (After Login)?'),
  yn('show_my_subscriptions', 'Show My Subscriptions?'), yn('can_set_goal', 'Can Set Goal?'), yn('show_diet_pdf', 'Show Diet PDF in Customer App?'),
  yn('show_workout_pdf', 'Show Workout PDF in Customer App?'), yn('can_change_diet_plan', 'Can Change Diet Plan?'), yn('can_change_workout_plan', 'Can Change Workout Plan?'),
  yn('show_diet_plan_history', 'Show diet plan history to clients on app inside the diet tracking feature?'),
  yn('show_other_home_page', 'Enable Minimalistic HomePage UI', 'It will show only banners, action item buttons, challenges and coupons feature'),
  yn('can_see_payment_details', 'Can Client See Payment Details of Coach inside coach profile?'),
  yn('show_subscription_payment_details', 'Can client see payment and subscription details of a particular subscription in My Subscriptions?'),
  yn('show_diet_upcoming_plans', 'Show diet plans scheduled for future to clients on app inside the diet tracking feature?'),
  yn('show_membership_plans_prices', 'Show Membership Plan Prices to clients on App?', 'Live now: prices on the member app plans list.'),
  yn('show_subscription_plans_prices', 'Show Subscription price [amount paid] to clients in My Subscriptions section of app?'),
  yn('is_wellness_coach', 'Is Wellness Coach?', 'Recommended for wellness coaches only as this will disable the workout checkout flow on the app'),
  { label: 'Upload Custom Screen Banner', items: [{ key: 'custom_screen_banner', type: 'image' }] },
  { label: 'Show Customized Terms And Conditions (Visible in Customer App)', items: [
    { key: 'terms_active', type: 'yesno', label: 'Status' }, { key: 'privacy_url', type: 'text', label: 'Privacy Policy URL:' },
    { key: 'terms_url', type: 'text', label: 'Terms & Conditions URL:' }, { key: 'terms_message', type: 'textarea', label: 'Terms Message:' }] },
]

export function AppPermissions() {
  return <SettingsPage title="App Permission Basic Information" section="app" rows={APP_ROWS}
    intro={<Notice>These switches shape the member app. “Can Sign Up” and the membership plan switches work now; the rest apply as each member-app feature arrives, and your choices are kept until then.</Notice>} />
}

// App Settings › Measurement Settings ---------------------------------------------------------------------------
interface MItem { key: string; order: number; on: boolean }

export function MeasurementSettings() {
  const { data: studio } = useStudio()
  if (!studio) return <Loading />
  const items = ((studio.settings as unknown as { measurements?: MItem[] }).measurements ?? []) as MItem[]
  return <MeasurementForm key={studio.id} initial={items} sub={studioLine(studio)} />
}

function MeasurementForm({ initial, sub }: { initial: MItem[]; sub: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [items, setItems] = useState<MItem[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (key: string, patch: Partial<MItem>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  const save = async () => {
    setBusy(true); setError(null)
    try {
      await saveSection(me.studioId, 'measurements', { items })
      await qc.invalidateQueries({ queryKey: ['studio'] })
      toast('Measurement settings saved')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const main = items.filter((i) => MAIN_MEASUREMENTS.includes(i.key))
  const extra = items.filter((i) => !MAIN_MEASUREMENTS.includes(i.key))
  const row = (i: MItem) => (
    <div key={i.key} className="flex items-center gap-3 border-b border-line-soft py-2 last:border-b-0">
      <input id={`m-${i.key}`} type="checkbox" className="check" checked={i.on} onChange={(e) => set(i.key, { on: e.target.checked })} />
      <label htmlFor={`m-${i.key}`} className="min-w-0 flex-1 text-[14px]">{MEASUREMENT_LABELS[i.key] ?? i.key}</label>
      <TextInput small type="number" className="w-20" value={String(i.order)} onChange={(v) => set(i.key, { order: Number(v) || 0 })} />
    </div>
  )
  return (
    <>
      <PageHeader title="Measurements Settings Form" sub={sub} actions={<button type="button" className="btn-gold min-h-10 px-6" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>} />
      <div className="flex max-w-[1000px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <p className="m-0 text-[13px] text-muted">Tick what the measurement form asks for; the number sets the order. Client measurements arrive with workouts and diet, and follow this list.</p>
        <section className="card p-4"><h2 className="eyebrow mb-2">Operations</h2><div className="grid gap-x-8 md:grid-cols-2">{main.map(row)}</div></section>
        <section className="card p-4">
          <h2 className="eyebrow mb-1">Additional Details</h2>
          <p className="m-0 mb-2 text-[12px] text-faint">Below fields will be displayed under Additional Details according to respective orders.</p>
          <div className="grid gap-x-8 md:grid-cols-2">{extra.map(row)}</div>
        </section>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className="btn-gold self-start px-8" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </>
  )
}
