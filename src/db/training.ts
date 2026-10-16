import { supabase } from '../lib/supabase'
import { throwIf } from './studio'

// Workouts, diet, exercises, foods, recipes and body measurements
// (supabase/migrations/20261011000014_training.sql).

export interface Exercise {
  id: string; studio_id: string | null; name: string; exercise_type: string; body_part: string; equipment: string | null
  instructions: string | null; image_url: string | null; video_url: string | null; active: boolean; created_at: string
}
export interface WorkoutPlan {
  id: string; studio_id: string; name: string; goal: string; level: string; trainer_id: string | null; days_per_week: number
  total_days: number | null; instructions: string | null; is_public: boolean; active: boolean; created_by: string | null; created_at: string
}
export type TimeUnit = 'secs' | 'mins' | 'hours'
export interface WorkoutItem {
  id: string; plan_id: string; day: number; seq: number; exercise_id: string | null; exercise_name: string; exercise_type: string | null
  body_part: string | null; sets: number | null; reps: number | null; time: number | null; time_unit: TimeUnit; weight_kg: number | null
  rest_secs: number | null; notes: string | null
}
export interface Food {
  id: string; studio_id: string | null; name: string; quantity: number; unit: string; calories: number; protein: number; fats: number
  carbs: number; fibre: number; is_veg: boolean; is_verified: boolean; active: boolean; created_at: string
}
export interface Recipe {
  id: string; studio_id: string; name: string; quantity: number; unit: string; calories: number; protein: number; fats: number; carbs: number; fibre: number
  prep_time_mins: number | null; ingredients: string | null; method: string | null; notes: string | null; image_url: string | null; pdf_url: string | null
  is_veg: boolean; member_id: string | null; is_verified: boolean; active: boolean; created_at: string
}
export interface DietPlan {
  id: string; studio_id: string; name: string; goal: string; level: string; trainer_id: string | null; calories_target: number | null
  instructions: string | null; is_public: boolean; active: boolean; created_by: string | null; created_at: string
}
export interface DietItem {
  id: string; plan_id: string; weekday: number; meal: string; meal_time: string | null; seq: number; food_id: string | null; recipe_id: string | null
  item_name: string; quantity: number | null; unit: string | null; calories: number; protein: number; fats: number; carbs: number; fibre: number; notes: string | null
}
export interface MemberWorkout { id: string; member_id: string; plan_id: string; weekdays: number[]; start_date: string; end_date: string | null; goal: string | null; level: string | null; active: boolean; assigned_by: string | null; created_at: string }
export interface MemberDiet { id: string; member_id: string; plan_id: string; start_date: string; end_date: string | null; active: boolean; assigned_by: string | null; created_at: string }
export interface WorkoutLog { id: string; member_id: string; item_id: string; date: string; sets_done: number | null; reps_done: number | null; weight_kg: number | null }
export interface Measurement {
  id: string; member_id: string; measured_on: string; vals: Record<string, number | string>; weight_kg: number | null; height_cm: number | null
  note: string | null; recorded_by: string | null; created_at: string
}
export interface MeasurementPhoto { id: string; member_id: string; measurement_id: string; path: string; created_at: string }

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const WEEKDAYS_SHORT = WEEKDAYS.map((d) => d.slice(0, 3))
export const dietDayLabel = (w: number) => (w === 0 ? 'Every day' : WEEKDAYS[w - 1])

