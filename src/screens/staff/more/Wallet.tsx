import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useList, useTeam } from '../../../db/studio'
import {
  activityCost, activityDuration, addWalletEntry, deleteWalletEntry, durationText, SOURCE_LABEL, walletActivities, walletBalance, walletCategories, walletEntries,
  type WalletActivity, type WalletEntry, type WalletSource,
} from '../../../db/wallet'
import { fmtDay, fmtTime } from '../../../lib/dates'
import { money, moneyExact } from '../../../lib/format'
import { ActiveChip, CrudFormPage, CrudList, type CrudDef } from '../../../components/crud'
import { Register, fGender, fStaff, type RegisterDef } from '../../../components/register'
import { Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../../components/controls'
import { DataTable } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { Icon, Sheet } from '../../../components/ui'

// YDL More Options › Wallet: Categories, Activity Plans, Activity Traffic and the Wallet Register; and the
// client's wallet on their profile (add money, a reward, an activity used, the history).

type Row = { id: string; created_at?: string; active?: boolean } & Record<string, unknown>
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

// Categories ------------------------------------------------------------------------------------------------------
function useCategoryDef(): CrudDef<Row> {
  const team = useTeam()
  return {
    table: 'wallet_categories', title: 'Wallet Category Listing', noun: 'Category', nounPlural: 'Categories', addLabel: 'Create Category',
    basePath: '/wallet/categories', pageForm: true, order: { column: 'name', ascending: true },
    searchText: (r) => `${str(r.name)} ${str(r.code)}`, searchPlaceholder: 'Search By Category Name or Code',
    columns: [
      { key: 'name', header: 'Category Name', cell: (r) => <div><strong>{str(r.name)}</strong>{r.description ? <div className="line-clamp-1 max-w-[320px] text-[12px] text-muted">{str(r.description)}</div> : null}</div> },
      { key: 'code', header: 'Category Code', cell: (r) => str(r.code) },
      { key: 'status', header: 'Status', cell: (r) => <ActiveChip on={r.active} /> },
      { key: 'by', header: 'Created by', cell: (r) => team.name(r.created_by as string) ?? '-' },
    ],
    card: (r) => <div className="flex flex-col gap-1"><strong>{str(r.name)}</strong><span className="text-[13px] text-muted">{str(r.code)}</span><ActiveChip on={r.active} /></div>,
    fields: [
      { key: 'name', label: 'Category Name', type: 'text', required: true },
      { key: 'description', label: 'Category Description', type: 'textarea', placeholder: 'e.g. Games Category gives you access to gym game area.' },
      { key: 'active', label: 'Is Active', type: 'yesno', required: true, default: true },
    ],
    emptyText: 'No categories yet.',
  }
}
export function WalletCategoryList() { return <CrudList def={useCategoryDef()} /> }
export function WalletCategoryForm() { return <CrudFormPage def={useCategoryDef()} title="Wallet Category" /> }

// Activity plans ---------------------------------------------------------------------------------------------------
function useCategories() {
  const me = useMe()
  return useQuery({ queryKey: ['wallet_categories', me.studioId, 'all'], queryFn: () => walletCategories(me.studioId) }).data ?? []
}

function useActivityDef(): CrudDef<Row> {
  const team = useTeam()
  const cats = useCategories()
  const catName = (id: unknown) => cats.find((c) => c.id === id)?.name ?? '-'
  return {
    table: 'wallet_activities', title: 'Activity Listing', noun: 'Activity', nounPlural: 'Activities', addLabel: 'Create Activity',
    basePath: '/wallet/activities', pageForm: true, order: { column: 'name', ascending: true },
    searchText: (r) => `${str(r.name)} ${str(r.code)}`,
    filters: (_rows, set) => <CategoryFilter categories={cats} onChange={(c) => set((r) => !c || r.category_id === c)} />,
    columns: [
      { key: 'name', header: 'Activity Name', cell: (r) => <div><strong>{str(r.name)}</strong><div className="text-[12px] text-muted">{activityDuration(r as unknown as WalletActivity)}</div></div> },
      { key: 'code', header: 'Activity Code', cell: (r) => str(r.code) },
      { key: 'cat', header: 'Activity Category', cell: (r) => catName(r.category_id) },
      { key: 'status', header: 'Status', cell: (r) => <ActiveChip on={r.active} /> },
      { key: 'price', header: 'Price', className: 'num', cell: (r) => money(Number(r.price)) },
      { key: 'by', header: 'Created by', cell: (r) => team.name(r.created_by as string) ?? '-' },
    ],
    card: (r) => <div className="flex flex-col gap-1"><strong>{str(r.name)}</strong><span className="text-[13px] text-muted">{catName(r.category_id)} · {money(Number(r.price))} · {activityDuration(r as unknown as WalletActivity)}</span><ActiveChip on={r.active} /></div>,
    fields: [
      { key: 'name', label: 'Activity Name', type: 'text', required: true },
      { key: 'price', label: 'Activity Price', type: 'number', required: true, placeholder: 'e.g. 10000' },
      { key: 'description', label: 'Activity Description', type: 'textarea', placeholder: 'e.g. Games Activity gives you access to gym game area.' },
      { key: 'one_time', label: 'Is One time', type: 'yesno', required: true, default: true, hint: 'One time: charged once. Otherwise charged per block of the hours below.' },
      { key: 'duration_hours', label: 'Activity Duration (hourly basis)', type: 'number', hint: 'For activities charged by time, e.g. 1 for every hour.' },
      { key: 'category_id', label: 'Select Category', type: 'select', required: true, placeholder: 'Select Activity Category', options: cats.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name })) },
      { key: 'active', label: 'Is Active', type: 'yesno', required: true, default: true },
    ],
    validate: (v) => (!(Number(v.price) > 0) ? 'The activity price should be more than 0.'
      : v.one_time === false && !(Number(v.duration_hours) > 0) ? 'Enter the activity duration in hours (it is charged per block of time).' : null),
    emptyText: 'No activity plans yet.',
  }
}
function CategoryFilter({ categories, onChange }: { categories: { id: string; name: string }[]; onChange: (id: string) => void }) {
  const [v, setV] = useState('')
  return <Select small ariaLabel="Activity category" value={v} onChange={(x) => { setV(x); onChange(x) }} placeholder="Select Category" className="w-auto" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
}
export function WalletActivityList() { return <CrudList def={useActivityDef()} /> }
export function WalletActivityForm() { return <CrudFormPage def={useActivityDef()} title="Activity Plans" /> }

