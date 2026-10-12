import { supabase } from '../lib/supabase'
import type { Option } from '../components/controls'

// Fitness Center and App Settings (YDL replica part 5): saving, and the fixed lists YDL offers.
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const saveCenterInfo = (studioId: string, p: Record<string, unknown>) => rpc<void>('save_center_info', { p_studio: studioId, p })
export const saveCenterPrivate = (studioId: string, p: Record<string, unknown>) => rpc<void>('save_center_private', { p_studio: studioId, p })
export const saveCurrency = (studioId: string, currency: string, tax: string) => rpc<void>('save_currency', { p_studio: studioId, p_currency: currency, p_tax: tax })
export type SecretKey = 'smtp_password' | 'otp_vendor_api_key' | 'whatsapp_token' | 'sms_api_key' | 'email_api_key'
export const setSecret = (studioId: string, key: SecretKey, value: string) =>
  rpc<void>('set_studio_secret', { p_studio: studioId, p_key: key, p_value: value })
export const secretStatus = (studioId: string) => rpc<Record<string, string> | null>('studio_secret_status', { p_studio: studioId })
export const notifyMembers = (studioId: string, kind: 'notice' | 'holiday', id: string) => rpc<number>('notify_members', { p_studio: studioId, p_kind: kind, p_id: id })
export const sendFeedback = (memberId: string, text: string) => rpc<string>('send_feedback', { p_member: memberId, p_text: text })

export interface StudioPrivate {
  studio_id: string; company_name: string | null; company_pan: string | null
  billing: Record<string, string>; bank: Record<string, string>; owner: Record<string, string>; manager: Record<string, string>; support: Record<string, string>
}
export async function studioPrivate(studioId: string) {
  const res = await supabase.from('studio_private').select('*').eq('studio_id', studioId).maybeSingle()
  if (res.error) throw new Error(res.error.message)
  return res.data as StudioPrivate | null
}

export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export interface Session { from: string; to: string; gender: 'unisex' | 'men' | 'women' }
export interface Timings { days: number[]; sessions: Session[] }

/** YDL's "Fitness center facilities" ticks. */
export const FACILITIES = ['Locker', 'Shower', 'Training', 'Steam', 'Sauna', 'Valet Parking', 'Wifi', 'Cafe', 'Toilet', 'Biometric', 'Changing Room', 'Pantry',
  'Separate weight loss', 'Cardio Training area', 'Fat Loss', 'Weight Loss', 'Weight Gain', 'Cardio', 'Strength Training', 'Natural Bodybuilding',
  'Injury Rehab', 'Weight Training', 'Crossfit Workout', 'Calisthenics', 'Special Population Training', 'Nutrition Counselling', 'Transformation Plans']

/** YDL "Currency Setting" (code → label). */
export const CURRENCIES: Option[] = [
  ['INR', 'Default (₹)'], ['USD', 'US (USD) ($)'], ['CHF', 'SWISS (CHF) (CHF)'], ['EUR', 'EURO (EUR) (€)'], ['AED', 'UAE (AED) (د.إ.‏)'],
  ['SCR', 'Seychelles (SCR) (SCR)'], ['KWD', 'Kuwait (KWD) ( KD )'], ['MAD', 'Moroccan (MAD) (د.م.‏)'], ['OMR', 'Oman Rial (OMR) (ر.ع.‏)'],
  ['QAR', 'Qatari riyal (QAR) (ر.ق.‏)'], ['PKR', 'Pakistan (PKR) (₨)'], ['LBP', 'Lebanon (LBP) (ل.ل.‏)'], ['SGD', 'Singapore (SGD) ($)'],
  ['SAR', 'Saudi Riyal (SAR) (ر.س.‏)'], ['THB', 'Thailand (THB) (฿)'], ['BHD', 'Bahraini (BHD) (د.ب.‏)'], ['MYR', 'Malaysian ringgit (MYR) (RM)'],
  ['GBP', 'London (GBP) (£)'], ['NPR', 'Nepal (NPR) (नेरू)'], ['PHP', 'Philippines (PHP) (₱)'], ['CDF', 'Congo (CDF) (FC)'],
  ['DZD', 'Algerian Dinar (DZD) (د.ج.‏)'], ['MZN', 'Mozambique (MZN) (MT)'], ['KES', 'Kenya (KES) (KSh)'], ['BDT', 'Bangladesh (BDT) (৳)'],
  ['MUR', 'Mauritius (MUR) (Rs)'],
].map(([value, label]) => ({ value, label }))

