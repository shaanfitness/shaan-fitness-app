import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useMe } from '../../../auth'
import { useBatches, useList, usePlans, useServices, useTeam } from '../../../db/studio'
import {
  report, type Billing, type BranchRow, type Collection, type DailyCollection, type DailyRow, type ExpenseSide, type ExpenseYear, type Forecast,
  type Leaderboard as LeaderboardData, type PlanRow, type ProfitLoss, type PtInsight, type StaffSplit, type SubscriptionsInsight, type TargetRow,
} from '../../../db/analysis'
import { Notice, Select, TextInput } from '../../../components/controls'
import { Icon, Sheet } from '../../../components/ui'
import { fmtClock } from '../../../lib/dates'
import {
  AnalysisPage, BarList, Block, Card, ColumnChart, CsvButton, Grid, Hero, LineChart, MONTHS, MONTHS_SHORT, MonthControl, PickControl, RangeControl,
  ReportBody, Table, ThisThat, Tiles, YearControl, amount, count, dec, num, rangeFor, rangeTitle, thisMonth, thisYear, useReport, useThisThat,
  type Col, type RangeValue,
} from './kit'

const staffOptions = (team: ReturnType<typeof useTeam>) => team.everyone.map((s) => ({ value: s.id, label: s.full_name }))
const TARGET_TYPE: Record<string, string> = { pt: 'PT', general: 'General', both: 'Both', new_pt: 'New PT', new_general: 'New General', renew_pt: 'Renew PT', renew_general: 'Renew General' }

// ---------------------------------------------------------------------------------------------
// Shared blocks: collections by service, mode and source; collections per staff member
// ---------------------------------------------------------------------------------------------
function ServicesTable({ s, caption }: { s: Collection['services']; caption: string }) {
  const rows = [
    { k: 'Gym', n: s.gym_new, r: s.gym_renewal }, { k: 'PT', n: s.pt_new, r: s.pt_renewal },
    ...(num(s.other) ? [{ k: 'Other (freeze, transfer and store fees)', n: 0, r: 0, t: s.other }] : []),
  ]
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="tbl">
        <caption className="sr-only">{caption}</caption>
        <thead><tr><th>Services</th><th className="num">New Membership</th><th className="num">Renewal</th><th className="num">Total</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}><td>{r.k}</td><td className="num">{'t' in r ? '—' : amount(r.n)}</td><td className="num">{'t' in r ? '—' : amount(r.r)}</td>
              <td className="num font-bold">{amount('t' in r ? r.t : num(r.n) + num(r.r))}</td></tr>
          ))}
          <tr className="font-bold"><td className="border-t border-line">Total</td><td className="num border-t border-line">{amount(num(s.gym_new) + num(s.pt_new))}</td>
            <td className="num border-t border-line">{amount(num(s.gym_renewal) + num(s.pt_renewal))}</td><td className="num border-t border-line">{amount(s.total)}</td></tr>
        </tbody>
      </table>
    </div>
  )
}

function ServicesChart({ s, caption }: { s: Collection['services']; caption: string }) {
  return <ColumnChart caption={caption} labels={['Gym', 'PT']} height={180} format={amount}
    series={[{ name: 'New Membership', values: [num(s.gym_new), num(s.pt_new)] }, { name: 'Renewal', values: [num(s.gym_renewal), num(s.pt_renewal)] }]} />
}

const labeledRows = (rows: Collection['modes']) => rows.map((r) => ({ label: r.label, value: num(r.amount), note: `${count(r.n)} receipt${num(r.n) === 1 ? '' : 's'}` }))

const staffCols = (totalLabel: string): Col<StaffSplit>[] => [
  { key: 'name', header: 'Staff Name', cell: (r) => <>{r.name}{r.staff_code && <span className="text-faint"> ({r.staff_code})</span>}</>, csv: (r) => r.name },
  { key: 'ptr', header: 'PT Renewal', num: true, cell: (r) => amount(r.pt_renewal), csv: (r) => r.pt_renewal },
  { key: 'ptn', header: 'PT New', num: true, cell: (r) => amount(r.pt_new), csv: (r) => r.pt_new },
  { key: 'gr', header: 'Gym Renewal', num: true, cell: (r) => amount(r.gym_renewal), csv: (r) => r.gym_renewal },
  { key: 'gn', header: 'Gym New', num: true, cell: (r) => amount(r.gym_new), csv: (r) => r.gym_new },
  { key: 'tot', header: totalLabel, num: true, cell: (r) => <b>{amount(r.total)}</b>, csv: (r) => r.total },
]

function TargetTable({ rows }: { rows: TargetRow[] }) {
  return (
    <Table caption="Targets" rowKey={(t, i) => `${t.staff_id}-${t.year}-${t.month}-${i}`} rows={rows} empty="No targets set for these months (Staff › Staff/Trainer Target)." cols={[
      { key: 'n', header: 'Staff/Trainer', cell: (t) => <>{t.name}<div className="text-[12px] text-faint">{MONTHS_SHORT[t.month - 1]} {t.year}</div></> },
      { key: 't', header: 'Target Type', cell: (t) => (t.target_type ? TARGET_TYPE[t.target_type] ?? t.target_type : 'All sales') },
      { key: 'a', header: 'Total Achieved', num: true, cell: (t) => <b>{amount(t.achieved)}</b> },
      { key: 'r', header: 'Target Achieved', cell: (t) => (t.tier_reached ? <span className="chip chip-gold">Target {t.tier_reached}</span> : <span className="text-muted">Not yet</span>) },
      ...[0, 1, 2, 3, 4].map((i) => ({ key: `t${i}`, header: `Target ${i + 1}`, num: true, cell: (t: TargetRow) => (t.targets[i] !== undefined ? amount(t.targets[i]) : '—') })),
    ]} />
  )
}