// Activity Traffic -------------------------------------------------------------------------------------------------
export function ActivityTraffic() {
  const cats = useCategories()
  const def: RegisterDef<WalletEntry> = {
    title: 'Activity Traffic Insights', view: 'wallet_overview', base: (q) => q.eq('source', 'activity'), dateCol: 'txn_date', defaultPreset: 'today',
    search: ['member_name', 'client_code', 'activity_name'], searchPlaceholder: 'Search by name, code or activity',
    filters: () => [{ key: 'cat', placeholder: 'All Categories', options: cats.map((c) => ({ value: c.name, label: c.name })), apply: (q, v) => q.eq('category_name', v) }],
    order: [['created_at', false]],
    columns: () => [
      { key: 'name', header: 'Name', cell: (r) => <Link to={`/clients/${r.member_id}`} className="font-semibold">{r.member_name}</Link> },
      { key: 'activity', header: 'Activity', cell: (r) => <div>{r.activity_name}<div className="text-[12px] text-muted">{r.category_name}</div></div> },
      { key: 'duration', header: 'Time Duration', cell: (r) => (r.activity_one_time === false && r.activity_duration_hours ? `Per ${Number(r.activity_duration_hours)} hr` : 'One time') },
      { key: 'start', header: 'Start Time', cell: (r) => (r.started_at ? <span className="whitespace-nowrap">{fmtDay(r.txn_date)} {fmtTime(r.started_at)}</span> : <span className="whitespace-nowrap">{fmtDay(r.txn_date)}</span>) },
      { key: 'end', header: 'End Time', cell: (r) => (r.ended_at ? fmtTime(r.ended_at) : '-') },
      { key: 'used', header: 'Time Consumed', cell: (r) => durationText(r.minutes) },
      { key: 'amount', header: 'Amount', className: 'num', cell: (r) => <strong>{moneyExact(r.amount)}</strong> },
    ],
    totals: (rows) => [['Visits', String(rows.length)], ['Amount', money(rows.reduce((s, r) => s + Number(r.amount), 0))]],
    csv: () => [['Name', (r) => r.member_name], ['Code', (r) => r.client_code], ['Activity', (r) => r.activity_name], ['Category', (r) => r.category_name], ['Date', (r) => r.txn_date],
      ['Start', (r) => (r.started_at ? fmtTime(r.started_at) : '')], ['End', (r) => (r.ended_at ? fmtTime(r.ended_at) : '')], ['Minutes', (r) => r.minutes ?? ''], ['Amount', (r) => r.amount]],
  }
  return <Register def={def} />
}

