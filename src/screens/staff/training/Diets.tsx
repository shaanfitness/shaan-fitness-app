import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import {
  clock, copyDietDay, deleteDietItem, dietDayLabel, dietForDay, getDietPlan, groupMeals, listDietPlans, saveDietItem, saveDietPlan, scaled, totals,
  type DietItem, type DietPlan, type Food, type Recipe,
} from '../../../db/training'
import { studioLine } from '../../../components/crud'
import { ActionMenu, Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../../components/controls'
import { useToast } from '../../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../../components/ui'
import { n1, SearchPick, useFoods, usePlanRights, useRecipes, useTrainingLists } from './common'
import { PlanListing, Steps } from './Workouts'

// YDL Workouts & Diet › My Diet Plans. YDL builds diet plans only in the coach app; here they can
// be made on the web too: Step 1 Basic Information, Step 2 Add Meals (every day, or a weekday
// that differs), copy a day, and a printable copy.

export const DietPlanList = () => <PlanListing kind="diet" />

const DAYS = [0, 1, 2, 3, 4, 5, 6, 7]

// Step 1 -----------------------------------------------------------------------------------------
export function DietPlanForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const lists = useTrainingLists()
  const rights = usePlanRights()
  const plan = useQuery({ queryKey: ['diet-plan', id], queryFn: () => getDietPlan(id!), enabled: !!id })
  const [f, setF] = useState({ name: '', goal: '', level: 'General', trainer_id: '', calories_target: '', instructions: '', is_public: false })
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const p = plan.data?.plan
    if (p) setF({ name: p.name, goal: p.goal, level: p.level, trainer_id: p.trainer_id ?? '', calories_target: p.calories_target ? String(p.calories_target) : '', instructions: p.instructions ?? '', is_public: p.is_public })
  }, [plan.data])
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((o) => ({ ...o, [k]: v }))
  const save = useMutation({
    mutationFn: async (next: boolean) => {
      const pid = await saveDietPlan(me.studioId, id ?? null, {
        name: f.name.trim(), goal: f.goal, level: f.level, trainer_id: f.trainer_id || null, calories_target: f.calories_target ? Math.round(Number(f.calories_target)) : null,
        instructions: f.instructions.trim() || null, is_public: f.is_public,
      })
      return { pid, next }
    },
    onSuccess: ({ pid, next }) => {
      qc.invalidateQueries({ queryKey: ['diet-plans'] }); qc.invalidateQueries({ queryKey: ['diet-plan', pid] })
      toast(id ? 'Diet plan saved' : 'Diet plan created')
      navigate(next ? `/diets/${pid}/meals` : '/diets')
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (next: boolean) => {
    setError(null)
    if (!f.name.trim()) return setError('Diet Plan Name is required.')
    if (!f.goal) return setError('Choose the customer\'s goal.')
    if (f.calories_target && !(Number(f.calories_target) > 0)) return setError('Calories a day should be a number, like 2000.')
    save.mutate(next)
  }
  if (id && plan.isLoading) return <Loading />
  if (id && plan.data && !rights.canEdit('diet', plan.data.plan)) {
    return <><PageHeader title="Diet Plan" /><div className="px-5 pt-5 lg:px-8"><Notice>Only the owner, front desk, or the coach who made this plan can change it.</Notice></div></>
  }
  return (
    <>
      <PageHeader title={id ? 'Edit Diet Plan' : 'Create Diet Plan'} actions={<Link to="/diets" className="btn btn-sm">Diet plans Listing</Link>} />
      <form className="flex max-w-[900px] flex-col gap-5 px-5 pt-5 pb-10 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(true) }}>
        <Steps step={1} planId={id} kind="diet" />
        <div className="card flex flex-col gap-5 p-5">
          <h2 className="m-0 text-[17px] font-bold">Diet Plan Basic Information</h2>
          <Field label="Diet Plan Name" required id="dp-name">
            <TextInput id="dp-name" value={f.name} onChange={set('name')} placeholder="e.g. 2000 kcal Fat Loss (Veg)" />
          </Field>
          <RadioGroup name="dp-goal" legend="Customer's Goal" required value={f.goal} onChange={set('goal')} options={lists.goals.map((g) => ({ value: g, label: g }))} />
          <RadioGroup name="dp-level" legend="Customer's Level" value={f.level} onChange={set('level')} options={lists.levels.map((g) => ({ value: g, label: g }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Assign By Trainer" id="dp-trainer">
              <Select id="dp-trainer" value={f.trainer_id} onChange={set('trainer_id')} placeholder="Select Trainer" options={rights.trainers.map((s) => ({ value: s.id, label: s.full_name }))} />
            </Field>
            <Field label="Calories a day" id="dp-kcal" hint="The target. The meals' total is shown against it.">
              <TextInput id="dp-kcal" type="number" inputMode="numeric" value={f.calories_target} onChange={set('calories_target')} placeholder="e.g. 2000" />
            </Field>
          </div>
          <Field label="Important Instruction" id="dp-ins">
            <TextArea id="dp-ins" value={f.instructions} onChange={set('instructions')} placeholder="Drink 3 to 4 litres of water a day…" />
          </Field>
          <RadioGroup name="dp-public" legend="Public Plan (members can browse it in the app)" value={f.is_public ? 'yes' : 'no'} onChange={(v) => set('is_public')(v === 'yes')}
            options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Link to="/diets" className="btn flex-1">Back</Link>
          <button type="button" className="btn flex-1" disabled={save.isPending} onClick={() => submit(false)}>Save</button>
          <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save & Next'}</button>
        </div>
      </form>
    </>
  )
}

// Step 2 -------------------------------------------------------------------------------------------
type ItemForm = {
  id: string | null; weekday: number; meal: string; meal_time: string; food_id: string; recipe_id: string; item_name: string; quantity: string; unit: string
  calories: string; protein: string; fats: string; carbs: string; fibre: string; notes: string; seq: number
}
const emptyItem = (weekday: number, meal: string, time: string, seq: number): ItemForm => ({
  id: null, weekday, meal, meal_time: time, food_id: '', recipe_id: '', item_name: '', quantity: '', unit: '', calories: '', protein: '', fats: '', carbs: '', fibre: '', notes: '', seq,
})
const fromItem = (i: DietItem): ItemForm => ({
  id: i.id, weekday: i.weekday, meal: i.meal, meal_time: i.meal_time?.slice(0, 5) ?? '', food_id: i.food_id ?? '', recipe_id: i.recipe_id ?? '', item_name: i.item_name,
  quantity: i.quantity?.toString() ?? '', unit: i.unit ?? '', calories: String(Number(i.calories)), protein: String(Number(i.protein)), fats: String(Number(i.fats)),
  carbs: String(Number(i.carbs)), fibre: String(Number(i.fibre)), notes: i.notes ?? '', seq: i.seq,
})

export function MacroLine({ t, target }: { t: ReturnType<typeof totals>; target?: number | null }) {
  return (
    <span className="text-[13px] text-muted">
      <b className="text-ink">{Math.round(t.calories)} kcal</b>{target ? ` of ${target}` : ''} · Protein {n1(t.protein)} g · Carbs {n1(t.carbs)} g · Fats {n1(t.fats)} g · Fibre {n1(t.fibre)} g
    </span>
  )
}

export function DietPlanMeals() {
  const { id = '' } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const rights = usePlanRights()
  const lists = useTrainingLists()
  const q = useQuery({ queryKey: ['diet-plan', id], queryFn: () => getDietPlan(id) })
  const plans = useQuery({ queryKey: ['diet-plans', me.studioId], queryFn: () => listDietPlans(me.studioId) })
  const [day, setDay] = useState(0)
  const [item, setItem] = useState<ItemForm | null>(null)
  const [copy, setCopy] = useState<null | { other: boolean; fromPlan: string; from: string; to: string }>(null)
  const del = useMutation({
    mutationFn: deleteDietItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diet-plan', id] }); toast('Item removed') },
    onError: (e: Error) => toast(e.message),
  })
  const doCopy = useMutation({
    mutationFn: (c: NonNullable<typeof copy>) => copyDietDay(id, c.other ? c.fromPlan : id, Number(c.from), Number(c.to)),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['diet-plan', id] }); setCopy(null); toast(`${n} item${n === 1 ? '' : 's'} copied`) },
    onError: (e: Error) => toast(e.message),
  })
  if (q.isLoading) return <Loading />
  if (q.error) return <div className="px-5 py-10 lg:px-8"><Notice tone="error">{(q.error as Error).message}</Notice></div>
  const { plan, items } = q.data!
  const can = rights.canEdit('diet', plan)
  const shown = dietForDay(items, day)
  const meals = groupMeals(shown, lists.meals)
  const dayTotal = totals(shown)
  const count = (d: number) => items.filter((i) => i.weekday === d).length
  return (
    <>
      <PageHeader title="Diet Plan Add Meals" sub={`${plan.name} · Goal : ${plan.goal} · Level : ${plan.level}${plan.calories_target ? ` · ${plan.calories_target} kcal a day` : ''}`}
        actions={<>
          <a className="btn btn-sm" href={`/print/diet/${plan.id}`} target="_blank" rel="noreferrer"><Icon name="doc" size={16} />Download PDF</a>
          {can && <button type="button" className="btn btn-sm" onClick={() => setCopy({ other: true, fromPlan: '', from: '0', to: String(day) })}>Copy from Diet Plan</button>}
          <Link to="/diets" className="btn btn-sm">Diet plans Listing</Link>
        </>} />
      <div className="flex flex-col gap-5 px-5 pt-5 pb-10 lg:px-8">
        <Steps step={2} planId={plan.id} kind="diet" />
        {!can && <Notice>You can view this plan. Only the owner, front desk, or the coach who made it can change it.</Notice>}
        {plan.instructions && <Notice>{plan.instructions}</Notice>}
        <div role="tablist" aria-label="Day" className="flex gap-1.5 overflow-x-auto pb-1">
          {DAYS.map((d) => (
            <button key={d} type="button" role="tab" aria-selected={day === d} onClick={() => setDay(d)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${day === d ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>
              {d === 0 ? 'Every day' : dietDayLabel(d).slice(0, 3)}{count(d) ? <span className="ml-1 opacity-70">{count(d)}</span> : null}
            </button>
          ))}
        </div>
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-[16px] font-bold">{dietDayLabel(day)}</h2>
            <MacroLine t={dayTotal} target={plan.calories_target} />
            {day > 0 && <span className="text-[12px] text-faint">Meals added for {dietDayLabel(day)} replace the same meal from Every day. Meals marked “Every day” carry over.</span>}
          </div>
          {can && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm" onClick={() => setCopy({ other: false, fromPlan: plan.id, from: day === 0 ? '1' : '0', to: String(day) })}>Copy from</button>
              <button type="button" className="btn-gold min-h-9 px-3 text-[13px]" onClick={() => setItem(emptyItem(day, lists.meals[0] ?? 'Breakfast', '', 1))}><Icon name="plus" size={16} />Add Meal</button>
            </div>
          )}
        </div>
        {meals.length === 0 && <p className="m-0 text-[14px] text-muted">No meals for {dietDayLabel(day)} yet.{can ? ' Add the first one.' : ''}</p>}
        {meals.map((m) => {
          const inherited = day > 0 && m.items.every((i) => i.weekday === 0)
          const t = totals(m.items)
          const nextSeq = (Math.max(0, ...m.items.map((i) => i.seq)) || 0) + 1
          return (
            <section key={m.meal} aria-labelledby={`meal-${m.meal}`} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div className="flex flex-col">
                  <h3 id={`meal-${m.meal}`} className="m-0 text-[15px] font-bold">{m.meal}{m.time && <span className="font-normal text-muted"> · {clock(m.time)}</span>}
                    {inherited && <span className="chip chip-muted ml-2 align-middle">Every day</span>}</h3>
                  <MacroLine t={t} />
                </div>
                {can && (
                  <button type="button" className="btn btn-sm" onClick={() => setItem(emptyItem(day, m.meal, m.time?.slice(0, 5) ?? '', inherited ? 1 : nextSeq))}>
                    <Icon name="plus" size={16} />{inherited ? `Change for ${dietDayLabel(day)}` : 'Add'}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto"><div className="min-w-[820px]">
                <table className="tbl table-fixed">
                  <caption className="sr-only">{m.meal}</caption>
                  <colgroup><col /><col className="w-[110px]" /><col className="w-[80px]" /><col className="w-[70px]" /><col className="w-[70px]" /><col className="w-[70px]" /><col className="w-[70px]" />{can && <col className="w-[110px]" />}</colgroup>
                  <thead><tr><th>Item</th><th>Quantity</th><th className="num">Calories</th><th className="num">Protein</th><th className="num">Carbs</th><th className="num">Fats</th><th className="num">Fibre</th>{can && <th>Action</th>}</tr></thead>
                  <tbody>{m.items.map((i) => (
                    <tr key={i.id}>
                      <td><span className="font-semibold">{i.item_name}</span>{i.recipe_id && <span className="chip chip-muted ml-1.5">Recipe</span>}{i.notes && <div className="text-[12px] text-muted">{i.notes}</div>}</td>
                      <td className="nowrap">{i.quantity ? `${Number(i.quantity)} ${i.unit ?? ''}` : '-'}</td>
                      <td className="num">{n1(i.calories)}</td><td className="num">{n1(i.protein)}</td><td className="num">{n1(i.carbs)}</td><td className="num">{n1(i.fats)}</td><td className="num">{n1(i.fibre)}</td>
                      {can && <td>{i.weekday === day ? <ActionMenu actions={[
                        { label: 'Edit', onClick: () => setItem(fromItem(i)) },
                        { label: 'Delete', danger: true, onClick: () => del.mutate(i.id) },
                      ]} /> : <span className="text-[12px] text-faint">Every day</span>}</td>}
                    </tr>
                  ))}</tbody>
                </table></div>
              </div>
            </section>
          )
        })}
        <div className="flex gap-2"><Link to={`/diets/${plan.id}/edit`} className="btn">Back</Link><Link to="/diets" className="btn-gold">Done</Link></div>
      </div>
      <Sheet wide open={!!item} onClose={() => setItem(null)} title={item?.id ? `Edit Item · ${dietDayLabel(item.weekday)}` : `Add Meal · ${dietDayLabel(item?.weekday ?? 0)}`}>
        {item && <MealItemForm plan={plan} value={item} onDone={() => setItem(null)} />}
      </Sheet>
      <Sheet open={!!copy} onClose={() => setCopy(null)} title={copy?.other ? 'Copy From Another Diet Plan' : 'Copy Meals for Day'}>
        {copy && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); doCopy.mutate(copy) }}>
            {copy.other && (
              <Field label="Copy From Diet Plan" required id="cp-plan">
                <Select id="cp-plan" value={copy.fromPlan} onChange={(v) => setCopy({ ...copy, fromPlan: v })} placeholder="Select Diet Plan"
                  options={(plans.data ?? []).filter((p) => p.id !== plan.id).map((p) => ({ value: p.id, label: p.name }))} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Copy From" required id="cp-from">
                <Select id="cp-from" value={copy.from} onChange={(v) => setCopy({ ...copy, from: v })} options={DAYS.map((d) => ({ value: String(d), label: dietDayLabel(d) }))} />
              </Field>
              <Field label="Copy To" required id="cp-to">
                <Select id="cp-to" value={copy.to} onChange={(v) => setCopy({ ...copy, to: v })} options={DAYS.map((d) => ({ value: String(d), label: dietDayLabel(d) }))} />
              </Field>
            </div>
            <p className="m-0 text-[13px] text-muted">The items are added after the ones already on that day.</p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setCopy(null)}>Close</button>
              <button type="submit" className="btn-gold flex-1" disabled={doCopy.isPending || (copy.other && !copy.fromPlan) || (!copy.other && copy.from === copy.to)}>Copy</button>
            </div>
          </form>
        )}
      </Sheet>
    </>
  )
}

type Pickable = { kind: 'food' | 'recipe'; row: Food | Recipe }

function MealItemForm({ plan, value, onDone }: { plan: DietPlan; value: ItemForm; onDone: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const lists = useTrainingLists()
  const { data: foods = [] } = useFoods()
  const { data: recipes = [] } = useRecipes()
  const [f, setF] = useState<ItemForm>(value)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof ItemForm) => (v: string) => setF((o) => ({ ...o, [k]: v }))
  const pick = useMemo<Pickable[]>(() => [
    ...recipes.filter((r) => r.active && (r.is_verified || !r.member_id)).map((row) => ({ kind: 'recipe' as const, row })),
    ...foods.filter((x) => x.active).map((row) => ({ kind: 'food' as const, row })),
  ], [foods, recipes])
  const base = f.food_id ? foods.find((x) => x.id === f.food_id) : f.recipe_id ? recipes.find((x) => x.id === f.recipe_id) : undefined
  // Macros follow the quantity while the item comes from the food list.
  const withMacros = (o: ItemForm, qty: string): ItemForm => {
    const b = o.food_id ? foods.find((x) => x.id === o.food_id) : o.recipe_id ? recipes.find((x) => x.id === o.recipe_id) : undefined
    if (!b || !(Number(qty) > 0)) return { ...o, quantity: qty }
    const m = scaled({ ...b, quantity: Number(b.quantity), calories: Number(b.calories), protein: Number(b.protein), fats: Number(b.fats), carbs: Number(b.carbs), fibre: Number(b.fibre) }, Number(qty))
    return { ...o, quantity: qty, calories: String(m.calories), protein: String(m.protein), fats: String(m.fats), carbs: String(m.carbs), fibre: String(m.fibre) }
  }
  const save = useMutation({
    mutationFn: async (another: boolean) => {
      await saveDietItem(plan.id, f.id, {
        weekday: f.weekday, meal: f.meal, meal_time: f.meal_time || null, seq: f.seq, food_id: f.food_id || null, recipe_id: f.recipe_id || null,
        item_name: f.item_name.trim(), quantity: f.quantity ? Number(f.quantity) : null, unit: f.unit.trim() || null,
        calories: Number(f.calories) || 0, protein: Number(f.protein) || 0, fats: Number(f.fats) || 0, carbs: Number(f.carbs) || 0, fibre: Number(f.fibre) || 0,
        notes: f.notes.trim() || null,
      })
      return another
    },
    onSuccess: (another) => {
      qc.invalidateQueries({ queryKey: ['diet-plan', plan.id] })
      toast(f.id ? 'Item saved' : 'Item added')
      if (another) setF(emptyItem(f.weekday, f.meal, f.meal_time, f.seq + 1))
      else onDone()
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (another: boolean) => {
    setError(null)
    if (!f.meal) return setError('Choose the meal.')
    if (!f.item_name.trim()) return setError('Choose a food or recipe (or type the item).')
    if (f.quantity && !(Number(f.quantity) > 0)) return setError('Quantity should be more than 0.')
    for (const k of ['calories', 'protein', 'fats', 'carbs', 'fibre'] as const) if (f[k] && !(Number(f[k]) >= 0)) return setError(`Check ${k}.`)
    save.mutate(another)
  }
  const mealOptions = [...new Set([...lists.meals, f.meal].filter(Boolean))]
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
      <p className="m-0 text-[13px] text-muted">{plan.name} · {dietDayLabel(f.weekday)}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Meal" required id="mi-meal">
          <Select id="mi-meal" value={f.meal} onChange={set('meal')} options={mealOptions.map((m) => ({ value: m, label: m }))} />
        </Field>
        <Field label="Time" id="mi-time" hint="Optional">
          <TextInput id="mi-time" type="time" value={f.meal_time} onChange={set('meal_time')} />
        </Field>
        <Field label="Food or Recipe" required id="mi-item" className="sm:col-span-2" hint="Search the food list, or type an item that isn't in it and fill in its values.">
          <SearchPick<Pickable> id="mi-item" items={pick} label={(p) => p.row.name} value={f.item_name} placeholder="Search food or recipe"
            render={(p) => (
              <span className="flex flex-col">
                <span>{p.row.name}{p.kind === 'recipe' && <span className="chip chip-muted ml-1.5">Recipe</span>}</span>
                <span className="text-[12px] text-muted">{Number(p.row.quantity)} {p.row.unit} · {n1(p.row.calories)} kcal · P {n1(p.row.protein)} · C {n1(p.row.carbs)} · F {n1(p.row.fats)}{p.row.is_veg ? '' : ' · Non-veg'}</span>
              </span>
            )}
            onPick={(p) => setF((o) => withMacros({ ...o, item_name: p.row.name, food_id: p.kind === 'food' ? p.row.id : '', recipe_id: p.kind === 'recipe' ? p.row.id : '',
              unit: p.row.unit }, String(Number(p.row.quantity))))} />
          <button type="button" className="link-btn mt-1 self-start text-[12px]" onClick={() => {
            const name = window.prompt('Item name', f.item_name)
            if (name) setF((o) => ({ ...o, item_name: name, food_id: '', recipe_id: '' }))
          }}>Type an item that isn't listed</button>
        </Field>
        <div className="flex gap-2 sm:col-span-2">
          <Field label="Quantity" id="mi-qty" className="flex-1"><TextInput id="mi-qty" type="number" inputMode="decimal" value={f.quantity} onChange={(v) => setF((o) => withMacros(o, v))} /></Field>
          <Field label="Unit" id="mi-unit" className="w-36">
            <Select id="mi-unit" value={f.unit} onChange={set('unit')} placeholder="Unit" options={[...new Set([...lists.units, f.unit].filter(Boolean))].map((u) => ({ value: u, label: u }))} />
          </Field>
        </div>
        {base && <p className="m-0 text-[12px] text-faint sm:col-span-2">{base.name}: {n1(base.calories)} kcal for {Number(base.quantity)} {base.unit}. The values below follow the quantity.</p>}
        <Field label="Calories (kcal)" id="mi-kcal"><TextInput id="mi-kcal" type="number" inputMode="decimal" value={f.calories} onChange={set('calories')} /></Field>
        <Field label="Protein (g)" id="mi-p"><TextInput id="mi-p" type="number" inputMode="decimal" value={f.protein} onChange={set('protein')} /></Field>
        <Field label="Carbs (g)" id="mi-c"><TextInput id="mi-c" type="number" inputMode="decimal" value={f.carbs} onChange={set('carbs')} /></Field>
        <Field label="Fats (g)" id="mi-f"><TextInput id="mi-f" type="number" inputMode="decimal" value={f.fats} onChange={set('fats')} /></Field>
        <Field label="Fibre (g)" id="mi-fb"><TextInput id="mi-fb" type="number" inputMode="decimal" value={f.fibre} onChange={set('fibre')} /></Field>
        <Field label="Note" id="mi-note"><TextInput id="mi-note" value={f.notes} onChange={set('notes')} placeholder="e.g. without sugar" /></Field>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        {!f.id && <button type="button" className="btn flex-1" disabled={save.isPending} onClick={() => submit(true)}>Save & add another</button>}
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : f.id ? 'Save' : 'Add Item'}</button>
      </div>
    </form>
  )
}

// Printable copy ------------------------------------------------------------------------------------
export function PrintDiet() {
  const { id = '' } = useParams()
  const { data: studio } = useStudio()
  const rights = usePlanRights()
  const lists = useTrainingLists()
  const q = useQuery({ queryKey: ['diet-plan', id], queryFn: () => getDietPlan(id) })
  useEffect(() => { if (q.data) document.title = `${q.data.plan.name} · Diet plan` }, [q.data])
  if (!q.data) return <Loading />
  const { plan, items } = q.data
  const days = DAYS.filter((d) => d === 0 || items.some((i) => i.weekday === d))
  return (
    <div className="print-page mx-auto max-w-[820px] bg-white p-8 text-black">
      <div className="mb-4 flex items-start justify-between gap-4 print:hidden">
        <Link to={`/diets/${plan.id}/meals`}>Back</Link>
        <button type="button" className="rounded-lg border px-4 py-2" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <h1 className="m-0 text-[26px] font-bold">{plan.name}</h1>
      <p className="mt-1 text-[14px]">{studioLine(studio)} · Goal: {plan.goal} · Level: {plan.level}{plan.calories_target ? ` · ${plan.calories_target} kcal a day` : ''}{plan.trainer_id ? ` · Trainer: ${rights.trainerName(plan.trainer_id)}` : ''}</p>
      {plan.instructions && <p className="mt-2 rounded border border-gray-300 p-3 text-[14px]">{plan.instructions}</p>}
      {days.map((d) => {
        const list = dietForDay(items, d)
        const t = totals(list)
        return (
          <section key={d} className="mt-5 break-inside-avoid">
            <h2 className="m-0 border-b border-gray-400 pb-1 text-[17px] font-bold">{dietDayLabel(d)} <span className="text-[13px] font-normal">· {Math.round(t.calories)} kcal · P {n1(t.protein)} g · C {n1(t.carbs)} g · F {n1(t.fats)} g</span></h2>
            {list.length === 0 ? <p className="text-[13px]">No meals</p> : groupMeals(list, lists.meals).map((m) => (
              <div key={m.meal} className="mt-2">
                <h3 className="m-0 text-[14px] font-bold">{m.meal}{m.time ? ` · ${clock(m.time)}` : ''}</h3>
                <table className="mt-1 w-full table-fixed border-collapse text-[13px]">
                  <colgroup><col /><col className="w-[90px]" /><col className="w-[80px]" /><col className="w-[56px]" /><col className="w-[56px]" /><col className="w-[56px]" /></colgroup>
                  <tbody>{m.items.map((x) => (
                    <tr key={x.id} className="border-t border-gray-200">
                      <td className="py-1">{x.item_name}{x.notes ? ` (${x.notes})` : ''}</td><td>{x.quantity ? `${Number(x.quantity)} ${x.unit ?? ''}` : ''}</td>
                      <td className="text-right">{n1(x.calories)} kcal</td><td className="text-right">P {n1(x.protein)}</td><td className="text-right">C {n1(x.carbs)}</td><td className="text-right">F {n1(x.fats)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
