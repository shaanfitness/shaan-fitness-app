import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import {
  assignDiet, assignWorkout, cmToFeet, dietForDay, endMemberPlan, feetToCm, getDietPlan, getWorkoutPlan, idealWeight, listDietPlans, listWorkoutPlans,
  memberPlans, planDayFor, totals, WEEKDAYS, WEEKDAYS_SHORT, workoutLogs, type Measurement, type WorkoutPlan,
} from '../../../db/training'
import { fmtDay, plusDays, studioToday } from '../../../lib/dates'
import { isoWeekday } from '../../../lib/format'
import { Checkbox, Field, Notice, RadioGroup, Select, TextInput } from '../../../components/controls'
import { useToast } from '../../../components/toast'
import { Icon, Sheet } from '../../../components/ui'
import { usePlanRights, useTrainingLists } from './common'
import { MacroLine } from './Diets'
import { LatestValues, MeasurementForm, MeasurementHistory, ProgressPhotos, useMeasurements, WeightChart } from './progress'

// The client profile's Workout tab: the client's workout and diet (YDL "Add Workout"), body
// measurements with a weight chart, and progress photos.

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const days = (w: number[]) => [...w].sort((a, b) => a - b).map((d) => WEEKDAYS_SHORT[d - 1]).join(' · ')

