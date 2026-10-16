import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import {
  addDiary, bodyFacts, dailyLogs, deleteDiary, deleteFoodLog, diary, foodLogs, GLASS_ML, logFood, myGoals, myMedical, myRecipes, pickFoods, saveDaily, saveGoals,
  saveMyMedical, type DailyLog, type FoodLog, type Goals,
} from '../../db/health'
import { getDietPlan, memberPlans, scaled, totals, workoutLogs, type Food, type Recipe } from '../../db/training'
import { PAR_Q } from '../../db/billing'
import { fmtDay, plusDays, studioToday } from '../../lib/dates'
import { Field, Notice, Select, TextArea, TextInput, opts } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, Loading, Sheet } from '../../components/ui'
import { useTrainingLists } from '../staff/training/common'

// Member app health tracking (YDL customer app): the Track page (water, steps, sleep, mood, food, workout, goals),
// adding food to a day, the diary and the PAR-Q health form. App Settings › On/Off Permission decide what shows.

export function MemberPage({ title, back = '/app/profile', wide, children }: { title: string; back?: string; wide?: boolean; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className={`flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto ${wide ? 'lg:max-w-[820px]' : 'lg:max-w-[640px]'}`}>
      <Link to={back} className="flex items-center gap-1 self-start text-[13px] font-semibold no-underline lg:hidden"><Icon name="chevronLeft" size={16} />{t('app.back')}</Link>
      <h1 className="title text-[36px]">{title}</h1>
      {children}
    </div>
  )
}

/** An App Settings › On/Off Permission switch as the member app reads it. */
export function useAppFlag(key: string, fallback: boolean) {
  const { data: studio } = useStudio()
  const v = (studio?.settings.app as Record<string, unknown> | undefined)?.[key]
  return v === undefined || v === null ? fallback : v === true
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const p = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div className="h-full rounded-full bg-gold" style={{ width: `${p * 100}%` }} />
    </div>
  )
}

const kcal = (n: number) => Math.round(Number(n))
const litres = (ml: number) => (ml / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })

/** The day's calorie target: my own goal, else my diet plan's. */
export function useCalorieTarget(memberId: string) {
  const goals = useQuery({ queryKey: ['my-goals', memberId], queryFn: () => myGoals(memberId), enabled: !!memberId })
  const plans = useQuery({ queryKey: ['member-plans', memberId], queryFn: () => memberPlans(memberId), enabled: !!memberId })
  const d = plans.data?.diets.find((x) => x.active)
  const plan = useQuery({ queryKey: ['diet-plan', d?.plan_id], queryFn: () => getDietPlan(d!.plan_id), enabled: !!d })
  return goals.data?.calories ?? plan.data?.plan.calories_target ?? null
}