// Wallet Register -----------------------------------------------------------------------------------------------------
const kindChip = (r: Pick<WalletEntry, 'kind' | 'source' | 'activity_name'>) => (
  <div><span className={`chip ${r.kind === 'credit' ? 'chip-green' : 'chip-amber'}`}>{r.kind === 'credit' ? 'Credit' : 'Debit'}</span>
    <div className="mt-0.5 text-[12px] text-muted">{SOURCE_LABEL[r.source]}{r.activity_name ? ` · ${r.activity_name}` : ''}</div></div>
)
const WALLET_REGISTER: RegisterDef<WalletEntry> = {
  title: 'Wallet Register Listing', view: 'wallet_overview', dateCol: 'txn_date', search: ['member_name', 'client_code'], searchPlaceholder: 'Search',
  filters: (ctx) => [
    fStaff(ctx, 'rep', 'client_rep', 'Client Rep'),
    { key: 'kind', placeholder: 'Transaction Type', options: [{ value: 'credit', label: 'Credit' }, { value: 'debit', label: 'Debit' }], apply: (q, v) => q.eq('kind', v) },
    { key: 'source', placeholder: 'Entry', options: (Object.keys(SOURCE_LABEL) as WalletSource[]).map((k) => ({ value: k, label: SOURCE_LABEL[k] })), apply: (q, v) => q.eq('source', v) },
    fGender(),
  ],
  order: [['created_at', false]],
  columns: () => [
    { key: 'name', header: 'Customer Name', cell: (r) => <div><Link to={`/clients/${r.member_id}`} className="font-semibold">{r.member_name}</Link><div className="text-[12px] text-muted">{r.client_code}</div></div> },
    { key: 'rep', header: 'Client Rep', cell: (r) => r.client_rep_name ?? '-' },
    { key: 'date', header: 'Transaction Date', cell: (r) => <span className="whitespace-nowrap">{fmtDay(r.txn_date)}</span> },
    { key: 'amount', header: 'Transaction Amount', className: 'num', cell: (r) => <strong className={r.kind === 'credit' ? 'text-green' : ''}>{r.kind === 'credit' ? '+' : '−'}{moneyExact(r.amount)}</strong> },
    { key: 'type', header: 'Transaction Type', cell: kindChip },
    { key: 'after', header: 'Balance After', className: 'num', cell: (r) => moneyExact(r.balance_after) },
  ],
  totals: (rows) => {
    const inn = rows.filter((r) => r.kind === 'credit').reduce((s, r) => s + Number(r.amount), 0)
    const out = rows.filter((r) => r.kind === 'debit').reduce((s, r) => s + Number(r.amount), 0)
    return [['Credited', money(inn)], ['Spent', money(out)]]
  },
  csv: () => [['Customer Name', (r) => r.member_name], ['Code', (r) => r.client_code], ['Client Rep', (r) => r.client_rep_name], ['Transaction Date', (r) => r.txn_date],
    ['Transaction Amount', (r) => r.amount], ['Transaction Type', (r) => (r.kind === 'credit' ? 'Credit' : 'Debit')], ['Entry', (r) => SOURCE_LABEL[r.source]],
    ['Activity', (r) => r.activity_name], ['Payment Method', (r) => r.payment_method], ['Note', (r) => r.note], ['Balance After', (r) => r.balance_after], ['Recorded By', (r) => r.created_by_name]],
}
export function WalletRegister() { return <Register def={WALLET_REGISTER} /> }

// The client's wallet (profile tab) ------------------------------------------------------------------------------------
type Mode = 'top_up' | 'reward' | 'activity' | 'refund' | 'adjustment'
const MODE_TITLE: Record<Mode, string> = { top_up: 'Add Money', reward: 'Give a Reward', activity: 'Use an Activity', refund: 'Refund to Wallet', adjustment: 'Correct the Balance' }

