import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import {
  copyWorkoutDay, deleteWorkoutItem, duplicatePlan, getWorkoutPlan, listDietPlans, listWorkoutPlans, saveWorkoutItem, saveWorkoutPlan, updatePlans,
  type DietPlan, type TimeUnit, type WorkoutItem, type WorkoutPlan,
} from '../../../db/training'
import { studioLine } from '../../../components/crud'
import { ActionMenu, Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../../components/controls'
import { BulkBar, DataTable } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../../components/ui'
import { SearchPick, usePlanRights, useExercises, useTrainingLists } from './common'

// YDL App Settings › Workouts & Diet › My Workout Plans: the list, Step 1 Basic Information,
// Step 2 Add Exercises (day by day, copy a day or a day from another plan), and a printable copy.

const timeText = (i: Pick<WorkoutItem, 'time' | 'time_unit'>) => (i.time ? `${Number(i.time)} ${i.time_unit}` : '-')

export const WorkoutPlanList = () => <PlanListing kind="workout" />

/** YDL "Workout plans Listing" and "Diet plans Listing". */
export function PlanListing({ kind }: { kind: 'workout' | 'diet' }) {
  type P = WorkoutPlan | DietPlan
  const W = kind === 'workout'
  const base = W ? '/workouts' : '/diets'
  const noun = W ? 'workout plan' : 'diet plan'
  const Noun = W ? 'Workout Plan' : 'Diet Plan'
  const second = W ? 'exercises' : 'meals'
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const rights = usePlanRights()
  const may = W ? rights.mayWorkout : rights.mayDiet
  const { data: studio } = useStudio()
  const { data = [], isLoading } = useQuery<P[]>({ queryKey: [`${kind}-plans`, me.studioId], queryFn: () => (W ? listWorkoutPlans(me.studioId) : listDietPlans(me.studioId)) })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { verb: string; done: string; change: 'delete' | { active?: boolean; is_public?: boolean }; ids: string[] }>(null)
  const rows = data.filter((p) => !search || `${p.name} ${p.goal} ${p.level} ${rights.trainerName(p.trainer_id) ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const editable = (p: P) => rights.canEdit(kind, p)
  const act = useMutation({
    mutationFn: async (c: NonNullable<typeof confirm>) => { await updatePlans(W ? 'workout_plans' : 'diet_plans', c.ids, c.change); return c },
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: [`${kind}-plans`] }); setSelected(new Set()); setConfirm(null); toast(`${c.ids.length} ${noun}${c.ids.length === 1 ? '' : 's'} ${c.done}`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const copy = useMutation({
    mutationFn: (p: P) => duplicatePlan(kind, p.id),
    onSuccess: (id) => { qc.invalidateQueries({ queryKey: [`${kind}-plans`] }); toast(`${Noun} copied`); navigate(`${base}/${id}/edit`) },
    onError: (e: Error) => toast(e.message),
  })
  const ids = [...selected]
  const actions = (p: P) => [
    { label: 'Edit', onClick: () => navigate(`${base}/${p.id}/edit`), hidden: !editable(p) },
    { label: editable(p) ? (W ? 'Add Exercises' : 'Add Meals') : (W ? 'View Exercises' : 'View Meals'), onClick: () => navigate(`${base}/${p.id}/${second}`) },
    { label: 'Make a copy', onClick: () => copy.mutate(p), hidden: !may },
    { label: p.is_public ? 'Make Private' : 'Make Public', onClick: () => setConfirm({ verb: p.is_public ? 'MAKE PRIVATE' : 'MAKE PUBLIC', done: p.is_public ? 'made private' : 'made public', change: { is_public: !p.is_public }, ids: [p.id] }), hidden: !editable(p) },
    { label: 'Download PDF', href: `/print/${kind}/${p.id}`, external: true },
  ]
  const daysOrKcal = (p: P) => ('days_per_week' in p ? `${p.days_per_week} Days a week` : p.calories_target ? `${p.calories_target} kcal a day` : '—')
  const status = (p: P) => (p.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>)
  return (
    <>
      <PageHeader title={`${W ? 'Workout' : 'Diet'} plans Listing`} sub={studioLine(studio)}
        actions={may && <Link to={`${base}/new`} className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Create {Noun}</Link>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="relative max-w-[480px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={setSearch} placeholder="Search" className="pl-9" />
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ verb: 'ACTIVATE', done: 'activated', change: { active: true }, ids })}>Activate</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ verb: 'DEACTIVATE', done: 'deactivated', change: { active: false }, ids })}>Deactivate</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ verb: 'DELETE', done: 'deleted', change: 'delete', ids })}>Delete</button>
        </BulkBar>
        <DataTable<P> loading={isLoading} rows={rows} rowKey={(r) => r.id} caption={`${W ? 'Workout' : 'Diet'} plans`}
          selectable selected={selected} onSelect={(s) => setSelected(new Set([...s].filter((id) => { const p = data.find((x) => x.id === id); return p && editable(p) })))}
          empty={search ? 'Nothing matches your search.' : `No ${noun}s yet. Create the first one.`}
          columns={[
            { key: 'name', header: 'Plan Name', cell: (p) => <Link to={`${base}/${p.id}/${second}`} className="font-semibold">{p.name}</Link> },
            { key: 'trainer', header: 'Trainer Name', cell: (p) => rights.trainerName(p.trainer_id) ?? '—' },
            { key: 'days', header: W ? 'Days of Weeks' : 'Calories', cell: daysOrKcal },
            { key: 'goal', header: 'Goal', cell: (p) => p.goal },
            { key: 'level', header: 'Level', cell: (p) => p.level },
            { key: 'public', header: 'Status Public Plan', cell: (p) => (p.is_public ? <span className="chip chip-gold">Public</span> : <span className="chip chip-muted">Private</span>) },
            { key: 'status', header: 'Status', cell: status },
            { key: 'action', header: 'Action', width: 90, cell: (p) => <ActionMenu actions={actions(p)} /> },
          ]}
          card={(p) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={`${base}/${p.id}/${second}`} className="font-semibold">{p.name}</Link>
                <div className="text-[13px] text-muted">{daysOrKcal(p)} · {p.goal} · {p.level}{p.trainer_id ? ` · ${rights.trainerName(p.trainer_id)}` : ''}</div>
                <div className="mt-1.5 flex gap-1.5">{status(p)}{p.is_public && <span className="chip chip-gold">Public</span>}</div>
              </div>
              <ActionMenu actions={actions(p)} />
            </div>
          )} />
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO {confirm.verb} {confirm.ids.length === 1 ? `THIS ${Noun.toUpperCase()}` : `THE SELECTED ${Noun.toUpperCase()}S`} ?</p>
            {confirm.change === 'delete' && <p className="m-0 text-[13px] text-muted">Clients on this plan lose it from their app.</p>}
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
              <button type="button" className={`btn flex-1 ${confirm.change === 'delete' ? 'btn-danger' : ''}`} disabled={act.isPending} onClick={() => act.mutate(confirm)}>Yes</button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}

export function Steps({ step, planId, kind }: { step: 1 | 2; planId?: string; kind: 'workout' | 'diet' }) {
  const base = kind === 'workout' ? '/workouts' : '/diets'
  const second = kind === 'workout' ? 'Add Exercises' : 'Add Meals'
  const item = (n: 1 | 2, label: string, to: string | null) => (
    <li className={`flex items-center gap-2 ${step === n ? 'text-ink' : 'text-muted'}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${step === n ? 'bg-gold text-on-gold' : 'bg-surface-3'}`}>{n}</span>
      {to && step !== n ? <Link to={to} className="font-semibold">{label}</Link> : <span className="font-semibold">{label}</span>}
    </li>
  )
  return (
    <ol className="m-0 flex list-none flex-wrap gap-5 p-0 text-[14px]" aria-label="Steps">
      {item(1, 'Basic Information', planId ? `${base}/${planId}/edit` : null)}
      {item(2, second, planId ? `${base}/${planId}/${kind === 'workout' ? 'exercises' : 'meals'}` : null)}
    </ol>
  )
}

// Step 1 -----------------------------------------------------------------------------------------
export function WorkoutPlanForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const lists = useTrainingLists()
  const rights = usePlanRights()
  const plan = useQuery({ queryKey: ['workout-plan', id], queryFn: () => getWorkoutPlan(id!), enabled: !!id })
  const [f, setF] = useState({ name: '', goal: '', level: 'General', trainer_id: '', days_per_week: '3', total_days: '', instructions: '', is_public: false })
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const p = plan.data?.plan
    if (p) setF({ name: p.name, goal: p.goal, level: p.level, trainer_id: p.trainer_id ?? '', days_per_week: String(p.days_per_week), total_days: p.total_days ? String(p.total_days) : '', instructions: p.instructions ?? '', is_public: p.is_public })
  }, [plan.data])
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((o) => ({ ...o, [k]: v }))
  const save = useMutation({
    mutationFn: async (next: boolean) => {
      const used = Math.max(0, ...(plan.data?.items ?? []).map((i) => i.day))
      if (Number(f.days_per_week) < used) throw new Error(`Day ${used} has exercises. Remove them before making the plan ${f.days_per_week} days a week.`)
      const pid = await saveWorkoutPlan(me.studioId, id ?? null, {
        name: f.name.trim(), goal: f.goal, level: f.level, trainer_id: f.trainer_id || null, days_per_week: Number(f.days_per_week),
        total_days: f.total_days ? Number(f.total_days) : null, instructions: f.instructions.trim() || null, is_public: f.is_public,
      })
      return { pid, next }
    },
    onSuccess: ({ pid, next }) => {
      qc.invalidateQueries({ queryKey: ['workout-plans'] }); qc.invalidateQueries({ queryKey: ['workout-plan', pid] })
      toast(id ? 'Workout plan saved' : 'Workout plan created')
      navigate(next ? `/workouts/${pid}/exercises` : '/workouts')
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (next: boolean) => {
    setError(null)
    if (!f.name.trim()) return setError('Workout Plan Name is required.')
    if (!f.goal) return setError('Choose the customer\'s goal.')
    if (!f.level) return setError('Choose the customer\'s level.')
    save.mutate(next)
  }
  if (id && plan.isLoading) return <Loading />
  if (id && plan.data && !rights.canEdit('workout', plan.data.plan)) {
    return <><PageHeader title="Workout Plan" /><div className="px-5 pt-5 lg:px-8"><Notice>Only the owner, front desk, or the coach who made this plan can change it.</Notice></div></>
  }
  return (
    <>
      <PageHeader title={id ? 'Edit Workout Plan' : 'Create Workout Plan'} actions={<Link to="/workouts" className="btn btn-sm">Workout plans Listing</Link>} />
      <form className="flex max-w-[900px] flex-col gap-5 px-5 pt-5 pb-10 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(true) }}>
        <Steps step={1} planId={id} kind="workout" />
        <div className="card flex flex-col gap-5 p-5">
          <h2 className="m-0 text-[17px] font-bold">Workout Plan Basic Information</h2>
          <Field label="Workout Plan Name" required id="wp-name">
            <TextInput id="wp-name" value={f.name} onChange={set('name')} placeholder="e.g. Beginner 3 Days Workout Plan" />
          </Field>
          <RadioGroup name="wp-goal" legend="Customer's Goal" required value={f.goal} onChange={set('goal')} options={lists.goals.map((g) => ({ value: g, label: g }))} />
          <RadioGroup name="wp-level" legend="Customer's Level" required value={f.level} onChange={set('level')} options={lists.levels.map((g) => ({ value: g, label: g }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Assign By Trainer" id="wp-trainer">
              <Select id="wp-trainer" value={f.trainer_id} onChange={set('trainer_id')} placeholder="Select Trainer" options={rights.trainers.map((s) => ({ value: s.id, label: s.full_name }))} />
            </Field>
            <Field label="Number of Days in a Week" required id="wp-days">
              <Select id="wp-days" value={f.days_per_week} onChange={set('days_per_week')} options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} Day${n === 1 ? '' : 's'} a week` }))} />
            </Field>
            <Field label="Total Days" id="wp-total" hint="How long the plan runs, if it has an end">
              <TextInput id="wp-total" type="number" inputMode="numeric" value={f.total_days} onChange={set('total_days')} placeholder="e.g. 30" />
            </Field>
          </div>
          <Field label="Important Instruction" id="wp-ins">
            <TextArea id="wp-ins" value={f.instructions} onChange={set('instructions')} placeholder="Warm up for 10 minutes before every session…" />
          </Field>
          <RadioGroup name="wp-public" legend="Public Plan (members can browse it in the app)" value={f.is_public ? 'yes' : 'no'} onChange={(v) => set('is_public')(v === 'yes')}
            options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Link to="/workouts" className="btn flex-1">Back</Link>
          <button type="button" className="btn flex-1" disabled={save.isPending} onClick={() => submit(false)}>Save</button>
          <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save & Next'}</button>
        </div>
      </form>
    </>
  )
}

