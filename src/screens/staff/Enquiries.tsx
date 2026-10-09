import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { allClients, listClients, updateClients, type ClientFilters } from '../../db/clients'
import { supabase } from '../../lib/supabase'
import { useLists, useStudio, useTeam } from '../../db/studio'
import type { Gender, MemberOverview } from '../../db/types'
import { fmtDateTime, fmtDay, presets, rangeLabel, type Range } from '../../lib/dates'
import { downloadCsv } from '../../lib/csv'
import { ClientCell, ContactButtons } from '../../components/client'
import { ActionMenu, CheckboxGroup, Notice, Select, TextInput, opts } from '../../components/controls'
import { FollowUpDialog, FollowUpHistory, type FollowUpTarget } from '../../components/FollowUp'
import { BulkBar, DataTable, Pager, type Column } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, PageHeader, Sheet } from '../../components/ui'
import { CsvOnly } from '../../access-ui'

// YDL "Enquiries List": filters panel, dropdown filters, staff summary, the list,
// row actions and bulk actions.
const PAGE = 50
const AGES: [string, [number, number]][] = [['Age 18-24', [18, 24]], ['Age 25-34', [25, 34]], ['Age 35-44', [35, 44]], ['Age 45-54', [45, 54]], ['Age 55-64', [55, 64]]]

interface UiFilters {
  search: string
  rangeKey: string
  range: Range
  filterBy: 'enquiry_date' | 'last_follow_up_at'
  genders: Gender[]
  leadStatus: ('open' | 'not_interested')[]
  ages: string[]
  leadType: string[]             // convertibility kinds: hot (with expected), warm, cold
  sourcePromotion: string
  gender: string
  convertibility: string         // a kind
  staff: string
  onTrial: '' | 'yes' | 'no'
  stage: '' | 'tapped' | 'untapped'
  trainer: string
  sourceEnquiry: string
}

const EMPTY: UiFilters = {
  search: '', rangeKey: 'all', range: { from: null, to: null }, filterBy: 'enquiry_date', genders: [], leadStatus: ['open'],
  ages: [], leadType: [], sourcePromotion: '', gender: '', convertibility: '', staff: '', onTrial: '', stage: '', trainer: '', sourceEnquiry: '',
}