export function ClientTrainingTab({ memberId, name }: { memberId: string; name: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const rights = usePlanRights()
  const today = studioToday()
  const plans = useQuery({ queryKey: ['member-plans', memberId], queryFn: () => memberPlans(memberId) })
  const wPlans = useQuery({ queryKey: ['workout-plans', me.studioId], queryFn: () => listWorkoutPlans(me.studioId) })
  const dPlans = useQuery({ queryKey: ['diet-plans', me.studioId], queryFn: () => listDietPlans(me.studioId) })
  const measurements = useMeasurements(memberId)
  const current = plans.data?.workouts.find((w) => w.active)
  const diet = plans.data?.diets.find((d) => d.active)
  const wPlan = useQuery({ queryKey: ['workout-plan', current?.plan_id], queryFn: () => getWorkoutPlan(current!.plan_id), enabled: !!current })
  const dPlan = useQuery({ queryKey: ['diet-plan', diet?.plan_id], queryFn: () => getDietPlan(diet!.plan_id), enabled: !!diet })
  const logs = useQuery({ queryKey: ['workout-logs', memberId, today], queryFn: () => workoutLogs(memberId, plusDays(today, -6), today), enabled: !!current })
  const [assign, setAssign] = useState<'workout' | 'diet' | null>(null)
  const [adding, setAdding] = useState(false)
  const end = useMutation({
    mutationFn: (kind: 'workout' | 'diet') => endMemberPlan(kind, memberId),
    onSuccess: (_, kind) => { qc.invalidateQueries({ queryKey: ['member-plans', memberId] }); toast(kind === 'workout' ? 'Workout plan ended' : 'Diet plan ended') },
    onError: (e: Error) => toast(e.message),
  })
  const planName = (id: string, kind: 'workout' | 'diet') => (kind === 'workout' ? wPlans.data : dPlans.data)?.find((p) => p.id === id)?.name ?? 'Plan'
  const rows = measurements.data ?? []
  const canDelete = (m: Measurement) => me.role === 'owner' || (!!m.recorded_by && rights.myIds.has(m.recorded_by))
  const todayDay = current && wPlan.data ? planDayFor(today, current.weekdays, wPlan.data.plan.days_per_week) : null
  const todayItems = todayDay ? (wPlan.data?.items ?? []).filter((i) => i.day === todayDay) : []
  const dietToday = dPlan.data ? dietForDay(dPlan.data.items, isoWeekday(today)) : []
  const past = (plans.data?.workouts ?? []).filter((w) => !w.active).slice(0, 5)
  const pastDiets = (plans.data?.diets ?? []).filter((d) => !d.active).slice(0, 5)
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card flex flex-col gap-3 p-5" aria-labelledby="ct-workout">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="ct-workout" className="m-0 text-[17px] font-bold">Workout Plan</h2>
            {rights.mayWorkout && <button type="button" className="btn-gold min-h-9 px-3 text-[13px]" onClick={() => setAssign('workout')}><Icon name="plus" size={16} />{current ? 'Change Workout' : 'Add Workout'}</button>}
          </div>
          {plans.isLoading ? <p className="m-0 text-muted">Loading…</p> : !current ? <p className="m-0 text-[14px] text-muted">No workout plan for {name} yet.</p> : (
            <>
              <div>
                <Link to={`/workouts/${current.plan_id}/exercises`} className="text-[16px] font-semibold">{planName(current.plan_id, 'workout')}</Link>
                <div className="text-[13px] text-muted">{days(current.weekdays)} · Goal {current.goal ?? '-'} · Level {current.level ?? '-'} · since {fmtDay(current.start_date)}</div>
              </div>
              <div className="rounded-xl bg-surface-2 px-3 py-2 text-[14px]">
                {todayDay ? <>Today is <b>Day {todayDay}</b>: {todayItems.length} exercise{todayItems.length === 1 ? '' : 's'}
                  {todayItems.length > 0 && <>, {todayItems.filter((i) => logs.data?.some((l) => l.item_id === i.id && l.date === today)).length} ticked</>}.</> : 'Today is a rest day.'}
                <div className="text-[12px] text-muted">{logs.data?.length ?? 0} exercise{logs.data?.length === 1 ? '' : 's'} ticked off in the last 7 days.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-sm" href={`/print/workout/${current.plan_id}`} target="_blank" rel="noreferrer"><Icon name="doc" size={16} />Download PDF</a>
                {rights.mayWorkout && <button type="button" className="btn btn-sm" disabled={end.isPending} onClick={() => { if (window.confirm(`End ${name}'s workout plan?`)) end.mutate('workout') }}>End Workout</button>}
              </div>
            </>
          )}
          {past.length > 0 && (
            <details className="text-[13px]"><summary className="cursor-pointer text-muted">Earlier workout plans</summary>
              <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">{past.map((w) => <li key={w.id}>{planName(w.plan_id, 'workout')} · {fmtDay(w.start_date)} to {fmtDay(w.end_date)}</li>)}</ul>
            </details>
          )}
        </section>
        <section className="card flex flex-col gap-3 p-5" aria-labelledby="ct-diet">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="ct-diet" className="m-0 text-[17px] font-bold">Diet Plan</h2>
            {rights.mayDiet && <button type="button" className="btn-gold min-h-9 px-3 text-[13px]" onClick={() => setAssign('diet')}><Icon name="plus" size={16} />{diet ? 'Change Diet' : 'Add Diet'}</button>}
          </div>
          {plans.isLoading ? <p className="m-0 text-muted">Loading…</p> : !diet ? <p className="m-0 text-[14px] text-muted">No diet plan for {name} yet.</p> : (
            <>
              <div>
                <Link to={`/diets/${diet.plan_id}/meals`} className="text-[16px] font-semibold">{planName(diet.plan_id, 'diet')}</Link>
                <div className="text-[13px] text-muted">since {fmtDay(diet.start_date)}{dPlan.data?.plan.calories_target ? ` · ${dPlan.data.plan.calories_target} kcal a day` : ''}</div>
              </div>
              <div className="rounded-xl bg-surface-2 px-3 py-2">
                <div className="text-[14px]">Today ({WEEKDAYS[isoWeekday(today) - 1]}): {plural(new Set(dietToday.map((i) => i.meal)).size, 'meal')}</div>
                <MacroLine t={totals(dietToday)} target={dPlan.data?.plan.calories_target} />
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-sm" href={`/print/diet/${diet.plan_id}`} target="_blank" rel="noreferrer"><Icon name="doc" size={16} />Download PDF</a>
                {rights.mayDiet && <button type="button" className="btn btn-sm" disabled={end.isPending} onClick={() => { if (window.confirm(`End ${name}'s diet plan?`)) end.mutate('diet') }}>End Diet</button>}
              </div>
            </>
          )}
          {pastDiets.length > 0 && (
            <details className="text-[13px]"><summary className="cursor-pointer text-muted">Earlier diet plans</summary>
              <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">{pastDiets.map((w) => <li key={w.id}>{planName(w.plan_id, 'diet')} · {fmtDay(w.start_date)} to {fmtDay(w.end_date)}</li>)}</ul>
            </details>
          )}
        </section>
      </div>
      <section className="card flex flex-col gap-4 p-5" aria-labelledby="ct-measure">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ct-measure" className="m-0 text-[17px] font-bold">Measurements</h2>
          <button type="button" className="btn-gold min-h-9 px-3 text-[13px]" onClick={() => setAdding(true)}><Icon name="plus" size={16} />Add Measurement</button>
        </div>
        {measurements.error && <Notice tone="error">{(measurements.error as Error).message}</Notice>}
        <LatestValues rows={rows} />
        <WeightChart rows={rows} />
        <MeasurementHistory memberId={memberId} rows={rows} canDelete={canDelete} byName={(id) => (id ? `by ${rights.trainerName(id) ?? 'staff'}` : 'by the client')} />
      </section>
      <section className="card flex flex-col gap-3 p-5" aria-labelledby="ct-photos">
        <h2 id="ct-photos" className="m-0 text-[17px] font-bold">Progress Photos</h2>
        {rights.desk && me.role !== 'owner'
          ? <p className="m-0 text-[13px] text-muted">Progress photos are private: only the owner, the client's coach or doctor, and the client can see them.</p>
          : <ProgressPhotos memberId={memberId} />}
      </section>
      <Sheet wide open={assign === 'workout'} onClose={() => setAssign(null)} title="Add Workout">
        {assign === 'workout' && <AssignWorkout memberId={memberId} name={name} last={rows} plans={wPlans.data ?? []} onDone={() => setAssign(null)} />}
      </Sheet>
      <Sheet open={assign === 'diet'} onClose={() => setAssign(null)} title="Add Diet">
        {assign === 'diet' && <AssignDiet memberId={memberId} name={name} onDone={() => setAssign(null)} />}
      </Sheet>
      <Sheet wide open={adding} onClose={() => setAdding(false)} title="Add Measurement">
        {adding && <MeasurementForm memberId={memberId} onDone={() => setAdding(false)} />}
      </Sheet>
    </div>
  )
}

