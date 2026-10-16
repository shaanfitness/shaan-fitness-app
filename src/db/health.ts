import { supabase } from '../lib/supabase'
import { throwIf } from './studio'
import type { Food, Recipe } from './training'

// Health tracking in the member app (supabase/migrations/20261016000019_health.sql): what I ate, daily trackers
// with goals, my diary, the PAR-Q form, free plans, and the numbers behind Workout and Diet Analysis.

export interface FoodLog {
  id: string; member_id: string; date: string; meal: string; plan_item_id: string | null; food_id: string | null; recipe_id: string | null
  name: string; quantity: number | null; unit: string | null; calories: number; protein: number; carbs: number; fats: number; fibre: number; created_at: string
}
export interface DailyLog { member_id: string; date: string; water_ml: number | null; steps: number | null; sleep_hours: number | null; mood: number | null }
export interface Goals { water_ml: number; steps: number; sleep_hours: number; calories: number | null }
export interface DiaryEntry { id: string; date: string; body: string; video_url: string | null; created_at: string }
export const DEFAULT_GOALS: Goals = { water_ml: 3000, steps: 8000, sleep_hours: 7.5, calories: null }
export const GLASS_ML = 250

const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function foodLogs(memberId: string, from: string, to: string) {
  return throwIf(await supabase.from('food_logs').select('*').eq('member_id', memberId).gte('date', from).lte('date', to).order('created_at')) as FoodLog[]
}
export async function logFood(v: { memberId: string; date: string; meal: string; planItemId?: string; foodId?: string; recipeId?: string; name?: string; quantity?: number | null; unit?: string | null; calories?: number; protein?: number; carbs?: number; fats?: number }) {
  const row = {
    member_id: v.memberId, date: v.date, meal: v.meal, plan_item_id: v.planItemId ?? null, food_id: v.foodId ?? null, recipe_id: v.recipeId ?? null,
    name: v.name ?? 'Food', quantity: v.quantity ?? null, unit: v.unit ?? null, calories: v.calories ?? 0, protein: v.protein ?? 0, carbs: v.carbs ?? 0, fats: v.fats ?? 0,
  }
  return throwIf(await supabase.from('food_logs').insert(row).select('*').single()) as FoodLog
}
export async function deleteFoodLog(id: string) { throwIf(await supabase.from('food_logs').delete().eq('id', id).select('id')) }
export async function untickPlanItem(memberId: string, date: string, planItemId: string) {
  throwIf(await supabase.from('food_logs').delete().eq('member_id', memberId).eq('date', date).eq('plan_item_id', planItemId).select('id'))
}

export async function dailyLogs(memberId: string, from: string, to: string) {
  return throwIf(await supabase.from('daily_logs').select('*').eq('member_id', memberId).gte('date', from).lte('date', to).order('date')) as DailyLog[]
}
export async function saveDaily(memberId: string, date: string, patch: Partial<Pick<DailyLog, 'water_ml' | 'steps' | 'sleep_hours' | 'mood'>>) {
  throwIf(await supabase.from('daily_logs').upsert({ member_id: memberId, date, ...patch }, { onConflict: 'member_id,date' }).select('member_id'))
}
export async function myGoals(memberId: string) {
  const r = throwIf(await supabase.from('member_goals').select('water_ml,steps,sleep_hours,calories').eq('member_id', memberId).maybeSingle()) as Goals | null
  return r ? { ...r, water_ml: Number(r.water_ml), steps: Number(r.steps), sleep_hours: Number(r.sleep_hours) } : DEFAULT_GOALS
}
export async function saveGoals(memberId: string, g: Goals) {
  throwIf(await supabase.from('member_goals').upsert({ member_id: memberId, ...g }, { onConflict: 'member_id' }).select('member_id'))
}

