import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../auth'
import { supabase } from '../lib/supabase'
import { throwIf, useStudio } from '../db/studio'
import { uploadStudioMedia } from '../db/classes'
import { downloadCsv } from '../lib/csv'
import { ActionMenu, Checkbox, CheckboxGroup, Field, MultiSelect, Notice, RadioGroup, Select, TextArea, TextInput, type MenuAction, type Option } from './controls'
import { BulkBar, DataTable, Pager, type Column } from './table'
import { CsvOnly } from '../access-ui'
import { useToast } from './toast'
import { Icon, Loading, PageHeader, Sheet } from './ui'

// YDL's simple listings (Notices, Rules, Holidays, Equipment, Gallery, Action Items, Banners…)
// share one shape: a searchable list with bulk Delete / Deactivate / Activate and an add/edit
// form, either in a pop-up or on its own page. Each page describes itself; this draws it.

export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'radio' | 'yesno' | 'checkbox' | 'checkboxes' | 'multiselect' | 'color' | 'image'
export interface FieldDef {
  key: string; label: string; type: FieldType; required?: boolean; options?: Option[]; hint?: string; placeholder?: string
  default?: unknown; optional?: boolean; full?: boolean
}
type Row = { id: string; created_at?: string; active?: boolean } & Record<string, unknown>
type Values = Record<string, unknown>

export interface CrudDef<T extends Row> {
  table: string
  title: string
  noun: string
  nounPlural?: string
  addLabel: string
  formTitle?: string
  editTitle?: string
  submitLabel?: string
  columns: Column<T>[]
  card: (r: T) => ReactNode
  fields: FieldDef[]
  searchText?: (r: T) => string
  searchPlaceholder?: string
  order: { column: string; ascending: boolean }
  bulk?: ('delete' | 'deactivate' | 'activate')[]
  extraBulk?: { label: string; run: (ids: string[], rows: T[]) => Promise<string> }[]
  rowActions?: (r: T, edit: () => void) => MenuAction[]
  basePath?: string
  pageForm?: boolean
  fixed?: Record<string, unknown>
  imageFolder?: string
  pageSize?: number
  csv?: [string, (r: T) => unknown][]
  filters?: (rows: T[], set: (f: (r: T) => boolean) => void) => ReactNode
  validate?: (v: Values) => string | null
  canAdd?: boolean
  emptyText?: string
}

export const studioLine = (s?: { name: string; branch_name: string | null } | null) => (s ? `${s.name}${s.branch_name ? ` (${s.branch_name})` : ''}` : '')
const plural = (d: { noun: string; nounPlural?: string }, n: number) => (n === 1 ? d.noun.toLowerCase() : (d.nounPlural ?? `${d.noun}s`).toLowerCase())
export const yes = (v: unknown) => v === true

export function useCrudRows<T extends Row>(def: CrudDef<T>) {
  const me = useMe()
  return useQuery({
    queryKey: [def.table, me.studioId, def.fixed ?? null],
    queryFn: async () => {
      let q = supabase.from(def.table).select('*').eq('studio_id', me.studioId)
      for (const [k, v] of Object.entries(def.fixed ?? {})) q = q.eq(k, v as string)
      return throwIf(await q.order(def.order.column, { ascending: def.order.ascending }).order('created_at', { ascending: false }).limit(5000)) as T[]
    },
  })
}

