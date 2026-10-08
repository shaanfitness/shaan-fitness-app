import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../auth'
import { supabase } from '../lib/supabase'
import { useBatches, useLists, usePlans, useServices, useStudio, useTeam } from '../db/studio'
import type { Batch, ListItem, Plan, Service, Studio } from '../db/types'
import { plusDays, presets, rangeLabel, studioToday, type Range } from '../lib/dates'
import { downloadCsv } from '../lib/csv'
import { CheckboxGroup, Notice, Select, TextInput, type Option } from './controls'
import { BulkBar, DataTable, Pager, type Column } from './table'
import { Icon, PageHeader, Sheet } from './ui'

// One engine for YDL's registers: a date range with YDL's presets, dropdown filters,
// the shared "Filters" panel (gender, subscription status, payment status), search,
// columns, totals, CSV export and paging. Each register is a small definition.

type Q = any // eslint-disable-line @typescript-eslint/no-explicit-any

export interface RegisterCtx {
  studio?: Studio
  team: ReturnType<typeof useTeam>
  plans: Plan[]
  services: Service[]
  batches: Batch[]
  lists: Record<string, ListItem[]>
  today: string
  navigate: ReturnType<typeof useNavigate>
  role: string
  coupons: { id: string; name: string; code: string }[]
  programs: { id: string; name: string }[]
}

export interface RegisterFilter {
  key: string
  placeholder: string
  options: Option[]
  apply: (q: Q, value: string) => Q
}

export interface PanelCols { gender?: string; state?: string; payment?: string; end?: string; renewal?: string }

export interface RegisterDef<T> {
  title: string
  view: string
  select?: string
  base?: (q: Q, ctx: RegisterCtx) => Q
  dateCol?: string
  dateLabel?: string
  presetKind?: 'register' | 'expiry' | 'list' | 'balance'
  defaultPreset?: string
  search?: string[]
  searchPlaceholder?: string
  filters?: (ctx: RegisterCtx) => RegisterFilter[]
  panel?: PanelCols
  columns: (ctx: RegisterCtx) => Column<T>[]
  card?: (r: T, ctx: RegisterCtx) => ReactNode
  csv?: (ctx: RegisterCtx) => [string, (r: T) => unknown][]
  totals?: (rows: T[]) => [string, string][]
  order: [string, boolean][]
  rowKey?: (r: T) => string
  actions?: (ctx: RegisterCtx, rows: T[]) => ReactNode
  notice?: ReactNode
  clientFilter?: (rows: T[], ui: Record<string, string>) => T[]
  /** Tick boxes on rows and the actions for the ticked rows (e.g. Delete on the waiting list). */
  bulk?: (rows: T[], done: () => void, ctx: RegisterCtx) => ReactNode
  /** A dropdown that must be chosen before anything is listed (e.g. "Select Program"). */
  requires?: string
  /** Extra things above the table that need the loaded rows (e.g. top trainers). */
  summary?: (rows: T[], ctx: RegisterCtx) => ReactNode
}

const PAGE = 50
const LIMIT = 5000

function rangePresets(kind: RegisterDef<unknown>['presetKind'], today: string) {
  if (kind === 'balance') return [{ key: 'all', label: 'All Data', range: { from: null, to: null } }, ...presets('expiry', today)]
  return presets(kind ?? 'register', today)
}

export function useRegisterCtx(): RegisterCtx {
  const me = useMe()
  const { data: studio } = useStudio()
  const { data: plans = [] } = usePlans()
  const { data: services = [] } = useServices()
  const { data: batches = [] } = useBatches()
  const { data: lists = {} } = useLists()
  const team = useTeam()
  const navigate = useNavigate()
  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons', me.studioId], staleTime: 5 * 60_000, enabled: me.role === 'owner' || me.role === 'front_desk',
    queryFn: async () => ((await supabase.from('coupons').select('id,name,code').eq('studio_id', me.studioId).order('name')).data ?? []) as { id: string; name: string; code: string }[],
  })
  const { data: programs = [] } = useQuery({
    queryKey: ['program-names', me.studioId], staleTime: 5 * 60_000, enabled: me.role !== 'member',
    queryFn: async () => ((await supabase.from('programs').select('id,name').eq('studio_id', me.studioId).order('name')).data ?? []) as { id: string; name: string }[],
  })
  return { studio, team, plans, services, batches, lists, today: studioToday(), navigate, role: me.role, coupons, programs }
}

