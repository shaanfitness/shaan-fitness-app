import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useStudio } from '../../db/studio'
import { notifyMembers } from '../../db/center'
import { fmtDateTime, fmtDay } from '../../lib/dates'
import { downloadCsv } from '../../lib/csv'
import { ActiveChip, CrudList, studioLine, type CrudDef } from '../../components/crud'
import { Select, TextInput } from '../../components/controls'
import { DataTable, Pager } from '../../components/table'
import { CsvOnly } from '../../access-ui'
import { Icon, PageHeader } from '../../components/ui'

// YDL Fitness Center lists: Holiday, Equipment, Notices, Rules and Feedback.
type Row = { id: string; created_at?: string; active?: boolean } & Record<string, unknown>
const yn = (v: unknown) => (v ? 'Yes' : 'No')
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function useStudioName() {
  const { data } = useStudio()
  return data?.name ?? 'Shaan Fitness'
}

// Fitness Center › Fitness Center Holiday ------------------------------------------------------------
export function Holidays() {
  const me = useMe()
  const def: CrudDef<Row> = {
    table: 'holidays', title: 'Fitness Center Holiday Listing', noun: 'Holiday', addLabel: 'Add Holiday', formTitle: 'Add Event Notice', editTitle: 'Edit Event Notice',
    order: { column: 'event_date', ascending: false },
    searchText: (r) => `${str(r.title)} ${str(r.holiday_type)} ${str(r.wish_text)}`,
    columns: [
      { key: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap">{fmtDay(str(r.event_date))}</span> },
      { key: 'title', header: 'Event title', cell: (r) => <strong>{str(r.title)}</strong> },
      { key: 'type', header: 'Event Type', cell: (r) => str(r.holiday_type) },
      { key: 'wish', header: 'Wish Text', cell: (r) => <span className="line-clamp-2 max-w-[280px]">{str(r.wish_text)}</span> },
      { key: 'holiday', header: 'Declared Holiday', cell: (r) => yn(r.is_holiday) },
      { key: 'send', header: 'Send Wish', cell: (r) => yn(r.send_wish) },
      { key: 'active', header: 'Active', cell: (r) => <ActiveChip on={r.active} /> },
    ],
    card: (r) => (
      <div className="flex flex-col gap-1">
        <strong>{str(r.title)}</strong>
        <span className="text-[13px] text-muted">{fmtDay(str(r.event_date))} · {str(r.holiday_type)} · {r.is_holiday ? 'Holiday' : 'Open'}</span>
        <ActiveChip on={r.active} />
      </div>
    ),
    fields: [
      { key: 'event_date', label: 'Date & Time', type: 'date', required: true },
      { key: 'title', label: 'Event', type: 'text', required: true, hint: 'Make sure your title is short and explanatory.' },
      { key: 'holiday_type', label: 'Type', type: 'select', required: true, default: 'PUBLIC HOLIDAY',
        options: ['PUBLIC HOLIDAY', 'GOVERMENT HOLIDAY', 'GYM HOLIDAY'].map((x) => ({ value: x, label: x })) },
      { key: 'audience', label: 'Send to', type: 'select', default: 'customer', options: [{ value: 'customer', label: 'Customer' }] },
      { key: 'is_holiday', label: 'Declared Holiday', type: 'yesno', required: true, hint: 'A declared holiday counts as a paid day in Payroll.' },
      { key: 'send_wish', label: 'Send Wish', type: 'yesno', required: true },
      { key: 'wish_text', label: 'Wish Text', type: 'textarea', hint: 'Description you provide should explain the notice clearly.' },
    ],
    extraBulk: [{
      label: 'Send Notification',
      run: async (ids) => {
        let n = 0
        for (const id of ids) n += await notifyMembers(me.studioId, 'holiday', id)
        return `Sent to ${n} member${n === 1 ? '' : 's'} in the app`
      },
    }],
  }
  return <CrudList def={def} />
}

// Fitness Center › Equipment › Equipment List -----------------------------------------------------------
const STATUS = [{ value: 'working', label: 'Working' }, { value: 'faulty', label: 'Faulty' }, { value: 'inactive', label: 'Inactive' }]
const statusChip = (s: unknown) => <span className={`chip ${s === 'working' ? 'chip-green' : s === 'faulty' ? 'chip-red' : 'chip-muted'}`}>{STATUS.find((x) => x.value === s)?.label ?? str(s)}</span>

function EquipmentFilters({ apply }: { apply: (f: (r: Row) => boolean) => void }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
      e.preventDefault()
      apply((r) => (!from || str(r.purchase_date) >= from) && (!to || str(r.purchase_date) <= to) && (!status || r.status === status))
    }}>
      <label className="field"><span className="text-[12px] font-semibold text-muted">From Date</span><TextInput small type="date" value={from} onChange={setFrom} /></label>
      <label className="field"><span className="text-[12px] font-semibold text-muted">To Date</span><TextInput small type="date" value={to} onChange={setTo} /></label>
      <label className="field"><span className="text-[12px] font-semibold text-muted">Status</span><Select small value={status} onChange={setStatus} placeholder="All" options={STATUS} /></label>
      <button type="submit" className="btn btn-sm">Submit</button>
    </form>
  )
}