export function CrudList<T extends Row>({ def, header }: { def: CrudDef<T>; header?: ReactNode }) {
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const { data = [], isLoading } = useCrudRows(def)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<(r: T) => boolean>(() => () => true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { action: 'delete' | 'deactivate' | 'activate'; ids: string[] }>(null)
  const [form, setForm] = useState<T | 'new' | null>(null)
  const [page, setPage] = useState(0)
  const size = def.pageSize ?? 25
  const rows = useMemo(() => data.filter((r) => filter(r) && (!search || (def.searchText?.(r) ?? '').toLowerCase().includes(search.toLowerCase()))), [data, filter, search, def])
  const shown = rows.slice(page * size, (page + 1) * size)
  const act = useMutation({
    mutationFn: async (c: { action: 'delete' | 'deactivate' | 'activate'; ids: string[] }) => {
      if (c.action === 'delete') throwIf(await supabase.from(def.table).delete().in('id', c.ids).select('id'))
      else throwIf(await supabase.from(def.table).update({ active: c.action === 'activate' }).in('id', c.ids).select('id'))
      return c
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: [def.table] })
      setSelected(new Set()); setConfirm(null)
      toast(`${c.ids.length} ${plural(def, c.ids.length)} ${c.action === 'delete' ? 'deleted' : c.action === 'activate' ? 'activated' : 'deactivated'}`)
    },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const extra = useMutation({
    mutationFn: async (x: { run: (ids: string[], rows: T[]) => Promise<string>; ids: string[] }) => x.run(x.ids, data.filter((r) => x.ids.includes(r.id))),
    onSuccess: (msg) => { qc.invalidateQueries({ queryKey: [def.table] }); setSelected(new Set()); toast(msg) },
    onError: (e: Error) => toast(e.message),
  })
  const edit = (r: T) => (def.pageForm ? navigate(`${def.basePath}/${r.id}/edit`) : setForm(r))
  const add = () => (def.pageForm ? navigate(`${def.basePath}/new`) : setForm('new'))
  const bulk = def.bulk ?? ['delete', 'deactivate', 'activate']
  const ids = [...selected]
  const exportCsv = def.csv ? () => downloadCsv(`${def.table}.csv`, rows, def.csv!) : null
  return (
    <>
      <PageHeader title={def.title} sub={studioLine(studio)}
        actions={<>
          {exportCsv && <CsvOnly><button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>}
          {def.canAdd !== false && <button type="button" className="btn-gold min-h-10 px-4" onClick={add}><Icon name="plus" size={18} />{def.addLabel}</button>}
        </>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        {header}
        <div className="flex flex-wrap items-center gap-2">
          {def.searchText && (
            <div className="relative min-w-[220px] flex-1">
              <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <TextInput small value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder={def.searchPlaceholder ?? 'Search'} className="pl-9" />
            </div>
          )}
          {def.filters?.(data, (f) => { setFilter(() => f); setPage(0) })}
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          {def.extraBulk?.map((x) => <button key={x.label} type="button" className="btn btn-sm" disabled={extra.isPending} onClick={() => extra.mutate({ run: x.run, ids })}>{x.label}</button>)}
          {bulk.includes('activate') && <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: 'activate', ids })}>Activate</button>}
          {bulk.includes('deactivate') && <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: 'deactivate', ids })}>Deactivate</button>}
          {bulk.includes('delete') && <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ action: 'delete', ids })}>Delete</button>}
        </BulkBar>
        <DataTable<T> loading={isLoading} rows={shown} rowKey={(r) => r.id} selectable selected={selected} onSelect={setSelected} caption={def.title}
          empty={search ? 'Nothing matches your search.' : def.emptyText ?? 'Nothing here yet.'}
          columns={[...def.columns, { key: 'action', header: 'Action', width: 90, cell: (r) => <ActionMenu actions={def.rowActions ? def.rowActions(r, () => edit(r)) : [{ label: 'Edit', onClick: () => edit(r) }]} /> }]}
          card={(r) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{def.card(r)}</div>
              <ActionMenu actions={def.rowActions ? def.rowActions(r, () => edit(r)) : [{ label: 'Edit', onClick: () => edit(r) }]} />
            </div>
          )} />
        <Pager page={page} pageSize={size} total={rows.length} onPage={setPage} />
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO {confirm.action.toUpperCase()} {confirm.ids.length === 1 ? `THIS ${def.noun.toUpperCase()}` : `THE SELECTED ${(def.nounPlural ?? `${def.noun}s`).toUpperCase()}`} ?</p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
              <button type="button" className={`btn flex-1 ${confirm.action === 'delete' ? 'btn-danger' : ''}`} disabled={act.isPending} onClick={() => act.mutate(confirm)}>Yes</button>
            </div>
          </div>
        )}
      </Sheet>
      {!def.pageForm && (
        <Sheet wide open={!!form} onClose={() => setForm(null)} title={form === 'new' ? def.formTitle ?? def.addLabel : def.editTitle ?? `Edit ${def.noun}`}>
          {form && <CrudForm def={def} value={form === 'new' ? null : form} onDone={() => setForm(null)} />}
        </Sheet>
      )}
    </>
  )
}

