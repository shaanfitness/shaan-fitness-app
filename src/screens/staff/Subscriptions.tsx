import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { amt, stateChip, STATE_LABEL, type Sub } from '../../db/billing'
import { useStudio } from '../../db/studio'
import { fmtDay, plusDays, studioToday } from '../../lib/dates'
import { downloadCsv } from '../../lib/csv'
import { ClientCell } from '../../components/client'
import { ActionMenu, CheckboxGroup, Notice, TextInput } from '../../components/controls'
import { FollowUpHistory } from '../../components/FollowUp'
import { DataTable, Pager, type Column } from '../../components/table'
import { Icon, PageHeader, Sheet } from '../../components/ui'

// YDL "Subscriptions" (SubscriptionsListing) with its Subscriptions Filter panel.
const PAGE = 50

function query(studioId: string, f: { search: string; genders: string[]; states: string[]; payment: string[]; soon: number }, today: string, count = false) {
  let q = supabase.from('subscription_overview').select('*', count ? { count: 'exact' } : undefined).eq('studio_id', studioId)
    .is('deleted_at', null).is('cancelled_at', null)
  const s = f.search.replace(/[,()*"\\]/g, ' ').trim()
  if (s) q = q.or(`member_name.ilike.*${s}*,member_phone.ilike.*${s}*,invoice_no.ilike.*${s}*,plan_name.ilike.*${s}*,client_code.ilike.*${s}*`)
  if (f.genders.length) q = q.in('member_gender', f.genders)
  const st = f.states
  const ors: string[] = []
  const plain = st.filter((x) => ['active', 'pending', 'expired', 'used'].includes(x))
  if (plain.length) ors.push(`state.in.(${plain.join(',')})`)
  if (st.includes('soon')) ors.push(`and(state.eq.active,end_date.gte.${today},end_date.lte.${plusDays(today, f.soon)})`)
  if (st.includes('retained')) ors.push('is_renewal.eq.true')
  if (ors.length) q = q.or(ors.join(','))
  const pay = f.payment.filter((x) => x === 'paid' || x === 'pending')
  if (pay.length) q = q.in('payment_status', pay)
  if (f.payment.includes('failed') && !pay.length) q = q.eq('id', '00000000-0000-0000-0000-000000000000')
  return q
}

export default function Subscriptions() {
  const me = useMe()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const today = studioToday()
  const soon = Number(studio?.settings.about_to_expire_days ?? 7)
  const [search, setSearch] = useState('')
  const [genders, setGenders] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [payment, setPayment] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [panel, setPanel] = useState(false)
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null)
  const f = useMemo(() => ({ search, genders, states, payment, soon }), [search, genders, states, payment, soon])
  const list = useQuery({
    queryKey: ['subs', 'list', me.studioId, f, page],
    placeholderData: (p) => p,
    queryFn: async () => {
      const res = await query(me.studioId, f, today, true).order('invoice_date', { ascending: false }).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1)
      if (res.error) throw new Error(res.error.message)
      return { rows: (res.data ?? []) as Sub[], total: res.count ?? 0 }
    },
  })
  const rows = list.data?.rows ?? []
  const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0) }

  const exportCsv = async () => {
    const res = await query(me.studioId, f, today).order('invoice_date', { ascending: false }).limit(10000)
    if (res.error) return
    downloadCsv(`subscriptions-${today}.csv`, (res.data ?? []) as Sub[], [
      ['Invoice No.', (r) => r.invoice_no], ['Invoice Date', (r) => r.invoice_date], ['Customer Name', (r) => r.member_name], ['Customer Code', (r) => r.client_code],
      ['Mobile', (r) => (r.member_phone ? `${r.member_country_code} ${r.member_phone}` : '')], ['Plan Name', (r) => r.plan_name], ['Type', (r) => r.kind],
      ['Start Date', (r) => r.start_date], ['End Date', (r) => r.end_date], ['Plan Status', (r) => STATE_LABEL[r.state]], ['Total Price', (r) => r.total_amount],
      ['Paid Price', (r) => r.paid_amount], ['Balance Price', (r) => r.balance_amount], ['Payment Status', (r) => r.payment_status], ['Trainer', (r) => r.trainer_name],
      ['Bill Rep', (r) => r.bill_rep_name], ['Renewal', (r) => (r.is_renewal ? 'Yes' : 'No')],
    ])
  }

  const actions = (r: Sub) => <ActionMenu actions={[
    { label: 'Follow Up History', onClick: () => setHistory({ id: r.member_id, name: r.member_name }) },
    { label: 'Edit', onClick: () => navigate(`/clients/${r.member_id}/subscriptions`) },
    { label: 'Make Payment', onClick: () => navigate(`/clients/${r.member_id}/payments/${r.id}`) },
  ]} />
  const columns: Column<Sub>[] = [
    { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => <span className="font-semibold">{r.invoice_no ?? '—'}</span> },
    { key: 'invd', header: 'Invoice Date', className: 'nowrap', cell: (r) => fmtDay(r.invoice_date) },
    { key: 'name', header: 'Customer Name', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> },
    { key: 'plan', header: 'Plan Name', cell: (r) => <><div>{r.plan_name}</div>{r.kind !== 'gym' && <div className="text-[12px] text-muted">{r.kind === 'pt' ? 'Personal training' : 'Trial'}</div>}</> },
    { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => fmtDay(r.start_date) },
    { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => fmtDay(r.end_date) },
    { key: 'state', header: 'Plan Status', cell: (r) => <span className={`chip ${stateChip(r.state)}`}>{STATE_LABEL[r.state]}</span> },
    { key: 'total', header: 'Total Price', className: 'num', cell: (r) => amt(r.total_amount) },
    { key: 'paid', header: 'Paid Price', className: 'num', cell: (r) => amt(r.paid_amount) },
    { key: 'bal', header: 'Balance Price', className: 'num', cell: (r) => <span className={r.balance_amount > 0 ? 'font-semibold text-red' : ''}>{amt(r.balance_amount)}</span> },
    { key: 'pay', header: 'Payment Status', cell: (r) => (r.payment_status === 'paid' ? <span className="chip chip-green">Paid</span> : <span className="chip chip-amber">Pending</span>) },
    { key: 'act', header: 'Action', cell: actions },
  ]
  const card = (r: Sub) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2"><ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} />
        <span className={`chip ${stateChip(r.state)}`}>{STATE_LABEL[r.state]}</span></div>
      <div className="text-[13px]">{r.plan_name} · {fmtDay(r.start_date)} – {fmtDay(r.end_date)}</div>
      <div className="text-[12px] text-muted">{r.invoice_no} · Total {amt(r.total_amount)} · Paid {amt(r.paid_amount)} · <span className={r.balance_amount > 0 ? 'text-red' : ''}>Balance {amt(r.balance_amount)}</span></div>
      {actions(r)}
    </div>
  )
  const active = genders.length + states.length + payment.length
  return (
    <>
      <PageHeader title="Subscriptions Listing" sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={<button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button>} />
      <div className="flex flex-col gap-3 px-5 pt-5 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={set(setSearch)} placeholder="Search name, mobile, invoice no. or plan" className="pl-9" />
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setPanel(true)}><Icon name="filter" size={16} />Subscriptions Filter{active ? ` (${active})` : ''}</button>
          {active > 0 && <button type="button" className="link-btn text-[13px]" onClick={() => { setGenders([]); setStates([]); setPayment([]); setPage(0) }}>Clear filters</button>}
          <span className="ml-auto text-[13px] text-muted">{list.data ? `${list.data.total} subscriptions` : ''}</span>
        </div>
        {list.error && <Notice tone="error">{(list.error as Error).message}</Notice>}
        <DataTable caption="Subscriptions" rows={rows} loading={list.isLoading} rowKey={(r) => r.id} columns={columns} card={card} empty="No subscriptions match." />
        <Pager page={page} pageSize={PAGE} total={list.data?.total ?? 0} onPage={setPage} />
      </div>
      <Sheet open={panel} onClose={() => setPanel(false)} title="Filters" wide>
        <div className="flex flex-col gap-5">
          <CheckboxGroup legend="Gender" values={genders} onChange={set(setGenders)} options={[{ value: 'male', label: 'Total Males' }, { value: 'female', label: 'Total Females' }]} />
          <CheckboxGroup legend="Subscription Status" values={states} onChange={set(setStates)} columns={2} options={[
            { value: 'active', label: 'Active Subscriptions' }, { value: 'pending', label: 'Pending Subscriptions' }, { value: 'expired', label: 'Expired Subscriptions' },
            { value: 'soon', label: `About to expire (${soon} days)` }, { value: 'retained', label: 'Retained Subscriptions' }, { value: 'used', label: 'Used Subscriptions' }]} />
          <CheckboxGroup legend="Payment Status" values={payment} onChange={set(setPayment)} columns={3} options={[{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }]} />
          <p className="m-0 text-[12px] text-muted">Failed and Bounced Subscriptions come from autopay, once recurring payments are switched on.</p>
          <button type="button" className="btn-gold" onClick={() => setPanel(false)}>Apply</button>
        </div>
      </Sheet>
      <FollowUpHistory member={history} onClose={() => setHistory(null)} />
    </>
  )
}