export function Equipment() {
  const def: CrudDef<Row> = {
    table: 'equipment', title: 'Equipment Listing', noun: 'Equipment', nounPlural: 'Equipment', addLabel: 'Add Equipment', editTitle: 'Edit Equipment',
    order: { column: 'purchase_date', ascending: false }, bulk: ['delete'],
    searchText: (r) => `${str(r.name)} ${str(r.serial_number)}`, searchPlaceholder: 'Search by Equipment Name or Serial Number',
    filters: (_rows, set) => <EquipmentFilters apply={set} />,
    columns: [
      { key: 'name', header: 'Equipment Name', cell: (r) => <strong>{str(r.name)}</strong> },
      { key: 'serial', header: 'Serial Number', cell: (r) => str(r.serial_number) },
      { key: 'date', header: 'Purchase Date', cell: (r) => fmtDay(str(r.purchase_date)) },
      { key: 'status', header: 'Status', cell: (r) => statusChip(r.status) },
    ],
    card: (r) => <div className="flex flex-col gap-1"><strong>{str(r.name)}</strong><span className="text-[13px] text-muted">{str(r.serial_number)} · bought {fmtDay(str(r.purchase_date))}</span>{statusChip(r.status)}</div>,
    fields: [
      { key: 'name', label: 'Equipment Name', type: 'text', required: true },
      { key: 'serial_number', label: 'Serial Number', type: 'text', required: true },
      { key: 'status', label: 'Status', type: 'select', required: true, default: 'working', options: STATUS },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
    ],
  }
  return <CrudList def={def} />
}

// Fitness Center › Notices & Rules ---------------------------------------------------------------------------
export function Notices() {
  const me = useMe()
  const center = useStudioName()
  const def: CrudDef<Row> = {
    table: 'notices', title: 'Notices Listing', noun: 'Notice', addLabel: 'Add Notice', editTitle: 'Edit Notice', submitLabel: 'Add Notice',
    order: { column: 'created_at', ascending: false },
    searchText: (r) => `${str(r.title)} ${str(r.description)}`,
    columns: [
      { key: 'title', header: 'Notice title', cell: (r) => <div className="flex flex-col gap-0.5"><strong>{str(r.title)}</strong><span className="line-clamp-1 max-w-[420px] text-[12px] text-muted">{str(r.description)}</span></div> },
      { key: 'center', header: 'Fitness Center', cell: () => center },
      { key: 'to', header: 'Send to', cell: (r) => (r.audience === 'trainer' ? 'Trainer' : 'Customer') },
      { key: 'status', header: 'Status', cell: (r) => <div className="flex flex-col items-start gap-1"><ActiveChip on={r.active} />{r.notified_at ? <span className="text-[11px] text-faint">Sent {fmtDateTime(str(r.notified_at))}</span> : null}</div> },
    ],
    card: (r) => <div className="flex flex-col gap-1"><strong>{str(r.title)}</strong><span className="line-clamp-2 text-[13px] text-muted">{str(r.description)}</span><ActiveChip on={r.active} /></div>,
    fields: [
      { key: 'title', label: 'Notice', type: 'text', required: true, hint: 'Make sure your title is short and explanatory.', full: true },
      { key: 'description', label: 'Notice Description', type: 'textarea', required: true, hint: 'Description you provide should explain the notice clearly.' },
      { key: 'audience', label: 'Send to', type: 'select', required: true, default: 'customer', options: [{ value: 'customer', label: 'Customer' }, { value: 'trainer', label: 'Trainer' }] },
    ],
    extraBulk: [{
      label: 'Send Notification',
      run: async (ids) => {
        let n = 0
        for (const id of ids) n += await notifyMembers(me.studioId, 'notice', id)
        return n ? `Sent to ${n} member${n === 1 ? '' : 's'} in the app` : 'Marked as sent (trainers see notices in the coach app)'
      },
    }],
  }
  return <CrudList def={def} />
}