const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// Exercises ------------------------------------------------------------------------------------
export async function listExercises(studioId: string) {
  const [rows, hidden] = await Promise.all([
    supabase.from('exercises').select('*').or(`studio_id.is.null,studio_id.eq.${studioId}`).order('name').limit(5000),
    supabase.from('exercise_exclusions').select('exercise_id').eq('studio_id', studioId),
  ])
  const list = throwIf(rows) as Exercise[]
  const off = new Set((throwIf(hidden) as { exercise_id: string }[]).map((h) => h.exercise_id))
  return list.map((e) => ({ ...e, hidden: off.has(e.id) }))
}
export async function saveExercise(studioId: string, id: string | null, v: Partial<Exercise>) {
  const res = id
    ? await supabase.from('exercises').update(v).eq('id', id).select('id').single()
    : await supabase.from('exercises').insert({ ...v, studio_id: studioId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function updateExercises(ids: string[], change: 'delete' | { active: boolean }) {
  if (change === 'delete') throwIf(await supabase.from('exercises').delete().in('id', ids).select('id'))
  else throwIf(await supabase.from('exercises').update(change).in('id', ids).select('id'))
}
export async function setExerciseHidden(studioId: string, ids: string[], hidden: boolean) {
  if (hidden) throwIf(await supabase.from('exercise_exclusions').upsert(ids.map((exercise_id) => ({ studio_id: studioId, exercise_id })), { onConflict: 'studio_id,exercise_id', ignoreDuplicates: true }).select('exercise_id'))
  else throwIf(await supabase.from('exercise_exclusions').delete().eq('studio_id', studioId).in('exercise_id', ids).select('exercise_id'))
}

// Workout plans --------------------------------------------------------------------------------
export async function listWorkoutPlans(studioId: string) {
  return throwIf(await supabase.from('workout_plans').select('*').eq('studio_id', studioId).order('created_at', { ascending: false }).limit(2000)) as WorkoutPlan[]
}
export async function getWorkoutPlan(id: string) {
  const [p, items] = await Promise.all([
    supabase.from('workout_plans').select('*').eq('id', id).single(),
    supabase.from('workout_plan_items').select('*').eq('plan_id', id).order('day').order('seq').order('created_at'),
  ])
  return { plan: throwIf(p) as WorkoutPlan, items: throwIf(items) as WorkoutItem[] }
}
export async function saveWorkoutPlan(studioId: string, id: string | null, v: Partial<WorkoutPlan>) {
  const res = id
    ? await supabase.from('workout_plans').update(v).eq('id', id).select('id').single()
    : await supabase.from('workout_plans').insert({ ...v, studio_id: studioId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function saveWorkoutItem(planId: string, id: string | null, v: Partial<WorkoutItem>) {
  const res = id
    ? await supabase.from('workout_plan_items').update(v).eq('id', id).select('id').single()
    : await supabase.from('workout_plan_items').insert({ ...v, plan_id: planId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function deleteWorkoutItem(id: string) {
  throwIf(await supabase.from('workout_plan_items').delete().eq('id', id).select('id'))
}
export const copyWorkoutDay = (plan: string, fromPlan: string, fromDay: number, toDay: number) =>
  rpc<number>('copy_workout_day', { p_plan: plan, p_from_plan: fromPlan, p_from_day: fromDay, p_to_day: toDay })
export const duplicatePlan = (kind: 'workout' | 'diet', plan: string, name?: string) => rpc<string>('duplicate_plan', { p_kind: kind, p_plan: plan, p_name: name ?? null })

// Diet plans -----------------------------------------------------------------------------------
export async function listDietPlans(studioId: string) {
  return throwIf(await supabase.from('diet_plans').select('*').eq('studio_id', studioId).order('created_at', { ascending: false }).limit(2000)) as DietPlan[]
}
export async function getDietPlan(id: string) {
  const [p, items] = await Promise.all([
    supabase.from('diet_plans').select('*').eq('id', id).single(),
    supabase.from('diet_plan_items').select('*').eq('plan_id', id).order('weekday').order('meal_time', { nullsFirst: false }).order('seq').order('created_at'),
  ])
  return { plan: throwIf(p) as DietPlan, items: throwIf(items) as DietItem[] }
}
export async function saveDietPlan(studioId: string, id: string | null, v: Partial<DietPlan>) {
  const res = id
    ? await supabase.from('diet_plans').update(v).eq('id', id).select('id').single()
    : await supabase.from('diet_plans').insert({ ...v, studio_id: studioId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function saveDietItem(planId: string, id: string | null, v: Partial<DietItem>) {
  const res = id
    ? await supabase.from('diet_plan_items').update(v).eq('id', id).select('id').single()
    : await supabase.from('diet_plan_items').insert({ ...v, plan_id: planId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function deleteDietItem(id: string) {
  throwIf(await supabase.from('diet_plan_items').delete().eq('id', id).select('id'))
}
export const copyDietDay = (plan: string, fromPlan: string, fromDay: number, toDay: number) =>
  rpc<number>('copy_diet_day', { p_plan: plan, p_from_plan: fromPlan, p_from_weekday: fromDay, p_to_weekday: toDay })

/** Bulk Delete / Deactivate / Activate / Make public on plan lists. */
export async function updatePlans(table: 'workout_plans' | 'diet_plans', ids: string[], change: 'delete' | { active?: boolean; is_public?: boolean }) {
  if (change === 'delete') throwIf(await supabase.from(table).delete().in('id', ids).select('id'))
  else throwIf(await supabase.from(table).update(change).in('id', ids).select('id'))
}

// Foods and recipes ----------------------------------------------------------------------------
export async function listFoods(studioId: string) {
  return throwIf(await supabase.from('foods').select('*').or(`studio_id.is.null,studio_id.eq.${studioId}`).order('name').limit(5000)) as Food[]
}
export async function listRecipes(studioId: string) {
  return throwIf(await supabase.from('recipes').select('*').eq('studio_id', studioId).order('name').limit(5000)) as Recipe[]
}
export async function saveFood(studioId: string, id: string | null, v: Partial<Food>) {
  const res = id
    ? await supabase.from('foods').update(v).eq('id', id).select('id').single()
    : await supabase.from('foods').insert({ ...v, studio_id: studioId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function updateFoods(ids: string[], change: 'delete' | { is_verified?: boolean; active?: boolean }) {
  if (change === 'delete') throwIf(await supabase.from('foods').delete().in('id', ids).select('id'))
  else throwIf(await supabase.from('foods').update(change).in('id', ids).select('id'))
}
export async function saveRecipe(studioId: string, id: string | null, v: Partial<Recipe>) {
  const res = id
    ? await supabase.from('recipes').update(v).eq('id', id).select('id').single()
    : await supabase.from('recipes').insert({ ...v, studio_id: studioId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function updateRecipes(ids: string[], change: 'delete' | { is_verified?: boolean; active?: boolean }) {
  if (change === 'delete') throwIf(await supabase.from('recipes').delete().in('id', ids).select('id'))
  else throwIf(await supabase.from('recipes').update(change).in('id', ids).select('id'))
}
export async function importRecipes(studioId: string, rows: Partial<Recipe>[]) {
  if (!rows.length) return 0
  const res = throwIf(await supabase.from('recipes').insert(rows.map((r) => ({ ...r, studio_id: studioId }))).select('id')) as { id: string }[]
  return res.length
}

/** Macros for an amount of a food or recipe (values are for its stated quantity). */
export function scaled(base: { quantity: number; calories: number; protein: number; fats: number; carbs: number; fibre: number }, amount: number) {
  const k = base.quantity > 0 ? amount / base.quantity : 0
  const r = (n: number) => Math.round(n * k * 10) / 10
  return { calories: r(base.calories), protein: r(base.protein), fats: r(base.fats), carbs: r(base.carbs), fibre: r(base.fibre) }
}
export const totals = (items: { calories: number; protein: number; fats: number; carbs: number; fibre: number }[]) =>
  items.reduce((t, i) => ({ calories: t.calories + Number(i.calories), protein: t.protein + Number(i.protein), fats: t.fats + Number(i.fats),
    carbs: t.carbs + Number(i.carbs), fibre: t.fibre + Number(i.fibre) }), { calories: 0, protein: 0, fats: 0, carbs: 0, fibre: 0 })

/** A day's diet: a weekday's own meals replace the "Every day" items of the same meal; other meals carry over. */
export function dietForDay(items: DietItem[], weekday: number) {
  if (weekday === 0) return items.filter((i) => i.weekday === 0)
  const own = items.filter((i) => i.weekday === weekday)
  const ownMeals = new Set(own.map((i) => i.meal))
  return [...own, ...items.filter((i) => i.weekday === 0 && !ownMeals.has(i.meal))]
}

/** Meals in the studio's meal-time order, unknown ones last; each with its time (earliest set) and items. */
export function groupMeals(items: DietItem[], order: string[]) {
  const by = new Map<string, DietItem[]>()
  for (const i of items) by.set(i.meal, [...(by.get(i.meal) ?? []), i])
  const rank = (m: string) => { const k = order.indexOf(m); return k < 0 ? 999 : k }
  return [...by.entries()]
    .map(([meal, list]) => ({ meal, time: list.map((i) => i.meal_time).filter(Boolean).sort()[0] ?? null, items: [...list].sort((a, b) => a.seq - b.seq) }))
    .sort((a, b) => rank(a.meal) - rank(b.meal) || (a.time ?? '99').localeCompare(b.time ?? '99') || a.meal.localeCompare(b.meal))
}

/** "7:30 AM" from "07:30:00". */
export function clock(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** Healthy weight range for a height (BMI 18.5 to 24.9). */
export function idealWeight(heightCm: number) {
  const m = heightCm / 100
  return { low: Math.round(18.5 * m * m * 10) / 10, high: Math.round(24.9 * m * m * 10) / 10 }
}
export const feetToCm = (ft: number, inch: number) => Math.round((ft * 30.48 + inch * 2.54) * 10) / 10
export function cmToFeet(cm: number) {
  const total = cm / 2.54
  let ft = Math.floor(total / 12)
  let inch = Math.round(total - ft * 12)
  if (inch === 12) { ft += 1; inch = 0 }
  return { ft, inch }
}

// A client's plans -----------------------------------------------------------------------------
export async function memberPlans(memberId: string) {
  const [w, d] = await Promise.all([
    supabase.from('member_workouts').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).limit(50),
    supabase.from('member_diets').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).limit(50),
  ])
  return { workouts: throwIf(w) as MemberWorkout[], diets: throwIf(d) as MemberDiet[] }
}
export const assignWorkout = (a: { member: string; plan: string; weekdays: number[]; weight?: number | null; heightCm?: number | null; goal?: string; level?: string }) =>
  rpc<string>('assign_workout', { p_member: a.member, p_plan: a.plan, p_weekdays: a.weekdays, p_weight: a.weight ?? null, p_height_cm: a.heightCm ?? null,
    p_goal: a.goal || null, p_level: a.level || null })
export const assignDiet = (member: string, plan: string) => rpc<string>('assign_diet', { p_member: member, p_plan: plan })
export const endMemberPlan = (kind: 'workout' | 'diet', member: string) => rpc<void>('end_member_plan', { p_kind: kind, p_member: member })

/** Which plan day falls on a date for a client's workout days (Day 1 on the first chosen weekday, and so on). */
export function planDayFor(dateIso: string, weekdays: number[], daysPerWeek: number) {
  const d = new Date(`${dateIso}T00:00:00`)
  const iso = ((d.getDay() + 6) % 7) + 1
  const sorted = [...weekdays].sort((a, b) => a - b)
  const i = sorted.indexOf(iso)
  return i < 0 ? null : (i % Math.max(1, daysPerWeek)) + 1
}

// Workout ticks ----------------------------------------------------------------------------------
export async function workoutLogs(memberId: string, from: string, to: string) {
  return throwIf(await supabase.from('workout_logs').select('*').eq('member_id', memberId).gte('date', from).lte('date', to).limit(2000)) as WorkoutLog[]
}
export async function tickExercise(memberId: string, itemId: string, date: string, done: boolean, sets?: number | null) {
  if (done) throwIf(await supabase.from('workout_logs').insert({ member_id: memberId, item_id: itemId, date, sets_done: sets ?? null }).select('id'))
  else throwIf(await supabase.from('workout_logs').delete().eq('member_id', memberId).eq('item_id', itemId).eq('date', date).select('id'))
}

// Measurements ------------------------------------------------------------------------------------
export async function memberMeasurements(memberId: string) {
  return throwIf(await supabase.from('measurements').select('*').eq('member_id', memberId).order('measured_on', { ascending: false }).order('created_at', { ascending: false }).limit(500)) as Measurement[]
}
export async function memberPhotos(memberId: string) {
  return throwIf(await supabase.from('measurement_photos').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).limit(200)) as MeasurementPhoto[]
}
export const saveMeasurement = (p: { member_id: string; measured_on?: string; values: Record<string, string | number>; note?: string; photos?: string[] }) =>
  rpc<string>('save_measurement', { p })
export async function deleteMeasurement(id: string) {
  throwIf(await supabase.from('measurements').delete().eq('id', id).select('id'))
}
export async function uploadProgressPhoto(studioId: string, memberId: string, file: File) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${studioId}/${memberId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const up = await supabase.storage.from('progress-photos').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (up.error) throw new Error(up.error.message)
  return path
}
export async function photoLink(path: string) {
  const res = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600)
  if (res.error) throw new Error(res.error.message)
  return res.data.signedUrl
}

/** Units shown next to each measurement (body circumferences in inches). */
const UNIT: Record<string, string> = {
  height: 'cm', weight_kg: 'kg', resting_heart_rate: 'bpm', general_body_fat: '%', bmr: 'kcal', resting_metabolism: 'kcal', body_metabolic_age: 'years',
  muscle_mass: 'kg', fat_free_weight: 'kg', trunk_muscle_mass: 'kg', left_arm_muscle_mass: 'kg', right_arm_muscle_mass: 'kg', left_leg_muscle_mass: 'kg',
  bone_mass: 'kg', skeletal_muscle: 'kg', left_leg_fat: 'kg', right_leg_fat: 'kg', right_arm_fat: 'kg', trunk_fat: '%', body_water: '%', protein_bar: '%',
  sub_cutaneous_fat: '%', subcut_fat_trunk: '%', subcut_fat_arms: '%', subcut_fat_legs: '%', skele_muscle_body: '%', skele_muscle_trunk: '%',
  skele_muscle_arms: '%', skele_muscle_legs: '%', visceral_fat: 'level', bmi: '', blood_presure: 'mmHg', deviation_note: '',
}
export const measurementUnit = (key: string) => (key in UNIT ? UNIT[key] : 'in')
export const TEXT_MEASUREMENTS = new Set(['blood_presure', 'deviation_note'])

// Weight Loss Analysis ------------------------------------------------------------------------------
export interface WeightLossRow {
  member_id: string; name: string; code: string | null; country_code: string; phone: string | null; email: string | null; gender: string | null; kind: string
  coach: string | null; count: number; first_date: string; first_weight: number; last_date: string; last_weight: number; lost: number; lost_pct: number | null; waist_lost: number | null
}
export const weightLoss = (studioId: string, from: string, to: string, filter: Record<string, unknown>) =>
  rpc<WeightLossRow[]>('analysis_weight_loss', { p_studio: studioId, p_from: from, p_to: to, p_filter: filter })
