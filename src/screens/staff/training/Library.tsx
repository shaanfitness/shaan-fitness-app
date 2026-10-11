import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import {
  importRecipes, saveExercise, saveFood, saveRecipe, setExerciseHidden, updateExercises, updateFoods, updateRecipes,
  type Exercise, type Food, type Recipe,
} from '../../../db/training'
import { downloadCsv, parseCsv } from '../../../lib/csv'
import { studioLine } from '../../../components/crud'
import { ActionMenu, Checkbox, Field, Notice, Select, TextArea, TextInput } from '../../../components/controls'
import { BulkBar, DataTable, Pager } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { Icon, PageHeader, Sheet } from '../../../components/ui'
import { n1, usePlanRights, useExercises, useFoods, useRecipes, useTrainingLists } from './common'

// YDL Workouts & Diet: Exercise List (the gym's own exercises and the General Exercise List with
// Exclude/Include in App), Verify Diet Food Listing, Recipe Listing (with Import Recipe) and
// Verify Client Diet Recipe.

const PAGE = 50

function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-[420px]">
      <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <TextInput small value={value} onChange={onChange} placeholder={placeholder} className="pl-9" ariaLabel={placeholder} />
    </div>
  )
}

type Confirm = { text: string; danger?: boolean; run: () => Promise<unknown>; done: string }
function useConfirm() {
  const toast = useToast()
  const [c, setC] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState(false)
  const sheet = (
    <Sheet open={!!c} onClose={() => setC(null)} title="Are you sure?">
      {c && (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px]">{c.text}</p>
          <div className="flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => setC(null)}>No</button>
            <button type="button" className={`btn flex-1 ${c.danger ? 'btn-danger' : ''}`} disabled={busy} onClick={async () => {
              setBusy(true)
              try { await c.run(); toast(c.done) } catch (e) { toast((e as Error).message) } finally { setBusy(false); setC(null) }
            }}>Yes</button>
          </div>
        </div>
      )}
    </Sheet>
  )
  return { ask: setC, sheet }
}

const inApp = (on: boolean) => (on ? <span className="chip chip-green">Included</span> : <span className="chip chip-muted">Excluded</span>)

// Exercise List ------------------------------------------------------------------------------------
type ExRow = Exercise & { hidden: boolean }