export function ClientWallet({ memberId, name }: { memberId: string; name: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const balance = useQuery({ queryKey: ['wallet', 'balance', memberId], queryFn: () => walletBalance(memberId) })
  const history = useQuery({ queryKey: ['wallet', 'entries', memberId], queryFn: () => walletEntries({ studioId: me.studioId, memberId }) })
  const [mode, setMode] = useState<Mode | null>(null)
  const del = useMutation({
    mutationFn: deleteWalletEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wallet'] }); toast('Entry removed') },
    onError: (e: Error) => toast(e.message),
  })
  const owner = me.role === 'owner'
  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="eyebrow">Wallet Balance</h2>
          <div className="mt-1 text-[32px] leading-none font-bold" aria-live="polite">{balance.data ? moneyExact(balance.data.balance) : '…'}</div>
          {balance.data && balance.data.credited > 0 && <p className="m-0 mt-1 text-[13px] text-muted">{money(balance.data.credited)} added · {money(balance.data.spent)} spent</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setMode('top_up')}><Icon name="plus" size={18} />Add Money</button>
          <button type="button" className="btn btn-sm" onClick={() => setMode('activity')}>Use an Activity</button>
          <button type="button" className="btn btn-sm" onClick={() => setMode('reward')}>Give a Reward</button>
          <button type="button" className="btn btn-sm" onClick={() => setMode('refund')}>Refund</button>
          {owner && <button type="button" className="btn btn-sm" onClick={() => setMode('adjustment')}>Correct Balance</button>}
        </div>
      </section>
      <DataTable<WalletEntry> loading={history.isLoading} rows={history.data ?? []} rowKey={(r) => r.id} caption="Wallet history" empty="No wallet entries yet."
        columns={[
          { key: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap">{fmtDay(r.txn_date)}</span> },
          { key: 'type', header: 'Entry', cell: kindChip },
          { key: 'detail', header: 'Details', cell: (r) => <div className="text-[13px]">{r.started_at ? `${fmtTime(r.started_at)} to ${fmtTime(r.ended_at)} · ${durationText(r.minutes)}` : r.payment_method ?? ''}{r.note ? <div className="text-muted">{r.note}</div> : null}</div> },
          { key: 'amount', header: 'Amount', className: 'num', cell: (r) => <strong>{r.kind === 'credit' ? '+' : '−'}{moneyExact(r.amount)}</strong> },
          { key: 'after', header: 'Balance', className: 'num', cell: (r) => moneyExact(r.balance_after) },
          { key: 'by', header: 'By', cell: (r) => r.created_by_name ?? '-' },
          ...(owner ? [{ key: 'del', header: '', width: 60, cell: (r: WalletEntry) => <button type="button" className="icon-btn icon-sm" aria-label={`Remove the ${SOURCE_LABEL[r.source]} of ${moneyExact(r.amount)}`}
            onClick={() => { if (window.confirm('Remove this wallet entry? Use a refund or a correction instead when you can.')) del.mutate(r.id) }}><Icon name="trash" size={15} /></button> }] : []),
        ]}
        card={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div>{kindChip(r)}<div className="mt-1 text-[12px] text-muted">{fmtDay(r.txn_date)}{r.note ? ` · ${r.note}` : ''}</div></div>
            <div className="text-right"><strong>{r.kind === 'credit' ? '+' : '−'}{moneyExact(r.amount)}</strong><div className="text-[12px] text-muted">Bal {moneyExact(r.balance_after)}</div></div>
          </div>
        )} />
      <Sheet wide open={!!mode} onClose={() => setMode(null)} title={mode ? `${MODE_TITLE[mode]} · ${name}` : ''}>
        {mode && <WalletEntryForm key={mode} mode={mode} memberId={memberId} balance={balance.data?.balance ?? 0} onDone={() => setMode(null)} />}
      </Sheet>
    </div>
  )
}

const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

