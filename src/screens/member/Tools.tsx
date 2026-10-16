import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import {
  ACTIVITY, addMyRecipe, ageOn, bmi, bmiBand, bmr, bodyFacts, deleteMyRecipe, foodLogs, getRecipe, myRecipes, navyBodyFat, publicPlans, startFreePlan,
  waterNeed, workoutAnalysis, type PublicPlan,
} from '../../db/health'
import { dietForDay, getDietPlan, getWorkoutPlan, groupMeals, idealWeight, memberPlans, totals, clock, type Recipe } from '../../db/training'
import { fmtDay, plusDays, studioToday } from '../../lib/dates'
import { isoWeekday } from '../../lib/format'
import { Checkbox, Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, Loading, Sheet } from '../../components/ui'
import { BarList, ColumnChart } from '../staff/analysis/kit'
import { useTrainingLists } from '../staff/training/common'
import { useMeasurements, WeightChart } from '../staff/training/progress'
import { FoodForm, MemberPage, useAppFlag, useCalorieTarget } from './Health'

// Member app: fitness tools, recipes, free workout and diet plans, and my analysis (workout, diet, body).

const r1 = (n: number) => Math.round(n * 10) / 10
const num = (v: string) => (v.trim() === '' ? NaN : Number(v))

// Fitness tools ---------------------------------------------------------------------------------------------------------------------
export function MemberTools() {
  const { t } = useTranslation()
  const me = useMe()
  const facts = useQuery({ queryKey: ['body-facts', me.memberId], queryFn: () => bodyFacts(me.memberId!), enabled: !!me.memberId })
  if (facts.isLoading) return <MemberPage title={t('tools.title')}><Loading /></MemberPage>
  return <ToolsBody key={facts.dataUpdatedAt} facts={facts.data} />
}