function initialValues(fields: FieldDef[], row: Row | null): Values {
  const v: Values = {}
  for (const f of fields) {
    const cur = row?.[f.key]
    if (f.type === 'checkbox' || f.type === 'yesno') v[f.key] = row ? cur === true : (f.default ?? (f.type === 'yesno' ? null : false))
    else if (f.type === 'checkboxes' || f.type === 'multiselect') v[f.key] = row ? ((cur as string[] | null) ?? []) : (f.default ?? [])
    else if (f.type === 'image') v[f.key] = row ? cur ?? null : null
    else v[f.key] = row ? (cur === null || cur === undefined ? '' : String(cur)) : (f.default ?? '')
  }
  return v
}

export function CrudForm<T extends Row>({ def, value, onDone, onSaved }: { def: CrudDef<T>; value: T | null; onDone: () => void; onSaved?: (another: boolean) => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const [v, setV] = useState<Values>(() => initialValues(def.fields, value))
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [optional, setOptional] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string) => (x: unknown) => setV((o) => ({ ...o, [k]: x }))
  const save = useMutation({
    mutationFn: async (another: boolean) => {
      const row: Values = { ...(def.fixed ?? {}) }
      for (const f of def.fields) {
        const x = v[f.key]
        if (f.type === 'image') row[f.key] = files[f.key] ? await uploadStudioMedia(me.studioId, def.imageFolder ?? def.table, files[f.key]!) : x
        else if (f.type === 'number') row[f.key] = x === '' ? (f.required ? 0 : null) : Number(x)
        else if (f.type === 'checkbox' || f.type === 'yesno' || f.type === 'checkboxes' || f.type === 'multiselect') row[f.key] = x
        else row[f.key] = typeof x === 'string' ? (x.trim() === '' ? null : x.trim()) : x
      }
      if (value) throwIf(await supabase.from(def.table).update(row).eq('id', value.id).select('id'))
      else throwIf(await supabase.from(def.table).insert({ ...row, studio_id: me.studioId }).select('id'))
      return another
    },
    onSuccess: (another) => {
      qc.invalidateQueries({ queryKey: [def.table] })
      toast(`${def.noun} ${value ? 'saved' : 'added'}`)
      if (another) { setV(initialValues(def.fields, null)); setFiles({}) }
      onSaved?.(another)
      if (!another) onDone()
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (another = false) => {
    setError(null)
    for (const f of def.fields) {
      if (!f.required) continue
      const x = v[f.key]
      const empty = f.type === 'image' ? !x && !files[f.key] : Array.isArray(x) ? !x.length : x === '' || x === null || x === undefined
      if (empty) return setError(`${f.label.replace(/\s*\*$/, '')} is required.`)
    }
    const msg = def.validate?.(v)
    if (msg) return setError(msg)
    save.mutate(another)
  }
  const main = def.fields.filter((f) => !f.optional)
  const extra = def.fields.filter((f) => f.optional)
  const render = (f: FieldDef) => {
    const id = `cf-${def.table}-${f.key}`
    const cls = f.full || f.type === 'textarea' || f.type === 'checkboxes' || f.type === 'radio' || f.type === 'image' ? 'sm:col-span-2' : ''
    switch (f.type) {
      case 'checkbox': return <div key={f.key} className={cls}><Checkbox id={id} checked={v[f.key] === true} onChange={set(f.key)} label={f.label} /></div>
      case 'checkboxes': return <div key={f.key} className={cls}><CheckboxGroup legend={f.label} options={f.options ?? []} values={v[f.key] as string[]} onChange={set(f.key)} columns={2} /></div>
      case 'radio': return <div key={f.key} className={cls}><RadioGroup name={id} legend={f.label} required={f.required} options={f.options ?? []} value={String(v[f.key] ?? '')} onChange={set(f.key)} /></div>
      case 'yesno': return (
        <div key={f.key} className={cls}>
          <RadioGroup name={id} legend={f.label} required={f.required} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            value={v[f.key] === true ? 'true' : v[f.key] === false ? 'false' : ''} onChange={(x) => set(f.key)(x === 'true')} />
        </div>
      )
      case 'image': {
        const cur = v[f.key] as string | null
        return (
          <Field key={f.key} className={cls} label={f.label} required={f.required} id={id} hint={f.hint}>
            <input id={id} type="file" accept="image/*" className="input pt-2.5" onChange={(e) => setFiles((o) => ({ ...o, [f.key]: e.target.files?.[0] ?? null }))} />
            {cur && !files[f.key] && <img src={cur} alt="" className="mt-2 h-24 w-auto max-w-[240px] rounded-xl border border-line object-cover" />}
          </Field>
        )
      }
      default:
        return (
          <Field key={f.key} className={cls} label={f.label} required={f.required} id={id} hint={f.hint}>
            {f.type === 'textarea' ? <TextArea id={id} value={String(v[f.key] ?? '')} onChange={set(f.key)} placeholder={f.placeholder} rows={4} />
              : f.type === 'select' ? <Select id={id} value={String(v[f.key] ?? '')} onChange={set(f.key)} placeholder={f.placeholder ?? 'Select'} options={f.options ?? []} />
              : f.type === 'multiselect' ? <MultiSelect id={id} values={v[f.key] as string[]} onChange={set(f.key)} options={f.options ?? []} placeholder={f.placeholder} />
              : f.type === 'color' ? <input id={id} type="color" className="input h-12 w-24 p-1" value={String(v[f.key] || '#000000')} onChange={(e) => set(f.key)(e.target.value)} />
              : <TextInput id={id} type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} value={String(v[f.key] ?? '')} onChange={set(f.key)} placeholder={f.placeholder} />}
          </Field>
        )
    }
  }
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
      <p className="m-0 text-[13px] font-semibold text-muted">{studioLine(studio)}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{main.map(render)}</div>
      {extra.length > 0 && (
        <>
          <button type="button" className="link-btn self-start text-[13px]" aria-expanded={optional} onClick={() => setOptional((o) => !o)}>{optional ? 'Hide Optional Fields' : 'Show Optional Fields'}</button>
          {optional && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{extra.map(render)}</div>}
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>{def.pageForm ? 'Back' : 'Close'}</button>
        {def.pageForm && !value && <button type="button" className="btn flex-1" disabled={save.isPending} onClick={() => submit(true)}>Save & add another</button>}
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : def.pageForm ? 'Save' : value ? `Save ${def.noun}` : def.submitLabel ?? def.addLabel}</button>
      </div>
    </form>
  )
}

/** A page-sized add/edit form (YDL "Create Gallery", "Create Action", "Create Banner"…). */
export function CrudFormPage<T extends Row>({ def, title }: { def: CrudDef<T>; title: string }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data = [], isLoading } = useCrudRows(def)
  const row = id ? data.find((r) => r.id === id) ?? null : null
  if (id && isLoading) return <Loading />
  if (id && !row) return <><PageHeader title={title} /><div className="px-5 pt-5 lg:px-8"><Notice tone="error">This item no longer exists. <Link to={def.basePath!}>Back to the list</Link></Notice></div></>
  return (
    <>
      <PageHeader title={title} actions={<Link to={def.basePath!} className="btn btn-sm">{def.title}</Link>} />
      <div className="max-w-[860px] px-5 pt-5 pb-10 lg:px-8">
        <div className="card p-5"><CrudForm key={id ?? 'new'} def={def} value={row} onDone={() => navigate(def.basePath!)} /></div>
      </div>
    </>
  )
}

export function ActiveChip({ on }: { on: unknown }) {
  return on ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>
}
