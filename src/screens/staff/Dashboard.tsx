import { useAccess } from '../../access'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { batchSummary, celebrations, dashboardSummary, expiredSubscriptions, upcomingRenewals } from '../../db/dashboard'
import { listFollowUps } from '../../db/followUps'
import { listClients } from '../../db/clients'
import { useLists, useStudio, useTeam } from '../../db/studio'
import type { FollowUpOverview } from '../../db/types'
import { fmtClock, fmtDateTime, fmtDay, plusDays, presets, rangeLabel, studioToday, type Range } from '../../lib/dates'
import { money } from '../../lib/format'
import { ClientCell, ContactButtons } from '../../components/client'
import { Select, TextInput, opts } from '../../components/controls'
import { FollowUpDialog, FollowUpHistory, type FollowUpTarget } from '../../components/FollowUp'
import { DataTable, type Column } from '../../components/table'
import { Icon, PageHeader, Sheet } from '../../components/ui'
import { AlertsBell } from './Alerts'

// YDL dashboard, section by section: alerts, filters, expected payments, my follow-ups,
// missed follow-ups, today's batches, the twelve cards, traffic, quick links,
// expired subscriptions, upcoming renewals, birthdays and anniversaries.

function RangePicker({ kind, value, onChange, label }: { kind: Parameters<typeof presets>[0]; value: { key: string; range: Range }; onChange: (v: { key: string; range: Range }) => void; label: string }) {
  const list = presets(kind)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select small ariaLabel={label} value={value.key} className="w-full sm:w-auto sm:min-w-[200px]"
        options={[...list.map((p) => ({ value: p.key, label: `${p.label}${p.range.from ? ` (${rangeLabel(p.range)})` : ''}` })), { value: 'custom', label: 'Custom' }]}
        onChange={(k) => {
          const p = list.find((x) => x.key === k)
          onChange({ key: k, range: p ? p.range : value.range })
        }} />
      {value.key === 'custom' && (
        <>
          <TextInput small type="date" value={value.range.from ?? ''} onChange={(v) => onChange({ key: 'custom', range: { ...value.range, from: v } })} className="w-auto" />
          <span className="text-[13px] text-muted">to</span>
          <TextInput small type="date" value={value.range.to ?? ''} onChange={(v) => onChange({ key: 'custom', range: { ...value.range, to: v } })} className="w-auto" />
        </>
      )}
    </div>
  )
}