function ToolsBody({ facts }: { facts?: Awaited<ReturnType<typeof bodyFacts>> }) {
  const { t } = useTranslation()
  const today = studioToday()
  const age0 = ageOn(facts?.dob ?? null, today)
  const [f, setF] = useState({
    gender: facts?.gender === 'female' ? 'female' : facts?.gender === 'male' ? 'male' : '', age: age0 ? String(age0) : '',
    height: facts?.height ? String(Number(facts.height)) : '', weight: facts?.weight ? String(Number(facts.weight)) : '', activity: '1.375',
    waist: facts?.waist ? String(facts.waist) : '', neck: facts?.neck ? String(facts.neck) : '', hips: facts?.hips ? String(facts.hips) : '',
  })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const h = num(f.height), w = num(f.weight), age = num(f.age)
  const okHW = h >= 100 && h <= 250 && w >= 25 && w <= 300
  const male = f.gender === 'male'
  const b = okHW ? bmi(w, h) : null
  const base = okHW && age >= 10 && age <= 100 && f.gender ? bmr(w, h, age, male) : null
  const tdee = base ? base * Number(f.activity) : null
  const fat = h >= 100 && f.gender && num(f.waist) > 0 && num(f.neck) > 0 ? navyBodyFat(male, h, num(f.waist) * 2.54, num(f.neck) * 2.54, num(f.hips) > 0 ? num(f.hips) * 2.54 : undefined) : null
  const range = h >= 100 && h <= 250 ? idealWeight(h) : null
  const prefilled = !!(facts?.height || facts?.weight || facts?.dob)
  return (
    <MemberPage title={t('tools.title')}>
      <p className="m-0 text-[14px] text-muted">{t('tools.intro')}{prefilled ? ` ${t('tools.fromProfile')}` : ''}</p>
      <section className="card flex flex-col gap-4 p-4" aria-label={t('tools.yourNumbers')}>
        <RadioGroup name="tl-gender" legend={t('tools.gender')} value={f.gender} onChange={set('gender')} options={[{ value: 'male', label: t('tools.male') }, { value: 'female', label: t('tools.female') }]} />
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('tools.age')} id="tl-age"><TextInput id="tl-age" inputMode="numeric" value={f.age} onChange={set('age')} /></Field>
          <Field label={t('tools.height')} id="tl-height"><TextInput id="tl-height" inputMode="decimal" value={f.height} onChange={set('height')} /></Field>
          <Field label={t('tools.weight')} id="tl-weight"><TextInput id="tl-weight" inputMode="decimal" value={f.weight} onChange={set('weight')} /></Field>
        </div>
        <Field label={t('tools.activity')} id="tl-act"><Select id="tl-act" value={f.activity} onChange={set('activity')} options={ACTIVITY.map(([v, k]) => ({ value: String(v), label: t(`tools.act.${k}`) }))} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('tools.waist')} id="tl-waist"><TextInput id="tl-waist" inputMode="decimal" value={f.waist} onChange={set('waist')} /></Field>
          <Field label={t('tools.neck')} id="tl-neck"><TextInput id="tl-neck" inputMode="decimal" value={f.neck} onChange={set('neck')} /></Field>
          {f.gender !== 'male' && <Field label={t('tools.hips')} id="tl-hips"><TextInput id="tl-hips" inputMode="decimal" value={f.hips} onChange={set('hips')} /></Field>}
        </div>
      </section>
      {!okHW && <Notice>{t('tools.need')}</Notice>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-live="polite">
        {b !== null && (
          <section className="card flex flex-col gap-1 p-4" aria-label={t('tools.bmi')}>
            <h2 className="m-0 text-[13px] font-semibold text-muted">{t('tools.bmi')}</h2>
            <div className="text-[30px] leading-tight font-bold">{r1(b)} <span className="text-[15px] font-semibold">{t(`tools.band.${bmiBand(b)}`)}</span></div>
            {range && <p className="m-0 text-[13px] text-muted">{t('tools.healthyRange', { low: range.low, high: range.high })}</p>}
          </section>
        )}
        {base !== null && tdee !== null && (
          <section className="card flex flex-col gap-1 p-4" aria-label={t('tools.bmr')}>
            <h2 className="m-0 text-[13px] font-semibold text-muted">{t('tools.bmr')}</h2>
            <div className="text-[30px] leading-tight font-bold">{t('tools.perDay', { kcal: Math.round(base).toLocaleString('en-IN') })}</div>
            <p className="m-0 text-[13px]">{t('tools.tdee', { kcal: Math.round(tdee).toLocaleString('en-IN') })}</p>
            <p className="m-0 text-[13px] text-muted">{t('tools.lose', { kcal: Math.round(Math.max(tdee - 500, male ? 1500 : 1200)).toLocaleString('en-IN') })}</p>
          </section>
        )}
        <section className="card flex flex-col gap-1 p-4" aria-label={t('tools.bodyFat')}>
          <h2 className="m-0 text-[13px] font-semibold text-muted">{t('tools.bodyFat')}</h2>
          {fat !== null && fat > 2 && fat < 70 ? <div className="text-[30px] leading-tight font-bold">{r1(fat)}%</div> : <p className="m-0 text-[13px] text-muted">{t('tools.bodyFatNeed')}</p>}
        </section>
        {okHW && (
          <section className="card flex flex-col gap-1 p-4" aria-label={t('tools.water')}>
            <h2 className="m-0 text-[13px] font-semibold text-muted">{t('tools.water')}</h2>
            <div className="text-[30px] leading-tight font-bold">{(waterNeed(w, false) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L</div>
            <p className="m-0 text-[13px] text-muted">{t('tools.waterLine', { l: (waterNeed(w, true) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) })}</p>
          </section>
        )}
      </div>
      <p className="m-0 text-[12px] text-muted">{t('tools.estimates')}</p>
    </MemberPage>
  )
}

// Recipes ------------------------------------------------------------------------------------------------------------------------------
export function MemberRecipes() {
  const { t } = useTranslation()
  const me = useMe()
  const on = useAppFlag('allow_recipes', true)
  const q = useQuery({ queryKey: ['my-recipes', me.studioId], queryFn: () => myRecipes(me.studioId), enabled: on })
  const [search, setSearch] = useState('')
  const [veg, setVeg] = useState(false)
  const [adding, setAdding] = useState(false)
  if (!on) return <MemberPage title={t('recipes.title')}><Notice>{t('recipes.off')}</Notice></MemberPage>
  const s = search.trim().toLowerCase()
  const list = (q.data ?? []).filter((r) => (r.is_verified || r.member_id === me.memberId) && (!veg || r.is_veg) && (!s || r.name.toLowerCase().includes(s)))
  return (
    <MemberPage title={t('recipes.title')}>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('recipes.search')} id="rc-q" className="min-w-[180px] flex-1"><TextInput id="rc-q" type="search" value={search} onChange={setSearch} /></Field>
        <Checkbox label={t('recipes.vegOnly')} checked={veg} onChange={setVeg} />
      </div>
      <button type="button" className="btn btn-sm self-start" onClick={() => setAdding(true)}><Icon name="plus" size={15} />{t('recipes.add')}</button>
      {q.isLoading ? <Loading /> : !list.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('recipes.empty')}</div> : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {list.map((r) => (
            <li key={r.id}>
              <Link to={`/app/recipes/${r.id}`} className="card flex h-full gap-3 overflow-hidden p-0 text-ink no-underline hover:border-gold">
                {r.image_url && /^https:\/\//.test(r.image_url) ? <img src={r.image_url} alt="" className="h-auto w-24 shrink-0 object-cover" /> : null}
                <span className="flex min-w-0 flex-col gap-1 p-3">
                  <strong className="text-[15px]">{r.name}</strong>
                  <span className="text-[12px] text-muted">{Math.round(Number(r.calories))} kcal · {Number(r.quantity)} {r.unit}{r.prep_time_mins ? ` · ${t('recipes.mins', { n: r.prep_time_mins })}` : ''}</span>
                  <span className="flex flex-wrap gap-1.5">
                    <span className={`chip ${r.is_veg ? 'chip-green' : 'chip-amber'}`}>{r.is_veg ? t('recipes.veg') : t('recipes.nonVeg')}</span>
                    {r.member_id === me.memberId && <span className={`chip ${r.is_verified ? 'chip-info' : 'chip-muted'}`}>{r.is_verified ? t('recipes.mine') : t('recipes.waiting')}</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Sheet wide open={adding} onClose={() => setAdding(false)} title={t('recipes.addTitle')}>{adding && <RecipeForm onDone={() => setAdding(false)} />}</Sheet>
    </MemberPage>
  )
}

function RecipeForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const me = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  const [f, setF] = useState({ name: '', quantity: '1', unit: 'serving', calories: '', protein: '', carbs: '', fats: '', prep: '', ingredients: '', method: '', veg: true })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const m = useMutation({
    mutationFn: () => addMyRecipe(me.studioId, me.memberId!, {
      name: f.name.trim(), quantity: Number(f.quantity), unit: f.unit.trim() || 'serving', calories: Number(f.calories || 0), protein: Number(f.protein || 0), carbs: Number(f.carbs || 0),
      fats: Number(f.fats || 0), prep_time_mins: f.prep.trim() ? Number(f.prep) : null, ingredients: f.ingredients.trim() || null, method: f.method.trim() || null, is_veg: f.veg,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-recipes'] }); toast(t('recipes.saved')); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  const bad = (v: string, int = false) => v.trim() !== '' && (Number.isNaN(Number(v)) || Number(v) < 0 || (int && !Number.isInteger(Number(v))))
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      if (!f.name.trim()) return setError(t('recipes.needName'))
      if (!(Number(f.quantity) > 0) || [f.calories, f.protein, f.carbs, f.fats].some((v) => bad(v)) || bad(f.prep, true)) return setError(t('recipes.badNumber'))
      m.mutate()
    }}>
      <Field label={t('recipes.name')} required id="rf-n"><TextInput id="rf-n" value={f.name} onChange={set('name')} /></Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label={t('recipes.quantity')} id="rf-q"><TextInput id="rf-q" inputMode="decimal" value={f.quantity} onChange={set('quantity')} /></Field>
        <Field label={t('recipes.unit')} id="rf-u"><TextInput id="rf-u" value={f.unit} onChange={set('unit')} /></Field>
        <Field label={t('recipes.calories')} id="rf-k"><TextInput id="rf-k" inputMode="decimal" value={f.calories} onChange={set('calories')} /></Field>
        <Field label={t('recipes.prep')} id="rf-t"><TextInput id="rf-t" inputMode="numeric" value={f.prep} onChange={set('prep')} /></Field>
        <Field label={t('recipes.protein')} id="rf-p"><TextInput id="rf-p" inputMode="decimal" value={f.protein} onChange={set('protein')} /></Field>
        <Field label={t('recipes.carbs')} id="rf-c"><TextInput id="rf-c" inputMode="decimal" value={f.carbs} onChange={set('carbs')} /></Field>
        <Field label={t('recipes.fats')} id="rf-f"><TextInput id="rf-f" inputMode="decimal" value={f.fats} onChange={set('fats')} /></Field>
      </div>
      <Checkbox label={t('recipes.isVeg')} checked={f.veg} onChange={(v) => setF({ ...f, veg: v })} />
      <Field label={t('recipes.ingredients')} id="rf-i"><TextArea id="rf-i" rows={3} value={f.ingredients} onChange={set('ingredients')} /></Field>
      <Field label={t('recipes.method')} id="rf-m"><TextArea id="rf-m" rows={4} value={f.method} onChange={set('method')} /></Field>
      <p className="m-0 text-[12px] text-muted">{t('recipes.ownHint')}</p>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-gold" disabled={m.isPending}>{t('recipes.save')}</button>
    </form>
  )
}

export function MemberRecipe() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const me = useMe()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const on = useAppFlag('allow_recipes', true)
  const canAdd = useAppFlag('can_add_food', true)
  const q = useQuery({ queryKey: ['recipe', id], queryFn: () => getRecipe(id), enabled: on && !!id })
  const [eat, setEat] = useState(false)
  const del = useMutation({
    mutationFn: () => deleteMyRecipe(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-recipes'] }); toast(t('recipes.deleted')); nav('/app/recipes') },
    onError: (e: Error) => toast(e.message),
  })
  if (!on) return <MemberPage title={t('recipes.title')} back="/app/recipes"><Notice>{t('recipes.off')}</Notice></MemberPage>
  if (q.isLoading) return <MemberPage title={t('recipes.title')} back="/app/recipes"><Loading /></MemberPage>
  const r = q.data
  if (!r) return <MemberPage title={t('recipes.title')} back="/app/recipes"><Notice tone="error">{t('recipes.notFound')}</Notice></MemberPage>
  const mine = r.member_id === me.memberId
  return (
    <MemberPage title={r.name} back="/app/recipes">
      <Link to="/app/recipes" className="link-btn hidden self-start text-[13px] lg:inline-flex">{t('recipes.all')}</Link>
      {r.image_url && /^https:\/\//.test(r.image_url) && <img src={r.image_url} alt={r.name} className="aspect-[4/3] w-full rounded-2xl border border-line object-cover" />}
      <div className="flex flex-wrap gap-1.5">
        <span className={`chip ${r.is_veg ? 'chip-green' : 'chip-amber'}`}>{r.is_veg ? t('recipes.veg') : t('recipes.nonVeg')}</span>
        {r.prep_time_mins ? <span className="chip chip-muted">{t('recipes.mins', { n: r.prep_time_mins })}</span> : null}
        {mine && !r.is_verified && <span className="chip chip-muted">{t('recipes.waiting')}</span>}
      </div>
      <section className="card flex flex-col gap-2 p-4" aria-label={t('recipes.macros', { q: Number(r.quantity), unit: r.unit })}>
        <h2 className="m-0 text-[13px] font-semibold text-muted">{t('recipes.macros', { q: Number(r.quantity), unit: r.unit })}</h2>
        <dl className="m-0 grid grid-cols-4 gap-2 text-center">
          {([['kcal', r.calories], [t('recipes.protein'), r.protein], [t('recipes.carbs'), r.carbs], [t('recipes.fats'), r.fats]] as const).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 px-1 py-2"><dt className="text-[11px] text-muted">{k.replace(/ \(.*\)$/, '')}</dt><dd className="m-0 text-[17px] font-bold">{r1(Number(v))}</dd></div>
          ))}
        </dl>
      </section>
      {r.ingredients && <section className="card flex flex-col gap-1 p-4"><h2 className="m-0 text-[15px] font-bold">{t('recipes.ingredientsTitle')}</h2><p className="m-0 text-[14px] whitespace-pre-line">{r.ingredients}</p></section>}
      {r.method && <section className="card flex flex-col gap-1 p-4"><h2 className="m-0 text-[15px] font-bold">{t('recipes.methodTitle')}</h2><p className="m-0 text-[14px] whitespace-pre-line">{r.method}</p></section>}
      {r.notes && <section className="card flex flex-col gap-1 p-4"><h2 className="m-0 text-[15px] font-bold">{t('recipes.notes')}</h2><p className="m-0 text-[14px] whitespace-pre-line">{r.notes}</p></section>}
      <div className="flex flex-wrap gap-2">
        {canAdd && (r.is_verified || mine) && <button type="button" className="btn-gold px-5" onClick={() => setEat(true)}>{t('recipes.ate')}</button>}
        {mine && !r.is_verified && <button type="button" className="btn" disabled={del.isPending} onClick={() => { if (window.confirm(t('recipes.confirmDelete'))) del.mutate() }}><Icon name="trash" size={16} />{t('recipes.delete')}</button>}
      </div>
      <Sheet open={eat} onClose={() => setEat(false)} title={t('food.title')}>
        {eat && <FoodForm memberId={me.memberId!} date={studioToday()} preset={{ kind: 'recipe', item: r as Recipe }} onDone={() => setEat(false)} />}
      </Sheet>
    </MemberPage>
  )
}

// Free plans ------------------------------------------------------------------------------------------------------------------------------
type Kind = 'workout' | 'diet'
export function MemberFreePlans() {
  const { t } = useTranslation()
  const me = useMe()
  const workoutOn = useAppFlag('is_woplan_allowed', true)
  const dietOn = useAppFlag('is_Diet_PlanAllowed', true)
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab') as Kind | null
  const tab: Kind = asked === 'diet' && dietOn ? 'diet' : asked === 'workout' && workoutOn ? 'workout' : workoutOn ? 'workout' : 'diet'
  const plans = useQuery({ queryKey: ['public-plans', me.studioId], queryFn: () => publicPlans(me.studioId) })
  const mine = useQuery({ queryKey: ['member-plans', me.memberId], queryFn: () => memberPlans(me.memberId!), enabled: !!me.memberId })
  const [view, setView] = useState<PublicPlan | null>(null)
  if (!workoutOn && !dietOn) return <MemberPage title={t('free.title')}><Notice>{t('free.off')}</Notice></MemberPage>
  const list = tab === 'workout' ? plans.data?.workout ?? [] : plans.data?.diet ?? []
  const current = tab === 'workout' ? mine.data?.workouts.find((x) => x.active) : mine.data?.diets.find((x) => x.active)
  return (
    <MemberPage title={t('free.title')}>
      {workoutOn && dietOn && (
        <div role="tablist" aria-label={t('free.title')} className="grid grid-cols-2 gap-1.5">
          {(['workout', 'diet'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k }, { replace: true })}
              className={`rounded-full border py-2 text-[13px] font-semibold ${tab === k ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>{t(`free.${k}`)}</button>
          ))}
        </div>
      )}
      {current?.assigned_by && <Notice>{t('free.coachPlan')}</Notice>}
      {plans.isLoading || mine.isLoading ? <Loading /> : !list.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('free.none')}</div> : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {list.map((p) => (
            <li key={p.id} className="card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <h2 className="m-0 text-[16px] font-bold">{p.name}</h2>
                <p className="m-0 text-[13px] text-muted">{[p.goal, p.level, tab === 'workout' ? t('free.daysWeek', { n: p.days_per_week }) : p.calories_target ? t('free.kcal', { n: p.calories_target }) : ''].filter(Boolean).join(' · ')}</p>
                {current?.plan_id === p.id && <span className="chip chip-green mt-1">{t('free.current')}</span>}
              </div>
              <button type="button" className="btn btn-sm shrink-0" onClick={() => setView(p)}>{t('free.view')}</button>
            </li>
          ))}
        </ul>
      )}
      <Sheet wide open={!!view} onClose={() => setView(null)} title={view?.name ?? ''}>
        {view && <FreePlanView kind={tab} plan={view} current={current ? { plan_id: current.plan_id, coach: !!current.assigned_by } : null} onDone={() => setView(null)} />}
      </Sheet>
    </MemberPage>
  )
}

function FreePlanView({ kind, plan, current, onDone }: { kind: Kind; plan: PublicPlan; current: { plan_id: string; coach: boolean } | null; onDone: () => void }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const lists = useTrainingLists()
  const canChange = useAppFlag(kind === 'workout' ? 'can_change_workout_plan' : 'can_change_diet_plan', false)
  const w = useQuery({ queryKey: ['workout-plan', plan.id], queryFn: () => getWorkoutPlan(plan.id), enabled: kind === 'workout' })
  const d = useQuery({ queryKey: ['diet-plan', plan.id], queryFn: () => getDietPlan(plan.id), enabled: kind === 'diet' })
  const [error, setError] = useState<string | null>(null)
  const start = useMutation({
    mutationFn: () => startFreePlan(kind, plan.id),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['member-plans'] }); toast(t('free.started')); onDone(); nav(`/app/plan?tab=${kind}`) },
    onError: (e: Error) => setError(e.message),
  })
  const isCurrent = current?.plan_id === plan.id
  const blocked = current && !isCurrent ? (current.coach ? t('free.coachPlan') : !canChange ? t('free.askGym') : null) : null
  const todayW = isoWeekday(studioToday())
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[13px] text-muted">{[plan.goal, plan.level, kind === 'workout' ? t('free.daysWeek', { n: plan.days_per_week }) : plan.calories_target ? t('free.kcal', { n: plan.calories_target }) : ''].filter(Boolean).join(' · ')}</p>
      {plan.instructions && <p className="m-0 text-[14px]">{plan.instructions}</p>}
      {kind === 'workout' && (w.isLoading ? <Loading /> : w.data && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: w.data.plan.days_per_week }, (_, i) => i + 1).map((day) => {
            const items = w.data!.items.filter((x) => x.day === day)
            return (
              <section key={day} className="rounded-2xl border border-line p-3" aria-label={t('free.day', { n: day })}>
                <h3 className="m-0 mb-1 text-[14px] font-bold">{t('free.day', { n: day })}</h3>
                {!items.length ? <p className="m-0 text-[13px] text-muted">{t('plan.rest')}</p> : (
                  <ul className="m-0 list-none p-0 text-[13px]">
                    {items.map((x) => <li key={x.id} className="py-0.5">{x.exercise_name}<span className="text-muted">{[x.sets ? ` · ${t('plan.sets', { n: x.sets })}` : '', x.reps ? ` × ${x.reps}` : '', x.time ? ` · ${Number(x.time)} ${x.time_unit}` : ''].join('')}</span></li>)}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      ))}
      {kind === 'diet' && (d.isLoading ? <Loading /> : d.data && (
        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-[14px] font-bold">{t('free.sampleDay')}</h3>
          {groupMeals(dietForDay(d.data.items, todayW), lists.meals).map((m) => (
            <section key={m.meal} className="rounded-2xl border border-line p-3" aria-label={m.meal}>
              <h4 className="m-0 mb-1 text-[14px] font-bold">{m.meal}{m.time ? <span className="font-normal text-muted"> · {clock(m.time)}</span> : null}</h4>
              <ul className="m-0 list-none p-0 text-[13px]">{m.items.map((x) => <li key={x.id} className="py-0.5">{x.item_name}<span className="text-muted">{x.quantity ? ` · ${Number(x.quantity)} ${x.unit ?? ''}` : ''} · {Math.round(Number(x.calories))} kcal</span></li>)}</ul>
            </section>
          ))}
        </div>
      ))}
      {isCurrent ? <Notice tone="success">{t('free.current')}</Notice> : blocked ? <Notice>{blocked}</Notice> : (
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="button" className="btn-gold" disabled={start.isPending}
            onClick={() => { setError(null); if (!current || window.confirm(t('free.replace', { name: plan.name }))) start.mutate() }}>{t('free.start')}</button>
        </>
      )}
    </div>
  )
}

// My analysis ------------------------------------------------------------------------------------------------------------------------------
export function MemberAnalysis() {
  const { t } = useTranslation()
  const me = useMe()
  const memberId = me.memberId ?? ''
  const analysisOn = useAppFlag('allow_workout', true)
  const plansOn = useAppFlag('is_woplan_allowed', true)
  const workoutOn = analysisOn && plansOn
  const volumeOn = useAppFlag('volume', true)
  const dietOn = useAppFlag('is_Diet_PlanAllowed', true)
  const today = studioToday()
  const from = plusDays(today, -13)
  const wa = useQuery({ queryKey: ['workout-analysis', memberId], queryFn: () => workoutAnalysis(8), enabled: !!memberId && workoutOn })
  const food = useQuery({ queryKey: ['food-logs', memberId, from, today], queryFn: () => foodLogs(memberId, from, today), enabled: !!memberId && dietOn })
  const target = useCalorieTarget(memberId)
  const ms = useMeasurements(memberId)
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => plusDays(from, i)), [from])
  if (!memberId) return <MemberPage title={t('analysis.title')}><Notice>{t('plan.noMember')}</Notice></MemberPage>
  const weeks = wa.data?.weeks ?? []
  const anyWorkout = weeks.some((w) => w.exercises > 0)
  const byDay = days.map((d) => totals((food.data ?? []).filter((f) => f.date === d)))
  const logged = byDay.filter((x) => x.calories > 0)
  const avg = logged.length ? totals(logged) : null
  const per = (n: number) => r1(n / Math.max(1, logged.length))
  return (
    <MemberPage title={t('analysis.title')} wide>
      {workoutOn && (
        <section className="card flex flex-col gap-4 p-4" aria-labelledby="an-wo">
          <h2 id="an-wo" className="m-0 text-[18px] font-bold">{t('analysis.workout')}</h2>
          {wa.isLoading ? <Loading /> : wa.error ? <Notice tone="error">{(wa.error as Error).message}</Notice> : !anyWorkout ? <p className="m-0 text-[14px] text-muted">{t('analysis.noWorkouts')}</p> : (
            <>
              <h3 className="m-0 text-[14px] font-semibold text-muted">{t('analysis.daysPerWeek')}</h3>
              <ColumnChart caption={t('analysis.daysPerWeek')} labels={weeks.map((w) => fmtDay(w.week, 'd MMM'))} titles={weeks.map((w) => t('analysis.weekOf', { date: fmtDay(w.week, 'd MMM yyyy') }))}
                series={[{ name: t('analysis.trained'), values: weeks.map((w) => w.days) }]} height={180} />
              <h3 className="m-0 text-[14px] font-semibold text-muted">{t('analysis.exercisesPerWeek')}</h3>
              <ColumnChart caption={t('analysis.exercisesPerWeek')} labels={weeks.map((w) => fmtDay(w.week, 'd MMM'))} titles={weeks.map((w) => t('analysis.weekOf', { date: fmtDay(w.week, 'd MMM yyyy') }))}
                series={[{ name: t('analysis.exercises'), values: weeks.map((w) => w.exercises) }]} height={180} />
              {volumeOn && weeks.some((w) => Number(w.volume) > 0) && (
                <>
                  <h3 className="m-0 text-[14px] font-semibold text-muted">{t('analysis.volume')}</h3>
                  <ColumnChart caption={t('analysis.volume')} labels={weeks.map((w) => fmtDay(w.week, 'd MMM'))} titles={weeks.map((w) => t('analysis.weekOf', { date: fmtDay(w.week, 'd MMM yyyy') }))}
                    series={[{ name: 'kg', values: weeks.map((w) => Number(w.volume)) }]} format={(n) => `${Math.round(n).toLocaleString('en-IN')} kg`} height={180} />
                </>
              )}
              <h3 className="m-0 text-[14px] font-semibold text-muted">{t('analysis.parts')}</h3>
              <BarList caption={t('analysis.parts')} rows={(wa.data?.parts ?? []).map((p) => ({ label: p.part, value: p.n }))} />
            </>
          )}
        </section>
      )}
      {dietOn && (
        <section className="card flex flex-col gap-4 p-4" aria-labelledby="an-diet">
          <h2 id="an-diet" className="m-0 text-[18px] font-bold">{t('analysis.diet')}</h2>
          {food.isLoading ? <Loading /> : !logged.length ? <p className="m-0 text-[14px] text-muted">{t('analysis.noFood')}</p> : (
            <>
              <ColumnChart caption={t('analysis.kcalPerDay')} labels={days.map((d) => fmtDay(d, 'd'))} titles={days.map((d) => fmtDay(d, 'EEE d MMM'))}
                series={[{ name: 'kcal', values: byDay.map((x) => Math.round(x.calories)) }]} height={180} />
              <p className="m-0 text-[13px] text-muted">{t('analysis.kcalPerDay')}{target ? ` · ${t('analysis.target', { kcal: target })}` : ''}</p>
              {avg && (
                <dl className="m-0 grid grid-cols-4 gap-2 text-center">
                  {([['kcal', Math.round(avg.calories / logged.length)], [t('analysis.protein'), per(avg.protein)], [t('analysis.carbs'), per(avg.carbs)], [t('analysis.fats'), per(avg.fats)]] as const).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-surface-2 px-1 py-2"><dt className="text-[11px] text-muted">{k}</dt><dd className="m-0 text-[17px] font-bold">{v}</dd></div>
                  ))}
                </dl>
              )}
              <p className="m-0 text-[12px] text-muted">{t('analysis.avg', { n: logged.length })}</p>
            </>
          )}
        </section>
      )}
      <section className="card flex flex-col gap-3 p-4" aria-labelledby="an-body">
        <h2 id="an-body" className="m-0 text-[18px] font-bold">{t('analysis.body')}</h2>
        {ms.isLoading ? <Loading /> : <WeightChart rows={ms.data ?? []} />}
        <Link to="/app/plan?tab=progress" className="link-btn self-start text-[13px]">{t('plan.addMeasurement')}</Link>
      </section>
    </MemberPage>
  )
}