// ---------------------------------------------------------------------------------------------
// Collection Analysis (This v/s That)
// ---------------------------------------------------------------------------------------------
export function CollectionAnalysis() {
  const { studioId } = useMe()
  const team = useTeam()
  const tt = useThisThat('last_90')
  const args = (s: 'This' | 'That') => ({ p_studio: studioId, p_from: tt.range(s).from, p_to: tt.range(s).to, p_client_rep: tt.staff(s) || null })
  const thisQ = useReport('collection', [args('This')], () => report<Collection>('analysis_collection', args('This')))
  const thatQ = useReport('collection', [args('That')], () => report<Collection>('analysis_collection', args('That')))
  const q = (s: 'This' | 'That') => (s === 'This' ? thisQ : thatQ)
  const err = thisQ.error ?? thatQ.error
  return (
    <AnalysisPage title="Collection Analysis">
      <Block title="This v/s That Comparison" sub="Receipts by receipt date">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {(['This', 'That'] as const).map((s) => (
            <fieldset key={s} className="card m-0 flex min-w-0 flex-wrap items-end gap-2 p-4">
              <legend className="sr-only">{s}</legend>
              <span className="w-full text-[13px] font-bold">{s}</span>
              <RangeControl value={tt.range(s)} onChange={tt.setRange(s)} />
              <PickControl label="Select Client Rep" value={tt.staff(s)} onChange={tt.setStaff(s)} options={staffOptions(team)} />
            </fieldset>
          ))}
        </div>
        {err && <Notice tone="error">{err.message}</Notice>}
      </Block>
      <Block title="Collections">
        <ThisThat render={(s) => {
          const d = q(s).data
          return (
            <Card key={s} title={`Collection Analysis · ${s}`} sub={rangeTitle(tt.range(s))} className={q(s).isFetching ? 'opacity-60' : ''}>
              {d ? <><ServicesChart s={d.services} caption={`Collections, ${s}`} /><ServicesTable s={d.services} caption={`Collections by service, ${s}`} /></> : <p className="m-0 text-muted">Loading…</p>}
            </Card>
          )
        }} />
      </Block>
      <Block title="Mode of Payments">
        <ThisThat render={(s) => (
          <Card key={s} title={`${s}`} sub={rangeTitle(tt.range(s))}>
            {q(s).data && <BarList caption={`Collections by mode of payment, ${s}`} rows={labeledRows(q(s).data!.modes)} format={amount} empty="No receipts in these dates." />}
          </Card>
        )} />
      </Block>
      <Block title="Mode Of Promotion" sub="The client's source of promotion">
        <ThisThat render={(s) => (
          <Card key={s} title={`${s}`} sub={rangeTitle(tt.range(s))}>
            {q(s).data && <BarList caption={`Collections by source of promotion, ${s}`} rows={labeledRows(q(s).data!.promotion)} format={amount} empty="No receipts in these dates." />}
          </Card>
        )} />
      </Block>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Subscriptions Analysis
// ---------------------------------------------------------------------------------------------
export function SubscriptionsAnalysis() {
  const { studioId } = useMe()
  const team = useTeam()
  const [year, setYear] = useState(thisYear)
  const [range, setRange] = useState<RangeValue>({ key: 'all', from: '', to: '' })
  const [rep, setRep] = useState('')
  const [gender, setGender] = useState('')
  const q = useReport('subscriptions', [year, range.from, range.to, rep, gender], () => report<SubscriptionsInsight>('analysis_subscriptions', {
    p_studio: studioId, p_year: year, p_from: range.from || null, p_to: range.to || null, p_client_rep: rep || null, p_gender: gender || null,
  }))
  const cols: Col<PlanRow>[] = [
    { key: 'name', header: 'Membership Name', cell: (r) => r.name },
    { key: 'subs', header: 'Subscriptions', num: true, cell: (r) => <b>{count(r.subscriptions)}</b>, csv: (r) => r.subscriptions },
    { key: 'act', header: 'Active', num: true, cell: (r) => count(r.active), csv: (r) => r.active },
    { key: 'pen', header: 'Pending', num: true, cell: (r) => count(r.pending), csv: (r) => r.pending },
    { key: 'ina', header: 'Inactive', num: true, cell: (r) => count(r.inactive), csv: (r) => r.inactive },
    { key: 'bill', header: 'Billing', num: true, cell: (r) => amount(r.billing), csv: (r) => r.billing },
    { key: 'rec', header: 'Amount Received', num: true, cell: (r) => amount(r.received), csv: (r) => r.received },
    { key: 'bal', header: 'Balance', num: true, cell: (r) => amount(r.balance), csv: (r) => r.balance },
  ]
  const total = (rows: PlanRow[]): PlanRow => rows.reduce((t, r) => ({ ...t, subscriptions: t.subscriptions + num(r.subscriptions), active: t.active + num(r.active),
    pending: t.pending + num(r.pending), inactive: t.inactive + num(r.inactive), billing: num(t.billing) + num(r.billing), received: num(t.received) + num(r.received),
    balance: num(t.balance) + num(r.balance) }), { plan_id: 'total', name: 'Total', subscriptions: 0, active: 0, pending: 0, inactive: 0, billing: 0, received: 0, balance: 0 })
  return (
    <AnalysisPage title="Subscriptions Analysis">
      <ReportBody q={q}>{(d) => {
        const max = d.max && num(d.max.total) > 0 ? `${MONTHS[d.max.month - 1]} · ${count(d.max.total)}` : '—'
        return <>
          <Block title={`Subscriptions Analysis Year (${d.year})`} sub="Gym and PT subscriptions by invoice date" action={<YearControl value={year} onChange={setYear} />}>
            <Tiles items={[
              { label: 'Average Subscriptions Per Month', value: dec(d.average.total, 1), hint: `PT ${dec(d.average.pt, 1)} · Gym ${dec(d.average.gym, 1)}` },
              { label: 'Max Subscriptions Of Month In Year', value: max },
              { label: 'Subscriptions in the year', value: count(d.months.reduce((a, m) => a + num(m.total), 0)) },
            ]} />
            <Card>
              {(() => {
                // Months still to come aren't zero yet, so the line stops at this month.
                const shown = d.months.slice(0, d.months_elapsed || 12)
                return <LineChart caption={`Subscriptions per month, ${d.year}`} labels={shown.map((m) => MONTHS_SHORT[m.month - 1])} titles={shown.map((m) => `${MONTHS[m.month - 1]} ${d.year}`)}
                  series={[{ name: 'Gym', values: shown.map((m) => num(m.gym)) }, { name: 'PT', values: shown.map((m) => num(m.pt)) }]} />
              })()}
            </Card>
          </Block>
          <Block title="Membership Plan Subscriptions Insights (According to Invoice date)" sub={range.from ? rangeTitle(range) : 'All invoice dates'}
            action={<CsvButton filename="membership-plan-insights.csv" rows={d.plans} cols={cols} />}>
            <div className="flex flex-wrap items-end gap-2">
              {range.key === 'all'
                ? <button type="button" className="btn btn-sm" onClick={() => setRange(rangeFor('this_month'))}><Icon name="calendar" size={16} />Choose invoice dates</button>
                : <><RangeControl value={range} onChange={setRange} label="Invoice Date" /><button type="button" className="btn btn-sm" onClick={() => setRange({ key: 'all', from: '', to: '' })}>All dates</button></>}
              <PickControl label="Client Rep." value={rep} onChange={setRep} options={staffOptions(team)} />
              <PickControl label="Gender" value={gender} onChange={setGender} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
            </div>
            <Table caption="Subscriptions by membership plan" rowKey={(r) => r.plan_id} rows={d.plans} total={d.plans.length ? total(d.plans) : null} cols={cols} empty="No subscriptions for these filters." />
          </Block>
        </>
      }}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Expense Analysis
// ---------------------------------------------------------------------------------------------
export function ExpenseAnalysis() {
  const { studioId } = useMe()
  const [year, setYear] = useState(thisYear)
  const tt = useThisThat('this_year')
  const yq = useReport('expenses', [year], () => report<ExpenseYear>('analysis_expenses', { p_studio: studioId, p_year: year }))
  const args = (s: 'This' | 'That') => ({ p_studio: studioId, p_from: tt.range(s).from, p_to: tt.range(s).to })
  const thisQ = useReport('expense-side', [args('This')], () => report<ExpenseSide>('analysis_expense_compare', args('This')))
  const thatQ = useReport('expense-side', [args('That')], () => report<ExpenseSide>('analysis_expense_compare', args('That')))
  const q = (s: 'This' | 'That') => (s === 'This' ? thisQ : thatQ)
  const side = (title: string, sub: string, body: (d: ExpenseSide, s: 'This' | 'That') => ReactNode) => (
    <Block title={title} sub={sub}>
      <ThisThat render={(s) => (
        <Card key={s} title={s} sub={rangeTitle(tt.range(s))} className={q(s).isFetching ? 'opacity-60' : ''}>
          {q(s).data ? body(q(s).data!, s) : <p className="m-0 text-muted">Loading…</p>}
        </Card>
      )} />
    </Block>
  )
  return (
    <AnalysisPage title="Expense Analysis">
      <ReportBody q={yq}>{(d) => <>
        <Block title={`Expense Analysis Year (${d.year})`} sub="Salaries from the Payroll Register plus everything on the Expense page" action={<YearControl value={year} onChange={setYear} />}>
          <Card>
            <ColumnChart caption={`Expenses per month, ${d.year}`} labels={MONTHS_SHORT} titles={MONTHS.map((m) => `${m} ${d.year}`)} format={amount}
              series={[{ name: 'Expenses', values: d.months.map((m) => num(m.amount)) }]} />
          </Card>
        </Block>
        <Block title="Average Expense Data">
          <Tiles items={[
            { label: 'Yearly per month Avg', value: amount(d.year_avg.amount), hint: `Count: ${count(d.year_avg.n)}` },
            ...d.quarters.map((x) => ({ label: `Q${x.quarter} Monthly Avg`, value: amount(x.amount), hint: `Count: ${count(x.n)}` })),
          ]} />
        </Block>
      </>}</ReportBody>
      <Block title="This v/s That Comparison">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {(['This', 'That'] as const).map((s) => (
            <fieldset key={s} className="card m-0 flex min-w-0 flex-wrap items-end gap-2 p-4">
              <legend className="sr-only">{s}</legend>
              <span className="w-full text-[13px] font-bold">{s}</span>
              <RangeControl value={tt.range(s)} onChange={tt.setRange(s)} />
            </fieldset>
          ))}
        </div>
        {(thisQ.error || thatQ.error) && <Notice tone="error">{(thisQ.error ?? thatQ.error)!.message}</Notice>}
      </Block>
      {side('Expense Amount Analysis', 'Total Expense Analysis', (d, s) => <>
        <div className="text-[28px] leading-none font-bold">{amount(d.total)}</div>
        <BarList caption={`Salary and vendor expenses, ${s}`} format={amount} rows={[{ label: 'Salary Expenses', value: num(d.salary) }, { label: 'Vendor Expenses', value: num(d.vendor) }]} />
      </>)}
      {side('Salary Expense Analysis', 'Salary Expense', (d, s) => (
        <BarList caption={`Salary expenses, ${s}`} format={amount} rows={[{ label: 'Trainer', value: num(d.trainer) }, { label: 'Staff', value: num(d.staff) },
          ...(num(d.unlinked) ? [{ label: 'Salary typed on the Expense page', value: num(d.unlinked) }] : [])]} />
      ))}
      {side('Staff Expense Analysis', 'Staff salaries by type', (d, s) => (
        <BarList caption={`Staff salaries by type, ${s}`} format={amount} rows={d.staff_types.map((x) => ({ label: x.label, value: num(x.amount) }))} empty="No staff salaries in these dates." />
      ))}
      {side('Trainer Expense Analysis', 'Trainer salaries by type', (d, s) => (
        <BarList caption={`Trainer salaries by type, ${s}`} format={amount} rows={d.trainer_types.map((x) => ({ label: x.label, value: num(x.amount) }))} empty="No trainer salaries in these dates." />
      ))}
      {side('Vendor Wise Analysis', 'Vendor expenses', (d, s) => (
        <BarList caption={`Expenses by vendor, ${s}`} format={amount} empty="No vendor expenses in these dates."
          rows={[...d.vendors.map((x) => ({ label: x.label, value: num(x.amount) })), ...(num(d.non_registered) ? [{ label: 'Non Register Vendor', value: num(d.non_registered) }] : [])]} />
      ))}
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Profit & Loss Analysis
// ---------------------------------------------------------------------------------------------
export function ProfitLossAnalysis() {
  const { studioId } = useMe()
  const [year, setYear] = useState(thisYear)
  const q = useReport('profit-loss', [year], () => report<ProfitLoss>('analysis_profit_loss', { p_studio: studioId, p_year: year }))
  const signed = (n: number) => (n < 0 ? `−${amount(-n)}` : amount(n))
  return (
    <AnalysisPage title="Profit & Loss Analysis" filters={<YearControl value={year} onChange={setYear} />}>
      <ReportBody q={q}>{(d) => {
        const profit = num(d.totals.profit)
        const monthRow = (label: string, pick: (m: ProfitLoss['months'][number]) => number, bold = false) => (
          <tr key={label} className={bold ? 'font-bold' : ''}><td className="nowrap">{label}</td>{d.months.map((m) => <td key={m.month} className="num nowrap">{signed(pick(m))}</td>)}
            <td className="num nowrap font-bold">{signed(d.months.reduce((a, m) => a + pick(m), 0))}</td></tr>
        )
        const group = (label: string) => <tr key={label}><td colSpan={14} className="pt-4 text-[11px] font-bold tracking-[.06em] text-muted uppercase">{label}</td></tr>
        const hasOther = d.months.some((m) => num(m.other))
        return <>
          <Block title={`Profit & Loss Analysis Year (${d.year})`}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
              <Card>
                <Hero label={profit < 0 ? `Loss in ${d.year}` : `Profit in ${d.year}`} value={signed(profit)} />
                <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[14px]">
                  <dt className="text-muted">Total Collection</dt><dd className="m-0 text-right font-bold">{amount(d.totals.collection)}</dd>
                  <dt className="text-muted">Total Expenses</dt><dd className="m-0 text-right font-bold">{amount(d.totals.expense)}</dd>
                </dl>
              </Card>
              <Card title="Collection v/s Expenses by month">
                <ColumnChart caption={`Collection and expenses per month, ${d.year}`} labels={MONTHS_SHORT} titles={MONTHS.map((m) => `${m} ${d.year}`)} format={amount}
                  series={[{ name: 'Collection', values: d.months.map((m) => num(m.collection)) }, { name: 'Expenses', values: d.months.map((m) => num(m.expense)) }]} />
              </Card>
            </div>
          </Block>
          <Block title="Profit & Loss Breakdown" sub="Total Collection Breakdown and Total Expense Breakdown, month by month">
            <div className="card overflow-x-auto">
              <table className="tbl">
                <caption className="sr-only">Collections, expenses and profit by month</caption>
                <thead><tr><th />{MONTHS.map((m) => <th key={m} className="num">{m.slice(0, 3)}</th>)}<th className="num">Year</th></tr></thead>
                <tbody>
                  {group('Collection')}
                  {monthRow('New Membership', (m) => num(m.new))}
                  {monthRow('Renewal', (m) => num(m.renewal))}
                  {hasOther && monthRow('Other fees', (m) => num(m.other))}
                  {monthRow('Total Collection', (m) => num(m.collection), true)}
                  {group('Expenses')}
                  {monthRow('Salary Expense', (m) => num(m.salary))}
                  {monthRow('Vendor Expense', (m) => num(m.vendor))}
                  {monthRow('Total Expense', (m) => num(m.expense), true)}
                  {group('Profit & Loss')}
                  {monthRow('Collection − Expenses', (m) => num(m.profit), true)}
                </tbody>
              </table>
            </div>
          </Block>
        </>
      }}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Billing Analysis and Sales Leaderboard (YDL's two pages share the filters)
// ---------------------------------------------------------------------------------------------
interface BillFilter { plan: string; service: string; created_by: string; mode: string; status: string; client_rep: string; gender: string; sub_status: string; batch: string }
const NO_FILTER: BillFilter = { plan: '', service: '', created_by: '', mode: '', status: '', client_rep: '', gender: '', sub_status: '', batch: '' }

function useBilling() {
  const { studioId } = useMe()
  const [range, setRange] = useState<RangeValue>(() => rangeFor('this_month'))
  const [f, setF] = useState<BillFilter>(NO_FILTER)
  const q = useReport('billing', [range.from, range.to, f], () => report<Billing>('analysis_billing', { p_studio: studioId, p_from: range.from, p_to: range.to, p_filter: f }))
  return { range, setRange, f, setF, q }
}

function BillingFilters({ f, setF }: { f: BillFilter; setF: (f: BillFilter) => void }) {
  const team = useTeam()
  const { data: plans = [] } = usePlans()
  const { data: services = [] } = useServices()
  const { data: batches = [] } = useBatches()
  const modes = useList('payment_mode')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(f)
  const on = Object.values(f).filter(Boolean).length
  const set = (k: keyof BillFilter) => (v: string) => setDraft({ ...draft, [k]: v })
  const sel = (k: keyof BillFilter, label: string, placeholder: string, options: { value: string; label: string }[]) => (
    <div className="field"><label htmlFor={`bf-${k}`}>{label}</label><Select id={`bf-${k}`} value={draft[k]} onChange={set(k)} placeholder={placeholder} options={options} /></div>
  )
  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => { setDraft(f); setOpen(true) }}><Icon name="filter" size={16} />Filters{on ? ` (${on})` : ''}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Filters" wide>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sel('plan', 'Membership plan', 'All membership plans', plans.map((p) => ({ value: p.id, label: p.active ? p.name : `${p.name} (inactive)` })))}
          {sel('service', 'Service', 'Select Service', services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name || s.name })))}
          {sel('created_by', 'Created by', 'Anyone', staffOptions(team))}
          {sel('mode', 'Payment mode', 'Select Payment Mode', modes.map((m) => ({ value: m.label, label: m.label })))}
          {sel('status', 'Status', 'Paid', [{ value: 'cancelled', label: 'Cancel' }])}
          {sel('client_rep', 'Client Rep', 'Anyone', staffOptions(team))}
          {sel('gender', 'Gender', 'Gender', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }])}
          {sel('sub_status', 'Subscription Status', 'Subscription Status', [{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'expired', label: 'Expired' }])}
          {sel('batch', 'Batch', 'Batch List', batches.map((b) => ({ value: b.id, label: `${fmtClock(b.start_time)} - ${fmtClock(b.end_time)}${b.name ? ` · ${b.name}` : ''}` })))}
        </div>
        <div className="flex justify-end gap-2 pt-5">
          <button type="button" className="btn" onClick={() => { setDraft(NO_FILTER); setF(NO_FILTER); setOpen(false) }}>Clear</button>
          <button type="button" className="btn-gold" onClick={() => { setF(draft); setOpen(false) }}>Submit</button>
        </div>
      </Sheet>
    </>
  )
}

export function BillingAnalysis() {
  const { range, setRange, f, setF, q } = useBilling()
  const planCols: Col<PlanRow>[] = [
    { key: 'name', header: 'Membership Name', cell: (r) => r.name },
    { key: 'subs', header: 'Subscriptions', num: true, cell: (r) => <b>{count(r.subscriptions)}</b>, csv: (r) => r.subscriptions },
    { key: 'act', header: 'Active', num: true, cell: (r) => count(r.active), csv: (r) => r.active },
    { key: 'pen', header: 'Pending', num: true, cell: (r) => count(r.pending), csv: (r) => r.pending },
    { key: 'ina', header: 'Inactive', num: true, cell: (r) => count(r.inactive), csv: (r) => r.inactive },
    { key: 'new', header: 'New', num: true, cell: (r) => count(r.new), csv: (r) => r.new },
    { key: 'ren', header: 'Renewal', num: true, cell: (r) => count(r.renewal), csv: (r) => r.renewal },
    { key: 'paid', header: 'Total Paid', num: true, cell: (r) => amount(r.paid), csv: (r) => r.paid },
    { key: 'bill', header: 'Total Bill Amount', num: true, cell: (r) => amount(r.bill), csv: (r) => r.bill },
  ]
  const sub = rangeTitle(range)
  return (
    <AnalysisPage title="Billing Analysis" filters={<><RangeControl value={range} onChange={setRange} /><BillingFilters f={f} setF={setF} /></>}>
      <ReportBody q={q}>{(d) => <>
        <Block title="Collection Report" sub={sub}>
          <Tiles items={[
            { label: 'Collections', value: amount(d.services.total), hint: `${count(d.services.receipts)} receipts` },
            { label: 'Billing', value: amount(d.billing), hint: 'Bills made in these dates' },
            { label: 'Balance Amount', value: amount(d.balance), hint: 'Still due on those bills' },
          ]} />
          <Grid>
            <Card title="Collections"><ServicesChart s={d.services} caption="Collections by service" /></Card>
            <Card title="Collections by service"><ServicesTable s={d.services} caption="Collections by service" /></Card>
          </Grid>
        </Block>
        <div className="px-5 lg:px-8">
          <Grid>
            <Card title="Source Of Promotion" sub={sub}><BarList caption="Collections by source of promotion" format={amount} rows={labeledRows(d.promotion)} empty="No receipts in these dates." /></Card>
            <Card title="Mode of Payments" sub={sub}><BarList caption="Collections by mode of payment" format={amount} rows={labeledRows(d.modes)} empty="No receipts in these dates." /></Card>
          </Grid>
        </div>
        <Block title="Membership Plan Subscriptions Insights (According to Invoice date)" sub={sub} action={<CsvButton filename={`billing-plans-${range.from}-${range.to}.csv`} rows={d.plans} cols={planCols} />}>
          <Table caption="Bills by membership plan" rowKey={(r) => r.plan_id} rows={d.plans} cols={planCols} empty="No bills in these dates." />
        </Block>
        <Block title="Bills According to Bill Rep" sub={`${sub} · collections`}>
          <Table caption="Collections by bill rep" rowKey={(r, i) => r.staff_id ?? `n${i}`} rows={d.bill_rep} cols={staffCols('Total Collection')} />
        </Block>
        <Block title="Target Analysis"><TargetTable rows={d.targets} /></Block>
        <Block title="Bills According to Client Rep" sub={sub}>
          <Table caption="Collections by client rep" rowKey={(r, i) => r.staff_id ?? `n${i}`} rows={d.client_rep} cols={staffCols('Total Amount')} />
        </Block>
        <Block title="Bills Created By" sub={sub}>
          <Table caption="Collections by who made the receipt" rowKey={(r, i) => r.staff_id ?? `n${i}`} rows={d.created_by} cols={staffCols('Total Amount')} />
        </Block>
      </>}</ReportBody>
    </AnalysisPage>
  )
}

export function SalesLeaderboard() {
  const { range, setRange, f, setF, q } = useBilling()
  const sub = rangeTitle(range)
  const billCols: Col<StaffSplit>[] = [
    ...staffCols('Total Collection').slice(0, 5),
    { key: 'hi', header: 'Highest Target Assigned', num: true, cell: (r) => (r.highest ? amount(r.highest) : '0'), csv: (r) => r.highest ?? 0 },
    { key: 'tot', header: 'Total Collection (Target Achieved)', num: true, cell: (r) => <b>{amount(r.total)}</b>, csv: (r) => r.total },
    { key: 'pct', header: 'Target Achieved (%)', num: true, cell: (r) => (r.pct === null || r.pct === undefined ? 'NA' : `${dec(r.pct, 1)}%`), csv: (r) => r.pct ?? 'NA' },
  ]
  return (
    <AnalysisPage title="Sales Leaderboard" filters={<><RangeControl value={range} onChange={setRange} /><BillingFilters f={f} setF={setF} /></>}
      actions={q.data ? <CsvButton filename={`sales-leaderboard-${range.from}-${range.to}.csv`} rows={q.data.bill_rep} cols={billCols} /> : null}>
      <ReportBody q={q}>{(d) => <>
        <Block title="Bills According to Bill Rep" sub={sub}>
          <Grid>
            <Card title="Leaderboard"><BarList caption="Collections by bill rep" format={amount} rows={d.bill_rep.map((r) => ({ label: r.name, value: num(r.total) }))} empty="No collections in these dates." /></Card>
            <Tiles items={[{ label: 'Total Collection', value: amount(d.services.total) }, { label: 'Balance Amount', value: amount(d.balance) }]} />
          </Grid>
          <Table caption="Collections and targets by bill rep" rowKey={(r, i) => r.staff_id ?? `n${i}`} rows={d.bill_rep} cols={billCols} />
        </Block>
        <Block title="Bills According to Client Rep" sub={sub}>
          <Table caption="Collections by client rep" rowKey={(r, i) => r.staff_id ?? `n${i}`} rows={d.client_rep} cols={staffCols('Total Amount')} />
        </Block>
      </>}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Daily Collection Analysis
// ---------------------------------------------------------------------------------------------
export function DailyCollectionAnalysis() {
  const { studioId } = useMe()
  const team = useTeam()
  const [year, setYear] = useState(thisYear)
  const [month, setMonth] = useState(thisMonth)
  const [createdBy, setCreatedBy] = useState('')
  const [billRep, setBillRep] = useState('')
  const q = useReport('daily-collection', [year, month, createdBy, billRep], () => report<DailyCollection>('analysis_daily_collection', {
    p_studio: studioId, p_year: year, p_month: month, p_created_by: createdBy || null, p_bill_rep: billRep || null,
  }))
  const an = (a: { amount: number; n: number }) => <>{amount(a.amount)} <span className="text-faint">({count(a.n)})</span></>
  const cols: Col<DailyRow>[] = [
    { key: 'd', header: 'Date', nowrap: true, cell: (r) => format(parseISO(r.d), 'dd MMM, EEE'), csv: (r) => r.d },
    { key: 'enq', header: 'Total New Enquiries Added', num: true, cell: (r) => count(r.enquiries), csv: (r) => r.enquiries },
    { key: 'bill', header: 'Total Billing Amount', num: true, cell: (r) => amount(r.billing), csv: (r) => r.billing },
    { key: 'rec', header: 'Total Amount Received', num: true, cell: (r) => <b>{amount(r.received)}</b>, csv: (r) => r.received },
    { key: 'spot', header: 'Spot Client Conversion', num: true, cell: (r) => an(r.spot), csv: (r) => `${r.spot.amount} (${r.spot.n})` },
    { key: 'cg', header: 'Converted (Gym-New)', num: true, cell: (r) => count(r.conv_gym), csv: (r) => r.conv_gym },
    { key: 'cp', header: 'Converted (PT-New)', num: true, cell: (r) => count(r.conv_pt), csv: (r) => r.conv_pt },
    { key: 'ng', header: 'New Amount (Gym)', num: true, cell: (r) => an(r.new_gym), csv: (r) => `${r.new_gym.amount} (${r.new_gym.n})` },
    { key: 'np', header: 'New Amount (PT)', num: true, cell: (r) => an(r.new_pt), csv: (r) => `${r.new_pt.amount} (${r.new_pt.n})` },
    { key: 'rg', header: 'Renewal Amount (Gym)', num: true, cell: (r) => an(r.ren_gym), csv: (r) => `${r.ren_gym.amount} (${r.ren_gym.n})` },
    { key: 'rp', header: 'Renewal Amount (PT)', num: true, cell: (r) => an(r.ren_pt), csv: (r) => `${r.ren_pt.amount} (${r.ren_pt.n})` },
    { key: 'v', header: 'View', cell: (r) => (num(r.received) ? <Link to={`/print/collection?from=${r.d}&to=${r.d}`} target="_blank" className="link-btn">View</Link> : null), csv: () => '' },
  ]
  const title = `${MONTHS[month - 1]} ${year}`
  return (
    <AnalysisPage title="Daily Collection Analysis" filters={<>
      <YearControl value={year} onChange={setYear} /><MonthControl value={month} onChange={setMonth} />
      <PickControl label="Created by" value={createdBy} onChange={setCreatedBy} options={staffOptions(team)} />
      <PickControl label="Bill rep" value={billRep} onChange={setBillRep} options={staffOptions(team)} />
    </>} actions={q.data ? <>
      <a className="btn btn-sm" href={`/print/collection?from=${q.data.from}&to=${q.data.to}`} target="_blank" rel="noreferrer"><Icon name="doc" size={16} />Report in PDF</a>
      <CsvButton filename={`daily-collection-${year}-${String(month).padStart(2, '0')}.csv`} rows={q.data.days} cols={cols} />
    </> : null}>
      <ReportBody q={q}>{(d) => <>
        <Block title={`Total Summary ${title}`}>
          <Tiles items={[
            { label: 'Total New Enquiries Added', value: count(d.summary.enquiries), hint: `${count(d.summary.open_enquiries)} open enquiries now` },
            { label: 'Total Client Converted', value: count(num(d.summary.conv_gym) + num(d.summary.conv_pt)), hint: `Gym-New ${count(d.summary.conv_gym)} · PT-New ${count(d.summary.conv_pt)}` },
            { label: 'Total New Amount Received', value: amount(num(d.summary.new_gym.amount) + num(d.summary.new_pt.amount)), hint: `Gym ${amount(d.summary.new_gym.amount)} · PT ${amount(d.summary.new_pt.amount)}` },
            { label: 'Total Renewal Amount Received', value: amount(num(d.summary.ren_gym.amount) + num(d.summary.ren_pt.amount)), hint: `Gym ${amount(d.summary.ren_gym.amount)} · PT ${amount(d.summary.ren_pt.amount)}` },
            { label: 'Total Amount Received', value: amount(d.summary.received), hint: `Billing ${amount(d.summary.billing)}` },
          ]} />
          <Card title="Received per day">
            <ColumnChart caption={`Amount received per day, ${title}`} format={amount} labels={d.days.map((r) => format(parseISO(r.d), 'd'))}
              titles={d.days.map((r) => format(parseISO(r.d), 'EEE, dd MMM yyyy'))} series={[{ name: 'Received', values: d.days.map((r) => num(r.received)) }]} />
          </Card>
        </Block>
        <Block title={`Daily Collection Report ${title}`} sub="Amounts in brackets are the number of receipts or bills">
          <Table caption={`Daily collection, ${title}`} rowKey={(r) => r.d} rows={d.days} cols={cols} wrapHeaders />
        </Block>
      </>}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// PT Analysis
// ---------------------------------------------------------------------------------------------
export function PtAnalysis() {
  const { studioId } = useMe()
  const team = useTeam()
  const [trainer, setTrainer] = useState('')
  const q = useReport('pt', [trainer], () => report<PtInsight>('analysis_pt', { p_studio: studioId, p_trainer: trainer || null }))
  const trainerCols: Col<PtInsight['trainers'][number]>[] = [
    { key: 'n', header: 'Trainer Name', cell: (r) => <>{r.name}{r.staff_code && <span className="text-faint"> ({r.staff_code})</span>}</> },
    { key: 't', header: 'Total', num: true, cell: (r) => <b>{count(r.total)}</b> },
    { key: 'a', header: 'Total Active', num: true, cell: (r) => count(r.active) },
    { key: 'i', header: 'Total Inactive', num: true, cell: (r) => count(r.inactive) },
  ]
  const trainers = team.all.filter((s) => s.role === 'coach' || s.role === 'doctor')
  return (
    <AnalysisPage title="PT Analysis" filters={<PickControl label="Trainer" value={trainer} onChange={setTrainer} placeholder="All trainers"
      options={trainers.map((s) => ({ value: s.id, label: s.active ? s.full_name : `${s.full_name} (deactivated)` }))} />}>
      <ReportBody q={q}>{(d) => <>
        <Block title="PT Analysis Insights">
          <Tiles items={[
            { label: 'Total', value: count(d.total), hint: 'PT subscriptions' },
            { label: 'Active', value: count(d.active), hint: 'Running now' },
            { label: 'Inactive', value: count(d.inactive), hint: 'PT clients whose plan ended, not renewed' },
            { label: 'New PT Members', value: count(d.new_30), hint: 'Added in last 30 days' },
          ]} />
        </Block>
        <div className="px-5 lg:px-8">
          <Grid>
            <Card title="Bounced" sub="Days since their last PT plan ended">
              <BarList caption="Inactive PT clients by days since their plan ended" rows={[
                { label: '0-15 days', value: num(d.bounced.d0_15) }, { label: '15-30 days', value: num(d.bounced.d15_30) }, { label: '30-60 days', value: num(d.bounced.d30_60) },
                { label: '60-90 days', value: num(d.bounced.d60_90) }, { label: 'More than 90 days', value: num(d.bounced.over90) },
              ]} />
            </Card>
            <Card title="Active PT Subscriptions Gender Basis">
              <BarList caption="Active PT subscriptions by gender" rows={[{ label: 'Male', value: num(d.gender.active.male) }, { label: 'Female', value: num(d.gender.active.female) },
                { label: 'Other', value: num(d.gender.active.other) }]} hideZero empty="No active PT subscriptions." />
            </Card>
          </Grid>
        </div>
        <Block title="PT Subscriptions by gender">
          <Table caption="PT subscriptions by gender" rowKey={(r) => r.k} rows={[{ k: 'Total', g: d.gender.total }, { k: 'Active', g: d.gender.active }, { k: 'Inactive', g: d.gender.inactive }]} cols={[
            { key: 'k', header: '', cell: (r) => r.k },
            { key: 'm', header: 'Male', num: true, cell: (r) => count(r.g.male) },
            { key: 'f', header: 'Female', num: true, cell: (r) => count(r.g.female) },
            { key: 'o', header: 'Other', num: true, cell: (r) => count(r.g.other) },
          ]} />
        </Block>
        <Block title="Trainer PT Analysis">
          <Table caption="PT subscriptions by trainer" rowKey={(r, i) => r.staff_id ?? `n${i}`} rows={d.trainers.filter((t) => t.current)} cols={trainerCols} empty="No PT subscriptions yet." />
        </Block>
        {d.trainers.some((t) => !t.current) && (
          <Block title="Deactivated Trainer PT Analysis">
            <Table caption="PT subscriptions by deactivated trainers" rowKey={(r, i) => r.staff_id ?? `n${i}`} rows={d.trainers.filter((t) => !t.current)} cols={trainerCols} />
          </Block>
        )}
      </>}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Leaderboard (trainers' sales and targets)
// ---------------------------------------------------------------------------------------------
export function Leaderboard() {
  const { studioId } = useMe()
  const [year, setYear] = useState(thisYear)
  const [month, setMonth] = useState(thisMonth)
  const q = useReport('leaderboard', [year, month], () => report<LeaderboardData>('analysis_leaderboard', { p_studio: studioId, p_year: year, p_month: month }))
  return (
    <AnalysisPage title="Leaderboard" filters={<><YearControl value={year} onChange={setYear} /><MonthControl value={month} onChange={setMonth} /></>}>
      <ReportBody q={q}>{(d) => {
        const sub = rangeTitle({ from: d.from, to: d.to })
        return <>
          <Block title="Target Analysis" sub={sub}>
            <Table caption="Trainer targets" rowKey={(t, i) => `${t.staff_id}-${i}`} rows={d.targets} empty="No trainer targets for this month (Staff › Staff/Trainer Target)." cols={[
              { key: 'n', header: 'Trainer Name', cell: (t) => t.name },
              { key: 's', header: 'Sales Target', num: true, cell: (t) => amount(t.highest) },
              { key: 'ty', header: 'Target Type', cell: (t) => (t.target_type ? TARGET_TYPE[t.target_type] ?? t.target_type : 'All sales') },
              { key: 'r', header: 'Target Achieved', cell: (t) => (t.tier_reached ? `Target ${t.tier_reached}` : 'Not yet') },
              { key: 'p', header: 'Achieved (%)', num: true, cell: (t) => (num(t.highest) ? `${dec((num(t.achieved) * 100) / num(t.highest), 1)}%` : '—') },
              { key: 'a', header: 'Sales Achieved', num: true, cell: (t) => <b>{amount(t.achieved)}</b> },
            ]} />
          </Block>
          <Block title="Leaderboard" sub={`${sub} · bills where the trainer is the bill rep or the trainer`}>
            <Grid>
              <Card title="Sales Achieved"><BarList caption="Trainer sales" format={amount} rows={d.board.map((b) => ({ label: b.name, value: num(b.sales) }))} empty="No trainer sales this month." /></Card>
              <Table caption="Trainer sales by type" rowKey={(b) => b.staff_id} rows={d.board} empty="No trainer sales this month." cols={[
                { key: 'n', header: 'Trainer Name', cell: (b) => b.name },
                { key: 's', header: 'Sales Achieved', num: true, cell: (b) => <b>{amount(b.sales)}</b> },
                { key: 'pr', header: 'PT Renewal', num: true, cell: (b) => amount(b.pt_renewal) },
                { key: 'pn', header: 'PT New', num: true, cell: (b) => amount(b.pt_new) },
                { key: 'gr', header: 'Gym Renewal', num: true, cell: (b) => amount(b.gym_renewal) },
                { key: 'gn', header: 'Gym New', num: true, cell: (b) => amount(b.gym_new) },
              ]} />
            </Grid>
          </Block>
        </>
      }}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Revenue Forecast
// ---------------------------------------------------------------------------------------------
export function RevenueForecast() {
  const { studioId } = useMe()
  const team = useTeam()
  const { data: services = [] } = useServices()
  const [category, setCategory] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const q = useReport('forecast', [category, createdBy], () => report<Forecast>('analysis_revenue_forecast', { p_studio: studioId, p_category: category || null, p_created_by: createdBy || null }))
  const label = (m: string) => format(parseISO(m), 'MMM yyyy')
  return (
    <AnalysisPage title="Revenue Forecast" filters={<>
      <PickControl label="Category" value={category} onChange={setCategory} placeholder="Select Category" options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name || s.name }))} />
      <PickControl label="Created by" value={createdBy} onChange={setCreatedBy} options={staffOptions(team)} />
    </>}>
      <ReportBody q={q}>{(d) => {
        const total = d.months.reduce((a, m) => a + num(m.renewal.amount) + num(m.balance.amount), 0)
        const cats = d.categories.filter((c) => d.months.some((m) => num(m.by_category[c.id]?.n)))
        return <>
          <Block title="Revenue Forecast" sub="Renewals: gym and PT plans ending that month, not yet renewed, at what the client paid last time. Balance: unpaid amounts by their payment date (overdue ones count this month).">
              <Card>
                <Hero label="Expected in the next 12 months" value={amount(total)} />
                <ColumnChart caption="Expected amount per month" format={amount} labels={d.months.map((m) => format(parseISO(m.month), 'MMM'))} titles={d.months.map((m) => label(m.month))}
                  series={[{ name: 'Renewal', values: d.months.map((m) => num(m.renewal.amount)) }, { name: 'Balance', values: d.months.map((m) => num(m.balance.amount)) }]} />
              </Card>
              <Table caption="Revenue forecast by month" rowKey={(m) => m.month} rows={d.months} cols={[
                { key: 'm', header: 'Month', nowrap: true, cell: (m) => label(m.month) },
                { key: 'e', header: 'Total Expected Amount', num: true, cell: (m) => <b>{amount(num(m.renewal.amount) + num(m.balance.amount))}</b> },
                { key: 'r', header: 'Total Renewal Amount', num: true, cell: (m) => <>{amount(m.renewal.amount)} <span className="text-faint">({count(m.renewal.n)})</span></> },
                { key: 'b', header: 'Total Balance Amount', num: true, cell: (m) => <>{amount(m.balance.amount)} <span className="text-faint">({count(m.balance.n)})</span></> },
              ]} />

          </Block>
          <Block title="Renewal breakdown category wise" sub="A plan in more than one category counts in each; Total counts it once">
            {cats.length ? (
              <div className="card overflow-x-auto">
                <table className="tbl">
                  <caption className="sr-only">Renewals by service category and month</caption>
                  <thead><tr><th>Month</th>{cats.map((c) => <th key={c.id} className="num">{c.name}</th>)}<th className="num">Total</th></tr></thead>
                  <tbody>{d.months.map((m) => (
                    <tr key={m.month}><td className="nowrap">{label(m.month)}</td>
                      {cats.map((c) => <td key={c.id} className="num nowrap">{amount(m.by_category[c.id]?.amount ?? 0)} <span className="text-faint">({count(m.by_category[c.id]?.n)})</span></td>)}
                      <td className="num nowrap font-bold">{amount(m.renewal.amount)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="card px-5 py-8 text-center text-[14px] text-muted">No renewals with a service category in the next 12 months. Plans get categories in Memberships › Membership Plans.</div>}
          </Block>
        </>
      }}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Branch Analysis
// ---------------------------------------------------------------------------------------------
export function BranchAnalysis() {
  const { studioId } = useMe()
  const [range, setRange] = useState<RangeValue>(() => rangeFor('this_month'))
  const [all, setAll] = useState(false)
  const [search, setSearch] = useState('')
  const q = useReport('branches', [all ? null : range.from, all ? null : range.to], () => report<BranchRow[]>('analysis_branches', {
    p_studio: studioId, p_from: all ? null : range.from, p_to: all ? null : range.to,
  }))
  const cols: Col<BranchRow>[] = [
    { key: 'n', header: 'Branch Name', cell: (r) => r.name },
    { key: 'a', header: 'Area', cell: (r) => r.area ?? '' },
    { key: 'oe', header: 'Total Open Enquiries', num: true, cell: (r) => count(r.open_enquiries), csv: (r) => r.open_enquiries },
    { key: 'te', header: "Today's New Enquiries", num: true, cell: (r) => count(r.enquiries_today), csv: (r) => r.enquiries_today },
    { key: 'ye', header: "Yesterday's New Enquiries", num: true, cell: (r) => count(r.enquiries_yesterday), csv: (r) => r.enquiries_yesterday },
    { key: 'tc', header: "Today's Collection (Paid Amt.)", num: true, cell: (r) => amount(r.collection_today), csv: (r) => r.collection_today },
    { key: 'yc', header: "Yesterday's Collection (Paid Amt.)", num: true, cell: (r) => amount(r.collection_yesterday), csv: (r) => r.collection_yesterday },
    { key: 'c', header: 'Total Collection (Paid Amt.)', num: true, cell: (r) => <b>{amount(r.collection)}</b>, csv: (r) => r.collection },
    { key: 'b', header: 'Total Balance Amount', num: true, cell: (r) => amount(r.balance), csv: (r) => r.balance },
    { key: 'bl', header: 'Total Billing Amount', num: true, cell: (r) => amount(r.billing), csv: (r) => r.billing },
  ]
  const rows = useMemo(() => (q.data ?? []).filter((r) => !search || `${r.name} ${r.branch ?? ''} ${r.studio_id}`.toLowerCase().includes(search.toLowerCase())), [q.data, search])
  return (
    <AnalysisPage title="Branch Analysis" filters={<>
      <label className="flex min-h-10 items-center gap-2 text-[14px]"><input type="checkbox" className="check" checked={all} onChange={(e) => setAll(e.target.checked)} />All Data</label>
      {!all && <RangeControl value={range} onChange={setRange} keys={['today', 'this_month', 'last_month', 'last_3', 'last_7', 'last_15', 'last_30']} />}
      <div className="relative min-w-[220px] flex-1">
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <TextInput small value={search} onChange={setSearch} placeholder="Search by Branch Name or Branch ID" className="pl-9" />
      </div>
    </>} actions={<CsvButton filename="branch-analysis.csv" rows={rows} cols={cols} />}>
      <ReportBody q={q}>{() => (
        <Block title="Branch Analysis Listing" sub={all ? 'All data' : rangeTitle(range)}>
          <Table caption="Branches" wrapHeaders rowKey={(r) => r.studio_id} rows={rows} cols={cols} empty="No branch matches." />
          <p className="m-0 text-[12px] text-muted">Shaan Fitness runs one branch. New branches appear here once they are added.</p>
        </Block>
      )}</ReportBody>
    </AnalysisPage>
  )
}