export async function diary(memberId: string) {
  return throwIf(await supabase.from('diary_entries').select('id,date,body,video_url,created_at').eq('member_id', memberId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(200)) as DiaryEntry[]
}
export async function addDiary(memberId: string, date: string, body: string, videoUrl: string | null) {
  throwIf(await supabase.from('diary_entries').insert({ member_id: memberId, date, body: body.trim(), video_url: videoUrl }).select('id'))
}
export async function deleteDiary(id: string) { throwIf(await supabase.from('diary_entries').delete().eq('id', id).select('id')) }

export async function myMedical(memberId: string) {
  return throwIf(await supabase.from('member_medical').select('answers,note,updated_at,filled_by_member_at').eq('member_id', memberId).maybeSingle()) as
    { answers: Record<string, boolean>; note: string | null; updated_at: string; filled_by_member_at: string | null } | null
}
export const saveMyMedical = (answers: Record<string, boolean>, note: string) => rpc<null>('save_my_medical', { p_answers: answers, p_note: note || null })

export const startFreePlan = (kind: 'workout' | 'diet', planId: string) => rpc<string>('start_free_plan', { p_kind: kind, p_plan: planId })

/** What the fitness tools start from: my latest weight, height, waist, neck and hips (inches), age and gender. */
export async function bodyFacts(memberId: string) {
  const [ms, me] = await Promise.all([
    supabase.from('measurements').select('measured_on,weight_kg,height_cm,vals').eq('member_id', memberId).order('measured_on', { ascending: false }).limit(20),
    supabase.from('members').select('date_of_birth,gender').eq('id', memberId).maybeSingle(),
  ])
  const rows = throwIf(ms) as { measured_on: string; weight_kg: number | null; height_cm: number | null; vals: Record<string, number | string> | null }[]
  const p = throwIf(me) as { date_of_birth: string | null; gender: string | null } | null
  const latest = (k: string) => { const v = rows.map((r) => r.vals?.[k]).find((x) => x !== undefined && x !== null && x !== '' && !Number.isNaN(Number(x))); return v === undefined ? null : Number(v) }
  return {
    weight: rows.find((x) => x.weight_kg)?.weight_kg ?? latest('weight_kg'), height: rows.find((x) => x.height_cm)?.height_cm ?? latest('height'),
    waist: latest('waist'), neck: latest('neck'), hips: latest('hips'), dob: p?.date_of_birth ?? null, gender: p?.gender ?? null,
  }
}

export interface WorkoutAnalysis { from: string; to: string; weeks: { week: string; days: number; exercises: number; volume: number }[]; parts: { part: string; n: number }[] }
export const workoutAnalysis = (weeks = 8, memberId?: string) => rpc<WorkoutAnalysis>('workout_analysis', { p_member: memberId ?? null, p_weeks: weeks })

/** Recipes I can see: the gym's verified ones and my own (mine wait for the gym to verify them). */
export async function myRecipes(studioId: string) {
  return throwIf(await supabase.from('recipes').select('*').eq('studio_id', studioId).eq('active', true).order('name').limit(1000)) as Recipe[]
}
export async function getRecipe(id: string) {
  return throwIf(await supabase.from('recipes').select('*').eq('id', id).maybeSingle()) as Recipe | null
}
export async function addMyRecipe(studioId: string, memberId: string, v: Partial<Recipe>) {
  return (throwIf(await supabase.from('recipes').insert({ ...v, studio_id: studioId, member_id: memberId, is_verified: false }).select('id').single()) as { id: string }).id
}
export async function deleteMyRecipe(id: string) { throwIf(await supabase.from('recipes').delete().eq('id', id).select('id')) }
/** Foods to pick from: the general list and the gym's own. */
export async function pickFoods(studioId: string) {
  return throwIf(await supabase.from('foods').select('*').or(`studio_id.is.null,studio_id.eq.${studioId}`).eq('active', true).order('name').limit(5000)) as Food[]
}

export interface PublicPlan { id: string; name: string; goal: string; level: string; days_per_week?: number; calories_target?: number | null; instructions: string | null }
export async function publicPlans(studioId: string) {
  const [w, d] = await Promise.all([
    supabase.from('workout_plans').select('id,name,goal,level,days_per_week,instructions').eq('studio_id', studioId).eq('is_public', true).eq('active', true).order('name'),
    supabase.from('diet_plans').select('id,name,goal,level,calories_target,instructions').eq('studio_id', studioId).eq('is_public', true).eq('active', true).order('name'),
  ])
  return { workout: throwIf(w) as PublicPlan[], diet: throwIf(d) as PublicPlan[] }
}

/** Fitness tools: BMI, Mifflin-St Jeor BMR, US Navy body fat, healthy weight range, water need. */
export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2
export const bmiBand = (b: number) => (b < 18.5 ? 'under' : b < 25 ? 'healthy' : b < 30 ? 'over' : 'obese')
export const bmr = (kg: number, cm: number, age: number, male: boolean) => 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161)
export function navyBodyFat(male: boolean, cm: number, waistCm: number, neckCm: number, hipCm?: number) {
  if (male) return waistCm > neckCm ? 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(cm)) - 450 : null
  if (!hipCm || waistCm + hipCm <= neckCm) return null
  return 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(cm)) - 450
}
export const ACTIVITY: [number, string][] = [[1.2, 'sedentary'], [1.375, 'light'], [1.55, 'moderate'], [1.725, 'active'], [1.9, 'athlete']]
export function ageOn(dob: string | null, today: string) {
  if (!dob) return null
  const [y, m, d] = dob.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0)
}
/** Water a day: about 35 ml per kg, more on training days. */
export const waterNeed = (kg: number, training: boolean) => Math.round((kg * 35 + (training ? 500 : 0)) / 50) * 50