// Track ------------------------------------------------------------------------------------------------------------------------
export function MemberTrack() {
  const { t } = useTranslation()
  const me = useMe()
  const memberId = me.memberId ?? ''
  const today = studioToday()
  const [day, setDay] = useState(today)
  const weekFrom = plusDays(today, -6)
  const from = day < weekFrom ? day : weekFrom
  const canGoal = useAppFlag('can_set_goal', true)
  const canAdd = useAppFlag('can_add_food', true)
  const workoutOn = useAppFlag('is_woplan_allowed', true)
  const daily = useQuery({ queryKey: ['daily-logs', memberId, from, today], queryFn: () => dailyLogs(memberId, from, today), enabled: !!memberId })
  const goalsQ = useQuery({ queryKey: ['my-goals', memberId], queryFn: () => myGoals(memberId), enabled: !!memberId })
  const food = useQuery({ queryKey: ['food-logs', memberId, from, today], queryFn: () => foodLogs(memberId, from, today), enabled: !!memberId })
  const done = useQuery({ queryKey: ['workout-logs', memberId, day, 'track'], queryFn: () => workoutLogs(memberId, day, day), enabled: !!memberId && workoutOn })
  const target = useCalorieTarget(memberId)
  const [editGoals, setEditGoals] = useState(false)
  if (!memberId) return <MemberPage title={t('track.title')}><Notice>{t('plan.noMember')}</Notice></MemberPage>
  if (daily.isLoading || goalsQ.isLoading) return <MemberPage title={t('track.title')}><Loading /></MemberPage>
  const goals = goalsQ.data!
  const row = daily.data?.find((r) => r.date === day)
  const dayFood = (food.data ?? []).filter((f) => f.date === day)
  const eaten = totals(dayFood).calories
  const oldest = plusDays(today, -60)
  return (
    <MemberPage title={t('track.title')}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="icon-btn" aria-label={t('track.prevDay')} disabled={day <= oldest} onClick={() => setDay(plusDays(day, -1))}><Icon name="chevronLeft" size={18} /></button>
        <span className="text-[16px] font-bold" aria-live="polite">{day === today ? t('track.today') : fmtDay(day, 'EEE d MMM')}</span>
        <button type="button" className="icon-btn" aria-label={t('track.nextDay')} disabled={day >= today} onClick={() => setDay(plusDays(day, 1))}><Icon name="chevronRight" size={18} /></button>
      </div>

      <WaterCard key={`w${day}`} memberId={memberId} day={day} ml={row?.water_ml ?? 0} goal={goals.water_ml} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard key={`s${day}${row?.steps ?? ''}`} id="steps" title={t('track.steps')} unit={t('track.stepsWalked')} value={row?.steps ?? null} goal={goals.steps} format={(n) => n.toLocaleString('en-IN')}
          inputMode="numeric" check={(n) => Number.isInteger(n) && n >= 0 && n <= 100000} bad={t('track.badSteps')} onSave={(n) => saveDaily(memberId, day, { steps: n })} />
        <MetricCard key={`h${day}${row?.sleep_hours ?? ''}`} id="sleep" title={t('track.sleep')} unit={t('track.hours')} value={row?.sleep_hours == null ? null : Number(row.sleep_hours)} goal={goals.sleep_hours}
          format={(n) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} h`} inputMode="decimal" check={(n) => n >= 0 && n <= 24} bad={t('track.badSleep')}
          onSave={(n) => saveDaily(memberId, day, { sleep_hours: n })} />
      </div>
      <MoodCard memberId={memberId} day={day} mood={row?.mood ?? null} />

      <section className="card flex flex-col gap-3 p-4" aria-labelledby="tr-food">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="tr-food" className="m-0 text-[16px] font-bold">{t('track.food')}</h2>
          <span className="text-[14px] font-semibold">{t('track.eaten', { kcal: kcal(eaten) })}{target ? ` ${t('track.target', { kcal: target })}` : ''}</span>
        </div>
        {target ? <ProgressBar value={eaten} max={target} label={t('track.food')} /> : null}
        <FoodList memberId={memberId} date={day} rows={dayFood} canAdd={canAdd} />
        <Link to="/app/plan?tab=diet" className="link-btn self-start text-[13px]">{t('track.fromPlan')}</Link>
      </section>

      {workoutOn && (
        <section className="card flex items-center justify-between gap-3 p-4" aria-labelledby="tr-wo">
          <div><h2 id="tr-wo" className="m-0 text-[16px] font-bold">{t('track.workout')}</h2>
            <p className="m-0 text-[14px] text-muted">{t('track.exercisesDone', { count: done.data?.length ?? 0 })}</p></div>
          <Link to="/app/plan?tab=workout" className="btn btn-sm no-underline">{t('track.openPlan')}</Link>
        </section>
      )}

      <section className="card flex flex-col gap-2 p-4" aria-labelledby="tr-goals">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tr-goals" className="m-0 text-[16px] font-bold">{t('track.goals')}</h2>
          {canGoal && <button type="button" className="btn btn-sm" onClick={() => setEditGoals(true)}><Icon name="edit" size={15} />{t('track.change')}</button>}
        </div>
        <p className="m-0 text-[14px] text-muted">
          {[t('track.goalLine.water', { l: litres(goals.water_ml) }), t('track.goalLine.steps', { n: goals.steps.toLocaleString('en-IN') }), t('track.goalLine.sleep', { h: goals.sleep_hours }),
            ...(goals.calories ? [t('track.goalLine.kcal', { kcal: goals.calories })] : [])].join(' · ')}
        </p>
        {!canGoal && <p className="m-0 text-[12px] text-muted">{t('track.goalsByGym')}</p>}
      </section>

      <WeekTable today={today} rows={daily.data ?? []} food={food.data ?? []} />
      <Sheet open={editGoals} onClose={() => setEditGoals(false)} title={t('track.goalsTitle')}>
        {editGoals && <GoalsForm memberId={memberId} goals={goals} onDone={() => setEditGoals(false)} />}
      </Sheet>
    </MemberPage>
  )
}

/** Member home: today's water with a quick "+ glass", and steps, opening the Track page. */
export function TodayCard() {
  const me = useMe()
  const memberId = me.memberId ?? ''
  const today = studioToday()
  const daily = useQuery({ queryKey: ['daily-logs', memberId, today, today], queryFn: () => dailyLogs(memberId, today, today), enabled: !!memberId })
  const goals = useQuery({ queryKey: ['my-goals', memberId], queryFn: () => myGoals(memberId), enabled: !!memberId })
  if (!daily.data || !goals.data) return null
  const row = daily.data[0]
  return <WaterCard memberId={memberId} day={today} ml={row?.water_ml ?? 0} goal={goals.data.water_ml} compact steps={row?.steps ?? null} stepsGoal={goals.data.steps} />
}

function WaterCard({ memberId, day, ml, goal, compact, steps, stepsGoal }: {
  memberId: string; day: string; ml: number; goal: number; compact?: boolean; steps?: number | null; stepsGoal?: number
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  // Taps show at once and are saved half a second after the last one (and when leaving the page).
  const [pending, setPending] = useState<number | null>(null)
  const timer = useRef<number | null>(null)
  const latest = useRef<number | null>(null)
  const save = useMutation({
    mutationFn: (v: number) => saveDaily(memberId, day, { water_ml: v }),
    onSuccess: async (_, v) => { await qc.invalidateQueries({ queryKey: ['daily-logs', memberId] }); setPending((p) => (p === v ? null : p)) },
    onError: (e: Error) => { setPending(null); toast(e.message) },
  })
  useEffect(() => () => {
    if (timer.current !== null && latest.current !== null) { window.clearTimeout(timer.current); saveDaily(memberId, day, { water_ml: latest.current }).then(() => qc.invalidateQueries({ queryKey: ['daily-logs', memberId] })) }
  }, [memberId, day, qc])
  const shown = pending ?? ml
  const change = (d: number) => {
    const v = Math.max(0, Math.min(10000, shown + d))
    setPending(v); latest.current = v
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { timer.current = null; save.mutate(v) }, 500)
  }
  const glasses = Math.round(shown / GLASS_ML)
  if (compact) return (
    <section className="card flex flex-col gap-2.5 p-4" aria-labelledby="home-today">
      <div className="flex items-center justify-between gap-3">
        <Link to="/app/track" id="home-today" className="text-[15px] font-bold text-ink no-underline">{t('track.todayCard')} <Icon name="chevronRight" size={14} /></Link>
        <button type="button" className="btn btn-sm" aria-label={t('track.addGlass')} onClick={() => change(GLASS_ML)}><Icon name="plus" size={15} />{t('track.glass')}</button>
      </div>
      <ProgressBar value={shown} max={goal} label={t('track.water')} />
      <p className="m-0 text-[13px] text-muted" aria-live="polite">
        {t('track.water')}: {t('track.litres', { l: litres(shown) })} {t('track.ofGoal', { goal: t('track.litres', { l: litres(goal) }) })}
        {steps != null && stepsGoal ? ` · ${t('track.steps')}: ${steps.toLocaleString('en-IN')} / ${stepsGoal.toLocaleString('en-IN')}` : ''}
      </p>
    </section>
  )
  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="tr-water">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="tr-water" className="m-0 text-[16px] font-bold">{t('track.water')}</h2>
        <span className="text-[14px] text-muted">{t('track.glasses', { n: glasses, goal: Math.round(goal / GLASS_ML) })}</span>
      </div>
      <ProgressBar value={shown} max={goal} label={t('track.water')} />
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="icon-btn" aria-label={t('track.removeGlass')} disabled={shown <= 0} onClick={() => change(-GLASS_ML)}><span aria-hidden="true" className="text-[22px] leading-none">−</span></button>
        <div className="text-center"><div className="text-[30px] leading-none font-bold" aria-live="polite">{t('track.litres', { l: litres(shown) })}</div>
          <div className="text-[12px] text-muted">{t('track.ofGoal', { goal: t('track.litres', { l: litres(goal) }) })}</div></div>
        <button type="button" className="btn-gold min-h-11 px-4" aria-label={t('track.addGlass')} onClick={() => change(GLASS_ML)}><Icon name="plus" size={18} />{t('track.glass')}</button>
      </div>
    </section>
  )
}

function MetricCard({ id, title, unit, value, goal, format, inputMode, check, bad, onSave }: {
  id: string; title: string; unit?: string; value: number | null; goal: number; format: (n: number) => string; inputMode: 'numeric' | 'decimal'
  check: (n: number) => boolean; bad: string; onSave: (n: number) => Promise<void>
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const me = useMe()
  const [text, setText] = useState(value === null ? '' : String(value))
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: onSave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['daily-logs', me.memberId] }); toast(t('track.saved', { what: title })) },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby={`tr-${id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`tr-${id}`} className="m-0 text-[16px] font-bold">{title}</h2>
        <span className="text-[14px] text-muted">{value === null ? '—' : format(value)} / {format(goal)}</span>
      </div>
      <ProgressBar value={value ?? 0} max={goal} label={title} />
      <form className="flex items-end gap-2" noValidate onSubmit={(e) => {
        e.preventDefault(); setError(null)
        const n = Number(text.replace(/,/g, ''))
        if (text.trim() === '' || Number.isNaN(n) || !check(n)) return setError(bad)
        m.mutate(n)
      }}>
        <Field label={unit ?? title} id={`tr-${id}-in`} className="flex-1"><TextInput id={`tr-${id}-in`} inputMode={inputMode} value={text} onChange={setText} /></Field>
        <button type="submit" className="btn min-h-11" disabled={m.isPending}>{t('track.save')}</button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
    </section>
  )
}