export function Register<T extends { id?: string }>({ def }: { def: RegisterDef<T> }) {
  const me = useMe()
  const ctx = useRegisterCtx()
  const choices = rangePresets(def.presetKind, ctx.today)
  const [rangeKey, setRangeKey] = useState(def.defaultPreset ?? choices[0].key)
  const [range, setRange] = useState<Range>((choices.find((c) => c.key === (def.defaultPreset ?? choices[0].key)) ?? choices[0]).range)
  const [search, setSearch] = useState('')
  const [ui, setUi] = useState<Record<string, string>>({})
  const [genders, setGenders] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [payments, setPayments] = useState<string[]>([])
  const [panel, setPanel] = useState(false)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const qc = useQueryClient()
  const filters = def.filters?.(ctx) ?? []
  const soon = Number(ctx.studio?.settings.about_to_expire_days ?? 7)

  const key = [def.view, def.title, me.studioId, range, search, ui, genders, states, payments]
  const build = () => {
    let q: Q = supabase.from(def.view).select(def.select ?? '*').eq('studio_id', me.studioId)
    if (def.base) q = def.base(q, ctx)
    if (def.dateCol && range.from) q = q.gte(def.dateCol, range.from)
    if (def.dateCol && range.to) q = q.lte(def.dateCol, def.dateCol.endsWith('_at') ? `${range.to}T23:59:59+05:30` : range.to)
    const s = search.replace(/[,()*"\\]/g, ' ').trim()
    if (s && def.search?.length) q = q.or(def.search.map((c) => `${c}.ilike.*${s}*`).join(','))
    for (const f of filters) if (ui[f.key]) q = f.apply(q, ui[f.key])
    const pc = def.panel
    if (pc?.gender && genders.length) q = q.in(pc.gender, genders)
    if (pc?.state && states.length) {
      const ors: string[] = []
      const plain = states.filter((x) => ['active', 'pending', 'expired', 'used'].includes(x))
      if (plain.length) ors.push(`${pc.state}.in.(${plain.join(',')})`)
      if (states.includes('soon') && pc.end) ors.push(`and(${pc.state}.eq.active,${pc.end}.gte.${ctx.today},${pc.end}.lte.${plusDays(ctx.today, soon)})`)
      if (states.includes('retained') && pc.renewal) ors.push(`${pc.renewal}.eq.true`)
      if (ors.length) q = q.or(ors.join(','))
    }
    if (pc?.payment && payments.length) {
      const pay = payments.filter((x) => x === 'paid' || x === 'pending')
      q = pay.length ? q.in(pc.payment, pay) : q.eq('studio_id', '00000000-0000-0000-0000-000000000000')
    }
    for (const [col, asc] of def.order) q = q.order(col, { ascending: asc, nullsFirst: false })
    return q.limit(LIMIT)
  }
  const blocked = !!def.requires && !ui[def.requires]
  const data = useQuery({
    queryKey: ['registers', ...key],
    placeholderData: (p) => p,
    enabled: !blocked,
    queryFn: async () => {
      const res = await build()
      if (res.error) throw new Error(res.error.message)
      return (res.data ?? []) as T[]
    },
  })
  const all = useMemo(() => (blocked ? [] : def.clientFilter ? def.clientFilter(data.data ?? [], ui) : data.data ?? []), [data.data, ui, def, blocked])
  const keyOf = def.rowKey ?? ((r: T) => String(r.id))
  const picked = all.filter((r) => selected.has(keyOf(r)))
  const done = () => { setSelected(new Set()); qc.invalidateQueries({ queryKey: ['registers'] }) }
  const rows = all.slice(page * PAGE, page * PAGE + PAGE)
  const columns = def.columns(ctx)
  const totals = def.totals?.(all) ?? []
  const set = (k: string, v: string) => { setUi((x) => ({ ...x, [k]: v })); setPage(0); setSelected(new Set()) }
  const exportCsv = () => {
    const cols = def.csv?.(ctx)
    if (!cols) return
    downloadCsv(`${def.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ctx.today}.csv`, all, cols)
  }
  const activePanel = genders.length + states.length + payments.length

  return (
    <>
      <PageHeader title={def.title} sub={`${ctx.studio?.name ?? ''}${ctx.studio?.branch_name ? ` (${ctx.studio.branch_name})` : ''}`}
        actions={<>
          {def.actions?.(ctx, all)}
          {def.csv && <button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button>}
        </>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        {def.notice}
        <div className="flex flex-wrap items-center gap-2">
          {def.search && (
            <div className="relative min-w-[220px] flex-1">
              <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <TextInput small value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder={def.searchPlaceholder ?? 'Search'} className="pl-9" />
            </div>
          )}
          {def.dateCol && <>
            <span className="text-[12px] text-muted">{def.dateLabel ?? 'From'}</span>
            <Select small ariaLabel="Date range" value={rangeKey} className="w-auto min-w-[200px]"
              options={[...choices.map((p) => ({ value: p.key, label: `${p.label}${p.range.from ? ` (${rangeLabel(p.range)})` : ''}` })), { value: 'custom', label: 'Custom' }]}
              onChange={(k) => { setRangeKey(k); const p = choices.find((x) => x.key === k); if (p) setRange(p.range); setPage(0) }} />
            {rangeKey === 'custom' && <>
              <TextInput small type="date" value={range.from ?? ''} onChange={(v) => { setRange({ ...range, from: v || null }); setPage(0) }} className="w-auto" />
              <TextInput small type="date" value={range.to ?? ''} onChange={(v) => { setRange({ ...range, to: v || null }); setPage(0) }} className="w-auto" />
            </>}
          </>}
          {def.panel && <button type="button" className="btn btn-sm" onClick={() => setPanel(true)}><Icon name="filter" size={16} />Filters{activePanel ? ` (${activePanel})` : ''}</button>}
        </div>
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => <Select key={f.key} small ariaLabel={f.placeholder} value={ui[f.key] ?? ''} onChange={(v) => set(f.key, v)} placeholder={f.placeholder} options={f.options} className="w-auto max-w-[260px]" />)}
            {Object.values(ui).some(Boolean) && <button type="button" className="link-btn text-[13px]" onClick={() => { setUi({}); setPage(0) }}>Clear filters</button>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">{totals.map(([k, v]) => <span key={k} className="rounded-xl border border-line px-3 py-1.5 text-[13px]"><span className="text-muted">{k} : </span><strong>{v}</strong></span>)}</div>
          <span className="text-[13px] text-muted">{data.data ? `${all.length}${all.length >= LIMIT ? '+' : ''} records` : ''}</span>
        </div>
        {all.length >= LIMIT && <Notice tone="warn">Showing the first {LIMIT} records. Narrow the dates to see the rest.</Notice>}
        {data.error && <Notice tone="error">{(data.error as Error).message}</Notice>}
        {def.summary && !blocked && def.summary(all, ctx)}
        {def.bulk && <BulkBar count={picked.length} onClear={() => setSelected(new Set())}>{def.bulk(picked, done, ctx)}</BulkBar>}
        {blocked ? <Notice>{filters.find((f) => f.key === def.requires)?.placeholder ?? 'Choose an option'} to see the list.</Notice> : (
          <DataTable caption={def.title} rows={rows} loading={data.isLoading} rowKey={keyOf} columns={columns}
            selectable={!!def.bulk} selected={selected} onSelect={setSelected}
            card={(r) => (def.card ? def.card(r, ctx) : <CardFallback row={r} columns={columns} />)} empty="No records for these filters." />
        )}
        <Pager page={page} pageSize={PAGE} total={all.length} onPage={setPage} />
      </div>
      {def.panel && (
        <Sheet open={panel} onClose={() => setPanel(false)} title="Filters" wide>
          <div className="flex flex-col gap-5">
            {def.panel.gender && <CheckboxGroup legend="Gender" values={genders} onChange={(v) => { setGenders(v); setPage(0) }} options={[{ value: 'male', label: 'Total Males' }, { value: 'female', label: 'Total Females' }]} />}
            {def.panel.state && <CheckboxGroup legend="Subscription Status" values={states} onChange={(v) => { setStates(v); setPage(0) }} columns={2} options={[
              { value: 'active', label: 'Active Subscriptions' }, { value: 'pending', label: 'Pending Subscriptions' }, { value: 'expired', label: 'Expired Subscriptions' },
              ...(def.panel.end ? [{ value: 'soon', label: 'About to expire' }] : []), ...(def.panel.renewal ? [{ value: 'retained', label: 'Retained Subscriptions' }] : []),
              { value: 'used', label: 'Used Subscriptions' }]} />}
            {def.panel.payment && <CheckboxGroup legend="Payment Status" values={payments} onChange={(v) => { setPayments(v); setPage(0) }} columns={3} options={[{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }]} />}
            <p className="m-0 text-[12px] text-muted">Failed and Bounced Subscriptions come from autopay, once recurring payments are switched on.</p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => { setGenders([]); setStates([]); setPayments([]); setPage(0) }}>Clear</button>
              <button type="button" className="btn-gold flex-1" onClick={() => setPanel(false)}>Apply</button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  )
}

function CardFallback<T>({ row, columns }: { row: T; columns: Column<T>[] }) {
  return (
    <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-[13px]">
      {columns.filter((c) => c.key !== 'act').map((c) => (
        <div key={c.key} className="contents"><dt className="text-muted">{c.header}</dt><dd className="m-0 min-w-0">{c.cell(row)}</dd></div>
      ))}
      {columns.filter((c) => c.key === 'act').map((c) => <div key="act" className="col-span-2 pt-1">{c.cell(row)}</div>)}
    </dl>
  )
}

// Common dropdown filters
export const fPlan = (ctx: RegisterCtx, col = 'plan_id', placeholder = 'Select Membership'): RegisterFilter => ({
  key: 'plan', placeholder, options: ctx.plans.map((p) => ({ value: p.id, label: p.name })), apply: (q, v) => q.eq(col, v),
})
export const fService = (ctx: RegisterCtx, col = 'plan_service_ids'): RegisterFilter => ({
  key: 'service', placeholder: 'Select Service', options: ctx.services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name })), apply: (q, v) => q.contains(col, [v]),
})
export const fStaff = (ctx: RegisterCtx, key: string, col: string, placeholder: string): RegisterFilter => ({
  key, placeholder, options: ctx.team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: s.full_name })), apply: (q, v) => q.eq(col, v),
})
export const fTrainer = (ctx: RegisterCtx, col = 'trainer_id', placeholder = 'Select Trainer'): RegisterFilter => ({
  key: 'trainer', placeholder, options: ctx.team.trainers.map((s) => ({ value: s.id, label: `${s.full_name} (${s.staff_code})` })), apply: (q, v) => q.eq(col, v),
})
export const fGender = (col = 'member_gender'): RegisterFilter => ({
  key: 'gender', placeholder: 'Gender', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }], apply: (q, v) => q.eq(col, v),
})
export const fMode = (ctx: RegisterCtx, col = 'mode'): RegisterFilter => ({
  key: 'mode', placeholder: 'Select Payment Mode', options: (ctx.lists.payment_mode ?? []).filter((i) => i.active).map((i) => ({ value: i.label, label: i.label })), apply: (q, v) => q.eq(col, v),
})
export const fBatch = (ctx: RegisterCtx, col = 'batch_id'): RegisterFilter => ({
  key: 'batch', placeholder: 'Batch List', options: ctx.batches.map((b) => ({ value: b.id, label: b.name })), apply: (q, v) => q.eq(col, v),
})
export const fSubState = (col: string, states: string[]): RegisterFilter => ({
  key: 'substate', placeholder: 'Subscription Status', options: states.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })), apply: (q, v) => q.eq(col, v),
})