export default function Enquiries() {
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const { data: lists } = useLists()
  const team = useTeam()
  const [ui, setUi] = useState<UiFilters>(EMPTY)
  const [deactivated, setDeactivated] = useState(false)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [panel, setPanel] = useState(false)
  const [respond, setRespond] = useState<FollowUpTarget | null>(null)
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null)
  const [confirm, setConfirm] = useState<null | { action: 'deactivate' | 'activate' | 'delete'; ids: string[] }>(null)
  const [notify, setNotify] = useState<string[] | null>(null)
  const [showStaff, setShowStaff] = useState(false)
  const isOwner = me.role === 'owner'

  const convLabels = (kinds: string[]) => (lists?.convertibility ?? []).filter((c) => c.kind && kinds.includes(c.kind)).map((c) => c.label)
  const filters: ClientFilters = useMemo(() => {
    const kinds = [...ui.leadType.flatMap((k) => (k === 'hot' ? ['hot', 'expected'] : [k])), ...(ui.convertibility ? [ui.convertibility] : [])]
    const genders = ui.gender ? [ui.gender as Gender] : ui.genders
    return {
      kind: 'enquiry', active: !deactivated, search: ui.search, range: ui.range, rangeOn: ui.filterBy,
      genders, leadStatus: ui.leadStatus, ages: AGES.filter(([l]) => ui.ages.includes(l)).map(([, a]) => a),
      convertibility: kinds.length ? convLabels(kinds) : undefined,
      sourcePromotion: ui.sourcePromotion || undefined, sourceEnquiry: ui.sourceEnquiry || undefined,
      addedBy: ui.staff || undefined, trainer: ui.trainer || undefined, onTrial: ui.onTrial || undefined, tapped: ui.stage || undefined,
    }
  }, [ui, deactivated, lists]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = useQuery({
    queryKey: ['clients', 'enquiries', me.studioId, filters, page],
    queryFn: () => listClients(me.studioId, filters, page, PAGE, 'enquiry_date.desc'),
    placeholderData: (prev) => prev,
  })
  const staffSummary = useQuery({
    queryKey: ['clients', 'enquiry-staff', me.studioId, ui.range],
    enabled: showStaff,
    queryFn: async () => {
      const to = ui.range.to ?? new Date().toISOString().slice(0, 10)
      const from = ui.range.from ?? '2000-01-01'
      const res = await supabase.rpc('enquiry_staff_summary', { p_studio: me.studioId, p_from: from, p_to: to })
      if (res.error) throw new Error(res.error.message)
      return res.data as { enquiry_date: string; staff_name: string; total: number }[]
    },
  })

  const set = <K extends keyof UiFilters>(k: K, v: UiFilters[K]) => { setUi((x) => ({ ...x, [k]: v })); setPage(0); setSelected(new Set()) }
  const activeCount = [ui.genders.length, ui.ages.length, ui.leadType.length, ui.sourcePromotion, ui.gender, ui.convertibility, ui.staff, ui.onTrial, ui.stage, ui.trainer, ui.sourceEnquiry]
    .filter((x) => (typeof x === 'number' ? x > 0 : !!x)).length + (ui.leadStatus.join() === 'open' ? 0 : 1)

  const bulk = useMutation({
    mutationFn: async ({ action, ids }: { action: 'deactivate' | 'activate' | 'delete' | 'tapped'; ids: string[] }) => {
      if (action === 'deactivate') await updateClients(ids, { active: false })
      if (action === 'activate') await updateClients(ids, { active: true })
      if (action === 'tapped') await updateClients(ids, { tapped: true })
      if (action === 'delete') await updateClients(ids, { deleted_at: new Date().toISOString() })
      return { action, n: ids.length }
    },
    onSuccess: ({ action, n }) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSelected(new Set())
      setConfirm(null)
      toast(`${n} ${n === 1 ? 'enquiry' : 'enquiries'} ${action === 'tapped' ? 'marked as tapped' : action === 'delete' ? 'deleted' : action === 'activate' ? 'activated' : 'deactivated'}`)
    },
    onError: (e: Error) => toast(e.message),
  })

  const exportCsv = async () => {
    const rows = selected.size ? (list.data?.rows ?? []).filter((r) => selected.has(r.id)) : await allClients(me.studioId, filters)
    downloadCsv(`enquiries-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
      ['Enquiry Code', (r) => r.enquiry_code], ['Date of Enquiry', (r) => r.enquiry_date], ['Name', (r) => r.full_name],
      ['Mobile', (r) => (r.phone ? `${r.country_code} ${r.phone}` : '')], ['Email', (r) => r.email], ['Gender', (r) => r.gender],
      ['Trial Booked', (r) => (r.had_trial ? 'Yes' : 'No')], ['Remarks', (r) => r.notes], ['Handled By', (r) => r.added_by_name],
      ['Source of Enquiry', (r) => r.source_enquiry], ['Source of Promotion', (r) => r.source_promotion], ['Convertibility', (r) => r.convertibility],
      ['Follow-up Stage', (r) => (r.tapped ? 'Tapped' : 'Untapped')], ['Lead Status', (r) => (r.lead_status === 'open' ? 'Open' : 'Not Interested')],
      ['Comment', (r) => r.last_follow_up_note], ['Next Follow-up', (r) => r.next_follow_up_at],
    ])
  }

  const rows = list.data?.rows ?? []
  const columns: Column<MemberOverview>[] = [
    { key: 'code', header: 'Enquiry code', className: 'nowrap', cell: (r) => <span className="font-semibold">{r.enquiry_code}</span> },
    { key: 'date', header: 'Date of enquiry', className: 'nowrap', cell: (r) => fmtDay(r.enquiry_date) },
    { key: 'name', header: 'Name & number', cell: (r) => <ClientCell id={r.id} name={r.full_name} countryCode={r.country_code} phone={r.phone} /> },
    { key: 'trial', header: 'Trial booked', cell: (r) => (r.had_trial ? <span className="chip chip-green">Yes</span> : <span className="chip chip-muted">No</span>) },
    { key: 'remarks', header: 'Remarks', cell: (r) => <span className="line-clamp-2 block max-w-[150px]">{r.notes ?? '—'}</span> },
    { key: 'by', header: 'Handled by', cell: (r) => r.added_by_name ?? 'Not assigned' },
    { key: 'se', header: 'Source of enquiry', cell: (r) => r.source_enquiry ?? '—' },
    { key: 'sp', header: 'Source of promotion', cell: (r) => r.source_promotion ?? '—' },
    { key: 'comment', header: 'Comment', cell: (r) => (
      <div className="w-[170px] text-[12px]">
        <div className="line-clamp-2">{r.last_follow_up_note ?? '—'}</div>
        {r.next_follow_up_at && <div className="mt-0.5 text-muted">Next: {fmtDateTime(r.next_follow_up_at)}</div>}
        <div className="mt-1 flex flex-wrap gap-1">
          {r.convertibility && <span className="chip chip-gold">{r.convertibility}</span>}
          {r.lead_status === 'not_interested' && <span className="chip chip-red">Not interested</span>}
          {!r.tapped && <span className="chip chip-muted">Untapped</span>}
        </div>
      </div>
    ) },
    { key: 'act', header: 'Action', className: 'nowrap', cell: (r) => rowActions(r) },
  ]

  function rowActions(r: MemberOverview) {
    return (
      <div className="flex items-center gap-1.5">
        <ContactButtons countryCode={r.country_code} phone={r.phone} message={`Hi ${r.first_name}, thank you for your interest in ${studio?.name ?? 'Shaan Fitness'}.`} />
        <ActionMenu actions={[
          { label: 'Add follow up', onClick: () => setRespond({ memberId: r.id, memberName: r.full_name, defaultType: 'Enquiry' }) },
          { label: 'Follow up history', onClick: () => setHistory({ id: r.id, name: r.full_name }) },
          { label: 'Edit enquiry', onClick: () => navigate(`/clients/${r.id}/edit`) },
          { label: 'Copy code', onClick: () => { navigator.clipboard?.writeText(r.enquiry_code ?? ''); toast('Code copied') } },
          { label: 'Mark as tapped', hidden: r.tapped, onClick: () => bulk.mutate({ action: 'tapped', ids: [r.id] }) },
          { label: 'Close enquiry', hidden: r.lead_status !== 'open', onClick: () => setRespond({ memberId: r.id, memberName: r.full_name, defaultType: 'Enquiry' }) },
          { label: deactivated ? 'Activate' : 'Deactivate', onClick: () => setConfirm({ action: deactivated ? 'activate' : 'deactivate', ids: [r.id] }) },
          { label: 'Delete', danger: true, hidden: !isOwner, onClick: () => setConfirm({ action: 'delete', ids: [r.id] }) },
        ]} />
      </div>
    )
  }

  const card = (r: MemberOverview) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <ClientCell id={r.id} name={r.full_name} code={r.enquiry_code} countryCode={r.country_code} phone={r.phone} />
        <span className="flex-none text-[12px] text-muted">{fmtDay(r.enquiry_date)}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {r.convertibility && <span className="chip chip-gold">{r.convertibility}</span>}
        {r.had_trial && <span className="chip chip-green">Trial booked</span>}
        {!r.tapped && <span className="chip chip-muted">Untapped</span>}
        {r.lead_status === 'not_interested' && <span className="chip chip-red">Not interested</span>}
      </div>
      {(r.last_follow_up_note || r.notes) && <div className="text-[13px] text-ink-soft">{r.last_follow_up_note ?? r.notes}</div>}
      <div className="text-[12px] text-muted">{[r.source_promotion, r.source_enquiry, r.added_by_name].filter(Boolean).join(' · ')}</div>
      {rowActions(r)}
    </div>
  )

  const staffOpts = team.staffAccounts.map((s) => ({ value: s.id, label: s.full_name }))
  const trainerOpts = team.trainers.map((s) => ({ value: s.id, label: `${s.full_name} (${s.staff_code})` }))
  const label = (name: string) => opts((lists?.[name] ?? []).filter((i) => i.active).map((i) => i.label))

  return (
    <>
      <PageHeader title={deactivated ? 'Deactivated enquiries' : 'Enquiries'} sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={<>
          <button type="button" className="btn btn-sm" onClick={() => { setDeactivated(!deactivated); setPage(0); setSelected(new Set()) }}>{deactivated ? 'Open enquiries' : 'Deactivated enquiries'}</button>
          <CsvOnly><button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>
          <Link to="/reports/enquiries" className="btn btn-sm">View analysis</Link>
          <Link to="/enquiries/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Add enquiry</Link>
        </>} />

      <div className="flex flex-col gap-3 px-5 pt-5 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={ui.search} onChange={(v) => set('search', v)} placeholder="Search by name, mobile number or email" className="pl-9" />
          </div>
          <Select small ariaLabel="Date range" value={ui.rangeKey} className="w-auto min-w-[180px]"
            options={[...presets('list').map((p) => ({ value: p.key, label: `${p.label}${p.range.from ? ` (${rangeLabel(p.range)})` : ''}` })), { value: 'custom', label: 'Custom' }]}
            onChange={(k) => { const p = presets('list').find((x) => x.key === k); setUi((x) => ({ ...x, rangeKey: k, range: p ? p.range : x.range })); setPage(0) }} />
          {ui.rangeKey === 'custom' && <>
            <TextInput small type="date" value={ui.range.from ?? ''} onChange={(v) => set('range', { ...ui.range, from: v || null })} className="w-auto" />
            <TextInput small type="date" value={ui.range.to ?? ''} onChange={(v) => set('range', { ...ui.range, to: v || null })} className="w-auto" />
          </>}
          <button type="button" className="btn btn-sm" aria-expanded={panel} onClick={() => setPanel(true)}>
            <Icon name="filter" size={16} />Filters{activeCount ? ` (${activeCount})` : ''}
          </button>
          {activeCount > 0 && <button type="button" className="link-btn text-[13px]" onClick={() => { setUi({ ...EMPTY, search: ui.search, rangeKey: ui.rangeKey, range: ui.range }); setPage(0) }}>Clear filters</button>}
        </div>

        <div className="hidden flex-wrap gap-2 lg:flex">
          <Select small ariaLabel="Source of promotion" value={ui.sourcePromotion} onChange={(v) => set('sourcePromotion', v)} placeholder="All sources of promotion" options={label('source_promotion')} className="w-auto" />
          <Select small ariaLabel="Gender" value={ui.gender} onChange={(v) => set('gender', v)} placeholder="All genders" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} className="w-auto" />
          <Select small ariaLabel="Convertibility" value={ui.convertibility} onChange={(v) => set('convertibility', v)} placeholder="All convertibility"
            options={[{ value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'cold', label: 'Cold' }, { value: 'expected', label: 'Expected' }, { value: 'unpitched', label: 'Unpitched' }]} className="w-auto" />
          <Select small ariaLabel="Lead status" value={ui.leadStatus.length === 1 ? ui.leadStatus[0] : ''} onChange={(v) => set('leadStatus', v ? [v as 'open'] : [])}
            placeholder="All lead status" options={[{ value: 'open', label: 'Open enquiries' }, { value: 'not_interested', label: 'Not interested' }]} className="w-auto" />
          <Select small ariaLabel="Staff" value={ui.staff} onChange={(v) => set('staff', v)} placeholder="All staff" options={[{ value: 'none', label: 'Not assigned' }, ...staffOpts]} className="w-auto" />
          <Select small ariaLabel="On trial" value={ui.onTrial} onChange={(v) => set('onTrial', v as UiFilters['onTrial'])} placeholder="On trial: all" options={[{ value: 'yes', label: 'On trial: yes' }, { value: 'no', label: 'On trial: no' }]} className="w-auto" />
          <Select small ariaLabel="Follow-up stage" value={ui.stage} onChange={(v) => set('stage', v as UiFilters['stage'])} placeholder="All stages" options={[{ value: 'untapped', label: 'Untapped' }, { value: 'tapped', label: 'Tapped' }]} className="w-auto" />
          <Select small ariaLabel="Trainer" value={ui.trainer} onChange={(v) => set('trainer', v)} placeholder="All trainers" options={trainerOpts} className="w-auto" />
          <Select small ariaLabel="Filter dates by" value={ui.filterBy} onChange={(v) => set('filterBy', v as UiFilters['filterBy'])} options={[{ value: 'enquiry_date', label: 'By created date' }, { value: 'last_follow_up_at', label: 'By follow up date' }]} className="w-auto" />
          <Select small ariaLabel="Source of enquiry" value={ui.sourceEnquiry} onChange={(v) => set('sourceEnquiry', v)} placeholder="All sources of enquiry" options={label('source_enquiry')} className="w-auto" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button type="button" className="link-btn text-[13px]" aria-expanded={showStaff} onClick={() => setShowStaff(!showStaff)}>
            {showStaff ? 'Hide' : 'Show'} enquiries added per staff member
          </button>
          <span className="text-[13px] text-muted">{list.data ? `${list.data.total} ${list.data.total === 1 ? 'enquiry' : 'enquiries'}` : ''}</span>
        </div>
        {showStaff && (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">Enquiries added per staff member</caption>
              <thead><tr><th>#</th><th>Date</th><th>Staff name</th><th className="num">Total enquiries (open and not interested) added</th></tr></thead>
              <tbody>
                {(staffSummary.data ?? []).map((r, i) => <tr key={`${r.enquiry_date}-${r.staff_name}`}><td>{i + 1}</td><td>{fmtDay(r.enquiry_date)}</td><td>{r.staff_name}</td><td className="num">{r.total}</td></tr>)}
                {staffSummary.data?.length === 0 && <tr><td colSpan={4} className="text-center text-muted">No enquiries in this period.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {list.error && <Notice tone="error">{(list.error as Error).message}</Notice>}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => bulk.mutate({ action: 'tapped', ids: [...selected] })}>Mark as tapped</button>
          <button type="button" className="btn btn-sm" onClick={() => setNotify([...selected])}>Send notification</button>
          <CsvOnly><button type="button" className="btn btn-sm" onClick={exportCsv}>Export to CSV</button></CsvOnly>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: deactivated ? 'activate' : 'deactivate', ids: [...selected] })}>{deactivated ? 'Activate' : 'Deactivate'}</button>
          {isOwner && <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ action: 'delete', ids: [...selected] })}>Delete</button>}
        </BulkBar>
        <DataTable caption="Enquiries" rows={rows} loading={list.isLoading} rowKey={(r) => r.id} columns={columns} card={card}
          selectable selected={selected} onSelect={setSelected}
          empty={<>No enquiries match. <Link to="/enquiries/new">Add an enquiry</Link></>} />
        <Pager page={page} pageSize={PAGE} total={list.data?.total ?? 0} onPage={(p) => { setPage(p); setSelected(new Set()) }} />
      </div>

      <Sheet open={panel} onClose={() => setPanel(false)} title="Filters" wide>
        <div className="flex flex-col gap-5">
          <CheckboxGroup legend="Gender" values={ui.genders} onChange={(v) => set('genders', v as Gender[])} options={[{ value: 'male', label: 'Total males' }, { value: 'female', label: 'Total females' }]} />
          <CheckboxGroup legend="Lead status" values={ui.leadStatus} onChange={(v) => set('leadStatus', v as UiFilters['leadStatus'])} options={[{ value: 'open', label: 'Open enquiry' }, { value: 'not_interested', label: 'Not interested' }]} />
          <CheckboxGroup legend="Members by age" values={ui.ages} onChange={(v) => set('ages', v)} options={AGES.map(([l]) => ({ value: l, label: l }))} columns={3} />
          <CheckboxGroup legend="Lead type" values={ui.leadType} onChange={(v) => set('leadType', v)} options={[{ value: 'hot', label: 'Hot / expected' }, { value: 'warm', label: 'Warm / may be' }, { value: 'cold', label: 'Cold / not so interested' }]} columns={1} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            <Select ariaLabel="Source of promotion" value={ui.sourcePromotion} onChange={(v) => set('sourcePromotion', v)} placeholder="All sources of promotion" options={label('source_promotion')} />
            <Select ariaLabel="Source of enquiry" value={ui.sourceEnquiry} onChange={(v) => set('sourceEnquiry', v)} placeholder="All sources of enquiry" options={label('source_enquiry')} />
            <Select ariaLabel="Staff" value={ui.staff} onChange={(v) => set('staff', v)} placeholder="All staff" options={[{ value: 'none', label: 'Not assigned' }, ...staffOpts]} />
            <Select ariaLabel="Trainer" value={ui.trainer} onChange={(v) => set('trainer', v)} placeholder="All trainers" options={trainerOpts} />
            <Select ariaLabel="On trial" value={ui.onTrial} onChange={(v) => set('onTrial', v as UiFilters['onTrial'])} placeholder="On trial: all" options={[{ value: 'yes', label: 'On trial: yes' }, { value: 'no', label: 'On trial: no' }]} />
            <Select ariaLabel="Follow-up stage" value={ui.stage} onChange={(v) => set('stage', v as UiFilters['stage'])} placeholder="All stages" options={[{ value: 'untapped', label: 'Untapped' }, { value: 'tapped', label: 'Tapped' }]} />
            <Select ariaLabel="Filter dates by" value={ui.filterBy} onChange={(v) => set('filterBy', v as UiFilters['filterBy'])} options={[{ value: 'enquiry_date', label: 'By created date' }, { value: 'last_follow_up_at', label: 'By follow up date' }]} />
          </div>
          <button type="button" className="btn-gold" onClick={() => setPanel(false)}>Apply</button>
        </div>
      </Sheet>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px]">
              {confirm.action === 'delete' ? `Delete ${confirm.ids.length === 1 ? 'this enquiry' : `these ${confirm.ids.length} enquiries`}? They're kept in the records but leave every list.`
                : confirm.action === 'activate' ? `Activate ${confirm.ids.length === 1 ? 'this enquiry' : `${confirm.ids.length} enquiries`}?`
                : `Deactivate ${confirm.ids.length === 1 ? 'this enquiry' : `${confirm.ids.length} enquiries`}? You can find them under Deactivated enquiries.`}
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
              <button type="button" className={`flex-1 ${confirm.action === 'delete' ? 'btn btn-danger' : 'btn-gold'}`} disabled={bulk.isPending}
                onClick={() => bulk.mutate(confirm)}>Yes</button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!notify} onClose={() => setNotify(null)} title="Send notification">
        <Notice tone="warn">App notifications and bulk WhatsApp go out once the member app and the WhatsApp connection are live (part of switch-day setup). For now, use the WhatsApp button on each enquiry.</Notice>
      </Sheet>

      <FollowUpDialog target={respond} onClose={() => setRespond(null)} />
      <FollowUpHistory member={history} onClose={() => setHistory(null)} />
    </>
  )
}