/** Where an app action item, quick action item or banner leads (YDL "Add Link Name"). */
export const LINKS: Option[] = [
  ['ABOUT_US', 'About Us'], ['ADD_DIARY', 'Add diary/notes'], ['ADD_MEASUREMENT', 'Add measurement'], ['ADD_POST', 'Add post in community'],
  ['APPOINTMENTS', 'Appointment Screen'], ['ARTICLES_SCREEN', 'Articles Screen'], ['TOTAL_CHECKINS', 'Checkins or Attendance Calendar'],
  ['CHALLENGE_LIST', 'Challenges List'], ['TRAINER_PROFILE', 'Coach Profile, Trainer Profile, Dietician/Nutritonist profile'],
  ['COMMUNITY_TAB', 'Community homepage'], ['BROWSE_CLASSES', 'Classes Listing'], ['TRAINERS_LIST', 'Coaches or Trainers or Dieiticians Listing'],
  ['PT_TAB', 'Coach Tab or PT Details Tab or Sessions Tab'], ['CONTACT', 'Contact us'], ['CUSTOM_CLIENT_FORM', 'Custom Client Form with History'],
  ['CUSTOM_SCREEN', 'Custom Screen'], ['DIARY_LISTING', 'Diary list'], ['DIET_ANALYSIS', 'Diet Analysis'], ['EXERCISE_VOLUME_GRAPHS', 'Exercise Analysis'],
  ['EXTERNAL_WEB', 'External Web link (redirects user to external web browser or app)'], ['FEEDBACK', 'Feedback'],
  ['VIEW_PARQ_FORM', 'Fitness form, health form, PARQ form'], ['FITNESS_NOTICES', 'Fitness Center Notices'], ['FITNESS_RULES', 'Fitness Center Rules'],
  ['FITNESS_TOOLS', 'Fitness tools'], ['FREE_DIET', 'Free Diet Plans List'],
  ['FREE_TRIAL', 'Free Trial (Generates a followup on dashboard once user clicks on this banner/button)'], ['FREE_WORKOUT', 'Free Workout Plans List'],
  ['GIVE_REFERRAL', 'Give Referral or Add Reference'], ['HYDRATION', 'Hydration, water tracker'], ['TRAFFIC', 'Live Traffic'], ['LOG_WEIGHT', 'Log Weight'],
  ['SUBSCRIPTIONS', 'Membership plans'], ['MEASUREMENT_LIST', 'Measurements Logs'], ['MY_COUPONS', 'My Coupons Listing (Coupon Distribution, JioCoupons)'],
  ['DIET_PLAN', 'My Diet Plan'], ['PROFILE', 'My Profile screen'], ['MY_SUBSCRIPTIONS', 'My subscriptions'], ['WORKOUT_PLAN', 'My Workout Plan'],
  ['OWN_PROGRAM_LIST', 'Program List'], ['POSTURE_REMINDER', 'Posture Reminder'], ['RECIPE_DETAILS', 'Recipe details screen'], ['RECIPE_LIST', 'Recipes Listing'],
  ['RESTARTAPP', 'Restart App'], ['SLEEP_TRACKER', 'Sleep Tracker'], ['STEPS', 'Steps Tracker'], ['TRACK_WORKOUT', 'Track Workout'],
  ['TRANSFORMATIONS', 'Transformations Listing'], ['VIDEO', 'Video Player'], ['WEB', 'Web page (opens site within the app)'],
  ['WORKOUT_ANALYSIS', 'Workout Analysis'], ['WORKOUT_DIET_OPTIONS', 'Workout And Diet Options'],
].map(([value, label]) => ({ value, label }))
export const linkLabel = (v: unknown) => LINKS.find((l) => l.value === v)?.label.split(' (')[0] ?? '—'