function Block({ title, right, children, id }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 px-5 pt-7 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id={id} className="m-0 text-[17px] font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

// YDL "Quick Follow Up": find an enquiry or a member by name or number, then schedule a follow-up for them.
function QuickFollowUp({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: FollowUpTarget) => void }) {
  const me = useMe()
  const [kind, setKind] = useState<'enquiry' | 'member'>('enquiry')
  const [q, setQ] = useState('')
  const found = useQuery({
    queryKey: ['clients', 'quick-follow-up', kind, q], enabled: open && q.trim().length >= 3,
    queryFn: () => listClients(me.studioId, { kind, search: q.trim() }, 0, 10, 'created_at.desc'),
  })
  return (
    <Sheet open={open} onClose={onClose} title="Quick follow ups">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Select small ariaLabel="Enquiry or member" value={kind} onChange={(v) => setKind(v as 'enquiry' | 'member')} options={[{ value: 'enquiry', label: 'Enquiry' }, { value: 'member', label: 'Member' }]} className="w-auto" />
          <TextInput small value={q} onChange={setQ} placeholder="Name, mobile number or code" className="min-w-[220px] flex-1" />
        </div>
        {q.trim().length < 3 && <p className="m-0 text-[13px] text-muted">Type at least 3 letters or digits.</p>}
        {found.isLoading && q.trim().length >= 3 && <p className="m-0 text-[13px] text-muted" role="status">Searching…</p>}
        {found.data && found.data.rows.length === 0 && <p className="m-0 text-[13px] text-muted">No {kind === 'enquiry' ? 'enquiry' : 'member'} matches “{q.trim()}”.</p>}
        <div className="flex flex-col">
          {(found.data?.rows ?? []).map((m) => (
            <button key={m.id} type="button" className="row text-left" onClick={() => { onPick({ memberId: m.id, memberName: m.full_name }); setQ('') }}>
              <span className="min-w-0 flex-1"><span className="font-semibold">{m.full_name}</span><span className="block text-[12px] text-muted">{m.client_code} · {m.phone ?? ''}</span></span>
              <span className="btn btn-sm">Follow up</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

export default function Dashboard() {
  const access = useAccess()
  const me = useMe()
  const today = studioToday()
  const { data: studio } = useStudio()
  const { data: lists } = useLists()
  const team = useTeam()
  const sid = me.studioId

  const [fuRange, setFuRange] = useState({ key: 'today', range: presets('dashboard')[0].range })
  const [fuStaff, setFuStaff] = useState('')
  const [epType, setEpType] = useState('')
  const [myType, setMyType] = useState('')
  const [myConv, setMyConv] = useState('')
  const [missStaff, setMissStaff] = useState('')
  const [missRange, setMissRange] = useState({ key: 'yesterday', range: presets('missed')[0].range })
  const [batchRange, setBatchRange] = useState({ key: 'today', range: presets('batch')[0].range })
  const [respond, setRespond] = useState<FollowUpTarget | null>(null)
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null)
  const [quick, setQuick] = useState(false)

  const summary = useQuery({ queryKey: ['dashboard', 'summary', sid], queryFn: () => dashboardSummary(sid) })
  const expected = useQuery({
    queryKey: ['followups', 'dash-expected', sid, fuRange.range, fuStaff, epType],
    queryFn: () => listFollowUps(sid, { mode: 'expected', from: fuRange.range.from, to: fuRange.range.to, assignedTo: fuStaff || undefined, type: epType || undefined }, 0, 100),
  })
  const mine = useQuery({
    queryKey: ['followups', 'dash-mine', sid, fuRange.range, fuStaff, myType, myConv, me.staffId],
    queryFn: () => listFollowUps(sid, {
      mode: 'due', from: fuRange.range.from, to: fuRange.range.to, assignedTo: fuStaff || me.staffId,
      type: myType || undefined, convertibility: myConv ? (lists?.convertibility ?? []).filter((c) => c.kind === myConv).map((c) => c.label) : undefined,
    }, 0, 100),
  })
  const missed = useQuery({
    queryKey: ['followups', 'dash-missed', sid, missRange.range, missStaff],
    queryFn: () => listFollowUps(sid, { mode: 'due', from: missRange.range.from, to: missRange.range.to, assignedTo: missStaff || undefined }, 0, 50),
  })
  const batches = useQuery({
    queryKey: ['dashboard', 'batches', sid, batchRange.range],
    enabled: !!batchRange.range.from && !!batchRange.range.to,
    queryFn: () => batchSummary(sid, batchRange.range.from!, batchRange.range.to!),
  })
  const soonDays = studio?.settings.about_to_expire_days ?? 7
  const expired = useQuery({ queryKey: ['dashboard', 'expired', sid, today], queryFn: () => expiredSubscriptions(sid, today) })
  const renewals = useQuery({ queryKey: ['dashboard', 'renewals', sid, today, soonDays], queryFn: () => upcomingRenewals(sid, today, soonDays) })
  const parties = useQuery({ queryKey: ['dashboard', 'celebrations', sid, today], queryFn: () => celebrations(sid, today) })

  const s = summary.data
  const expectedTotal = useMemo(() => (expected.data?.rows ?? []).reduce((a, r) => a + Number(r.expected_amount ?? 0), 0), [expected.data])
  // YDL splits the expected amount: renewals, balance payments and new joinings (everything else).
  const expectedSplit = useMemo(() => {
    const t = { renewals: 0, balance: 0, fresh: 0 }
    for (const r of expected.data?.rows ?? []) {
      const a = Number(r.expected_amount ?? 0)
      if (r.type === 'Membership Renewal' || r.type === 'PT Renewal') t.renewals += a
      else if (r.type === 'Balance due') t.balance += a
      else t.fresh += a
    }
    return t
  }, [expected.data])
  const ydl = s?.present_expired !== undefined   // the database has the YDL counts (migration 24)
  const yesterday = plusDays(today, -1)
  const staffOptions = team.everyone.filter((x) => x.role !== 'doctor').map((x) => ({ value: x.id, label: x.full_name }))
  const followUpTypes = opts((lists?.followup_type ?? []).filter((i) => i.active).map((i) => i.label))

  const fuColumns = (withExpected: boolean): Column<FollowUpOverview>[] => [
    { key: 'type', header: 'Type', cell: (r) => <span className="font-semibold">{r.type}</span> },
    { key: 'name', header: 'Name & number', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> },
    ...(withExpected ? [] : [{ key: 'date', header: 'Follow up date', className: 'nowrap', cell: (r: FollowUpOverview) => fmtDateTime(r.due_at) }]),
    { key: 'by', header: 'Assign / schedule by', cell: (r) => <div className="text-[12px]"><div>{r.assigned_name ?? '—'}</div><div className="text-muted">{r.source === 'system' ? 'System generated' : r.created_by_name ?? ''}</div></div> },
    { key: 'todo', header: 'To do', cell: (r) => <span className="line-clamp-2 max-w-[260px]">{r.notes ?? '—'}</span> },
    ...(withExpected
      ? [
          { key: 'edate', header: 'Expected date', className: 'nowrap', cell: (r: FollowUpOverview) => fmtDay(r.expected_date) },
          { key: 'eamt', header: 'Expected amount', className: 'num', cell: (r: FollowUpOverview) => money(Number(r.expected_amount ?? 0)) },
        ]
      : [{ key: 'conv', header: 'Convertibility', cell: (r: FollowUpOverview) => r.convertibility ?? '—' }]),
    { key: 'act', header: 'Action', className: 'nowrap', cell: (r) => (
      <div className="flex items-center gap-1.5">
        <button type="button" className="btn btn-sm" onClick={() => setRespond({ memberId: r.member_id, memberName: r.member_name, followUp: r })}>Response</button>
        <button type="button" className="icon-btn icon-sm" aria-label="Follow-up history" onClick={() => setHistory({ id: r.member_id, name: r.member_name })}><Icon name="history" size={16} /></button>
        <ContactButtons countryCode={r.member_country_code} phone={r.member_phone} />
      </div>
    ) },
  ]
  const fuCard = (withExpected: boolean) => (r: FollowUpOverview) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} />
        <span className="chip chip-muted">{r.type}</span>
      </div>
      <div className="text-[13px] text-ink-soft">{r.notes ?? '—'}</div>
      <div className="text-[12px] text-muted">
        {withExpected ? `Expected ${fmtDay(r.expected_date)} · ${money(Number(r.expected_amount ?? 0))}` : `${fmtDateTime(r.due_at)}${r.convertibility ? ` · ${r.convertibility}` : ''}`}
        {r.assigned_name ? ` · ${r.assigned_name}` : ''}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setRespond({ memberId: r.member_id, memberName: r.member_name, followUp: r })}>Response</button>
        <button type="button" className="btn btn-sm" onClick={() => setHistory({ id: r.member_id, name: r.member_name })}>History</button>
        <ContactButtons countryCode={r.member_country_code} phone={r.member_phone} />
      </div>
    </div>
  )

  const cards: { label: string; value: string; to?: string; right?: string }[] = s ? ([
    { label: "Today's collection", value: money(s.today_collection), to: '/registers/receipts', right: 'today' },
    { label: "Current month's collection", value: money(s.month_collection), to: '/registers/receipts', right: 'month' },
    { label: "Current year's collection", value: money(s.year_collection), to: '/registers/receipts', right: 'year' },
    { label: 'Balance amount', value: money(s.balance_amount), to: '/registers/balance-due', right: 'balance' },
    { label: 'Active gym subscriptions', value: String(s.active_gym), to: '/subscriptions', right: 'active_gym' },
    { label: 'Expired gym subscriptions', value: String(s.expired_gym), to: '/registers/expired', right: 'expired_gym' },
    { label: 'Total open enquiries', value: String(s.open_enquiries), to: '/enquiries', right: 'open_enquiries' },
    { label: 'Total active members', value: String(s.active_members), to: '/members', right: 'active_members' },
    { label: 'Present check-ins', value: String(s.present_checkins), to: '/attendance/clients' },
    { label: 'Live app installs', value: s.members_total ? `${s.app_installs} (${Math.round((s.app_installs / s.members_total) * 100)}%)` : String(s.app_installs), to: '/members' },
    { label: 'Active PT subscriptions', value: String(s.active_pt), to: '/registers/sessions', right: 'active_pt' },
    { label: 'Expired PT subscriptions', value: String(s.expired_pt), to: '/registers/expired', right: 'expired_pt' },
  ] as { label: string; value: string; to?: string; right?: string }[]).filter((c) => !c.right || access.can('dashboard_cards', c.right)) : []

  const wish = (name: string, kind: 'birthday' | 'anniversary') =>
    kind === 'birthday' ? `Happy Birthday ${name} from ${studio?.name ?? 'Shaan Fitness'}! Have a great year ahead.` : `Happy anniversary with ${studio?.name ?? 'Shaan Fitness'}, ${name}! Thank you for training with us.`

  return (
    <>
      <PageHeader title="Dashboard" sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''} · ${fmtDay(today, 'EEEE, d MMMM yyyy')}`}
        actions={<AlertsBell />} />

      {/* YDL's shortcut bar */}
      <nav aria-label="Shortcuts" className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-5 sm:flex-wrap lg:px-8 [&>*]:shrink-0">
        <Link to="/enquiries/new" className="btn-gold min-h-11"><Icon name="userPlus" size={18} />Add enquiry</Link>
        <Link to="/quick-billing" className="btn min-h-11"><Icon name="receipt" size={18} />Quick billing</Link>
        <Link to="/registers/receipts" className="btn min-h-11"><Icon name="doc" size={18} />Receipts</Link>
        <button type="button" className="btn min-h-11" onClick={() => setQuick(true)}><Icon name="list" size={18} />Quick follow up</button>
        <Link to="/qr-links" className="btn min-h-11"><Icon name="qr" size={18} />QR codes &amp; links</Link>
        <Link to="/members/quick" className="btn min-h-11"><Icon name="person" size={18} />Add quick member</Link>
      </nav>
      <nav aria-label="Lists to act on" className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-3 sm:flex-wrap lg:px-8 [&>*]:shrink-0">
        {[
          { to: '/attendance/clients?who=irregular_3d', label: 'Irregular members' },
          { to: '/registers/balance-due', label: 'Balance due register' },
          { to: '/registers/expired?preset=next_7&f_expiry=soon', label: 'Upcoming renewals' },
          { to: `/follow-ups?mode=due&from=${plusDays(today, -60)}&to=${yesterday}`, label: 'Missed follow-ups of 60 days' },
          { to: '/registers/expired?preset=last_30&f_expiry=expired', label: 'Expired membership register' },
          { to: '/registers/expired?preset=over_7&f_expiry=expired', label: 'Pending renewals (more than 7 days)' },
          ...(me.role === 'owner' ? [{ to: '/analysis/branches', label: 'View branch analysis' }] : []),
        ].map((l) => <Link key={l.label} to={l.to} className="chip chip-muted min-h-9 no-underline">{l.label}</Link>)}
      </nav>

      {/* Alerts */}
      <div className="grid grid-cols-1 gap-3 px-5 pt-5 sm:grid-cols-3 lg:px-8">
        {/* YDL counts the clients in today's traffic (checked in today); before the database update, all clients. */}
        <Link to={ydl ? '/attendance/clients?day=today&with=expired' : '/registers/expired'} className="kpi border-red/30">
          <span className="kpi-label">Clients with expired membership</span>
          <span className="kpi-value text-red">{(ydl ? s?.present_expired : s?.expired_recent) ?? '–'}</span>
          <span className="text-[12px] text-muted">{ydl ? 'Checked in today · view clients' : 'Ended in the last 30 days, not renewed'}</span>
        </Link>
        <Link to={ydl ? '/attendance/clients?day=today&with=soon' : '/registers/expired'} className="kpi border-amber/30">
          <span className="kpi-label">Clients with about-to-expire membership</span>
          <span className="kpi-value text-amber">{(ydl ? s?.present_about : s?.about_to_expire) ?? '–'}</span>
          <span className="text-[12px] text-muted">{ydl ? `Checked in today, ending within ${soonDays} days` : `Ending in the next ${soonDays} days`}</span>
        </Link>
        <Link to={ydl ? '/attendance/clients?day=today&with=balance' : '/registers/balance-due'} className="kpi border-gold/30">
          <span className="kpi-label">Clients with balance payments</span>
          <span className="kpi-value text-gold">{(ydl ? s?.present_balance : s?.balance_clients) ?? '–'}</span>
          <span className="text-[12px] text-muted">{ydl ? 'Checked in today · view clients' : s ? `${money(s.balance_amount)} to collect` : ''}</span>
        </Link>
      </div>

      {/* The twelve cards */}
      <section aria-label="Studio numbers" className="grid grid-cols-2 gap-3 px-5 pt-4 md:grid-cols-3 xl:grid-cols-4 lg:px-8">
        {summary.isLoading && <div className="col-span-full py-6 text-center text-[14px] text-muted" role="status">Loading…</div>}
        {summary.error && <div className="col-span-full text-[13px] text-red">{(summary.error as Error).message}</div>}
        {cards.map((c) => (
          <Link key={c.label} to={c.to ?? '#'} className="kpi">
            <span className="kpi-label">{c.label}</span>
            <span className="kpi-value">{c.value}</span>
          </Link>
        ))}
      </section>

      {/* Filters for expected payments and my follow-ups */}
      <Block id="filters-h" title="Filters">
        <div className="card flex flex-wrap items-center gap-2 p-3">
          <RangePicker kind="dashboard" label="Date range" value={fuRange} onChange={setFuRange} />
          <Select small ariaLabel="Staff" value={fuStaff} onChange={setFuStaff} placeholder="All staff" options={staffOptions} className="w-auto min-w-[170px]" />
          <Select small ariaLabel="Follow-up type for expected payments" value={epType} onChange={setEpType} placeholder="Select follow up type" options={followUpTypes} className="w-auto min-w-[200px]" />
        </div>
      </Block>

      <Block id="expected-h" title={`Expected payments (total payments: ${expected.data?.total ?? 0}, total amount: ${money(expectedTotal)})`}
        right={<span className="text-[13px] text-muted">Renewals {money(expectedSplit.renewals)} · Balance {money(expectedSplit.balance)} · New {money(expectedSplit.fresh)}</span>}>
        <DataTable caption="Expected payments" rows={expected.data?.rows ?? []} loading={expected.isLoading} rowKey={(r) => r.id}
          columns={fuColumns(true)} card={fuCard(true)} empty="No payments expected in this period." />
      </Block>

      <Block id="mine-h" title={`My follow ups — total follow ups (${mine.data?.total ?? 0})`}
        right={<div className="flex flex-wrap gap-2">
          <Select small ariaLabel="Follow-up type" value={myType} onChange={setMyType} placeholder="Select follow up type" options={followUpTypes} className="w-auto min-w-[190px]" />
          <Select small ariaLabel="Convertibility" value={myConv} onChange={setMyConv} placeholder="Select convertibility"
            options={[{ value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'cold', label: 'Cold' }]} className="w-auto min-w-[170px]" />
          <Link to="/follow-ups" className="btn btn-sm">See all follow ups</Link>
        </div>}>
        <DataTable caption="My follow-ups" rows={mine.data?.rows ?? []} loading={mine.isLoading} rowKey={(r) => r.id}
          columns={fuColumns(false)} card={fuCard(false)} empty="No follow-ups due for you in this period." />
      </Block>

      <Block id="missed-h" title={`Missed follow-ups (${missed.data?.total ?? 0})`}
        right={<div className="flex flex-wrap gap-2">
          <Select small ariaLabel="Staff" value={missStaff} onChange={setMissStaff} placeholder="All staff" options={staffOptions} className="w-auto min-w-[160px]" />
          <RangePicker kind="missed" label="Missed period" value={missRange} onChange={setMissRange} />
          <Link to="/follow-ups?mode=due" className="btn btn-sm">See all missed follow-ups</Link>
        </div>}>
        <DataTable caption="Missed follow-ups" rows={missed.data?.rows ?? []} loading={missed.isLoading} rowKey={(r) => r.id}
          columns={fuColumns(false)} card={fuCard(false)} empty="No missed follow-ups. Well done." />
      </Block>

      <Block id="batches-h" title="Today's batches — batchwise attendance"
        right={<RangePicker kind="batch" label="Attendance period" value={batchRange} onChange={setBatchRange} />}>
        <DataTable caption="Batchwise attendance" rows={batches.data ?? []} loading={batches.isLoading} rowKey={(r) => r.batch_id}
          columns={[
            { key: 'name', header: 'Batch name', cell: (r) => <div><div className="font-semibold">{r.name}</div><div className="text-[12px] text-muted">{r.batch_code}</div></div> },
            { key: 'by', header: 'Conducted by', cell: (r) => r.trainer_names ?? '—' },
            { key: 'time', header: 'Time', className: 'nowrap', cell: (r) => `${fmtClock(r.start_time)} – ${fmtClock(r.end_time)}` },
            { key: 'ci', header: 'Total check-ins', className: 'num', cell: (r) => r.check_ins },
            { key: 'a', header: 'Active', className: 'num', cell: (r) => r.active_members },
            { key: 'e', header: 'Expired', className: 'num', cell: (r) => r.expired_members },
            { key: 'n', header: 'Membership not assigned', className: 'num', cell: (r) => r.not_assigned },
            { key: 'act', header: 'Action', className: 'nowrap', cell: (r) => <Link to={`/batches/attendance?batch=${r.batch_id}`} className="btn btn-sm">View clients</Link> },
          ]}
          card={(r) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">{r.name}</span><span className="text-[12px] text-muted">{fmtClock(r.start_time)}</span></div>
              <div className="text-[12px] text-muted">{r.trainer_names ?? 'No trainer'}</div>
              <div className="text-[13px]">{r.check_ins} check-ins · {r.active_members} active · {r.expired_members} expired · {r.not_assigned} without a plan</div>
            </div>
          )} empty="No batches run in this period." />
      </Block>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        <Block id="traffic-h" title={`Current traffic (${fmtDay(today)})`} right={<Link to="/reports/traffic" className="btn btn-sm">See traffic insights</Link>}>
          <div className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            <div><div className="kpi-label">Present traffic</div><div className="kpi-value">{s?.present_checkins ?? '–'}</div></div>
            <div><div className="kpi-label">Traffic rate</div><div className="kpi-value">{s?.capacity ? `${Math.round(((s.present_checkins ?? 0) / s.capacity) * 1000) / 10}%` : '–'}</div>
              <div className="text-[12px] text-muted">{s?.capacity ? `of ${s.capacity} capacity` : 'Set the capacity in My Fitness Centers'}</div></div>
            <div><div className="kpi-label">Checked in today</div><div className="kpi-value">{s?.checkins_today ?? '–'}</div></div>
            {ydl && <>
              <div><div className="kpi-label">Total men</div><div className="kpi-value">{s?.checkins_men}</div></div>
              <div><div className="kpi-label">Total women</div><div className="kpi-value">{s?.checkins_women}</div></div>
              <div><div className="kpi-label">Gender not given</div><div className="kpi-value">{(s?.checkins_unknown ?? 0) + (s?.checkins_other ?? 0)}</div></div>
            </>}
          </div>
        </Block>
        <Block id="links-h" title="Quick links">
          <div className="card overflow-hidden">
            {[
              { to: '/attendance/clients?day=yesterday&with=expired', label: 'Members who checked in yesterday whose membership got expired', n: s?.yesterday_expired },
              ...(access.can('dashboard_cards', 'balance') ? [{ to: '/attendance/clients?day=yesterday&with=balance', label: 'Members who checked in yesterday whose balance payment is pending', n: s?.yesterday_balance }] : []),
              { to: `/follow-ups?mode=due&from=${yesterday}&to=${yesterday}`, label: "Yesterday's missed follow ups", n: undefined },
              { to: `/follow-ups?mode=due&to=${yesterday}`, label: 'Missed follow ups overall', n: undefined },
              { to: '/attendance/mark', label: 'Mark attendance', n: undefined },
            ].map((q) => (
              <Link key={q.label} to={q.to} className="row no-underline">
                <span className="min-w-0 flex-1 text-[14px]">{q.label}</span>
                {q.n !== undefined && <span className="chip chip-muted">{q.n}</span>}
                <Icon name="chevronRight" size={16} />
              </Link>
            ))}
          </div>
        </Block>
      </div>

      <div className="grid grid-cols-1 gap-0 xl:grid-cols-2">
        <Block id="expired-h" title="Expired subscriptions" right={<Link to="/registers/expired" className="btn btn-sm">View all</Link>}>
          <DataTable caption="Expired subscriptions" rows={expired.data ?? []} loading={expired.isLoading} rowKey={(r) => r.id}
            columns={[
              { key: 'n', header: 'Name & number', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> },
              { key: 'p', header: 'Plan', cell: (r) => r.plan_name },
              { key: 'e', header: 'Ended', className: 'nowrap', cell: (r) => fmtDay(r.end_date) },
              { key: 'a', header: 'Action', className: 'nowrap', cell: (r) => <div className="flex gap-1.5">
                <button type="button" className="btn btn-sm" onClick={() => setRespond({ memberId: r.member_id, memberName: r.member_name, defaultType: 'Membership Renewal' })}>Follow up</button>
                <ContactButtons countryCode={r.member_country_code} phone={r.member_phone} message={`Hi ${r.member_name}, your ${r.plan_name} plan at ${studio?.name ?? 'Shaan Fitness'} ended on ${fmtDay(r.end_date)}. Renew to continue your training.`} />
              </div> },
            ]}
            card={(r) => <div className="flex items-center justify-between gap-2"><ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /><span className="text-[12px] text-muted">{r.plan_name}<br />ended {fmtDay(r.end_date)}</span></div>}
            empty="No plans ended in the last 30 days." />
        </Block>
        <Block id="renew-h" title="Upcoming renewals" right={<Link to="/registers/expired" className="btn btn-sm">View all</Link>}>
          <DataTable caption="Upcoming renewals" rows={renewals.data ?? []} loading={renewals.isLoading} rowKey={(r) => r.id}
            columns={[
              { key: 'n', header: 'Name & number', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> },
              { key: 'p', header: 'Plan', cell: (r) => r.plan_name },
              { key: 'e', header: 'Ends', className: 'nowrap', cell: (r) => `${fmtDay(r.end_date)} (${r.days_left} ${r.days_left === 1 ? 'day' : 'days'})` },
              { key: 'a', header: 'Action', className: 'nowrap', cell: (r) => <div className="flex gap-1.5">
                <button type="button" className="btn btn-sm" onClick={() => setRespond({ memberId: r.member_id, memberName: r.member_name, defaultType: 'Membership Renewal' })}>Follow up</button>
                <ContactButtons countryCode={r.member_country_code} phone={r.member_phone} message={`Hi ${r.member_name}, your ${r.plan_name} plan at ${studio?.name ?? 'Shaan Fitness'} ends on ${fmtDay(r.end_date)}. Renew now to keep your slot.`} />
              </div> },
            ]}
            card={(r) => <div className="flex items-center justify-between gap-2"><ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /><span className="text-right text-[12px] text-muted">{r.plan_name}<br />ends {fmtDay(r.end_date)}</span></div>}
            empty={`No plans end in the next ${soonDays} days.`} />
        </Block>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        {(['birthdays', 'anniversaries'] as const).map((k) => {
          const rows = parties.data?.[k] ?? []
          return (
            <Block key={k} id={`${k}-h`} title={k === 'birthdays' ? "Today's birthdays" : "Today's members anniversaries"}>
              <div className="card overflow-hidden">
                {parties.isLoading && <div className="px-4 py-6 text-center text-[14px] text-muted">Loading…</div>}
                {!parties.isLoading && rows.length === 0 && <div className="px-4 py-6 text-center text-[14px] text-muted">{k === 'birthdays' ? 'No birthdays today.' : 'No anniversaries today.'}</div>}
                {rows.map((r) => (
                  <div key={r.id} className="row">
                    <div className="min-w-0 flex-1"><ClientCell id={r.id!} name={r.full_name!} code={r.client_code} countryCode={r.country_code} phone={r.phone} /></div>
                    <ContactButtons countryCode={r.country_code} phone={r.phone} message={wish(r.full_name!, k === 'birthdays' ? 'birthday' : 'anniversary')} />
                  </div>
                ))}
              </div>
            </Block>
          )
        })}
      </div>

      <QuickFollowUp open={quick} onClose={() => setQuick(false)} onPick={(t) => { setQuick(false); setRespond(t) }} />
      <FollowUpDialog target={respond} onClose={() => setRespond(null)} />
      <FollowUpHistory member={history} onClose={() => setHistory(null)} />
    </>
  )
}