// Step 2 -------------------------------------------------------------------------------------------
type ItemForm = { id: string | null; day: number; exercise_type: string; body_part: string; exercise_id: string; exercise_name: string; reps: string; sets: string; time: string; time_unit: TimeUnit; weight_kg: string; seq: string; notes: string }
const emptyItem = (day: number, seq: number): ItemForm => ({ id: null, day, exercise_type: '', body_part: '', exercise_id: '', exercise_name: '', reps: '', sets: '3', time: '', time_unit: 'secs', weight_kg: '', seq: String(seq), notes: '' })

export function WorkoutPlanDays() {
  const { id = '' } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const rights = usePlanRights()
  const q = useQuery({ queryKey: ['workout-plan', id], queryFn: () => getWorkoutPlan(id) })
  const plans = useQuery({ queryKey: ['workout-plans', me.studioId], queryFn: () => listWorkoutPlans(me.studioId) })
  const [item, setItem] = useState<ItemForm | null>(null)
  const [copy, setCopy] = useState<null | { other: boolean; fromPlan: string; from: string; to: string }>(null)
  const del = useMutation({
    mutationFn: deleteWorkoutItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workout-plan', id] }); toast('Exercise removed') },
    onError: (e: Error) => toast(e.message),
  })
  const doCopy = useMutation({
    mutationFn: (c: NonNullable<typeof copy>) => copyWorkoutDay(id, c.other ? c.fromPlan : id, Number(c.from), Number(c.to)),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['workout-plan', id] }); setCopy(null); toast(`${n} exercise${n === 1 ? '' : 's'} copied`) },
    onError: (e: Error) => toast(e.message),
  })
  if (q.isLoading) return <Loading />
  if (q.error) return <div className="px-5 py-10 lg:px-8"><Notice tone="error">{(q.error as Error).message}</Notice></div>
  const { plan, items } = q.data!
  const can = rights.canEdit('workout', plan)
  const days = Array.from({ length: plan.days_per_week }, (_, i) => i + 1)
  const sourcePlan = copy?.other ? plans.data?.find((p) => p.id === copy.fromPlan) : plan
  return (
    <>
      <PageHeader title="Workout Plan Add exercises" sub={`${plan.name} · ${plan.days_per_week} Days a Week · Goal : ${plan.goal} · Level : ${plan.level}`}
        actions={<>
          <a className="btn btn-sm" href={`/print/workout/${plan.id}`} target="_blank" rel="noreferrer"><Icon name="doc" size={16} />Download PDF</a>
          {can && <button type="button" className="btn btn-sm" onClick={() => setCopy({ other: true, fromPlan: '', from: '1', to: '1' })}>Copy from Workout Plan</button>}
          <Link to="/workouts" className="btn btn-sm">Workout plans Listing</Link>
        </>} />
      <div className="flex flex-col gap-5 px-5 pt-5 pb-10 lg:px-8">
        <Steps step={2} planId={plan.id} kind="workout" />
        {!can && <Notice>You can view this plan. Only the owner, front desk, or the coach who made it can change it.</Notice>}
        {plan.instructions && <Notice>{plan.instructions}</Notice>}
        <h2 className="m-0 text-[17px] font-bold">Workout Schedule</h2>
        {days.map((d) => {
          const list = items.filter((i) => i.day === d)
          const nextSeq = (Math.max(0, ...list.map((i) => i.seq)) || 0) + 1
          return (
            <section key={d} aria-labelledby={`day-${d}`} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <h3 id={`day-${d}`} className="m-0 text-[15px] font-bold">Day {d} <span className="text-[13px] font-normal text-muted">· {list.length} exercise{list.length === 1 ? '' : 's'}</span></h3>
                {can && (
                  <div className="flex gap-2">
                    {d > 1 && <button type="button" className="btn btn-sm" onClick={() => setCopy({ other: false, fromPlan: plan.id, from: '1', to: String(d) })}>Copy from</button>}
                    <button type="button" className="btn-gold min-h-9 px-3 text-[13px]" onClick={() => setItem(emptyItem(d, nextSeq))}><Icon name="plus" size={16} />Add</button>
                  </div>
                )}
              </div>
              {list.length === 0 ? <p className="m-0 px-4 py-5 text-[14px] text-muted">Rest day, or no exercises added yet.</p> : (
                <div className="overflow-x-auto"><div className="min-w-[900px]">
                  <table className="tbl table-fixed">
                    <caption className="sr-only">Day {d} exercises</caption>
                    <colgroup><col className="w-[90px]" /><col /><col className="w-[140px]" /><col className="w-[110px]" /><col className="w-[60px]" /><col className="w-[60px]" /><col className="w-[80px]" />{can && <col className="w-[110px]" />}</colgroup>
                    <thead><tr><th className="num">Sequence</th><th>Exercise</th><th>Exercise Type</th><th>Body part</th><th className="num">Reps</th><th className="num">Sets</th><th>Time</th>{can && <th>Action</th>}</tr></thead>
                    <tbody>{list.map((i) => (
                      <tr key={i.id}>
                        <td className="num">{i.seq}</td>
                        <td><span className="font-semibold">{i.exercise_name}</span>{i.weight_kg ? <span className="text-muted"> · {Number(i.weight_kg)} kg</span> : null}{i.notes && <div className="text-[12px] text-muted">{i.notes}</div>}</td>
                        <td>{i.exercise_type ?? '-'}</td><td>{i.body_part ?? '-'}</td>
                        <td className="num">{i.reps ?? '-'}</td><td className="num">{i.sets ?? '-'}</td><td className="nowrap">{timeText(i)}</td>
                        {can && <td><ActionMenu actions={[
                          { label: 'Edit', onClick: () => setItem({ id: i.id, day: i.day, exercise_type: i.exercise_type ?? '', body_part: i.body_part ?? '', exercise_id: i.exercise_id ?? '',
                            exercise_name: i.exercise_name, reps: i.reps?.toString() ?? '', sets: i.sets?.toString() ?? '', time: i.time?.toString() ?? '', time_unit: i.time_unit,
                            weight_kg: i.weight_kg?.toString() ?? '', seq: String(i.seq), notes: i.notes ?? '' }) },
                          { label: 'Delete', danger: true, onClick: () => del.mutate(i.id) },
                        ]} /></td>}
                      </tr>
                    ))}</tbody>
                  </table></div>
                </div>
              )}
            </section>
          )
        })}
        <div className="flex gap-2"><Link to={`/workouts/${plan.id}/edit`} className="btn">Back</Link><Link to="/workouts" className="btn-gold">Done</Link></div>
      </div>
      <Sheet wide open={!!item} onClose={() => setItem(null)} title={item?.id ? `Edit Exercise · Day ${item.day}` : `Add Exercise for Day ${item?.day ?? ''}`}>
        {item && <ExerciseForm plan={plan} value={item} onDone={() => setItem(null)} />}
      </Sheet>
      <Sheet open={!!copy} onClose={() => setCopy(null)} title={copy?.other ? 'Copy From Another Workout' : 'Copy Exercise for Day'}>
        {copy && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); doCopy.mutate(copy) }}>
            {copy.other && (
              <Field label="Copy From Workout Plan" required id="cp-plan">
                <Select id="cp-plan" value={copy.fromPlan} onChange={(v) => setCopy({ ...copy, fromPlan: v, from: '1' })} placeholder="Select Workout Plan"
                  options={(plans.data ?? []).filter((p) => p.id !== plan.id).map((p) => ({ value: p.id, label: `${p.name} (${p.days_per_week} days)` }))} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Copy From" required id="cp-from">
                <Select id="cp-from" value={copy.from} onChange={(v) => setCopy({ ...copy, from: v })}
                  options={Array.from({ length: sourcePlan?.days_per_week ?? 0 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }))} />
              </Field>
              <Field label="Copy To" required id="cp-to">
                <Select id="cp-to" value={copy.to} onChange={(v) => setCopy({ ...copy, to: v })} options={days.map((d) => ({ value: String(d), label: `Day ${d}` }))} />
              </Field>
            </div>
            <p className="m-0 text-[13px] text-muted">The exercises are added after the ones already on that day.</p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setCopy(null)}>Close</button>
              <button type="submit" className="btn-gold flex-1" disabled={doCopy.isPending || (copy.other && !copy.fromPlan)}>Copy</button>
            </div>
          </form>
        )}
      </Sheet>
    </>
  )
}