export function Rules() {
  const center = useStudioName()
  const def: CrudDef<Row> = {
    table: 'rules', title: 'Rules Listing', noun: 'Rule', addLabel: 'Add rule', formTitle: 'Add a Rule', editTitle: 'Edit Rule', submitLabel: 'Add Rule',
    order: { column: 'created_at', ascending: false },
    searchText: (r) => `${str(r.title)} ${str(r.description)}`,
    columns: [
      { key: 'title', header: 'Rule title', cell: (r) => <div className="flex flex-col gap-0.5"><strong>{str(r.title)}</strong><span className="line-clamp-1 max-w-[420px] text-[12px] text-muted">{str(r.description)}</span></div> },
      { key: 'center', header: 'Fitness Center', cell: () => center },
      { key: 'status', header: 'Status', cell: (r) => <ActiveChip on={r.active} /> },
    ],
    card: (r) => <div className="flex flex-col gap-1"><strong>{str(r.title)}</strong><span className="line-clamp-2 text-[13px] text-muted">{str(r.description)}</span><ActiveChip on={r.active} /></div>,
    fields: [
      { key: 'title', label: 'Rule', type: 'text', required: true, hint: 'Make sure your title is short and explanatory.', full: true },
      { key: 'description', label: 'Rule Description', type: 'textarea', required: true, hint: 'Explain your rule in short.' },
    ],
  }
  return <CrudList def={def} />
}

// Fitness Center › Feedback ------------------------------------------------------------------------------------
interface FeedbackRow { id: string; feedback_no: number; feedback: string; created_at: string; member_id: string; full_name: string; email: string | null }

export function FeedbackList() {
  const me = useMe()
  const { data: studio } = useStudio()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const { data = [], isLoading } = useQuery({
    queryKey: ['app_feedback', me.studioId],
    queryFn: async () => throwIf(await supabase.from('app_feedback_overview').select('*')
      .eq('studio_id', me.studioId).order('created_at', { ascending: false }).limit(5000)) as FeedbackRow[],
  })
  const rows = useMemo(() => data.filter((r) => !search || `${r.full_name} ${r.feedback}`.toLowerCase().includes(search.toLowerCase())), [data, search])
  const size = 25
  return (
    <>
      <PageHeader title="Feedback Listing" sub={studioLine(studio)}
        actions={<CsvOnly><button type="button" className="btn btn-sm" onClick={() => downloadCsv('feedback.csv', rows, [
          ['Feedback No.', (r) => r.feedback_no], ['Customer Name', (r) => r.full_name], ['Date & Time', (r) => fmtDateTime(r.created_at)],
          ['Customer Email', (r) => r.email], ['Feedback', (r) => r.feedback]])}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="relative max-w-[420px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search by name or feedback" className="pl-9" />
        </div>
        <DataTable<FeedbackRow> loading={isLoading} rows={rows.slice(page * size, (page + 1) * size)} rowKey={(r) => r.id} caption="Feedback"
          empty="No feedback yet. Members send it from the app (Profile › Send feedback)."
          columns={[
            { key: 'no', header: 'Feedback No.', cell: (r) => r.feedback_no },
            { key: 'name', header: 'Customer Name', cell: (r) => <Link to={`/clients/${r.member_id}`}>{r.full_name}</Link> },
            { key: 'at', header: 'Date & Time', cell: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.created_at)}</span> },
            { key: 'email', header: 'Customer Email', cell: (r) => r.email ?? '' },
            { key: 'text', header: 'Feedback', cell: (r) => <span className="whitespace-pre-line">{r.feedback}</span> },
          ]}
          card={(r) => <div className="flex flex-col gap-1"><strong>{r.full_name}</strong><span className="text-[12px] text-muted">#{r.feedback_no} · {fmtDateTime(r.created_at)}</span><span className="text-[14px] whitespace-pre-line">{r.feedback}</span></div>} />
        <Pager page={page} pageSize={size} total={rows.length} onPage={setPage} />
      </div>
    </>
  )
}
