import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { deleteFollowUps, followUpQuery, listFollowUps, transferFollowUps, type FollowUpFilters } from '../../db/followUps'
import { useLists, useStudio, useTeam } from '../../db/studio'
import type { FollowUpOverview, Gender } from '../../db/types'
import { fmtDateTime, fmtDay, studioToday } from '../../lib/dates'
import { downloadCsv } from '../../lib/csv'
import { money } from '../../lib/format'
import { ClientCell, ContactButtons } from '../../components/client'
import { Checkbox, Field, Notice, Select, TextInput, opts } from '../../components/controls'
import { FollowUpDialog, FollowUpHistory, statusChip, type FollowUpTarget } from '../../components/FollowUp'
import { BulkBar, DataTable, Pager, type Column } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, PageHeader, Sheet } from '../../components/ui'

// YDL "Follow Up Dashboard": what would you like to do (missed / due, done, expected),
// filters, transfer follow-ups between staff, delete, export, staff insights.
const PAGE = 50
type Mode = 'due' | 'done' | 'expected'

export default function FollowUps() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const { data: studio } = useStudio()
  const { data: lists } = useLists()
  const team = useTeam()
  const today = studioToday()
  const isDesk = me.role === 'owner' || me.role === 'front_desk'

  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'due')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(today)
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [conv, setConv] = useState('')
  const [status, setStatus] = useState('')
  const [assigned, setAssigned] = useState(isDesk ? '' : me.staffId ?? '')
  const [createdBy, setCreatedBy] = useState('')
  const [clientRep, setClientRep] = useState('')
  const [type, setType] = useState('')
  const [clientKind, setClientKind] = useState('')
  const [insights, setInsights] = useState(false)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [respond, setRespond] = useState<FollowUpTarget | null>(null)
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null)
  const [transfer, setTransfer] = useState(false)
  const [tFrom, setTFrom] = useState('')
  const [tTo, setTTo] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filters: FollowUpFilters = useMemo(() => ({
    mode, from: from || null, to: to || null, search,
    gender: (gender || undefined) as Gender | undefined,
    convertibility: conv ? (lists?.convertibility ?? []).filter((c) => c.kind === conv).map((c) => c.label) : undefined,
    status: status || undefined, assignedTo: assigned || undefined, createdBy: createdBy || undefined,
    clientRep: clientRep || undefined, type: type || undefined, clientKind: (clientKind || undefined) as FollowUpFilters['clientKind'],
  }), [mode, from, to, search, gender, conv, status, assigned, createdBy, clientRep, type, clientKind, lists])

  const list = useQuery({
    queryKey: ['followups', 'list', me.studioId, filters, page],
    queryFn: () => listFollowUps(me.studioId, filters, page, PAGE),
    placeholderData: (prev) => prev,
  })
  const staffStats = useQuery({
    queryKey: ['followups', 'insights', me.studioId, from, to],
    enabled: insights,
    queryFn: async () => {
      const res = await followUpQuery(me.studioId, { mode: 'all', from: null, to: null }).select('assigned_to,assigned_name,status,due_at').limit(10000)
      if (res.error) throw new Error(res.error.message)
      const rows = (res.data ?? []) as FollowUpOverview[]
      const inRange = rows.filter((r) => (!from || r.due_at.slice(0, 10) >= from) && (!to || r.due_at.slice(0, 10) <= to))
      const by = new Map<string, { name: string; open: number; done: number; successful: number; not_interested: number }>()
      for (const r of inRange) {
        const k = r.assigned_to ?? 'system'
        const e = by.get(k) ?? { name: r.assigned_name ?? 'System generated', open: 0, done: 0, successful: 0, not_interested: 0 }
        e[r.status] += 1
        by.set(k, e)
      }
      return [...by.values()].sort((a, b) => a.name.localeCompare(b.name))
    },
  })

  const reset = () => { setPage(0); setSelected(new Set()) }
  const doTransfer = useMutation({
    mutationFn: () => transferFollowUps(me.studioId, tFrom, tTo),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['followups'] }); setTransfer(false); toast(`${n} open follow-up${n === 1 ? '' : 's'} transferred`) },
    onError: (e: Error) => toast(e.message),
  })
  const doDelete = useMutation({
    mutationFn: () => deleteFollowUps([...selected]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['followups'] }); setSelected(new Set()); setConfirmDelete(false); toast('Follow-ups deleted') },
    onError: (e: Error) => toast(e.message),
  })

  const exportCsv = async () => {
    const res = await followUpQuery(me.studioId, filters).order('due_at').limit(10000)
    if (res.error) return toast(res.error.message)
    downloadCsv(`follow-ups-${today}.csv`, (res.data ?? []) as FollowUpOverview[], [
      ['Type', (r) => r.type], ['Client Code', (r) => r.client_code], ['Name', (r) => r.member_name], ['Mobile', (r) => (r.member_phone ? `${r.member_country_code} ${r.member_phone}` : '')],
      ['Client Type', (r) => (r.member_kind === 'member' ? 'Member' : 'Enquiry')], ['Follow up Date', (r) => r.due_at], ['Assigned To', (r) => r.assigned_name],
      ['Scheduled By', (r) => (r.source === 'system' ? 'System Generated' : r.created_by_name)], ['To Do', (r) => r.notes], ['Convertibility', (r) => r.convertibility],
      ['Status', (r) => r.status], ['Response', (r) => r.response], ['Comment', (r) => r.response_note], ['Expected Date', (r) => r.expected_date], ['Expected Amount', (r) => r.expected_amount],
    ])
  }

  const staffOpts = team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: s.full_name + (s.role === 'coach' ? ' (trainer)' : '') }))
  const rows = list.data?.rows ?? []
  const columns: Column<FollowUpOverview>[] = [
    { key: 'type', header: 'Type', cell: (r) => <div><div className="font-semibold">{r.type}</div><div className="text-[12px] text-muted">{r.member_kind === 'member' ? 'Member' : 'Enquiry'}</div></div> },
    { key: 'name', header: 'Name & number', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> },
    { key: 'date', className: 'nowrap', header: mode === 'done' ? 'Done on' : mode === 'expected' ? 'Expected' : 'Follow up date', cell: (r) => (
      mode === 'done' ? fmtDateTime(r.responded_at) : mode === 'expected' ? <div>{fmtDay(r.expected_date)}<div className="text-[12px] text-muted">{money(Number(r.expected_amount ?? 0))}</div></div>
        : <span className={r.due_date < today ? 'text-red' : ''}>{fmtDateTime(r.due_at)}</span>
    ) },
    { key: 'by', header: 'Assign / schedule by', cell: (r) => <div className="text-[12px]"><div>{r.assigned_name ?? 'System generated'}</div><div className="text-muted">{r.source === 'system' ? 'System generated' : r.created_by_name ?? ''}</div></div> },
    { key: 'todo', header: 'To do', cell: (r) => <div className="max-w-[260px] text-[13px]"><div className="line-clamp-2">{r.notes ?? '—'}</div>{r.response_note && <div className="mt-1 line-clamp-2 text-muted">{r.response}: {r.response_note}</div>}</div> },
    { key: 'conv', header: 'Convertibility', cell: (r) => r.convertibility ?? '—' },
    { key: 'status', header: 'Status', cell: (r) => statusChip(r.status) },
    { key: 'act', header: 'Action', className: 'nowrap', cell: (r) => actions(r) },
  ]
  function actions(r: FollowUpOverview) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {r.status === 'open' && <button type="button" className="btn btn-sm" onClick={() => setRespond({ memberId: r.member_id, memberName: r.member_name, followUp: r })}>Response</button>}
        <button type="button" className="icon-btn icon-sm" aria-label="Follow-up history" onClick={() => setHistory({ id: r.member_id, name: r.member_name })}><Icon name="history" size={16} /></button>
        <ContactButtons countryCode={r.member_country_code} phone={r.member_phone} />
      </div>
    )
  }
  const card = (r: FollowUpOverview) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} />
        {statusChip(r.status)}
      </div>
      <div className="text-[13px]"><span className="font-semibold">{r.type}</span> · <span className={mode === 'due' && r.due_date < today ? 'text-red' : 'text-muted'}>{fmtDateTime(r.due_at)}</span></div>
      {r.notes && <div className="text-[13px] text-ink-soft">{r.notes}</div>}
      <div className="text-[12px] text-muted">{[r.assigned_name, r.convertibility, r.expected_amount ? `${money(Number(r.expected_amount))} expected` : null].filter(Boolean).join(' · ')}</div>
      {actions(r)}
    </div>
  )

  return (
    <>
      <PageHeader title="Follow up dashboard" sub={`Welcome, ${me.name.split(' ')[0]} · ${studio?.name ?? ''}`}
        actions={<>
          {isDesk && <button type="button" className="btn btn-sm" onClick={() => setTransfer(true)}>Transfer follow ups</button>}
          <button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button>
          <Link to="/reports/follow-ups" className="btn btn-sm">View analysis</Link>
        </>} />

      <div className="flex flex-col gap-3 px-5 pt-5 lg:px-8">
        <div className="card flex flex-col gap-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="What would you like to do?" id="mode">
              <Select id="mode" small value={mode} onChange={(v) => { setMode(v as Mode); reset() }}
                options={[{ value: 'due', label: 'Missed / due follow ups' }, { value: 'done', label: 'Follow ups done' }, { value: 'expected', label: 'Expected follow ups' }]} />
            </Field>
            <Field label="From" id="from"><TextInput id="from" small type="date" value={from} onChange={(v) => { setFrom(v); reset() }} /></Field>
            <Field label="To" id="to"><TextInput id="to" small type="date" value={to} onChange={(v) => { setTo(v); reset() }} /></Field>
            <Field label="Search" id="fsearch"><TextInput id="fsearch" small value={search} onChange={(v) => { setSearch(v); reset() }} placeholder="Name, mobile or code" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Select small ariaLabel="Gender" value={gender} onChange={(v) => { setGender(v); reset() }} placeholder="All genders" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
            <Select small ariaLabel="Convertibility" value={conv} onChange={(v) => { setConv(v); reset() }} placeholder="All convertibility" options={[{ value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'cold', label: 'Cold' }, { value: 'expected', label: 'Expected' }, { value: 'unpitched', label: 'Unpitched' }]} />
            <Select small ariaLabel="Status" value={status} onChange={(v) => { setStatus(v); reset() }} placeholder="All status" options={[{ value: 'open', label: 'Open' }, { value: 'done', label: 'Follow ups done' }, { value: 'not_interested', label: 'Not interested' }, { value: 'successful', label: 'Successful' }]} />
            <Select small ariaLabel="Assigned to" value={assigned} onChange={(v) => { setAssigned(v); reset() }} placeholder="All staff" options={[{ value: 'system', label: 'System generated' }, ...staffOpts]} />
            <Select small ariaLabel="Comment added by" value={createdBy} onChange={(v) => { setCreatedBy(v); reset() }} placeholder="Added by: all" options={[{ value: 'system', label: 'System generated' }, ...staffOpts]} />
            <Select small ariaLabel="Client rep" value={clientRep} onChange={(v) => { setClientRep(v); reset() }} placeholder="Client rep: all" options={team.staffAccounts.map((s) => ({ value: s.id, label: s.full_name }))} />
            <Select small ariaLabel="Follow-up type" value={type} onChange={(v) => { setType(v); reset() }} placeholder="All follow up types" options={opts((lists?.followup_type ?? []).map((i) => i.label))} />
            <Select small ariaLabel="Client type" value={clientKind} onChange={(v) => { setClientKind(v); reset() }} placeholder="All clients" options={[{ value: 'enquiry', label: 'Enquiry' }, { value: 'member', label: 'Member' }]} />
          </div>
          {isDesk && <Checkbox checked={insights} onChange={setInsights} label="Show staff insights" />}
        </div>

        {insights && (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <caption className="sr-only">Follow-ups by staff member</caption>
              <thead><tr><th>Staff name</th><th className="num">Open</th><th className="num">Follow ups done</th><th className="num">Successful</th><th className="num">Not interested</th><th className="num">Total</th></tr></thead>
              <tbody>
                {(staffStats.data ?? []).map((s) => (
                  <tr key={s.name}><td>{s.name}</td><td className="num">{s.open}</td><td className="num">{s.done}</td><td className="num">{s.successful}</td><td className="num">{s.not_interested}</td>
                    <td className="num font-bold">{s.open + s.done + s.successful + s.not_interested}</td></tr>
                ))}
                {staffStats.isLoading && <tr><td colSpan={6} className="text-center text-muted">Loading…</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted">{list.data ? `${list.data.total} follow-up${list.data.total === 1 ? '' : 's'}` : ''}</span>
        </div>
        {list.error && <Notice tone="error">{(list.error as Error).message}</Notice>}
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          {me.role === 'owner' && <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
        </BulkBar>
        <DataTable caption="Follow-ups" rows={rows} loading={list.isLoading} rowKey={(r) => r.id} columns={columns} card={card}
          selectable={me.role === 'owner'} selected={selected} onSelect={setSelected}
          empty={mode === 'due' ? 'No follow-ups due. Well done.' : 'Nothing in this period.'} />
        <Pager page={page} pageSize={PAGE} total={list.data?.total ?? 0} onPage={(p) => { setPage(p); setSelected(new Set()) }} />
      </div>

      <Sheet open={transfer} onClose={() => setTransfer(false)} title="Transfer follow ups">
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-[14px] text-muted">Every open follow-up of one staff member moves to another. Done ones stay with whoever did them.</p>
          <Field label="Transfer from" required id="tfrom"><Select id="tfrom" value={tFrom} onChange={setTFrom} placeholder="Select staff" options={staffOpts} /></Field>
          <Field label="Transfer to" required id="tto"><Select id="tto" value={tTo} onChange={setTTo} placeholder="Select staff" options={staffOpts.filter((s) => s.value !== tFrom)} /></Field>
          <button type="button" className="btn-gold" disabled={!tFrom || !tTo || doTransfer.isPending} onClick={() => doTransfer.mutate()}>Transfer follow ups</button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Are you sure?">
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px]">Delete the {selected.size} selected follow-up{selected.size === 1 ? '' : 's'}? This can't be undone.</p>
          <div className="flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => setConfirmDelete(false)}>No</button>
            <button type="button" className="btn btn-danger flex-1" disabled={doDelete.isPending} onClick={() => doDelete.mutate()}>Yes, delete</button>
          </div>
        </div>
      </Sheet>

      <FollowUpDialog target={respond} onClose={() => setRespond(null)} />
      <FollowUpHistory member={history} onClose={() => setHistory(null)} />
    </>
  )
}