function WalletEntryForm({ mode, memberId, balance, onDone }: { mode: Mode; memberId: string; balance: number; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const methods = useList('payment_mode')
  const acts = useQuery({ queryKey: ['wallet_activities', me.studioId, 'all'], queryFn: () => walletActivities(me.studioId) }).data ?? []
  const [f, setF] = useState(() => {
    const now = new Date()
    return { amount: '', method: 'CASH', note: '', activity: '', start: localInput(new Date(now.getTime() - 60 * 60_000)), end: localInput(now), kind: 'credit' }
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }))
  const act = acts.find((a) => a.id === f.activity)
  const minutes = act && !act.one_time ? Math.ceil((new Date(f.end).getTime() - new Date(f.start).getTime()) / 60_000) : null
  const cost = mode === 'activity' && act ? activityCost(act, minutes) : null
  const amount = mode === 'activity' ? cost : mode === 'reward' && !f.amount && act ? Number(act.price) : Number(f.amount) || null
  const after = amount === null ? null : (mode === 'activity' || (mode === 'adjustment' && f.kind === 'debit')) ? balance - amount : balance + amount
  const choices = acts.filter((a) => a.active)
  const save = useMutation({
    mutationFn: () => addWalletEntry({
      memberId, source: mode, amount: mode === 'activity' ? null : mode === 'reward' && !f.amount ? null : Number(f.amount),
      activityId: (mode === 'activity' || mode === 'reward') && f.activity ? f.activity : null,
      startedAt: mode === 'activity' && act && !act.one_time ? new Date(f.start).toISOString() : null,
      endedAt: mode === 'activity' && act && !act.one_time ? new Date(f.end).toISOString() : null,
      paymentMethod: mode === 'top_up' ? f.method : null, note: f.note, kind: mode === 'adjustment' ? f.kind as 'credit' | 'debit' : undefined,
    }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['wallet'] }); qc.invalidateQueries({ queryKey: ['registers'] }); toast(`Saved. Wallet balance ${moneyExact(r.balance_after)}`); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  const submit = () => {
    setError(null)
    if (mode === 'activity') {
      if (!act) return setError('Choose the activity.')
      if (!act.one_time && !(minutes && minutes > 0)) return setError('The end time should be after the start time.')
      if (cost !== null && cost > balance) return setError(`Not enough in the wallet: the balance is ${moneyExact(balance)}, this needs ${moneyExact(cost)}.`)
    } else if (mode === 'reward') {
      if (!act && !(Number(f.amount) > 0)) return setError('Choose the reward or enter the amount.')
    } else if (!(Number(f.amount) > 0)) return setError('Enter the amount.')
    if ((mode === 'refund' || mode === 'adjustment') && !f.note.trim()) return setError('Write why, for the record.')
    save.mutate()
  }
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <p className="m-0 text-[14px]">Wallet balance now: <strong>{moneyExact(balance)}</strong></p>
      {(mode === 'activity' || mode === 'reward') && (
        <Field label={mode === 'activity' ? 'Activity' : 'Reward (an activity plan)'} required={mode === 'activity'} id="wl-act">
          <Select id="wl-act" value={f.activity} onChange={set('activity')} placeholder="Select Activity"
            options={choices.map((a) => ({ value: a.id, label: `${a.name} · ${money(Number(a.price))} ${a.one_time ? '' : `per ${Number(a.duration_hours)} hr`}`.trim() }))} />
        </Field>
      )}
      {mode === 'activity' && act && !act.one_time && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Start Time" required id="wl-start"><TextInput id="wl-start" type="datetime-local" value={f.start} onChange={set('start')} /></Field>
          <Field label="End Time" required id="wl-end"><TextInput id="wl-end" type="datetime-local" value={f.end} onChange={set('end')} /></Field>
        </div>
      )}
      {mode === 'adjustment' && <RadioGroup name="wl-kind" legend="Direction" value={f.kind} onChange={set('kind')} options={[{ value: 'credit', label: 'Add to the wallet' }, { value: 'debit', label: 'Take from the wallet' }]} />}
      {mode !== 'activity' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Amount" required={mode !== 'reward'} id="wl-amount" hint={mode === 'reward' && act ? `Empty: the plan's ${money(Number(act.price))}` : undefined}>
            <TextInput id="wl-amount" type="number" inputMode="decimal" value={f.amount} onChange={set('amount')} />
          </Field>
          {mode === 'top_up' && <Field label="Payment Method" id="wl-method"><Select id="wl-method" value={f.method} onChange={set('method')} options={methods.map((m) => ({ value: m.label, label: m.label }))} /></Field>}
        </div>
      )}
      <Field label="Note" required={mode === 'refund' || mode === 'adjustment'} id="wl-note"><TextArea id="wl-note" rows={2} value={f.note} onChange={set('note')} placeholder={mode === 'top_up' ? 'e.g. UPI ref 1234' : ''} /></Field>
      {amount !== null && after !== null && (
        <Notice tone={after < 0 ? 'warn' : 'info'}>{mode === 'activity' && minutes ? `${durationText(minutes)} · ` : ''}{moneyExact(amount)} {mode === 'activity' || (mode === 'adjustment' && f.kind === 'debit') ? 'out' : 'in'}; the balance becomes {moneyExact(after)}.</Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button></div>
    </form>
  )
}
