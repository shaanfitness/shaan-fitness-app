import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { allClients, batchMemberIds, countClients, listClients, updateClients, type ClientFilters } from '../../db/clients'
import { useBatches, useLists, usePlans, useServices, useStudio, useTeam } from '../../db/studio'
import type { Gender, MemberOverview } from '../../db/types'
import { fmtClock, fmtDateTime, fmtDay, studioToday, plusDays } from '../../lib/dates'
import { downloadCsv } from '../../lib/csv'
import { waLink } from '../../lib/format'
import { ClientCell, ContactButtons } from '../../components/client'
import { ActionMenu, CheckboxGroup, Field, Notice, Select, TextArea, TextInput, opts } from '../../components/controls'
import { FollowUpDialog, FollowUpHistory, type FollowUpTarget } from '../../components/FollowUp'
import { BulkBar, DataTable, Pager, type Column } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, PageHeader, Sheet } from '../../components/ui'
import { NotifyDialog } from './ClientProfile'

// YDL client lists: My Members, Client DataBase and Members Birthday Listing.
// Same filters panel, dropdown filters, columns, row actions and bulk actions as YDL.

export type ClientListVariant = 'members' | 'database' | 'birthdays'
const PAGE = 50
const AGES: [string, [number, number]][] = [['Age 18-24', [18, 24]], ['Age 25-34', [25, 34]], ['Age 35-44', [35, 44]], ['Age 45-54', [45, 54]], ['Age 55-64', [55, 64]]]

interface Ui {
  search: string; from: string; to: string
  genders: string[]; statusChecks: string[]; ages: string[]; levels: string[]; leadStatus: string[]; leadType: string[]
  sourcePromotion: string; gender: string; convertibility: string; staff: string; trainer: string; subStatus: string
  services: string; plan: string; appStatus: string; employment: string; clientType: string; batch: string
}
const EMPTY: Ui = {
  search: '', from: '', to: '', genders: [], statusChecks: [], ages: [], levels: [], leadStatus: [], leadType: [],
  sourcePromotion: '', gender: '', convertibility: '', staff: '', trainer: '', subStatus: '', services: '', plan: '', appStatus: '',
  employment: '', clientType: '', batch: '',
}

const TITLES: Record<ClientListVariant, string> = { members: 'My Members Listing', database: 'Clients List', birthdays: 'Members Birthday Listing' }