// YDL "Add Workout": weight and height (ideal weight), goal, level, the plan for them, and workout days.
function AssignWorkout({ memberId, name, last, plans, onDone }: { memberId: string; name: string; last: Measurement[]; plans: WorkoutPlan[]; onDone: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const lists = useTrainingLists()
  const lastWeight = last.find((m) => m.weight_kg != null)?.weight_kg
  const lastHeight = last.find((m) => m.height_cm != null)?.height_cm
  const h = lastHeight ? cmToFeet(Number(lastHeight)) : null
  const [f, setF] = useState({ weight: lastWeight ? String(Number(lastWeight)) : '', ft: h ? String(h.ft) : '', inch: h ? String(h.inch) : '', goal: '', level: '', plan: '', all: false })
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((o) => ({ ...o, [k]: v }))
  const heightCm = f.ft || f.inch ? feetToCm(Number(f.ft) || 0, Number(f.inch) || 0) : null
  const ideal = heightCm && heightCm > 50 ? idealWeight(heightCm) : null
  const choices = useMemo(() => plans.filter((p) => p.active && (f.all || ((!f.goal || p.goal === f.goal) && (!f.level || p.level === f.level)))), [plans, f.all, f.goal, f.level])
  const plan = plans.find((p) => p.id === f.plan)
  const save = useMutation({
    mutationFn: () => assignWorkout({ member: memberId, plan: f.plan, weekdays, weight: f.weight ? Number(f.weight) : null, heightCm: heightCm && heightCm !== Number(lastHeight) ? heightCm : null,
      goal: f.goal || undefined, level: f.level || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-plans', memberId] }); qc.invalidateQueries({ queryKey: ['measurements', memberId] })
      toast(`Workout plan assigned to ${name}`); onDone()
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = () => {
    setError(null)
    if (f.weight && !(Number(f.weight) >= 10 && Number(f.weight) <= 350)) return setError('Weight should be in kg (10 to 350).')
    if (heightCm !== null && !(heightCm >= 50 && heightCm <= 260)) return setError('Check the height in feet and inches.')
    if (!f.goal) return setError('Select the customer\'s goal.')
    if (!f.level) return setError('Select the customer\'s level.')
    if (!f.plan) return setError('Select the workout plan.')
    if (!weekdays.length) return setError('Select the days the customer works out.')
    save.mutate()
  }
  const toggle = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort((a, b) => a - b)))
  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <p className="m-0 text-[13px] text-muted">To set {name}'s workout, fill in these details and pick a plan. You can then change the plan for them.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Customer's Weight (kg)" id="aw-weight"><TextInput id="aw-weight" type="number" inputMode="decimal" value={f.weight} onChange={set('weight')} /></Field>
        <Field label="Height (feet)" id="aw-ft"><TextInput id="aw-ft" type="number" inputMode="numeric" value={f.ft} onChange={set('ft')} /></Field>
        <Field label="Height (inch)" id="aw-in"><TextInput id="aw-in" type="number" inputMode="numeric" value={f.inch} onChange={set('inch')} /></Field>
      </div>
      {ideal && <Notice>Ideal Weight for {heightCm} cm: {ideal.low} to {ideal.high} kg{f.weight ? ` · BMI ${(Number(f.weight) / (heightCm! / 100) ** 2).toFixed(1)}` : ''}.</Notice>}
      <RadioGroup name="aw-goal" legend="Goal" required value={f.goal} onChange={(v) => setF((o) => ({ ...o, goal: v, plan: '' }))} options={lists.goals.map((g) => ({ value: g, label: g }))} />
      <RadioGroup name="aw-level" legend="Level" required value={f.level} onChange={(v) => setF((o) => ({ ...o, level: v, plan: '' }))} options={lists.levels.map((g) => ({ value: g, label: g }))} />
      <div className="flex flex-col gap-2">
        <Field label="Workout Plans" required id="aw-plan" hint="Plans made for the goal and level above.">
          <Select id="aw-plan" value={f.plan} onChange={set('plan')} placeholder="Select Workout Plan" options={choices.map((p) => ({ value: p.id, label: `${p.name} (${p.days_per_week} days a week)` }))} />
        </Field>
        <Checkbox checked={f.all} onChange={set('all')} label="Show every plan" />
        {!choices.length && (
          <Notice tone="warn">Seems you have not created a Workout Plan for the above selections. <Link to="/workouts/new">Create A Workout Plan</Link> first, or tick “Show every plan”.</Notice>
        )}
      </div>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-[14px] font-semibold">Workout Days <span className="text-red">*</span></legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <label key={w} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[14px] ${weekdays.includes(i + 1) ? 'border-gold bg-gold/15' : 'border-line'}`}>
              <input type="checkbox" className="check" checked={weekdays.includes(i + 1)} onChange={() => toggle(i + 1)} />{WEEKDAYS_SHORT[i]}
            </label>
          ))}
        </div>
        {plan && <p className="m-0 mt-2 text-[12px] text-muted">{plan.name} has {plan.days_per_week} day{plan.days_per_week === 1 ? '' : 's'}: Day 1 falls on the first day you pick{weekdays.length > plan.days_per_week ? ', and the plan repeats after the last day' : ''}.{weekdays.length && weekdays.length < plan.days_per_week ? ` Only ${weekdays.length} of its days will be used.` : ''}</p>}
      </fieldset>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Assigning…' : 'Assign Workout'}</button>
      </div>
    </form>
  )
}

function AssignDiet({ memberId, name, onDone }: { memberId: string; name: string; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const plans = useQuery({ queryKey: ['diet-plans', me.studioId], queryFn: () => listDietPlans(me.studioId) })
  const [plan, setPlan] = useState('')
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => assignDiet(memberId, plan),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['member-plans', memberId] }); toast(`Diet plan assigned to ${name}`); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  const active = (plans.data ?? []).filter((p) => p.active)
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); if (!plan) setError('Select the diet plan.'); else save.mutate() }}>
      <Field label="Diet Plan" required id="ad-plan">
        <Select id="ad-plan" value={plan} onChange={setPlan} placeholder="Select Diet Plan"
          options={active.map((p) => ({ value: p.id, label: `${p.name}${p.calories_target ? ` (${p.calories_target} kcal)` : ''} · ${p.goal}` }))} />
      </Field>
      {!plans.isLoading && !active.length && <Notice tone="warn">No diet plans yet. <Link to="/diets/new">Create A Diet Plan</Link> first.</Notice>}
      <p className="m-0 text-[13px] text-muted">{name}'s current diet plan, if any, ends today.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Assigning…' : 'Assign Diet'}</button>
      </div>
    </form>
  )
}