/** Links the member app opens today (the rest arrive with the member app's features). */
export const LIVE_LINKS = new Set(['SUBSCRIPTIONS', 'TRAINERS_LIST', 'ABOUT_US', 'CONTACT', 'FREE_TRIAL', 'FITNESS_NOTICES', 'FITNESS_RULES', 'FEEDBACK',
  'TRANSFORMATIONS', 'EXTERNAL_WEB', 'WEB', 'PROFILE', 'MY_SUBSCRIPTIONS'])

/** YDL's icon choices, drawn with our own icons (YDL's pictures stay with YDL). */
export const ICONS: { value: string; label: string; icon: string }[] = [
  ['free_workout', 'Free Workout', 'dumbbell'], ['claim_free_course', 'Claim Free Course', 'sparkle'], ['browse_plans', 'Browse Plans', 'list'],
  ['free_class', 'Free Class', 'calendar'], ['buy_courses', 'Buy Courses', 'receipt'], ['recipes', 'Recipes', 'plate'], ['track_diet', 'Track Your Diet', 'plate'],
  ['message', 'Message', 'chat'], ['whatsapp', 'WhatsApp', 'whatsapp'], ['personal_trainer', 'Personal Trainer', 'person'], ['medicine', 'Medicine', 'plus'],
  ['laboratory', 'Laboratory', 'doc'], ['facebook', 'Facebook', 'people'], ['instagram', 'Instagram', 'eye'], ['search', 'Search', 'search'],
  ['contact_us', 'Contact Us', 'phone'], ['website', 'Website', 'home'], ['body_transformation', 'Body Transformation', 'sparkle'],
  ['products_icon', 'Products Icon', 'receipt'], ['pt_trial', 'PT Trial', 'person'], ['book_classes', 'Book Classes', 'calendar'], ['books', 'Books', 'doc'],
  ['calendar', 'Calendar', 'calendar'], ['credit_card', 'Credit Card', 'rupee'], ['linkedin', 'Linkedin', 'people'], ['measurement', 'Measurement', 'chart'],
  ['measure_tape', 'Measure Tape', 'chart'], ['money', 'Money', 'rupee'], ['our_blogs', 'Our Blogs', 'doc'], ['posture_reminder', 'Posture Reminder', 'bell'],
  ['refer_friend', 'Refer your friend', 'userPlus'], ['track_workout', 'Track Workout', 'dumbbell'], ['water_bottle', 'Water Bottle', 'plus'],
  ['weight_machine', 'Weight Machine', 'dumbbell'], ['live_traffic', 'Live Traffic', 'people'], ['my_profile', 'My Profile', 'person'],
  ['my_diet_plan', 'My Diet Plan', 'plate'], ['my_coupons', 'My Coupons', 'receipt'],
].map(([value, label, icon]) => ({ value, label, icon }))
/** Quick action items offer fewer icons in YDL. */
export const QUICK_ICONS = ICONS.filter((i) => !['pt_trial', 'book_classes', 'books', 'calendar', 'credit_card', 'linkedin', 'measurement', 'measure_tape', 'money',
  'our_blogs', 'posture_reminder', 'refer_friend', 'track_workout', 'water_bottle', 'weight_machine', 'live_traffic'].includes(i.value))
export const iconFor = (v: unknown) => ICONS.find((i) => i.value === v)?.icon ?? 'sparkle'

export const SHOW_TO: Option[] = [
  ['both', 'Both (Paid/Free)'], ['paid', 'Paid Users'], ['free', 'Free Users'], ['active_pt', 'Active PT or Personalised Plan Clients'],
  ['general_no_pt', 'Clients with Active general plan but no personalised plans'], ['all_expired', 'Clients with All Expired plans'],
].map(([value, label]) => ({ value, label }))

export const BANNER_CATEGORIES = ['Sponsored', 'Top Sponsored', 'Custom Screen', ...Array.from({ length: 10 }, (_, i) => `Custom Screen ${i + 1}`)]
/** The Banner List filter also offers YDL's older categories. */
export const BANNER_FILTER = ['Rest Day', 'Post Workout Diet', 'Pre-Workout Diet', 'Expert Articles', 'Sponsored', 'Top Sponsored', 'Power Yoga', 'Cross-fit', 'Cardio',
  'Custom Screen', ...Array.from({ length: 10 }, (_, i) => `Custom Screen ${i + 1}`)]