export default function ClientList({ variant }: { variant: ClientListVariant }) {
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const { data: lists } = useLists()
  const { data: services = [] } = useServices()
  const { data: plans = [] } = usePlans()
  const { data: batches = [] } = useBatches()
  const team = useTeam()
  const today = studioToday()
  const [params] = useSearchParams()
  const [ui, setUi] = useState<Ui>(variant === 'birthdays' ? { ...EMPTY, from: today, to: plusDays(today, 7) } : { ...EMPTY, batch: params.get('batch') ?? '' })
  const [deactivated, setDeactivated] = useState(false)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [panel, setPanel] = useState(false)
  const [fu, setFu] = useState<FollowUpTarget | null>(null)
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null)
  const [confirm, setConfirm] = useState<null | { action: 'deactivate' | 'activate' | 'delete'; ids: string[] }>(null)
  const [notify, setNotify] = useState<string[] | null>(null)
  const [bulkWa, setBulkWa] = useState<MemberOverview[] | null>(null)
  const [transfer, setTransfer] = useState<string[] | null>(null)
  const isOwner = me.role === 'owner'
  const isDesk = isOwner || me.role === 'front_desk'
  const set = <K extends keyof Ui>(k: K, v: Ui[K]) => { setUi((x) => ({ ...x, [k]: v })); setPage(0); setSelected(new Set()) }

  const batchIds = useQuery({ queryKey: ['batch-members', ui.batch], enabled: !!ui.batch, queryFn: () => batchMemberIds(ui.batch) })
  const convLabels = (kinds: string[]) => (lists?.convertibility ?? []).filter((c) => c.kind && kinds.includes(c.kind)).map((c) => c.label)

  const filters: ClientFilters = useMemo(() => {
    const kind: ClientFilters['kind'] = variant === 'database' ? ((ui.clientType as 'enquiry' | 'member') || 'all') : 'member'
    const live: MemberOverview['live_status'][] = []
    const st = ui.statusChecks
    if (st.includes('active')) live.push('active')
    if (st.includes('inactive')) live.push('inactive')
    if (ui.subStatus === 'live') live.push('active')
    if (ui.subStatus === 'pending') live.push('pending')
    if (ui.subStatus === 'inactive') live.push('inactive')
    if (ui.subStatus === 'none') live.push('none')
    const kinds = [...ui.leadType.flatMap((k) => (k === 'hot' ? ['hot', 'expected'] : [k])), ...(ui.convertibility ? [ui.convertibility] : [])]
    const md = (d: string) => d.slice(5)
    const newEnq = st.includes('new_inquiries') && variant !== 'database'
    return {
      kind: newEnq ? 'enquiry' : kind,
      active: !deactivated, search: ui.search,
      range: newEnq ? { from: plusDays(today, -30), to: today } : variant === 'birthdays' ? undefined : { from: ui.from || null, to: ui.to || null },
      rangeOn: variant === 'members' && !newEnq ? 'joined_on' : 'enquiry_date',
      incorrect: st.includes('incorrect') || undefined,
      birthday: variant === 'birthdays' && ui.from && ui.to ? { from: md(ui.from), to: md(ui.to) } : undefined,
      genders: (ui.gender ? [ui.gender] : ui.genders) as Gender[],
      leadStatus: ui.leadStatus.length ? (ui.leadStatus as ('open' | 'not_interested')[]) : undefined,
      ages: AGES.filter(([l]) => ui.ages.includes(l)).map(([, a]) => a),
      convertibility: kinds.length ? convLabels(kinds) : undefined,
      sourcePromotion: ui.sourcePromotion || undefined, employmentStatus: ui.employment || undefined,
      addedBy: ui.staff || undefined, trainer: ui.trainer || undefined, liveStatus: live.length ? live : undefined,
      hasApp: (ui.appStatus as 'yes' | 'no') || undefined, levels: ui.levels.length ? ui.levels : undefined,
      services: ui.services || undefined, plan: ui.plan || undefined, memberIds: ui.batch ? batchIds.data ?? [] : undefined,
      neverCheckedIn: st.includes('never') || undefined, retained: st.includes('retained') || undefined,
      newSince: st.includes('new') ? plusDays(today, -30) : undefined,
    }
  }, [ui, deactivated, lists, batchIds.data, variant, today]) // eslint-disable-line react-hooks/exhaustive-deps

  const order = variant === 'birthdays' ? 'birthday_md.asc' : variant === 'members' ? 'joined_on.desc' : 'enquiry_date.desc'
  const list = useQuery({
    queryKey: ['clients', variant, me.studioId, filters, page],
    enabled: !ui.batch || !!batchIds.data,
    queryFn: () => listClients(me.studioId, filters, page, PAGE, order),
    placeholderData: (prev) => prev,
  })
  const totals = useQuery({
    queryKey: ['clients', 'member-totals', me.studioId],
    enabled: variant === 'members',
    queryFn: async () => {
      const base: ClientFilters = { kind: 'member', active: true }
      const [active, pending, inactive, none] = await Promise.all((['active', 'pending', 'inactive', 'none'] as const).map((s) => countClients(me.studioId, { ...base, liveStatus: [s] })))
      return { active, pending, inactive, none }
    },
  })

  const bulk = useMutation({
    mutationFn: async ({ action, ids, patch }: { action: string; ids: string[]; patch?: Record<string, unknown> }) => {
      if (action === 'deactivate') await updateClients(ids, { active: false })
      else if (action === 'activate') await updateClients(ids, { active: true })
      else if (action === 'delete') await updateClients(ids, { deleted_at: new Date().toISOString() })
      else if (patch) await updateClients(ids, patch)
      return { action, n: ids.length }
    },
    onSuccess: ({ action, n }) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSelected(new Set()); setConfirm(null); setTransfer(null)
      const done: Record<string, string> = { deactivate: 'deactivated', activate: 'activated', delete: 'deleted', transfer: 'transferred', interested: 'marked interested', not_interested: 'marked not interested' }
      toast(`${n} ${n === 1 ? 'client' : 'clients'} ${done[action] ?? 'updated'}`)
    },
    onError: (e: Error) => toast(e.message),
  })

  const rows = list.data?.rows ?? []
  const chosen = () => rows.filter((r) => selected.has(r.id))
  const exportCsv = async () => {
    const data = selected.size ? chosen() : await allClients(me.studioId, filters)
    downloadCsv(`${variant}-${today}.csv`, data, [
      ['Code', (r) => r.client_code], ['Name', (r) => r.full_name], ['Mobile', (r) => (r.phone ? `${r.country_code} ${r.phone}` : '')],
      ['Email', (r) => r.email], ['Gender', (r) => r.gender], ['Date of Birth', (r) => r.date_of_birth], ['Type', (r) => (r.kind === 'member' ? 'Member' : 'Enquiry')],
      ['Status', (r) => r.live_status], ['Current Plan', (r) => r.current_plan_name], ['Plan Ends', (r) => r.current_end_date],
      ['Added By', (r) => r.added_by_name], ['Trainer', (r) => r.trainer_name], ['Source of Promotion', (r) => r.source_promotion],
      ['Date of Entry', (r) => r.enquiry_date], ['Joined On', (r) => r.joined_on], ['App', (r) => (r.has_app ? 'Installed' : 'Not installed')],
      ['Last Check-in', (r) => r.last_check_in],
    ])
  }

  const rowActions = (r: MemberOverview) => (
    <div className="flex items-center gap-1.5">
      <ContactButtons countryCode={r.country_code} phone={r.phone} message={`Hi ${r.first_name}, greetings from ${studio?.name ?? 'Shaan Fitness'}.`} />
      <ActionMenu actions={[
        { label: 'View', onClick: () => navigate(`/clients/${r.id}`) },
        { label: 'Copy code', hidden: variant === 'members', onClick: () => { void navigator.clipboard?.writeText(r.client_code ?? ''); toast('Code copied') } },
        { label: 'Add Follow up', onClick: () => setFu({ memberId: r.id, memberName: r.full_name, defaultType: r.kind === 'member' ? (variant === 'birthdays' ? 'Birthday' : 'Feedback') : 'Enquiry' }) },
        { label: 'Follow Up History', onClick: () => setHistory({ id: r.id, name: r.full_name }) },
        { label: 'Close Enquiry', hidden: variant !== 'database' || r.kind !== 'enquiry' || r.lead_status !== 'open', onClick: () => setFu({ memberId: r.id, memberName: r.full_name, defaultType: 'Enquiry' }) },
        { label: 'Not Interested', hidden: variant !== 'database' || r.lead_status === 'not_interested', onClick: () => bulk.mutate({ action: 'not_interested', ids: [r.id], patch: { lead_status: 'not_interested' } }) },
        { label: 'Interested', hidden: variant !== 'database' || r.lead_status !== 'not_interested', onClick: () => bulk.mutate({ action: 'interested', ids: [r.id], patch: { lead_status: 'open' } }) },
        { label: 'Edit', hidden: !isDesk, onClick: () => navigate(`/clients/${r.id}/edit`) },
      ]} />
    </div>
  )

  const statusCell = (r: MemberOverview) => r.checked_in_now
    ? <span className="chip chip-green">Checked in</span>
    : r.last_check_in ? <span className="text-[12px] text-muted">Last: {fmtDateTime(r.last_check_in)}</span> : <span className="chip chip-muted">Never</span>
  const liveChip = (r: MemberOverview) => r.live_status === 'active' ? <span className="chip chip-green">Live</span>
    : r.live_status === 'pending' ? <span className="chip chip-amber">Pending</span> : r.live_status === 'inactive' ? <span className="chip chip-red">Inactive</span> : <span className="chip chip-muted">No plan</span>

  const name: Column<MemberOverview> = { key: 'name', header: variant === 'database' ? 'Name & Number' : 'Member Name & Number', cell: (r) => <ClientCell id={r.id} name={r.full_name} countryCode={r.country_code} phone={r.phone} /> }
  const columns: Column<MemberOverview>[] = variant === 'database' ? [
    { key: 'code', header: 'Client Code', className: 'nowrap', cell: (r) => <span className="font-semibold">{r.client_code}</span> },
    { key: 'date', header: 'Date of Entry', className: 'nowrap', cell: (r) => fmtDay(r.enquiry_date) },
    name,
    { key: 'type', header: 'Type', cell: (r) => <span className={`chip ${r.kind === 'member' ? 'chip-gold' : 'chip-info'}`}>{r.kind === 'member' ? 'Member' : 'Enquiry'}</span> },
    { key: 'by', header: 'Handled By', cell: (r) => r.added_by_name ?? 'Not assigned' },
    { key: 'sp', header: 'Source of Promotion', cell: (r) => r.source_promotion ?? '—' },
    { key: 'act', header: 'Action', className: 'nowrap', cell: rowActions },
  ] : [
    name,
    { key: 'code', header: 'Member Code', className: 'nowrap', cell: (r) => <><div className="font-semibold">{r.member_code ?? r.client_code}</div><div className="mt-1">{liveChip(r)}</div></> },
    { key: 'gender', header: 'Gender', cell: (r) => (r.gender ? r.gender[0].toUpperCase() + r.gender.slice(1) : '—') },
    { key: 'by', header: 'Added By', cell: (r) => r.added_by_name ?? '—' },
    variant === 'birthdays'
      ? { key: 'bday', header: 'Birthday Date', className: 'nowrap', cell: (r) => (r.date_of_birth ? fmtDay(r.date_of_birth, 'dd MMMM') : '—') }
      : { key: 'checkin', header: 'Checkin Status', cell: statusCell },
    { key: 'app', header: 'App Access', cell: (r) => (r.has_app ? <span className="chip chip-green">Yes</span> : <span className="chip chip-muted">No</span>) },
    ...(variant === 'members' ? [{ key: 'bio', header: 'Biometric Status', cell: (r: MemberOverview) => (r.biometric_code ? <span className="text-[12px]">Code {r.biometric_code}</span> : <span className="text-[12px] text-muted">Not added</span>) }] : []),
    { key: 'act', header: 'Action', className: 'nowrap', cell: rowActions },
  ]

  const card = (r: MemberOverview) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <ClientCell id={r.id} name={r.full_name} code={r.client_code} countryCode={r.country_code} phone={r.phone} />
        {variant === 'database' ? <span className={`chip ${r.kind === 'member' ? 'chip-gold' : 'chip-info'}`}>{r.kind === 'member' ? 'Member' : 'Enquiry'}</span> : liveChip(r)}
      </div>
      <div className="text-[12px] text-muted">
        {variant === 'birthdays' && r.date_of_birth ? `Birthday ${fmtDay(r.date_of_birth, 'dd MMMM')} · ` : ''}
        {r.current_plan_name ? `${r.current_plan_name} till ${fmtDay(r.current_end_date)} · ` : ''}{r.added_by_name ?? ''}
      </div>
      {rowActions(r)}
    </div>
  )

  const label = (n: string) => opts((lists?.[n] ?? []).filter((i) => i.active).map((i) => i.label))
  const staffOpts = team.staffAccounts.map((s) => ({ value: s.id, label: s.full_name }))
  const trainerOpts = team.trainers.map((s) => ({ value: s.id, label: `${s.full_name} (${s.staff_code})` }))
  const genderOpts = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]
  const convOpts = [{ value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'cold', label: 'Cold' }, { value: 'expected', label: 'Expected' }, { value: 'unpitched', label: 'Unpitched' }]
  const dropdowns = (
    <>
      <Select small ariaLabel="Source of promotion" value={ui.sourcePromotion} onChange={(v) => set('sourcePromotion', v)} placeholder="All sources of promotion" options={label('source_promotion')} className="w-auto" />
      {variant === 'database' && <Select small ariaLabel="Employment type" value={ui.employment} onChange={(v) => set('employment', v)} placeholder="All employment types" options={label('employment_status')} className="w-auto" />}
      <Select small ariaLabel="Gender" value={ui.gender} onChange={(v) => set('gender', v)} placeholder="All genders" options={genderOpts} className="w-auto" />
      <Select small ariaLabel="Lead type" value={ui.convertibility} onChange={(v) => set('convertibility', v)} placeholder="All Convertibility" options={convOpts} className="w-auto" />
      {variant !== 'database' && <Select small ariaLabel="Members status" value={ui.subStatus} onChange={(v) => set('subStatus', v)} placeholder="All Members"
        options={[{ value: 'live', label: 'Live Members' }, ...(variant === 'members' ? [{ value: 'pending', label: 'Members with Pending Subscription' }] : []), { value: 'inactive', label: 'Inactive Members' }, ...(variant === 'members' ? [{ value: 'none', label: 'Members Without Subscription' }] : [])]} className="w-auto" />}
      <Select small ariaLabel="Client rep" value={ui.staff} onChange={(v) => set('staff', v)} placeholder="All client reps" options={[{ value: 'none', label: 'Not assigned' }, ...staffOpts]} className="w-auto" />
      {variant === 'database' && <Select small ariaLabel="Batch" value={ui.batch} onChange={(v) => set('batch', v)} placeholder="All batches" options={batches.map((b) => ({ value: b.id, label: `${fmtClock(b.start_time)} · ${b.name}` }))} className="w-auto" />}
      {variant !== 'database' && ui.batch && <button type="button" className="chip chip-gold min-h-9 px-3" onClick={() => set('batch', '')}>
        Batch: {batches.find((b) => b.id === ui.batch)?.name ?? '…'} <Icon name="close" size={12} /></button>}
      {variant === 'database' && <Select small ariaLabel="Client type" value={ui.clientType} onChange={(v) => set('clientType', v)} placeholder="All Clients" options={[{ value: 'enquiry', label: 'Enquiry' }, { value: 'member', label: 'Member' }]} className="w-auto" />}
      <Select small ariaLabel="Assigned trainer" value={ui.trainer} onChange={(v) => set('trainer', v)} placeholder="All trainers" options={trainerOpts} className="w-auto" />
      {variant === 'members' && <>
        <Select small ariaLabel="Services" value={ui.services} onChange={(v) => set('services', v)} placeholder="All Service" options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} className="w-auto" />
        <Select small ariaLabel="Memberships" value={ui.plan} onChange={(v) => set('plan', v)} placeholder="All memberships" options={plans.map((p) => ({ value: p.id, label: p.name }))} className="w-auto" />
      </>}
      {variant !== 'birthdays' && <Select small ariaLabel="App status" value={ui.appStatus} onChange={(v) => set('appStatus', v)} placeholder="Select App Status" options={[{ value: 'yes', label: 'App Installed' }, { value: 'no', label: 'App Not Installed' }]} className="w-auto" />}
    </>
  )

  return (
    <>
      <PageHeader title={deactivated ? `Deactivated ${variant === 'database' ? 'clients' : 'members'}` : TITLES[variant]} sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={<>
          {variant !== 'birthdays' && <Link to="/members/import" className="btn btn-sm">Import Members</Link>}
          {variant !== 'birthdays' && <button type="button" className="btn btn-sm" onClick={() => setUi((x) => ({ ...x, statusChecks: x.statusChecks.includes('incorrect') ? x.statusChecks.filter((s) => s !== 'incorrect') : [...x.statusChecks, 'incorrect'] }))}>Incorrect Entries</button>}
          {variant === 'members' && <button type="button" className="btn btn-sm" onClick={() => { setDeactivated(!deactivated); setPage(0); setSelected(new Set()) }}>{deactivated ? 'Active Members' : 'Deactivated Members'}</button>}
          <button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button>
          {variant === 'members' && <Link to="/analysis/members" className="btn btn-sm">View Analysis</Link>}
          {isDesk && variant !== 'birthdays' && <Link to="/members/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Add Member</Link>}
        </>} />

      <div className="flex flex-col gap-3 px-5 pt-5 lg:px-8">
        {variant === 'members' && totals.data && (
          <div className="flex flex-wrap gap-2">
            {([['live', 'Total Active', totals.data.active], ['pending', 'Total Pending', totals.data.pending], ['inactive', 'Total Inactive', totals.data.inactive], ['none', 'Total Members With No Subscription', totals.data.none]] as const).map(([k, l, n]) => (
              <button key={k} type="button" aria-pressed={ui.subStatus === k} className={`btn btn-sm ${ui.subStatus === k ? 'border-gold text-gold' : ''}`} onClick={() => set('subStatus', ui.subStatus === k ? '' : k)}>{l} : {n}</button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={ui.search} onChange={(v) => set('search', v)} placeholder="Search by name, mobile number or email" className="pl-9" />
          </div>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">{variant === 'birthdays' ? 'Birth Date' : 'From'}
            <TextInput small type="date" value={ui.from} onChange={(v) => set('from', v)} className="w-auto" /></label>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">To<TextInput small type="date" value={ui.to} onChange={(v) => set('to', v)} className="w-auto" /></label>
          <button type="button" className="btn btn-sm" onClick={() => setPanel(true)}><Icon name="filter" size={16} />Filters</button>
          <button type="button" className="link-btn text-[13px]" onClick={() => { setUi(variant === 'birthdays' ? { ...EMPTY, from: today, to: plusDays(today, 7) } : EMPTY); setPage(0) }}>Clear filters</button>
        </div>
        <div className="hidden flex-wrap gap-2 lg:flex">{dropdowns}</div>
        {ui.statusChecks.includes('incorrect') && <Notice tone="warn">Showing incorrect entries: clients with no mobile number, a mobile number that isn't 10 digits, or an email that doesn't look right.</Notice>}
        <div className="text-right text-[13px] text-muted">{list.data ? `${list.data.total} ${list.data.total === 1 ? 'record' : 'records'}` : ''}</div>
        {list.error && <Notice tone="error">{(list.error as Error).message}</Notice>}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => setNotify([...selected])}>Send Notification</button>
          <button type="button" className="btn btn-sm" onClick={() => setBulkWa(chosen())}>{variant === 'birthdays' ? 'Send SMS' : 'Send Customized WhatsApp'}</button>
          {variant === 'members' && <a className="btn btn-sm" href={`mailto:?bcc=${encodeURIComponent(chosen().map((r) => r.email).filter(Boolean).join(','))}`}>Send Email</a>}
          {variant === 'database' && isDesk && <button type="button" className="btn btn-sm" onClick={() => setTransfer([...selected])}>Transfer Client</button>}
          <button type="button" className="btn btn-sm" onClick={exportCsv}>Export to CSV</button>
          {isDesk && variant !== 'database' && <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: deactivated ? 'activate' : 'deactivate', ids: [...selected] })}>{deactivated ? 'Activate' : 'Deactivate'}</button>}
          {isOwner && <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ action: 'delete', ids: [...selected] })}>Delete</button>}
        </BulkBar>
        <DataTable caption={TITLES[variant]} rows={rows} loading={list.isLoading} rowKey={(r) => r.id} columns={columns} card={card}
          selectable selected={selected} onSelect={setSelected}
          empty={variant === 'birthdays' ? 'No birthdays in these dates.' : <>Nothing matches. {isDesk && <Link to="/members/new">Add a member</Link>}</>} />
        <Pager page={page} pageSize={PAGE} total={list.data?.total ?? 0} onPage={(p) => { setPage(p); setSelected(new Set()) }} />
      </div>

      <Sheet open={panel} onClose={() => setPanel(false)} title="Filters" wide>
        <div className="flex flex-col gap-5">
          <CheckboxGroup legend="Gender" values={ui.genders} onChange={(v) => set('genders', v)} options={[{ value: 'male', label: 'Total Males' }, { value: 'female', label: 'Total Females' }]} />
          {variant === 'database' ? <>
            <CheckboxGroup legend="Lead Status" values={ui.leadStatus} onChange={(v) => set('leadStatus', v)} options={[{ value: 'open', label: 'Open Enquiry' }, { value: 'not_interested', label: 'Not Interested' }]} />
            <CheckboxGroup legend="Members by Age" values={ui.ages} onChange={(v) => set('ages', v)} options={AGES.map(([l]) => ({ value: l, label: l }))} columns={3} />
            <CheckboxGroup legend="Lead Type" values={ui.leadType} onChange={(v) => set('leadType', v)} columns={1} options={[{ value: 'hot', label: 'Hot / Expected' }, { value: 'warm', label: 'Warm / May be' }, { value: 'cold', label: 'Cold / Not so interested' }]} />
          </> : <>
            <CheckboxGroup legend="Member Status" values={ui.statusChecks.filter((s) => s !== 'incorrect')} onChange={(v) => set('statusChecks', [...v, ...(ui.statusChecks.includes('incorrect') ? ['incorrect'] : [])])} columns={2}
              options={[{ value: 'new', label: 'New Members' }, { value: 'new_inquiries', label: 'New Inquires' }, { value: 'active', label: 'Active Members' }, { value: 'inactive', label: 'Inactive Members' }, { value: 'never', label: 'Never Checked-In' }, { value: 'retained', label: 'Members Retained' }]} />
            <CheckboxGroup legend="Members by Age" values={ui.ages} onChange={(v) => set('ages', v)} options={AGES.map(([l]) => ({ value: l, label: l }))} columns={3} />
            <CheckboxGroup legend="Members by Level" values={ui.levels} onChange={(v) => set('levels', v)} columns={3} options={[{ value: 'Beginner', label: 'Beginner' }, { value: 'Intermediate', label: 'Intermediate' }, { value: 'Advanced', label: 'Advanced' }]} />
            <p className="m-0 text-[12px] text-muted">Bounced Members (failed autopay) shows here once recurring payments are switched on.</p>
          </>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">{dropdowns}</div>
          <button type="button" className="btn-gold" onClick={() => setPanel(false)}>Apply</button>
        </div>
      </Sheet>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px]">
              {confirm.action === 'delete' ? `ARE YOU SURE YOU WANT TO DELETE ${confirm.ids.length === 1 ? 'THIS CLIENT' : `THESE ${confirm.ids.length} CLIENTS`}? They're kept in the records but leave every list.`
                : `ARE YOU SURE YOU WANT TO ${confirm.action.toUpperCase()} ${confirm.ids.length === 1 ? 'THIS MEMBER' : `${confirm.ids.length} MEMBERS`}?`}
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
              <button type="button" className={`flex-1 ${confirm.action === 'delete' ? 'btn btn-danger' : 'btn-gold'}`} disabled={bulk.isPending} onClick={() => bulk.mutate(confirm)}>Yes</button>
            </div>
          </div>
        )}
      </Sheet>

      <TransferDialog ids={transfer} onClose={() => setTransfer(null)} options={team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: s.full_name }))}
        onSubmit={(to) => transfer && bulk.mutate({ action: 'transfer', ids: transfer, patch: { added_by: to } })} busy={bulk.isPending} />
      <BulkMessage clients={bulkWa} onClose={() => setBulkWa(null)} sms={variant === 'birthdays'} studioName={studio?.name ?? 'Shaan Fitness'} birthday={variant === 'birthdays'} />
      <NotifyDialog open={!!notify} onClose={() => setNotify(null)} memberIds={notify ?? []} name={notify ? `${notify.length} selected` : undefined} />
      <FollowUpDialog target={fu} onClose={() => setFu(null)} />
      <FollowUpHistory member={history} onClose={() => setHistory(null)} />
    </>
  )
}

