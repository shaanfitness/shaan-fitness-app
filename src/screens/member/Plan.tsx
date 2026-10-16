import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import {
  clock, dietForDay, getDietPlan, getWorkoutPlan, groupMeals, memberPlans, planDayFor, tickExercise, totals, workoutLogs, type DietItem, type WorkoutItem,
} from '../../db/training'
import { studioToday } from '../../lib/dates'
import { isoWeekday } from '../../lib/format'
import { Notice } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, Loading, Sheet } from '../../components/ui'
import { n1, useTrainingLists } from '../staff/training/common'
import { foodLogs, logFood, untickPlanItem } from '../../db/health'
import { FoodList, ProgressBar, useAppFlag } from './Health'
import { LatestValues, MeasurementForm, MeasurementHistory, ProgressPhotos, useMeasurements, WeightChart } from '../staff/training/progress'

// Member app › Plan: today's workout (tick each exercise off), the diet for each day of the week,
// and progress (measurements, weight chart, photos). App Settings › On/Off Permission decide what shows.

type Tab = 'workout' | 'diet' | 'progress'
const WD = ['wd1', 'wd2', 'wd3', 'wd4', 'wd5', 'wd6', 'wd7']

function Chips<T extends string | number>({ items, value, onChange, label, mark, markLabel, fill }: {
  items: { v: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; mark?: T | null; markLabel?: string
  /** Share the row equally (the seven weekdays fit a phone without scrolling). */
  fill?: boolean
}) {
  return (
    <div role="tablist" aria-label={label} className={fill ? 'grid grid-cols-7 gap-1' : 'flex gap-1.5 overflow-x-auto pb-1'}>
      {items.map((it) => (
        <button key={String(it.v)} type="button" role="tab" aria-selected={value === it.v} onClick={() => onChange(it.v)}
          className={`relative shrink-0 rounded-full border py-1.5 text-[13px] font-semibold ${fill ? 'px-0' : 'px-3.5'} ${value === it.v ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>
          {it.label}{mark === it.v && <><span className="absolute top-0.5 right-1.5 text-[10px]" aria-hidden="true">•</span><span className="sr-only"> ({markLabel})</span></>}
        </button>
      ))}
    </div>
  )
}

export default function MemberPlan() {
  const { t } = useTranslation()
  const me = useMe()
  const { data: studio } = useStudio()
  const app = ((studio?.settings as unknown as { app?: Record<string, unknown> })?.app ?? {}) as Record<string, unknown>
  const workoutOn = app.is_woplan_allowed !== false
  const dietOn = app.is_Diet_PlanAllowed !== false
  const asked = new URLSearchParams(useLocation().search).get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(asked && ['workout', 'diet', 'progress'].includes(asked) ? asked : workoutOn ? 'workout' : dietOn ? 'diet' : 'progress')
  const memberId = me.memberId ?? ''
  const plans = useQuery({ queryKey: ['member-plans', memberId], queryFn: () => memberPlans(memberId), enabled: !!memberId })
  if (!memberId) return <div className="px-5 pt-6"><Notice>{t('plan.noMember')}</Notice></div>
  const tabs: { v: Tab; label: string }[] = [
    ...(workoutOn ? [{ v: 'workout' as const, label: t('plan.workout') }] : []),
    ...(dietOn ? [{ v: 'diet' as const, label: t('plan.diet') }] : []),
    { v: 'progress', label: t('plan.progress') },
  ]
  const w = plans.data?.workouts.find((x) => x.active)
  const d = plans.data?.diets.find((x) => x.active)
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[720px]">
      <h1 className="title text-[36px]">{t('nav.plan')}</h1>
      <Chips items={tabs} value={tab} onChange={setTab} label={t('nav.plan')} />
      {plans.isLoading ? <Loading /> : plans.error ? <Notice tone="error">{(plans.error as Error).message}</Notice> : (
        <>
          {tab === 'workout' && (w ? <WorkoutToday memberId={memberId} planId={w.plan_id} weekdays={w.weekdays} pdf={app.show_workout_pdf === true} /> : <Empty text={t('plan.noWorkout')} />)}
          {tab === 'diet' && (d ? <DietWeek memberId={memberId} planId={d.plan_id} macros={app.show_calories_breakdown !== false} pdf={app.show_diet_pdf === true} />
            : <><Empty text={t('plan.noDiet')} /><TodayOtherFood memberId={memberId} title={t('food.today')} /></>)}
          {tab === 'progress' && <Progress memberId={memberId} />}
        </>
      )}
    </div>
  )
}

const Empty = ({ text }: { text: string }) => <div className="card px-5 py-8 text-center text-[14px] text-muted">{text}</div>

function WorkoutToday({ memberId, planId, weekdays, pdf }: { memberId: string; planId: string; weekdays: number[]; pdf: boolean }) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const today = studioToday()
  const q = useQuery({ queryKey: ['workout-plan', planId], queryFn: () => getWorkoutPlan(planId) })
  const logs = useQuery({ queryKey: ['workout-logs', memberId, today, 'today'], queryFn: () => workoutLogs(memberId, today, today) })
  const todayDay = q.data ? planDayFor(today, weekdays, q.data.plan.days_per_week) : null
  const [day, setDay] = useState<number | null>(null)
  // A tick shows at once; it is undone if saving fails.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({})
  const settle = (id: string) => setOptimistic((o) => { const n = { ...o }; delete n[id]; return n })
  const tick = useMutation({
    mutationFn: ({ item, done }: { item: WorkoutItem; done: boolean }) => tickExercise(memberId, item.id, today, done, item.sets),
    onMutate: ({ item, done }) => setOptimistic((o) => ({ ...o, [item.id]: done })),
    onSuccess: async (_, { item }) => { await qc.invalidateQueries({ queryKey: ['workout-logs', memberId] }); settle(item.id) },
    onError: (e: Error, { item }) => { settle(item.id); toast(e.message) },
  })
  if (q.isLoading) return <Loading />
  if (!q.data) return <Notice tone="error">{(q.error as Error)?.message ?? t('plan.noWorkout')}</Notice>
  const { plan, items } = q.data
  const shown = day ?? todayDay ?? 1
  const list = items.filter((i) => i.day === shown)
  const isToday = shown === todayDay
  const done = (i: WorkoutItem) => optimistic[i.id] ?? !!logs.data?.some((l) => l.item_id === i.id && l.date === today)
  const count = list.filter(done).length
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-1 p-4">
        <h2 className="m-0 text-[18px] font-bold">{plan.name}</h2>
        <p className="m-0 text-[13px] text-muted">{t('plan.yourDays', { days: [...weekdays].sort().map((x) => t(`plan.${WD[x - 1]}`)).join(' · ') })}</p>
        {plan.instructions && <p className="m-0 mt-1 text-[13px]">{plan.instructions}</p>}
        {pdf && <a className="link-btn mt-1 self-start text-[13px]" href={`/print/workout/${plan.id}`} target="_blank" rel="noreferrer">{t('plan.pdf')}</a>}
      </div>
      {!todayDay && <Notice>{t('plan.restDay')}</Notice>}
      <Chips items={Array.from({ length: plan.days_per_week }, (_, i) => ({ v: i + 1, label: i + 1 === todayDay ? `${t('plan.day', { n: i + 1 })} · ${t('plan.today')}` : t('plan.day', { n: i + 1 }) }))}
        value={shown} onChange={setDay} label={t('plan.workout')} />
      {isToday && list.length > 0 && <p className="m-0 text-[14px] font-semibold">{t('plan.ticked', { done: count, total: list.length })}</p>}
      {!isToday && list.length > 0 && <p className="m-0 text-[13px] text-muted">{t('plan.onlyToday')}</p>}
      {list.length === 0 ? <Empty text={t('plan.rest')} /> : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map((i) => {
            const on = done(i)
            const what = [i.sets ? t('plan.sets', { n: i.sets }) : '', i.reps ? t('plan.reps', { n: i.reps }) : '', i.time ? `${Number(i.time)} ${i.time_unit}` : '', i.weight_kg ? `${Number(i.weight_kg)} kg` : ''].filter(Boolean).join(' × ')
            return (
              <li key={i.id} className={`card flex items-start gap-3 p-4 ${on ? 'opacity-70' : ''}`}>
                <input type="checkbox" className="check mt-0.5" aria-label={`${t('plan.markDone')}: ${i.exercise_name}`} checked={on} disabled={!isToday || i.id in optimistic}
                  onChange={(e) => tick.mutate({ item: i, done: e.target.checked })} />
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold ${on ? 'line-through' : ''}`}>{i.exercise_name}</div>
                  <div className="text-[13px] text-muted">{what}{i.body_part ? ` · ${i.body_part}` : ''}</div>
                  {i.notes && <div className="text-[12px] text-muted">{i.notes}</div>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Food I ate today outside my diet plan (or with no plan). */
function TodayOtherFood({ memberId, title }: { memberId: string; title: string }) {
  const today = studioToday()
  const canAdd = useAppFlag('can_add_food', true)
  const logs = useQuery({ queryKey: ['food-logs', memberId, today, today], queryFn: () => foodLogs(memberId, today, today) })
  return <section className="card p-4"><FoodList memberId={memberId} date={today} rows={(logs.data ?? []).filter((l) => !l.plan_item_id)} canAdd={canAdd} title={title} /></section>
}

function DietWeek({ memberId, planId, macros, pdf }: { memberId: string; planId: string; macros: boolean; pdf: boolean }) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const lists = useTrainingLists()
  const today = studioToday()
  const todayW = isoWeekday(today)
  const [w, setW] = useState(todayW)
  const q = useQuery({ queryKey: ['diet-plan', planId], queryFn: () => getDietPlan(planId) })
  const logs = useQuery({ queryKey: ['food-logs', memberId, today, today], queryFn: () => foodLogs(memberId, today, today) })
  // "I ate this" shows at once; it is undone if saving fails.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({})
  const settle = (id: string) => setOptimistic((o) => { const n = { ...o }; delete n[id]; return n })
  const tick = useMutation({
    mutationFn: ({ item, done }: { item: DietItem; done: boolean }) =>
      done ? logFood({ memberId, date: today, meal: item.meal, planItemId: item.id, name: item.item_name }).then(() => undefined) : untickPlanItem(memberId, today, item.id),
    onMutate: ({ item, done }) => setOptimistic((o) => ({ ...o, [item.id]: done })),
    onSuccess: async (_, { item }) => { await qc.invalidateQueries({ queryKey: ['food-logs', memberId] }); settle(item.id) },
    onError: (e: Error, { item }) => { settle(item.id); toast(e.message) },
  })
  if (q.isLoading) return <Loading />
  if (!q.data) return <Notice tone="error">{(q.error as Error)?.message ?? t('plan.noDiet')}</Notice>
  const { plan, items } = q.data
  const list = dietForDay(items, w)
  const tot = totals(list)
  const isToday = w === todayW
  const ate = (i: DietItem) => optimistic[i.id] ?? !!logs.data?.some((l) => l.plan_item_id === i.id)
  const eaten = totals((logs.data ?? []).filter((l) => !l.plan_item_id)).calories + list.filter(ate).reduce((a, i) => a + Number(i.calories), 0)
  const line = (x: { calories: number; protein: number; carbs: number; fats: number }) =>
    t('plan.macros', { kcal: Math.round(Number(x.calories)), p: n1(x.protein), c: n1(x.carbs), f: n1(x.fats) })
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-1 p-4">
        <h2 className="m-0 text-[18px] font-bold">{plan.name}</h2>
        {macros && plan.calories_target && <p className="m-0 text-[13px] text-muted">{t('plan.target', { kcal: plan.calories_target })}</p>}
        {plan.instructions && <p className="m-0 mt-1 text-[13px]">{plan.instructions}</p>}
        {pdf && <a className="link-btn mt-1 self-start text-[13px]" href={`/print/diet/${plan.id}`} target="_blank" rel="noreferrer">{t('plan.pdf')}</a>}
      </div>
      <Chips items={WD.map((k, i) => ({ v: i + 1, label: t(`plan.${k}`) }))} value={w} onChange={setW} label={t('plan.diet')} mark={todayW} markLabel={t('plan.today')} fill />
      {macros && list.length > 0 && <p className="m-0 text-[14px] font-semibold">{line(tot)}</p>}
      {isToday && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <p className="m-0 text-[14px] font-semibold">{t('food.eatenOf', { eaten: Math.round(eaten), plan: Math.round(plan.calories_target ?? tot.calories) })}</p>
          <ProgressBar value={eaten} max={plan.calories_target ?? tot.calories} label={t('track.food')} />
        </div>
      )}
      {!isToday && list.length > 0 && <p className="m-0 text-[13px] text-muted">{t('food.onlyToday')}</p>}
      {list.length === 0 ? <Empty text={t('plan.noMeals')} /> : groupMeals(list, lists.meals).map((m) => (
        <section key={m.meal} className="card overflow-hidden" aria-label={m.meal}>
          <div className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="m-0 text-[15px] font-bold">{m.meal}</h3>
            {m.time && <span className="text-[13px] text-muted">{clock(m.time)}</span>}
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {m.items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0">
                {isToday && <input type="checkbox" className="check mt-0.5" aria-label={`${t('food.ate')}: ${i.item_name}`} checked={ate(i)} disabled={i.id in optimistic}
                  onChange={(e) => tick.mutate({ item: i, done: e.target.checked })} />}
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold ${isToday && ate(i) ? 'line-through opacity-70' : ''}`}>{i.item_name}</div>
                  {i.notes && <div className="text-[12px] text-muted">{i.notes}</div>}
                  {macros && <div className="text-[12px] text-muted">{line(i)}</div>}
                </div>
                <span className="shrink-0 text-[13px] text-muted">{i.quantity ? `${Number(i.quantity)} ${i.unit ?? ''}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {isToday && <TodayOtherFood memberId={memberId} title={t('food.other')} />}
    </div>
  )
}

function Progress({ memberId }: { memberId: string }) {
  const { t } = useTranslation()
  const m = useMeasurements(memberId)
  const [adding, setAdding] = useState(false)
  const rows = m.data ?? []
  return (
    <div className="flex flex-col gap-4">
      <button type="button" className="btn-gold self-start px-4" onClick={() => setAdding(true)}><Icon name="plus" size={18} />{t('plan.addMeasurement')}</button>
      {m.isLoading ? <Loading /> : (
        <>
          <LatestValues rows={rows} />
          <section className="card flex flex-col gap-2 p-4"><h2 className="m-0 text-[16px] font-bold">{t('plan.weightChart')}</h2><WeightChart rows={rows} /></section>
          <section className="card flex flex-col gap-2 p-4"><h2 className="m-0 text-[16px] font-bold">{t('plan.history')}</h2>
            <MeasurementHistory memberId={memberId} rows={rows} canDelete={(x) => !x.recorded_by} /></section>
          <section className="card flex flex-col gap-2 p-4"><h2 className="m-0 text-[16px] font-bold">{t('plan.photosTitle')}</h2><ProgressPhotos memberId={memberId} /></section>
        </>
      )}
      <Sheet wide open={adding} onClose={() => setAdding(false)} title={t('plan.addMeasurement')}>
        {adding && <MeasurementForm memberId={memberId} onDone={() => setAdding(false)} />}
      </Sheet>
    </div>
  )
}