export function ExerciseList() {
  const me = useMe()
  const qc = useQueryClient()
  const lists = useTrainingLists()
  const { data: studio } = useStudio()
  const { data = [], isLoading } = useExercises()
  const [search, setSearch] = useState('')
  const [part, setPart] = useState('')
  const [ownSel, setOwnSel] = useState<Set<string>>(new Set())
  const [genSel, setGenSel] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [edit, setEdit] = useState<ExRow | 'new' | null>(null)
  const [view, setView] = useState<ExRow | null>(null)
  const { ask, sheet } = useConfirm()
  const match = (e: ExRow) => (!part || e.body_part === part) && (!search || `${e.name} ${e.exercise_type} ${e.body_part} ${e.equipment ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const own = data.filter((e) => e.studio_id && match(e))
  const general = data.filter((e) => !e.studio_id && match(e))
  const parts = [...new Set([...lists.parts, ...data.map((e) => e.body_part)])].sort()
  const refresh = () => qc.invalidateQueries({ queryKey: ['exercises'] })
  const ownBulk = (active: boolean | 'delete') => {
    const ids = [...ownSel]
    ask({
      text: active === 'delete' ? `ARE YOU SURE YOU WANT TO DELETE ${ids.length === 1 ? 'THIS EXERCISE' : 'THE SELECTED EXERCISES'} ?` : `${active ? 'Include' : 'Exclude'} ${ids.length} exercise${ids.length === 1 ? '' : 's'} ${active ? 'in' : 'from'} the app?`,
      danger: active === 'delete', done: active === 'delete' ? 'Exercises deleted' : active ? 'Included in the app' : 'Excluded from the app',
      run: async () => { await updateExercises(ids, active === 'delete' ? 'delete' : { active }); setOwnSel(new Set()); refresh() },
    })
  }
  const genBulk = (hidden: boolean) => {
    const ids = [...genSel]
    ask({
      text: `${hidden ? 'Exclude' : 'Include'} ${ids.length} exercise${ids.length === 1 ? '' : 's'} ${hidden ? 'from' : 'in'} the app? ${hidden ? 'Coaches and members won\'t see them.' : ''}`,
      done: hidden ? 'Excluded from the app' : 'Included in the app',
      run: async () => { await setExerciseHidden(me.studioId, ids, hidden); setGenSel(new Set()); refresh() },
    })
  }
  const generalPage = general.slice(page * PAGE, (page + 1) * PAGE)
  return (
    <>
      <PageHeader title="Exercise Listing" sub={studioLine(studio)}
        actions={<button type="button" className="btn-gold min-h-10 px-4" onClick={() => setEdit('new')}><Icon name="plus" size={18} />Add Exercise</button>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0) }} />
          <Select small ariaLabel="Body part" value={part} onChange={(v) => { setPart(v); setPage(0) }} placeholder="Select Body part" options={parts.map((p) => ({ value: p, label: p }))} className="w-48" />
        </div>
        <h2 className="m-0 text-[16px] font-bold">Our Exercises <span className="text-[13px] font-normal text-muted">· {own.length}</span></h2>
        <BulkBar count={ownSel.size} onClear={() => setOwnSel(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => ownBulk(false)}>Exclude in App</button>
          <button type="button" className="btn btn-sm" onClick={() => ownBulk(true)}>Include in App</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => ownBulk('delete')}>Delete</button>
        </BulkBar>
        <DataTable<ExRow> loading={isLoading} rows={own} rowKey={(r) => r.id} caption="Our exercises" selectable selected={ownSel} onSelect={setOwnSel}
          empty={search || part ? 'Nothing matches.' : 'No exercises of your own yet. The general list below is ready to use; add your own for anything it lacks.'}
          columns={[
            { key: 'name', header: 'Exercise Name', cell: (e) => <button type="button" className="link-btn font-semibold" onClick={() => setView(e)}>{e.name}</button> },
            { key: 'type', header: 'Exercise Type', cell: (e) => e.exercise_type },
            { key: 'part', header: 'Body Part', cell: (e) => e.body_part },
            { key: 'app', header: 'In App', cell: (e) => inApp(e.active) },
            { key: 'action', header: 'Action', width: 90, cell: (e) => <ActionMenu actions={[{ label: 'View', onClick: () => setView(e) }, { label: 'Edit', onClick: () => setEdit(e) }]} /> },
          ]}
          card={(e) => (
            <div className="flex items-start justify-between gap-3">
              <div><button type="button" className="link-btn font-semibold" onClick={() => setView(e)}>{e.name}</button><div className="text-[13px] text-muted">{e.exercise_type} · {e.body_part}</div><div className="mt-1">{inApp(e.active)}</div></div>
              <ActionMenu actions={[{ label: 'View', onClick: () => setView(e) }, { label: 'Edit', onClick: () => setEdit(e) }]} />
            </div>
          )} />
        <h2 className="m-0 mt-2 text-[16px] font-bold">General Exercise List <span className="text-[13px] font-normal text-muted">· {general.length}</span></h2>
        <BulkBar count={genSel.size} onClear={() => setGenSel(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => genBulk(true)}>Exclude in App</button>
          <button type="button" className="btn btn-sm" onClick={() => genBulk(false)}>Include in App</button>
        </BulkBar>
        <DataTable<ExRow> loading={isLoading} rows={generalPage} rowKey={(r) => r.id} caption="General exercise list" selectable selected={genSel} onSelect={setGenSel}
          empty="Nothing matches."
          columns={[
            { key: 'n', header: '#', width: 56, cell: (e) => general.indexOf(e) + 1 },
            { key: 'name', header: 'Exercise Name', cell: (e) => <button type="button" className="link-btn font-semibold" onClick={() => setView(e)}>{e.name}</button> },
            { key: 'type', header: 'Exercise Type', cell: (e) => e.exercise_type },
            { key: 'part', header: 'Body Part.', cell: (e) => e.body_part },
            { key: 'eq', header: 'Equipment', cell: (e) => e.equipment ?? '-' },
            { key: 'app', header: 'In App', cell: (e) => inApp(!e.hidden) },
          ]}
          card={(e) => (
            <div><button type="button" className="link-btn font-semibold" onClick={() => setView(e)}>{e.name}</button>
              <div className="text-[13px] text-muted">{e.exercise_type} · {e.body_part}{e.equipment ? ` · ${e.equipment}` : ''}</div><div className="mt-1">{inApp(!e.hidden)}</div></div>
          )} />
        <Pager page={page} pageSize={PAGE} total={general.length} onPage={setPage} />
      </div>
      <Sheet open={!!view} onClose={() => setView(null)} title="Exercise Preview">
        {view && (
          <div className="flex flex-col gap-3 text-[14px]">
            <dl className="m-0 grid grid-cols-[130px_1fr] gap-x-3 gap-y-2">
              <dt className="text-muted">Exercise Name</dt><dd className="m-0 font-semibold">{view.name}</dd>
              <dt className="text-muted">Exercise Type</dt><dd className="m-0">{view.exercise_type}</dd>
              <dt className="text-muted">Body Parts</dt><dd className="m-0">{view.body_part}</dd>
              <dt className="text-muted">Equipment</dt><dd className="m-0">{view.equipment || '-'}</dd>
              <dt className="text-muted">In App</dt><dd className="m-0">{inApp(view.studio_id ? view.active : !view.hidden)}</dd>
            </dl>
            <div><div className="eyebrow mb-1">Instructions</div><p className="m-0 whitespace-pre-wrap">{view.instructions || 'No instructions added.'}</p></div>
            {view.image_url ? <img src={view.image_url} alt={view.name} className="max-h-64 rounded-xl object-contain" /> : <p className="m-0 text-muted">No exercise image added.</p>}
            {view.video_url ? <a href={view.video_url} target="_blank" rel="noreferrer" className="link-btn self-start">Watch the video</a> : <p className="m-0 text-muted">No video URL added.</p>}
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setView(null)}>Back</button>
              {view.studio_id && <button type="button" className="btn-gold flex-1" onClick={() => { setEdit(view); setView(null) }}>Edit</button>}
            </div>
          </div>
        )}
      </Sheet>
      <Sheet wide open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add Exercise' : 'Edit Exercise'}>
        {edit && <ExerciseForm value={edit === 'new' ? null : edit} onDone={() => setEdit(null)} />}
      </Sheet>
      {sheet}
    </>
  )
}

function ExerciseForm({ value, onDone }: { value: ExRow | null; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const lists = useTrainingLists()
  const [f, setF] = useState({
    name: value?.name ?? '', exercise_type: value?.exercise_type ?? '', body_part: value?.body_part ?? '', equipment: value?.equipment ?? '',
    instructions: value?.instructions ?? '', image_url: value?.image_url ?? '', video_url: value?.video_url ?? '', active: value?.active ?? true,
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((o) => ({ ...o, [k]: v }))
  const save = useMutation({
    mutationFn: () => saveExercise(me.studioId, value?.id ?? null, {
      name: f.name.trim(), exercise_type: f.exercise_type, body_part: f.body_part, equipment: f.equipment.trim() || null, instructions: f.instructions.trim() || null,
      image_url: f.image_url.trim() || null, video_url: f.video_url.trim() || null, active: f.active,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exercises'] }); toast(value ? 'Exercise saved' : 'Exercise added'); onDone() },
    onError: (e: Error) => setError(/exercises_name_uq|duplicate/.test(e.message) ? 'An exercise with this name is already in your list.' : e.message),
  })
  const url = (s: string) => !s.trim() || /^https:\/\//i.test(s.trim())
  const submit = () => {
    setError(null)
    if (!f.name.trim()) return setError('Exercise Name is required.')
    if (!f.exercise_type) return setError('Choose the exercise type.')
    if (!f.body_part) return setError('Choose the body part.')
    if (!url(f.image_url) || !url(f.video_url)) return setError('Image and video links should start with https://')
    save.mutate()
  }
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Exercise Name" required id="xf-name" className="sm:col-span-2"><TextInput id="xf-name" value={f.name} onChange={set('name')} placeholder="e.g. Barbell Floor Hip Thrusts" /></Field>
        <Field label="Exercise Type" required id="xf-type">
          <Select id="xf-type" value={f.exercise_type} onChange={set('exercise_type')} placeholder="Select exercise type" options={[...new Set([...lists.types, f.exercise_type].filter(Boolean))].map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="Body Part" required id="xf-part">
          <Select id="xf-part" value={f.body_part} onChange={set('body_part')} placeholder="Select body part" options={[...new Set([...lists.parts, f.body_part].filter(Boolean))].map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="Equipment" id="xf-eq"><TextInput id="xf-eq" value={f.equipment} onChange={set('equipment')} placeholder="e.g. Barbell, Bench" /></Field>
        <Field label="Exercise Video URL" id="xf-video"><TextInput id="xf-video" type="url" value={f.video_url} onChange={set('video_url')} placeholder="https://youtube.com/…" /></Field>
        <Field label="Exercise Image (link)" id="xf-img" className="sm:col-span-2"><TextInput id="xf-img" type="url" value={f.image_url} onChange={set('image_url')} placeholder="https://… (a picture or GIF)" /></Field>
        <Field label="Description, instructions and tips" id="xf-ins" className="sm:col-span-2">
          <TextArea id="xf-ins" rows={4} value={f.instructions} onChange={set('instructions')} placeholder="How to do it, the benefits, and tips." />
        </Field>
      </div>
      <Checkbox checked={f.active} onChange={set('active')} label="Include in App (coaches and members can pick it)" />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

// Diet Food Listing ----------------------------------------------------------------------------------
const macroCols = <T extends { calories: number; protein: number; fats: number; carbs: number; fibre: number }>() => [
  { key: 'p', header: 'Proteins In gm', className: 'num', cell: (r: T) => n1(r.protein) },
  { key: 'f', header: 'Fats In gm', className: 'num', cell: (r: T) => n1(r.fats) },
  { key: 'c', header: 'Carbs In gm', className: 'num', cell: (r: T) => n1(r.carbs) },
  { key: 'fb', header: 'Fibers In gm', className: 'num', cell: (r: T) => n1(r.fibre) },
  { key: 'kcal', header: 'Calorie', className: 'num', cell: (r: T) => n1(r.calories) },
]
const yesNo = (v: boolean, yes = 'Yes', no = 'No') => (v ? <span className="chip chip-green">{yes}</span> : <span className="chip chip-muted">{no}</span>)
const macroLine = (r: { quantity: number; unit: string; calories: number; protein: number; fats: number; carbs: number; fibre: number }) =>
  `${Number(r.quantity)} ${r.unit} · ${n1(r.calories)} kcal · P ${n1(r.protein)} · F ${n1(r.fats)} · C ${n1(r.carbs)} · Fibre ${n1(r.fibre)}`

export function FoodList() {
  const qc = useQueryClient()
  const rights = usePlanRights()
  const { data: studio } = useStudio()
  const { data = [], isLoading } = useFoods()
  const [tab, setTab] = useState<'ours' | 'general'>('ours')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [edit, setEdit] = useState<Food | 'new' | null>(null)
  const { ask, sheet } = useConfirm()
  const rows = data.filter((f) => (tab === 'ours' ? !!f.studio_id : !f.studio_id) && (!search || f.name.toLowerCase().includes(search.toLowerCase())))
  const pageRows = rows.slice(page * PAGE, (page + 1) * PAGE)
  const ids = [...selected]
  const bulk = (change: 'delete' | { is_verified: boolean }) => ask({
    text: change === 'delete' ? `ARE YOU SURE YOU WANT TO DELETE ${ids.length === 1 ? 'THIS FOOD' : 'THE SELECTED FOODS'} ?` : `Mark ${ids.length} food${ids.length === 1 ? '' : 's'} as ${change.is_verified ? 'verified' : 'not verified'}?`,
    danger: change === 'delete', done: change === 'delete' ? 'Foods deleted' : 'Foods updated',
    run: async () => { await updateFoods(ids, change); setSelected(new Set()); qc.invalidateQueries({ queryKey: ['foods'] }) },
  })
  const ours = tab === 'ours'
  return (
    <>
      <PageHeader title="Diet Food Listing" sub={studioLine(studio)}
        actions={<button type="button" className="btn-gold min-h-10 px-4" onClick={() => setEdit('new')}><Icon name="plus" size={18} />Add Food</button>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <div role="tablist" aria-label="Food list" className="flex gap-1.5">
          {(['ours', 'general'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setSelected(new Set()); setPage(0) }}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${tab === t ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>
              {t === 'ours' ? 'Added by your gym and clients' : 'General food list'}
            </button>
          ))}
        </div>
        <p className="m-0 text-[13px] text-muted">{ours
          ? 'Foods your coaches add while making diets. Check the values, then mark them verified; unverified foods show a warning to coaches.'
          : 'Common Indian foods with typical values, ready to use in diets. Add your own if you need a different value.'}</p>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0) }} />
        {ours && (
          <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
            {rights.desk && <button type="button" className="btn btn-sm" onClick={() => bulk({ is_verified: true })}>Mark Verified</button>}
            {rights.desk && <button type="button" className="btn btn-sm" onClick={() => bulk({ is_verified: false })}>Mark Not Verified</button>}
            <button type="button" className="btn btn-sm btn-danger" onClick={() => bulk('delete')}>Delete</button>
          </BulkBar>
        )}
        <DataTable<Food> loading={isLoading} rows={pageRows} rowKey={(r) => r.id} caption="Foods" selectable={ours} selected={selected} onSelect={setSelected}
          empty={search ? 'Nothing matches.' : ours ? 'No foods added yet.' : 'No foods.'}
          columns={[
            { key: 'name', header: 'Item Name', cell: (r) => <span className="font-semibold">{r.name}</span> },
            { key: 'q', header: 'Quantity', className: 'num', cell: (r) => Number(r.quantity) },
            { key: 'u', header: 'Quantity Units', cell: (r) => r.unit },
            ...macroCols<Food>(),
            { key: 'veg', header: 'Is Veg', cell: (r) => yesNo(r.is_veg, 'Veg', 'Non-veg') },
            { key: 'ver', header: 'Is Verified', cell: (r) => yesNo(r.is_verified) },
            ...(ours ? [{ key: 'a', header: 'Action', width: 80, cell: (r: Food) => <button type="button" className="btn btn-sm" onClick={() => setEdit(r)}>Edit</button> }] : []),
          ]}
          card={(r) => (
            <div className="flex items-start justify-between gap-3">
              <div><span className="font-semibold">{r.name}</span><div className="text-[13px] text-muted">{macroLine(r)}</div>
                <div className="mt-1 flex gap-1.5">{yesNo(r.is_veg, 'Veg', 'Non-veg')}{yesNo(r.is_verified, 'Verified', 'Not verified')}</div></div>
              {ours && <button type="button" className="btn btn-sm" onClick={() => setEdit(r)}>Edit</button>}
            </div>
          )} />
        <Pager page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
      </div>
      <Sheet wide open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add Food' : 'Edit Food'}>
        {edit && <FoodForm value={edit === 'new' ? null : edit} desk={rights.desk} onDone={() => setEdit(null)} />}
      </Sheet>
      {sheet}
    </>
  )
}

type MacroForm = { name: string; quantity: string; unit: string; calories: string; protein: string; fats: string; carbs: string; fibre: string; is_veg: boolean }
const macroForm = (r: Partial<Food | Recipe> | null, unit: string, qty: string): MacroForm => ({
  name: r?.name ?? '', quantity: r?.quantity ? String(Number(r.quantity)) : qty, unit: r?.unit ?? unit, calories: r?.calories != null ? String(Number(r.calories)) : '',
  protein: r?.protein != null ? String(Number(r.protein)) : '', fats: r?.fats != null ? String(Number(r.fats)) : '', carbs: r?.carbs != null ? String(Number(r.carbs)) : '',
  fibre: r?.fibre != null ? String(Number(r.fibre)) : '', is_veg: r?.is_veg ?? true,
})
const macroValues = (f: MacroForm) => ({
  name: f.name.trim(), quantity: Number(f.quantity), unit: f.unit, calories: Number(f.calories) || 0, protein: Number(f.protein) || 0,
  fats: Number(f.fats) || 0, carbs: Number(f.carbs) || 0, fibre: Number(f.fibre) || 0, is_veg: f.is_veg,
})
function checkMacros(f: MacroForm): string | null {
  if (!f.name.trim()) return 'Item Name is required.'
  if (!(Number(f.quantity) > 0)) return 'Quantity should be more than 0.'
  if (!f.unit) return 'Choose the unit.'
  for (const k of ['calories', 'protein', 'fats', 'carbs', 'fibre'] as const) if (f[k] !== '' && !(Number(f[k]) >= 0)) return `Check ${k}.`
  return null
}
function MacroFields({ f, set, prefix }: { f: MacroForm; set: (k: keyof MacroForm) => (v: string | boolean) => void; prefix: string }) {
  const lists = useTrainingLists()
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Field label="Item Name" required id={`${prefix}-name`} className="col-span-2 sm:col-span-4"><TextInput id={`${prefix}-name`} value={f.name} onChange={set('name')} /></Field>
      <Field label="Quantity" required id={`${prefix}-q`}><TextInput id={`${prefix}-q`} type="number" inputMode="decimal" value={f.quantity} onChange={set('quantity')} /></Field>
      <Field label="Quantity Units" required id={`${prefix}-u`}>
        <Select id={`${prefix}-u`} value={f.unit} onChange={set('unit')} options={[...new Set([...lists.units, 'pieces', f.unit].filter(Boolean))].map((u) => ({ value: u, label: u }))} />
      </Field>
      <Field label="Calorie" id={`${prefix}-kcal`}><TextInput id={`${prefix}-kcal`} type="number" inputMode="decimal" value={f.calories} onChange={set('calories')} /></Field>
      <Field label="Proteins In gm" id={`${prefix}-p`}><TextInput id={`${prefix}-p`} type="number" inputMode="decimal" value={f.protein} onChange={set('protein')} /></Field>
      <Field label="Fats In gm" id={`${prefix}-f`}><TextInput id={`${prefix}-f`} type="number" inputMode="decimal" value={f.fats} onChange={set('fats')} /></Field>
      <Field label="Carbs In gm" id={`${prefix}-c`}><TextInput id={`${prefix}-c`} type="number" inputMode="decimal" value={f.carbs} onChange={set('carbs')} /></Field>
      <Field label="Fibers In gm" id={`${prefix}-fb`}><TextInput id={`${prefix}-fb`} type="number" inputMode="decimal" value={f.fibre} onChange={set('fibre')} /></Field>
      <div className="col-span-2 flex items-end sm:col-span-1"><Checkbox checked={f.is_veg} onChange={set('is_veg')} label="Is Veg" /></div>
    </div>
  )
}

function FoodForm({ value, desk, onDone }: { value: Food | null; desk: boolean; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [f, setF] = useState<MacroForm>(macroForm(value, 'g', '100'))
  const [verified, setVerified] = useState(value?.is_verified ?? desk)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof MacroForm) => (v: string | boolean) => setF((o) => ({ ...o, [k]: v }))
  const save = useMutation({
    mutationFn: () => saveFood(me.studioId, value?.id ?? null, { ...macroValues(f), ...(desk ? { is_verified: verified } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['foods'] }); toast(value ? 'Food saved' : 'Food added'); onDone() },
    onError: (e: Error) => setError(/foods_name_uq|duplicate/.test(e.message) ? 'A food with this name is already in your list.' : e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); const err = checkMacros(f); setError(err); if (!err) save.mutate() }}>
      <p className="m-0 text-[13px] text-muted">Values are for the quantity you enter, e.g. 100 g, or 1 piece.</p>
      <MacroFields f={f} set={set} prefix="ff" />
      {desk ? <Checkbox checked={verified} onChange={setVerified} label="Is Verified (the values are checked)" /> : <Notice>The owner or front desk verifies foods you add.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

// Recipes --------------------------------------------------------------------------------------------
const prep = (r: Recipe) => (r.prep_time_mins ? `${r.prep_time_mins} mins` : '-')

export function RecipeList() {
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const { data = [], isLoading } = useRecipes()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [edit, setEdit] = useState<Recipe | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const { ask, sheet } = useConfirm()
  const rows = data.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))
  const ids = [...selected]
  const bulk = (verb: 'DELETE' | 'DEACTIVATE' | 'ACTIVATE') => ask({
    text: `ARE YOU SURE YOU WANT TO ${verb} ${ids.length === 1 ? 'THIS RECIPE' : 'THE SELECTED RECIPES'} ?`, danger: verb === 'DELETE',
    done: `${ids.length} recipe${ids.length === 1 ? '' : 's'} ${verb === 'DELETE' ? 'deleted' : verb === 'ACTIVATE' ? 'activated' : 'deactivated'}`,
    run: async () => { await updateRecipes(ids, verb === 'DELETE' ? 'delete' : { active: verb === 'ACTIVATE' }); setSelected(new Set()); qc.invalidateQueries({ queryKey: ['recipes'] }) },
  })
  return (
    <>
      <PageHeader title="Recipe Listing" sub={studioLine(studio)}
        actions={<>
          <button type="button" className="btn btn-sm" onClick={() => setImporting(true)}>Import Recipe</button>
          <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setEdit('new')}><Icon name="plus" size={18} />Add Recipe</button>
        </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <SearchBox value={search} onChange={setSearch} />
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => bulk('DELETE')}>Delete</button>
          <button type="button" className="btn btn-sm" onClick={() => bulk('DEACTIVATE')}>Deactivate</button>
          <button type="button" className="btn btn-sm" onClick={() => bulk('ACTIVATE')}>Activate</button>
        </BulkBar>
        <DataTable<Recipe> loading={isLoading} rows={rows} rowKey={(r) => r.id} caption="Recipes" selectable selected={selected} onSelect={setSelected}
          empty={search ? 'Nothing matches.' : 'No recipes yet. Add one, or import a list.'}
          columns={[
            { key: 'name', header: 'Item Name', cell: (r) => <button type="button" className="link-btn font-semibold" onClick={() => setEdit(r)}>{r.name}</button> },
            { key: 'kcal', header: 'Calories', className: 'num', cell: (r) => n1(r.calories) },
            { key: 'prep', header: 'Prep Time', cell: prep },
            { key: 'veg', header: 'Veg', cell: (r) => yesNo(r.is_veg, 'Veg', 'Non-veg') },
            { key: 'by', header: 'Added by', cell: (r) => (r.member_id ? <span className="chip chip-muted">Client</span> : 'Gym') },
            { key: 'status', header: 'Status', cell: (r) => (r.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>) },
          ]}
          card={(r) => (
            <div>
              <button type="button" className="link-btn font-semibold" onClick={() => setEdit(r)}>{r.name}</button>
              <div className="text-[13px] text-muted">{n1(r.calories)} kcal · Prep {prep(r)}</div>
              <div className="mt-1 flex gap-1.5">{r.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>}{yesNo(r.is_veg, 'Veg', 'Non-veg')}</div>
            </div>
          )} />
      </div>
      <Sheet wide open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add Recipe' : 'Recipe'}>
        {edit && <RecipeForm value={edit === 'new' ? null : edit} onDone={() => setEdit(null)} />}
      </Sheet>
      <Sheet open={importing} onClose={() => setImporting(false)} title="Import Recipe">
        {importing && <RecipeImport onDone={() => setImporting(false)} />}
      </Sheet>
      {sheet}
    </>
  )
}

function RecipeForm({ value, onDone }: { value: Recipe | null; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [f, setF] = useState<MacroForm>(macroForm(value, 'serving', '1'))
  const [x, setX] = useState({
    prep: value?.prep_time_mins?.toString() ?? '', ingredients: value?.ingredients ?? '', method: value?.method ?? '', notes: value?.notes ?? '',
    image_url: value?.image_url ?? '', pdf_url: value?.pdf_url ?? '', active: value?.active ?? true,
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof MacroForm) => (v: string | boolean) => setF((o) => ({ ...o, [k]: v }))
  const setx = (k: keyof typeof x) => (v: string | boolean) => setX((o) => ({ ...o, [k]: v }))
  const save = useMutation({
    mutationFn: () => saveRecipe(me.studioId, value?.id ?? null, {
      ...macroValues(f), prep_time_mins: x.prep ? Math.round(Number(x.prep)) : null, ingredients: x.ingredients.trim() || null, method: x.method.trim() || null,
      notes: x.notes.trim() || null, image_url: x.image_url.trim() || null, pdf_url: x.pdf_url.trim() || null, active: x.active,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast(value ? 'Recipe saved' : 'Recipe added'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  const url = (s: string) => !s.trim() || /^https:\/\//i.test(s.trim())
  const submit = () => {
    const err = checkMacros(f) ?? (x.prep && !(Number(x.prep) >= 0) ? 'Prep time should be minutes, like 15.' : null)
      ?? (!url(x.image_url) || !url(x.pdf_url) ? 'Image and PDF links should start with https://' : null)
    setError(err)
    if (!err) save.mutate()
  }
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      {value?.member_id && <Notice>A client added this recipe. {value.is_verified ? 'It is verified.' : 'It waits for the owner or front desk to verify it.'}</Notice>}
      <MacroFields f={f} set={set} prefix="rf" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Prep Time (minutes)" id="rf-prep"><TextInput id="rf-prep" type="number" inputMode="numeric" value={x.prep} onChange={setx('prep')} /></Field>
        <Field label="Image (link)" id="rf-img"><TextInput id="rf-img" type="url" value={x.image_url} onChange={setx('image_url')} placeholder="https://…" /></Field>
        <Field label="Ingredients" id="rf-ing" className="sm:col-span-2"><TextArea id="rf-ing" rows={4} value={x.ingredients} onChange={setx('ingredients')} placeholder="One per line" /></Field>
        <Field label="Instructions" id="rf-method" className="sm:col-span-2"><TextArea id="rf-method" rows={4} value={x.method} onChange={setx('method')} placeholder="1. …" /></Field>
        <Field label="Notes" id="rf-notes"><TextInput id="rf-notes" value={x.notes} onChange={setx('notes')} /></Field>
        <Field label="PDF Link" id="rf-pdf"><TextInput id="rf-pdf" type="url" value={x.pdf_url} onChange={setx('pdf_url')} placeholder="https://…" /></Field>
      </div>
      <Checkbox checked={x.active} onChange={setx('active')} label="Active (coaches can use it in diets; members see it once verified)" />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

const CSV_HEAD = ['Item Name', 'Quantity', 'Quantity Units', 'Proteins In gm', 'Fats In gm', 'Carbs In gm', 'Fibers In gm', 'Calorie', 'Prep Time', 'Ingredients', 'Instructions', 'Is Veg']

function RecipeImport({ onDone }: { onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const file = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Partial<Recipe>[] | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const read = async (fl: File) => {
    const cells = parseCsv(await fl.text())
    const head = (cells[0] ?? []).map((h) => h.trim().toLowerCase())
    const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)))
    const c = {
      name: col('item name', 'name'), q: col('quantity'), u: col('quantity units', 'unit'), p: col('proteins', 'protein'), f: col('fats', 'fat'), carbs: col('carbs'),
      fibre: col('fibers', 'fibre', 'fiber'), kcal: col('calorie'), prep: col('prep'), ing: col('ingredients'), method: col('instructions', 'method'), veg: col('is veg', 'veg'),
    }
    // "quantity units" also starts with "quantity": take the exact one for the number.
    c.q = head.indexOf('quantity')
    const out: Partial<Recipe>[] = []
    const bad: string[] = []
    if (c.name < 0) { setRows([]); setProblems(['The first row should have the column names, starting with "Item Name".']); return }
    cells.slice(1).forEach((r, i) => {
      const get = (k: number) => (k >= 0 ? (r[k] ?? '').trim() : '')
      const num = (k: number) => { const v = get(k); return v === '' ? 0 : Number(v) }
      const name = get(c.name)
      if (!name) return
      const vals = { quantity: get(c.q) ? Number(get(c.q)) : 1, calories: num(c.kcal), protein: num(c.p), fats: num(c.f), carbs: num(c.carbs), fibre: num(c.fibre) }
      if (Object.values(vals).some((v) => !(v >= 0)) || !(vals.quantity > 0)) { bad.push(`Row ${i + 2} (${name}): check the numbers`); return }
      const prepMins = get(c.prep) ? Number.parseInt(get(c.prep), 10) : null
      out.push({ name, unit: get(c.u) || 'serving', ...vals, prep_time_mins: Number.isFinite(prepMins) ? prepMins : null, ingredients: get(c.ing) || null, method: get(c.method) || null,
        is_veg: !/^(no|n|0|false|non[- ]?veg)$/i.test(get(c.veg)) })
    })
    setRows(out); setProblems(bad)
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[14px]">Upload a CSV file with these columns: {CSV_HEAD.join(', ')}. Values are for the quantity given.</p>
      <button type="button" className="btn btn-sm self-start" onClick={() => downloadCsv('recipes-sample.csv', [{}], CSV_HEAD.map((h, i) => [h, () => ['Moong Dal Chilla', 2, 'pieces', 12, 6, 30, 5, 230, 20, 'Moong dal, onion, chilli', 'Soak, grind, cook on a tawa', 'Yes'][i]] as [string, () => unknown]))}>
        Download a sample file
      </button>
      <input ref={file} type="file" accept=".csv,text/csv" className="text-[14px]" aria-label="Recipe CSV file" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) void read(fl) }} />
      {rows && <Notice tone={rows.length ? 'success' : 'warn'}>{rows.length} recipe{rows.length === 1 ? '' : 's'} ready to import.</Notice>}
      {problems.length > 0 && <Notice tone="error">{problems.slice(0, 8).join('. ')}{problems.length > 8 ? ` and ${problems.length - 8} more` : ''}.</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="button" className="btn-gold flex-1" disabled={busy || !rows?.length} onClick={async () => {
          setBusy(true)
          try { const n = await importRecipes(me.studioId, rows!); qc.invalidateQueries({ queryKey: ['recipes'] }); toast(`${n} recipe${n === 1 ? '' : 's'} imported`); onDone() }
          catch (e) { setProblems([(e as Error).message]) } finally { setBusy(false) }
        }}>{busy ? 'Importing…' : 'Import'}</button>
      </div>
    </div>
  )
}

export function RecipeVerify() {
  const qc = useQueryClient()
  const rights = usePlanRights()
  const { data: studio } = useStudio()
  const { data = [], isLoading } = useRecipes()
  const [show, setShow] = useState<'all' | 'yes' | 'no'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [view, setView] = useState<Recipe | null>(null)
  const toast = useToast()
  const { ask, sheet } = useConfirm()
  const rows = useMemo(() => data.filter((r) => (show === 'all' || r.is_verified === (show === 'yes')) && (!search || r.name.toLowerCase().includes(search.toLowerCase()))), [data, show, search])
  const ids = [...selected]
  const bulk = (verb: 'Approve' | 'Disapprove' | 'Delete') => ask({
    text: verb === 'Delete' ? `ARE YOU SURE YOU WANT TO DELETE ${ids.length === 1 ? 'THIS RECIPE' : 'THE SELECTED RECIPES'} ?` : `${verb} ${ids.length} recipe${ids.length === 1 ? '' : 's'}?${verb === 'Approve' ? ' Members will see them in the app.' : ''}`,
    danger: verb === 'Delete', done: `${ids.length} recipe${ids.length === 1 ? '' : 's'} ${verb === 'Delete' ? 'deleted' : verb === 'Approve' ? 'approved' : 'disapproved'}`,
    run: async () => { await updateRecipes(ids, verb === 'Delete' ? 'delete' : { is_verified: verb === 'Approve' }); setSelected(new Set()); qc.invalidateQueries({ queryKey: ['recipes'] }) },
  })
  const media = (r: Recipe): ReactNode => (r.image_url ? <a href={r.image_url} target="_blank" rel="noreferrer" className="link-btn">View</a> : '-')
  return (
    <>
      <PageHeader title="Verify Client Diet Recipe" sub={studioLine(studio)} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} />
          <Select small ariaLabel="Show" value={show} onChange={(v) => setShow(v as typeof show)} className="w-56"
            options={[{ value: 'all', label: 'Show-All Recipe' }, { value: 'yes', label: 'Verified Recipe' }, { value: 'no', label: 'Non Verified Recipe' }]} />
        </div>
        {!rights.desk && <Notice>The owner or front desk approves recipes. You can view them here.</Notice>}
        {rights.desk && (
          <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => bulk('Delete')}>Delete</button>
            <button type="button" className="btn btn-sm" onClick={() => bulk('Disapprove')}>Disapprove</button>
            <button type="button" className="btn btn-sm btn-gold" onClick={() => bulk('Approve')}>Approve</button>
          </BulkBar>
        )}
        <DataTable<Recipe> loading={isLoading} rows={rows} rowKey={(r) => r.id} caption="Recipes to verify" selectable={rights.desk} selected={selected} onSelect={setSelected}
          empty="No recipes here."
          columns={[
            { key: 'name', header: 'Item Name', className: 'min-w-[160px]', cell: (r) => <button type="button" className="link-btn text-left font-semibold" onClick={() => setView(r)}>{r.name}</button> },
            { key: 'q', header: 'Quantity', className: 'nowrap', cell: (r) => `${Number(r.quantity)} ${r.unit}` },
            ...macroCols<Recipe>(),
            { key: 'notes', header: 'Notes', cell: (r) => (r.ingredients || r.method || r.notes ? <button type="button" className="link-btn" onClick={() => setView(r)}>Read</button> : '-') },
            { key: 'pdf', header: 'PDFLink', cell: (r) => (r.pdf_url ? <a href={r.pdf_url} target="_blank" rel="noreferrer" className="link-btn">Open</a> : '-') },
            { key: 'prep', header: 'PrepTime', cell: prep },
            { key: 'img', header: 'Image', cell: media },
            { key: 'veg', header: 'Is Veg', cell: (r) => yesNo(r.is_veg, 'Veg', 'Non-veg') },
            { key: 'by', header: 'Added by', cell: (r) => (r.member_id ? 'Client' : 'Gym') },
            { key: 'ver', header: 'Is Verified', cell: (r) => yesNo(r.is_verified) },
          ]}
          card={(r) => (
            <div>
              <button type="button" className="link-btn font-semibold" onClick={() => setView(r)}>{r.name}</button>
              <div className="text-[13px] text-muted">{macroLine(r)}</div>
              <div className="mt-1 flex gap-1.5">{yesNo(r.is_verified, 'Verified', 'Not verified')}{yesNo(r.is_veg, 'Veg', 'Non-veg')}{r.member_id && <span className="chip chip-muted">Client</span>}</div>
            </div>
          )} />
      </div>
      <Sheet open={!!view} onClose={() => setView(null)} title={view?.name ?? 'Recipe'}>
        {view && (
          <div className="flex flex-col gap-3 text-[14px]">
            <p className="m-0 text-muted">{macroLine(view)} · Prep {prep(view)}</p>
            {view.image_url && <img src={view.image_url} alt={view.name} className="max-h-64 rounded-xl object-contain" />}
            {view.ingredients && <div><div className="eyebrow mb-1">Ingredients</div><p className="m-0 whitespace-pre-wrap">{view.ingredients}</p></div>}
            {view.method && <div><div className="eyebrow mb-1">Instructions</div><p className="m-0 whitespace-pre-wrap">{view.method}</p></div>}
            {view.notes && <div><div className="eyebrow mb-1">Notes</div><p className="m-0 whitespace-pre-wrap">{view.notes}</p></div>}
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setView(null)}>Close</button>
              {rights.desk && (
                <button type="button" className="btn-gold flex-1" onClick={async () => {
                  try { await updateRecipes([view.id], { is_verified: !view.is_verified }); qc.invalidateQueries({ queryKey: ['recipes'] }); toast(view.is_verified ? 'Recipe disapproved' : 'Recipe approved') }
                  catch (e) { toast((e as Error).message) } finally { setView(null) }
                }}>{view.is_verified ? 'Disapprove' : 'Approve'}</button>
              )}
            </div>
          </div>
        )}
      </Sheet>
      {sheet}
    </>
  )
}