function TransferDialog({ ids, onClose, options, onSubmit, busy }: { ids: string[] | null; onClose: () => void; options: { value: string; label: string }[]; onSubmit: (to: string) => void; busy: boolean }) {
  const [to, setTo] = useState('')
  return (
    <Sheet open={!!ids} onClose={onClose} title="Transfer Client">
      <div className="flex flex-col gap-3.5">
        <p className="m-0 text-[14px]">Move {ids?.length ?? 0} selected {ids?.length === 1 ? 'client' : 'clients'} to another client rep.</p>
        <Field label="Transfer to" required id="tto"><Select id="tto" value={to} onChange={setTo} placeholder="Select staff" options={options} /></Field>
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-gold flex-1" disabled={!to || busy} onClick={() => onSubmit(to)}>Transfer</button></div>
      </div>
    </Sheet>
  )
}

/** "Send Customized WhatsApp" / "Send SMS": one tap per client, with the message filled in ({name} becomes the first name). */
function BulkMessage({ clients, onClose, sms, studioName, birthday }: { clients: MemberOverview[] | null; onClose: () => void; sms: boolean; studioName: string; birthday: boolean }) {
  const [text, setText] = useState(birthday ? `Happy Birthday {name}! Wishing you a strong and healthy year ahead. — ${studioName}` : `Hi {name}, `)
  const withPhone = (clients ?? []).filter((c) => c.phone)
  return (
    <Sheet wide open={!!clients} onClose={onClose} title={sms ? 'Send SMS' : 'SEND WHATSAPP MESSAGE'}>
      <div className="flex flex-col gap-3">
        <Field label={sms ? 'SMS Body' : 'Write your whatsapp message here...'} id="bm" hint="{name} is replaced with each client's first name."><TextArea id="bm" value={text} onChange={setText} rows={4} /></Field>
        <Notice>Automatic bulk sending comes with the WhatsApp (third party) and DLT SMS setup. Until then, tap each client below to send from your phone.</Notice>
        <ul className="m-0 flex max-h-[45vh] list-none flex-col gap-1.5 overflow-y-auto p-0">
          {withPhone.map((c) => {
            const msg = text.replaceAll('{name}', c.first_name)
            const href = sms ? `sms:${c.country_code}${c.phone}?body=${encodeURIComponent(msg)}` : waLink(`${c.country_code}${c.phone}`.replace(/\D/g, ''), msg)
            return <li key={c.id}><a className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-[14px] no-underline" href={href} target="_blank" rel="noreferrer">
              <span>{c.full_name}</span><span className="text-[12px] text-muted">{c.country_code} {c.phone}</span></a></li>
          })}
          {!withPhone.length && <li className="text-[13px] text-muted">None of the selected clients has a mobile number.</li>}
        </ul>
      </div>
    </Sheet>
  )
}