function ExerciseForm({ plan, value, onDone }: { plan: WorkoutPlan; value: ItemForm; onDone: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const lists = useTrainingLists()
  const { data: exercises = [] } = useExercises()
  const [f, setF] = useState<ItemForm>(value)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof ItemForm) => (v: string) => setF((o) => ({ ...o, [k]: v }))
  const shown = useMemo(() => exercises.filter((e) => e.active && !e.hidden && (!f.exercise_type || e.exercise_type === f.exercise_type) && (!f.body_part || e.body_part === f.body_part)),
    [exercises, f.exercise_type, f.body_part])
  const save = useMutation({
    mutationFn: async (another: boolean) => {
      await saveWorkoutItem(plan.id, f.id, {
        day: f.day, seq: Number(f.seq) || 0, exercise_id: f.exercise_id || null, exercise_name: f.exercise_name.trim(),
        exercise_type: f.exercise_type || null, body_part: f.body_part || null, reps: f.reps ? Number(f.reps) : null, sets: f.sets ? Number(f.sets) : null,
        time: f.time ? Number(f.time) : null, time_unit: f.time_unit, weight_kg: f.weight_kg ? Number(f.weight_kg) : null, notes: f.notes.trim() || null,
      })
      return another
    },
    onSuccess: (another) => {
      qc.invalidateQueries({ queryKey: ['workout-plan', plan.id] })
      toast(f.id ? 'Exercise saved' : 'Exercise added')
      if (another) setF({ ...emptyItem(f.day, (Number(f.seq) || 0) + 1), exercise_type: f.exercise_type, body_part: f.body_part, sets: f.sets })
      else onDone()
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (another: boolean) => {
    setError(null)
    if (!f.exercise_name.trim()) return setError('Choose an exercise (or type its name).')
    if (!f.reps && !f.time && !f.sets) return setError('Enter reps, sets or time.')
    save.mutate(another)
  }
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
      <p className="m-0 text-[13px] text-muted">{plan.name} - Day {f.day} · {plan.days_per_week} Days a Week · Goal : {plan.goal} · Level : {plan.level}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Exercise Type" id="ex-type" hint="Select Exercise type you wish to add.">
          <Select id="ex-type" value={f.exercise_type} onChange={(v) => setF((o) => ({ ...o, exercise_type: v, exercise_id: '' }))} placeholder="Select exercise type" options={lists.types.map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="Body part" id="ex-part">
          <Select id="ex-part" value={f.body_part} onChange={(v) => setF((o) => ({ ...o, body_part: v, exercise_id: '' }))} placeholder="Select body part" options={lists.parts.map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="Exercise" required id="ex-name" className="sm:col-span-2" hint={`${shown.length} exercise${shown.length === 1 ? '' : 's'} match. Or type a custom name.`}>
          <SearchPick id="ex-name" items={shown} label={(e) => e.name} value={f.exercise_name} placeholder="Search exercise"
            render={(e) => <span className="flex flex-col"><span>{e.name}</span><span className="text-[12px] text-muted">{e.exercise_type} · {e.body_part}{e.studio_id ? ' · ours' : ''}</span></span>}
            onPick={(e) => setF((o) => ({ ...o, exercise_id: e.id, exercise_name: e.name, exercise_type: o.exercise_type || e.exercise_type, body_part: o.body_part || e.body_part }))} />
          <input type="text" className="sr-only" aria-hidden="true" tabIndex={-1} readOnly value={f.exercise_name} />
          <button type="button" className="link-btn mt-1 self-start text-[12px]" onClick={() => {
            const name = window.prompt('Custom exercise name', f.exercise_name)
            if (name) setF((o) => ({ ...o, exercise_id: '', exercise_name: name }))
          }}>Type a custom exercise</button>
        </Field>
        <Field label="Reps" id="ex-reps"><TextInput id="ex-reps" type="number" inputMode="numeric" value={f.reps} onChange={set('reps')} /></Field>
        <Field label="Sets" id="ex-sets"><TextInput id="ex-sets" type="number" inputMode="numeric" value={f.sets} onChange={set('sets')} /></Field>
        <div className="flex gap-2">
          <Field label="Time" id="ex-time" className="flex-1"><TextInput id="ex-time" type="number" inputMode="decimal" value={f.time} onChange={set('time')} /></Field>
          <Field label="Unit" id="ex-unit" className="w-28">
            <Select id="ex-unit" value={f.time_unit} onChange={set('time_unit')} options={[{ value: 'secs', label: 'Secs' }, { value: 'mins', label: 'Mins' }, { value: 'hours', label: 'Hours' }]} />
          </Field>
        </div>
        <Field label="Weight (kg)" id="ex-wt"><TextInput id="ex-wt" type="number" inputMode="decimal" value={f.weight_kg} onChange={set('weight_kg')} /></Field>
        <Field label="Sequence" id="ex-seq"><TextInput id="ex-seq" type="number" inputMode="numeric" value={f.seq} onChange={set('seq')} /></Field>
        <Field label="Note" id="ex-note"><TextInput id="ex-note" value={f.notes} onChange={set('notes')} placeholder="e.g. slow on the way down" /></Field>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        {!f.id && <button type="button" className="btn flex-1" disabled={save.isPending} onClick={() => submit(true)}>Save & add another</button>}
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : f.id ? 'Save' : 'Add Exercise'}</button>
      </div>
    </form>
  )
}

// Printable copy ------------------------------------------------------------------------------------
export function PrintWorkout() {
  const { id = '' } = useParams()
  const { data: studio } = useStudio()
  const rights = usePlanRights()
  const q = useQuery({ queryKey: ['workout-plan', id], queryFn: () => getWorkoutPlan(id) })
  useEffect(() => { if (q.data) document.title = `${q.data.plan.name} · Workout plan` }, [q.data])
  if (!q.data) return <Loading />
  const { plan, items } = q.data
  return (
    <div className="print-page mx-auto max-w-[820px] bg-white p-8 text-black">
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <Link to={`/workouts/${plan.id}/exercises`}>Back</Link>
        <button type="button" className="rounded-lg border px-4 py-2" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <h1 className="m-0 text-[26px] font-bold">{plan.name}</h1>
      <p className="mt-1 text-[14px]">{studioLine(studio)} · {plan.days_per_week} days a week · Goal: {plan.goal} · Level: {plan.level}{plan.trainer_id ? ` · Trainer: ${rights.trainerName(plan.trainer_id)}` : ''}</p>
      {plan.instructions && <p className="mt-2 rounded border border-gray-300 p-3 text-[14px]">{plan.instructions}</p>}
      {Array.from({ length: plan.days_per_week }, (_, i) => i + 1).map((d) => {
        const list = items.filter((x) => x.day === d)
        return (
          <section key={d} className="mt-5 break-inside-avoid">
            <h2 className="m-0 border-b border-gray-400 pb-1 text-[17px] font-bold">Day {d}</h2>
            {list.length === 0 ? <p className="text-[13px]">Rest</p> : (
              <table className="mt-2 w-full table-fixed border-collapse text-[13px]">
                <colgroup><col className="w-[32px]" /><col /><col className="w-[110px]" /><col className="w-[50px]" /><col className="w-[50px]" /><col className="w-[80px]" /></colgroup>
                <thead><tr className="text-left"><th className="py-1">#</th><th>Exercise</th><th>Body part</th><th>Sets</th><th>Reps</th><th>Time</th></tr></thead>
                <tbody>{list.map((x) => (
                  <tr key={x.id} className="border-t border-gray-200"><td className="py-1">{x.seq}</td><td>{x.exercise_name}{x.notes ? ` (${x.notes})` : ''}</td><td>{x.body_part ?? ''}</td>
                    <td>{x.sets ?? ''}</td><td>{x.reps ?? ''}</td><td>{x.time ? `${Number(x.time)} ${x.time_unit}` : ''}</td></tr>
                ))}</tbody>
              </table>
            )}
          </section>
        )
      })}
    </div>
  )
}