/** YDL measurement names (Measurements Settings). */
export const MEASUREMENT_LABELS: Record<string, string> = {
  height: 'Height', weight_kg: 'Weight', resting_heart_rate: 'Heart Rate', general_body_fat: 'Body Fat', blood_presure: 'Blood Pressure', bmi: 'BMI', bmr: 'BMR',
  visceral_fat: 'Visceral Fat', sub_cutaneous_fat: 'Subcutaneous Fat', body_metabolic_age: 'Body Metabolic Age', muscle_mass: 'Muscle Mass',
  knees: 'Knees', calves: 'Calves', upper_arm: 'Upper Arm', forearm: 'Forearm', neck: 'Neck', shoulder: 'Shoulder', upper_abdomen: 'Upper Abdomen (Belly)',
  lower_abdomen: 'Lower Abdomen (Belly)', wrist: 'Wrist', bust: 'Bust', chest: 'Chest', waist: 'Waist', hips: 'Hips', midway: 'Midway', thighs: 'Thighs',
  deviation_note: 'Deviation Note', image: 'Image', image_two: 'Image Two', image_three: 'Image Three', trunk_fat: 'Trunk Fat', fat_free_weight: 'Fat Free weight',
  protein_bar: 'Protein', trunk_muscle_mass: 'Trunk Muscle Mass', left_arm_muscle_mass: 'Left Arm Muscle Mass', left_leg_fat: 'Left Leg Fat', bone_mass: 'Bone Mass',
  body_water: 'Body Water', right_arm_fat: 'Right Arm Fat', right_arm_muscle_mass: 'Right Arm Muscle Mass', right_leg_fat: 'Right Leg Fat',
  left_leg_muscle_mass: 'Left Leg muscle mass', skeletal_muscle: 'Skeletal Muscle', upper_arm_left: 'Upper Arm Left (Bicep)', upper_arm_right: 'Upper Arm Right (Bicep)',
  forearm_left: 'Forearm Left', forearm_right: 'Forearm Right', under_bust: 'Under Bust', upper_waist: 'Upper Waist', lower_waist: 'Lower Waist', abdomen: 'Abdomen',
  rib_cage: 'Rib Cage', back_width: 'Back Width (Shoulder)', glutes: 'Glutes (Hips)', love_handles: 'Love Handles', mid_thigh_left: 'Mid Thigh Left',
  mid_thigh_right: 'Mid Thigh Right', face: 'Face', jawline: 'Jawline', wrist_left: 'Left Wrist', wrist_right: 'Right Wrist', thigh_left: 'Left Thigh',
  thigh_right: 'Right Thigh', knee_left: 'Left Knee', knee_right: 'Right Knee', calf_left: 'Left Calf', calf_right: 'Right Calf', ankle_left: 'Left Ankle',
  ankle_right: 'Right Ankle', resting_metabolism: 'Resting Metabolism', subcut_fat_trunk: 'Subcutaneous Fat (Trunk)', subcut_fat_arms: 'Subcutaneous Fat (Arms)',
  subcut_fat_legs: 'Subcutaneous Fat (Legs)', skele_muscle_body: 'Skeletal Muscle % (Whole Body)', skele_muscle_trunk: 'Skeletal Muscle % (Trunk)',
  skele_muscle_arms: 'Skeletal Muscle % (Arms)', skele_muscle_legs: 'Skeletal Muscle % (Legs)', left_lower_thigh: 'Left Lower Thigh',
  right_lower_thigh: 'Right Lower Thigh', abs_upper: 'Abs Upper', abs_mid: 'Abs Mid', abs_lower: 'Abs Lower',
}
/** The first eleven are YDL's main measurements; the rest show under "Additional Details". */
export const MAIN_MEASUREMENTS = ['height', 'weight_kg', 'resting_heart_rate', 'general_body_fat', 'blood_presure', 'bmi', 'bmr', 'visceral_fat',
  'sub_cutaneous_fat', 'body_metabolic_age', 'muscle_mass']