function MoodCard({ memberId, day, mood }: { memberId: string; day: string; mood: number | null }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const [shown, setShown] = useState<number | null>(null)
  const m = useMutation({
    mutationFn: (v: number) => saveDaily(memberId, day, { mood: v }),
    onMutate: (v) => setShown(v),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['daily-logs', memberId] }); setShown(null) },
    onError: (e: Error) => { setShown(null); toast(e.message) },
  })
  const cur = shown ?? mood
  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="tr-mood">
      <h2 id="tr-mood" className="m-0 text-[16px] font-bold">{t('track.mood')}</h2>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" aria-pressed={cur === v} onClick={() => m.mutate(v)}
            className={`min-h-11 rounded-xl border px-1 text-[12px] font-semibold ${cur === v ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>{t(`track.mood${v}`)}</button>
        ))}
      </div>
    </section>
  )
}

function WeekTable({ today, rows, food }: { today: string; rows: DailyLog[]; food: FoodLog[] }) {
  const { t } = useTranslation()
  const days = Array.from({ length: 7 }, (_, i) => plusDays(today, -i))
  return (
    <section className="card overflow-x-auto p-0" aria-labelledby="tr-week">
      <h2 id="tr-week" className="m-0 px-4 pt-4 text-[16px] font-bold">{t('track.week')}</h2>
      <table className="w-full text-[13px]">
        <thead><tr className="text-left text-muted">
          <th scope="col" className="px-4 py-2 font-semibold">{t('track.day')}</th><th scope="col" className="px-2 py-2 text-right font-semibold">{t('track.water')}</th>
          <th scope="col" className="px-2 py-2 text-right font-semibold">{t('track.steps')}</th><th scope="col" className="px-2 py-2 text-right font-semibold">{t('track.sleep')}</th>
          <th scope="col" className="px-4 py-2 text-right font-semibold">kcal</th></tr></thead>
        <tbody>
          {days.map((d) => {
            const r = rows.find((x) => x.date === d)
            const k = totals(food.filter((f) => f.date === d)).calories
            return (
              <tr key={d} className="border-t border-line-soft">
                <th scope="row" className="px-4 py-2 text-left font-semibold">{d === today ? t('track.today') : fmtDay(d, 'EEE d')}</th>
                <td className="px-2 py-2 text-right">{r?.water_ml ? `${litres(r.water_ml)} L` : '–'}</td>
                <td className="px-2 py-2 text-right">{r?.steps != null ? r.steps.toLocaleString('en-IN') : '–'}</td>
                <td className="px-2 py-2 text-right">{r?.sleep_hours != null ? `${Number(r.sleep_hours)} h` : '–'}</td>
                <td className="px-4 py-2 text-right">{k ? kcal(k) : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function GoalsForm({ memberId, goals, onDone }: { memberId: string; goals: Goals; onDone: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const [f, setF] = useState({ water: String(goals.water_ml), steps: String(goals.steps), sleep: String(goals.sleep_hours), kcal: goals.calories ? String(goals.calories) : '' })
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: (g: Goals) => saveGoals(memberId, g),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-goals', memberId] }); toast(t('track.goalsSaved')); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      const g = { water_ml: Number(f.water), steps: Number(f.steps), sleep_hours: Number(f.sleep), calories: f.kcal.trim() ? Number(f.kcal) : null }
      const ok = g.water_ml >= 500 && g.water_ml <= 10000 && Number.isInteger(g.steps) && g.steps >= 500 && g.steps <= 50000 && g.sleep_hours >= 3 && g.sleep_hours <= 12
        && (g.calories === null || (Number.isInteger(g.calories) && g.calories >= 800 && g.calories <= 6000))
      if (!ok) return setError(t('track.badGoals'))
      m.mutate(g)
    }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('track.goalWater')} id="g-water"><TextInput id="g-water" inputMode="numeric" value={f.water} onChange={(v) => setF({ ...f, water: v })} /></Field>
        <Field label={t('track.goalSteps')} id="g-steps"><TextInput id="g-steps" inputMode="numeric" value={f.steps} onChange={(v) => setF({ ...f, steps: v })} /></Field>
        <Field label={t('track.goalSleep')} id="g-sleep"><TextInput id="g-sleep" inputMode="decimal" value={f.sleep} onChange={(v) => setF({ ...f, sleep: v })} /></Field>
        <Field label={t('track.goalCalories')} id="g-kcal"><TextInput id="g-kcal" inputMode="numeric" value={f.kcal} onChange={(v) => setF({ ...f, kcal: v })} /></Field>
      </div>
      <p className="m-0 text-[12px] text-muted">{t('track.kcalHint')}</p>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-gold" disabled={m.isPending}>{t('track.save')}</button>
    </form>
  )
}

// Food for a day -------------------------------------------------------------------------------------------------------------------
/** What I ate on a day (from the plan and on my own), with Add food when the gym allows it. */
export function FoodList({ memberId, date, rows, canAdd, title }: { memberId: string; date: string; rows: FoodLog[]; canAdd: boolean; title?: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const del = useMutation({
    mutationFn: (id: string) => deleteFoodLog(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-logs', memberId] }); toast(t('track.removed')) },
    onError: (e: Error) => toast(e.message),
  })
  return (
    <div className="flex flex-col gap-2">
      {title && <h3 className="m-0 text-[15px] font-bold">{title}</h3>}
      {!rows.length ? <p className="m-0 text-[13px] text-muted">{t('track.noFood')}</p> : (
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 border-b border-line-soft py-2 last:border-b-0">
              <span className="min-w-0 text-[14px]"><span className="font-semibold">{r.name}</span>
                <span className="block text-[12px] text-muted">{r.meal}{r.quantity ? ` · ${Number(r.quantity)} ${r.unit ?? ''}` : ''} · {kcal(r.calories)} kcal{r.plan_item_id ? ` · ${t('food.fromPlan')}` : ''}</span></span>
              <button type="button" className="icon-btn shrink-0" aria-label={t('track.removeItem', { name: r.name })} disabled={del.isPending}
                onClick={() => { if (window.confirm(t('track.confirmRemove', { name: r.name }))) del.mutate(r.id) }}><Icon name="trash" size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      {canAdd ? <button type="button" className="btn btn-sm self-start" onClick={() => setAdding(true)}><Icon name="plus" size={15} />{t('track.addFood')}</button>
        : <p className="m-0 text-[12px] text-muted">{t('food.turnedOff')}</p>}
      <Sheet open={adding} onClose={() => setAdding(false)} title={t('food.title')}>
        {adding && <FoodForm memberId={memberId} date={date} onDone={() => setAdding(false)} />}
      </Sheet>
    </div>
  )
}

type Pick = { kind: 'food'; item: Food } | { kind: 'recipe'; item: Recipe }
function guessMeal(meals: string[]) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date()))
  const want = h < 7 ? 'Early Morning' : h < 10 ? 'Breakfast' : h < 12 ? 'Mid Morning' : h < 16 ? 'Lunch' : h < 19 ? 'Evening Snack' : 'Dinner'
  return meals.includes(want) ? want : meals[0]
}

export function FoodForm({ memberId, date, preset, onDone }: { memberId: string; date: string; preset?: Pick; onDone: () => void }) {
  const { t } = useTranslation()
  const me = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  const lists = useTrainingLists()
  const foods = useQuery({ queryKey: ['pick-foods', me.studioId], queryFn: () => pickFoods(me.studioId), staleTime: 300_000 })
  const recipes = useQuery({ queryKey: ['my-recipes', me.studioId], queryFn: () => myRecipes(me.studioId), staleTime: 60_000 })
  const [meal, setMeal] = useState(() => guessMeal(lists.meals))
  const [q, setQ] = useState('')
  const [pick, setPick] = useState<Pick | null>(preset ?? null)
  const [amount, setAmount] = useState(preset ? String(Number(preset.item.quantity)) : '')
  const [manual, setManual] = useState(false)
  const [m, setM] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' })
  const [error, setError] = useState<string | null>(null)
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const all: Pick[] = [...(recipes.data ?? []).map((r) => ({ kind: 'recipe' as const, item: r })), ...(foods.data ?? []).map((f) => ({ kind: 'food' as const, item: f }))]
    return all.filter((p) => p.item.name.toLowerCase().includes(s))
      .sort((a, b) => Number(!a.item.name.toLowerCase().startsWith(s)) - Number(!b.item.name.toLowerCase().startsWith(s)) || a.item.name.localeCompare(b.item.name)).slice(0, 12)
  }, [q, foods.data, recipes.data])
  const save = useMutation({
    mutationFn: () => {
      if (pick) return logFood({ memberId, date, meal, name: pick.item.name, quantity: Number(amount), ...(pick.kind === 'food' ? { foodId: pick.item.id } : { recipeId: pick.item.id }) })
      return logFood({ memberId, date, meal, name: m.name.trim(), calories: Number(m.calories), protein: Number(m.protein || 0), carbs: Number(m.carbs || 0), fats: Number(m.fats || 0) })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['food-logs', memberId] }); toast(t('food.added', { meal })); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  const preview = pick && Number(amount) > 0 ? scaled({ ...pick.item, quantity: Number(pick.item.quantity), calories: Number(pick.item.calories), protein: Number(pick.item.protein),
    fats: Number(pick.item.fats), carbs: Number(pick.item.carbs), fibre: Number(pick.item.fibre) }, Number(amount)) : null
  const okNum = (v: string) => v.trim() === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0)
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      if (!manual) {
        if (!pick) return setError(t('food.needPick'))
        if (!(Number(amount) > 0)) return setError(t('food.needAmount'))
      } else {
        if (!m.name.trim()) return setError(t('food.needName'))
        if (m.calories.trim() === '' || !okNum(m.calories) || !okNum(m.protein) || !okNum(m.carbs) || !okNum(m.fats)) return setError(t('food.needKcal'))
      }
      save.mutate()
    }}>
      <Field label={t('food.meal')} id="fd-meal"><Select id="fd-meal" value={meal} onChange={setMeal} options={opts(lists.meals)} /></Field>
      {!manual ? (
        <>
          {pick ? (
            <div className="card flex flex-col gap-3 p-3">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-semibold">{pick.item.name}</div>
                  <div className="text-[12px] text-muted">{pick.kind === 'recipe' ? `${t('food.recipe')} · ` : ''}{t('food.per', { kcal: kcal(pick.item.calories), q: Number(pick.item.quantity), unit: pick.item.unit })}</div></div>
                {!preset && <button type="button" className="link-btn text-[13px]" onClick={() => { setPick(null); setAmount('') }}>{t('food.change')}</button>}
              </div>
              <Field label={`${t('food.amount')} (${pick.item.unit})`} id="fd-amount"><TextInput id="fd-amount" inputMode="decimal" value={amount} onChange={setAmount} /></Field>
              {preview && <p className="m-0 text-[13px] font-semibold">{t('plan.macros', { kcal: kcal(preview.calories), p: preview.protein, c: preview.carbs, f: preview.fats })}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Field label={t('food.search')} id="fd-q"><TextInput id="fd-q" type="search" value={q} onChange={setQ} autoComplete="off" /></Field>
              {q.trim() && (matches.length ? (
                <ul className="m-0 flex list-none flex-col p-0" aria-label={t('food.results')}>
                  {matches.map((p) => (
                    <li key={`${p.kind}${p.item.id}`}>
                      <button type="button" className="flex w-full items-center justify-between gap-3 border-0 border-b border-line-soft bg-transparent px-1 py-2.5 text-left text-ink"
                        onClick={() => { setPick(p); setAmount(String(Number(p.item.quantity))) }}>
                        <span className="min-w-0"><span className="font-semibold">{p.item.name}</span>{p.kind === 'recipe' && <span className="chip chip-muted ml-2">{t('food.recipe')}</span>}</span>
                        <span className="shrink-0 text-[12px] text-muted">{kcal(p.item.calories)} kcal · {Number(p.item.quantity)} {p.item.unit}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="m-0 text-[13px] text-muted">{t('food.noMatch')}</p>)}
            </div>
          )}
          {!preset && <button type="button" className="link-btn self-start text-[13px]" onClick={() => { setManual(true); setM({ ...m, name: q.trim() }) }}>{t('food.manual')}</button>}
        </>
      ) : (
        <>
          <Field label={t('food.name')} required id="fd-name"><TextInput id="fd-name" value={m.name} onChange={(v) => setM({ ...m, name: v })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('food.calories')} required id="fd-kcal"><TextInput id="fd-kcal" inputMode="decimal" value={m.calories} onChange={(v) => setM({ ...m, calories: v })} /></Field>
            <Field label={t('food.protein')} id="fd-p"><TextInput id="fd-p" inputMode="decimal" value={m.protein} onChange={(v) => setM({ ...m, protein: v })} /></Field>
            <Field label={t('food.carbs')} id="fd-c"><TextInput id="fd-c" inputMode="decimal" value={m.carbs} onChange={(v) => setM({ ...m, carbs: v })} /></Field>
            <Field label={t('food.fats')} id="fd-f"><TextInput id="fd-f" inputMode="decimal" value={m.fats} onChange={(v) => setM({ ...m, fats: v })} /></Field>
          </div>
          <button type="button" className="link-btn self-start text-[13px]" onClick={() => setManual(false)}>{t('food.pickList')}</button>
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-gold" disabled={save.isPending}>{t('food.add')}</button>
    </form>
  )
}

// Diary ------------------------------------------------------------------------------------------------------------------------------
export function MemberDiary() {
  const { t } = useTranslation()
  const me = useMe()
  const memberId = me.memberId ?? ''
  const on = useAppFlag('show_diary', true)
  const video = useAppFlag('show_diary_video', true)
  const qc = useQueryClient()
  const toast = useToast()
  const today = studioToday()
  const list = useQuery({ queryKey: ['diary', memberId], queryFn: () => diary(memberId), enabled: !!memberId && on })
  const [f, setF] = useState({ date: today, body: '', video: '' })
  const [error, setError] = useState<string | null>(null)
  const add = useMutation({
    mutationFn: () => addDiary(memberId, f.date, f.body, f.video.trim() || null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diary', memberId] }); toast(t('diary.saved')); setF({ date: today, body: '', video: '' }) },
    onError: (e: Error) => setError(e.message),
  })
  const del = useMutation({
    mutationFn: deleteDiary,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diary', memberId] }); toast(t('diary.deleted')) },
    onError: (e: Error) => toast(e.message),
  })
  if (!on) return <MemberPage title={t('diary.title')}><Notice>{t('diary.off')}</Notice></MemberPage>
  return (
    <MemberPage title={t('diary.title')}>
      <form className="card flex flex-col gap-4 p-4" noValidate onSubmit={(e) => {
        e.preventDefault(); setError(null)
        if (!f.body.trim()) return setError(t('diary.needText'))
        if (!f.date || f.date > today) return setError(t('diary.badDate'))
        if (f.video.trim() && !/^https:\/\/\S+$/i.test(f.video.trim())) return setError(t('diary.badVideo'))
        add.mutate()
      }}>
        <Field label={t('diary.date')} id="dy-date"><TextInput id="dy-date" type="date" value={f.date} onChange={(v) => setF({ ...f, date: v })} /></Field>
        <Field label={t('diary.write')} id="dy-body"><TextArea id="dy-body" rows={4} value={f.body} onChange={(v) => setF({ ...f, body: v })} /></Field>
        {video && <Field label={t('diary.video')} hint={t('diary.videoHint')} id="dy-video"><TextInput id="dy-video" type="url" inputMode="text" value={f.video} onChange={(v) => setF({ ...f, video: v })} placeholder="https://" /></Field>}
        <p className="m-0 text-[12px] text-muted">{t('diary.privacy')}</p>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn-gold" disabled={add.isPending}>{t('diary.save')}</button>
      </form>
      {list.isLoading ? <Loading /> : !list.data?.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('diary.empty')}</div> : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {list.data.map((d) => (
            <li key={d.id} className="card flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-muted">{fmtDay(d.date, 'EEE d MMM yyyy')}</span>
                <button type="button" className="icon-btn" aria-label={t('diary.delete')} disabled={del.isPending}
                  onClick={() => { if (window.confirm(t('diary.confirmDelete'))) del.mutate(d.id) }}><Icon name="trash" size={16} /></button>
              </div>
              <p className="m-0 text-[15px] whitespace-pre-line">{d.body}</p>
              {d.video_url && /^https:\/\//i.test(d.video_url) && <a href={d.video_url} target="_blank" rel="noreferrer" className="link-btn self-start text-[13px]">{t('diary.watch')}</a>}
            </li>
          ))}
        </ul>
      )}
    </MemberPage>
  )
}

// PAR-Q health form ----------------------------------------------------------------------------------------------------------------------
export function MemberHealthForm() {
  const { t } = useTranslation()
  const me = useMe()
  const memberId = me.memberId ?? ''
  const on = useAppFlag('can_view_parq_form', true)
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['my-medical', memberId], queryFn: () => myMedical(memberId), enabled: !!memberId && on })
  const gender = useQuery({ queryKey: ['my-gender', memberId], queryFn: () => bodyFacts(memberId).then((b) => b.gender), enabled: !!memberId && on })
  const [ans, setAns] = useState<Record<string, string> | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: (a: Record<string, boolean>) => saveMyMedical(a, note ?? q.data?.note ?? ''),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-medical', memberId] }); toast(t('parq.saved')); setAns(null); setNote(null) },
    onError: (e: Error) => setError(e.message),
  })
  if (!on) return <MemberPage title={t('parq.title')}><Notice>{t('parq.off')}</Notice></MemberPage>
  if (q.isLoading || gender.isLoading) return <MemberPage title={t('parq.title')}><Loading /></MemberPage>
  const saved = q.data?.answers ?? {}
  const male = gender.data === 'male'
  const keys = PAR_Q.map(([k]) => k).filter((k) => !(male && k === 'pregnant'))
  const cur: Record<string, string> = ans ?? Object.fromEntries(keys.map((k) => [k, saved[k] === undefined || saved[k] === null ? '' : saved[k] ? 'yes' : 'no']))
  const worry = keys.some((k) => (k === 'medical_problem' ? cur[k] === 'no' : cur[k] === 'yes'))
  return (
    <MemberPage title={t('parq.title')}>
      <p className="m-0 text-[14px] text-muted">{t('parq.intro')}</p>
      {q.data && <p className="m-0 text-[13px]">{t('parq.last', { date: fmtDay(q.data.updated_at, 'd MMM yyyy'), who: q.data.filled_by_member_at && q.data.filled_by_member_at >= q.data.updated_at ? t('parq.byYou') : t('parq.byGym') })}</p>}
      <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
        e.preventDefault(); setError(null)
        if (keys.some((k) => !cur[k])) return setError(t('parq.answerAll'))
        m.mutate({ ...Object.fromEntries(keys.map((k) => [k, cur[k] === 'yes'])), ...(male ? { pregnant: false } : {}) })
      }}>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {keys.map((k, i) => (
            <li key={k} className="card p-4">
              <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
                <legend className="mb-2.5 p-0 text-[15px] leading-snug font-semibold">{i + 1}. {t(`parq.q.${k}`)}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['yes', 'no'] as const).map((v) => (
                    <label key={v} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[14px] font-semibold ${cur[k] === v ? 'border-gold bg-accent-tint' : 'border-line-strong text-muted'}`}>
                      <input type="radio" className="check" name={`pq-${k}`} value={v} checked={cur[k] === v} onChange={() => setAns({ ...cur, [k]: v })} />{t(`parq.${v}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <Field label={t('parq.note')} id="pq-note"><TextArea id="pq-note" rows={3} value={note ?? q.data?.note ?? ''} onChange={setNote} /></Field>
        {worry && <Notice tone="warn">{t('parq.seeDoctor')}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn-gold" disabled={m.isPending}>{t('parq.save')}</button>
      </form>
    </MemberPage>
  )
}
