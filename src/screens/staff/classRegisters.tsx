import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { stateChip, STATE_LABEL, type SubState } from '../../db/billing'
import { daysLabel, decideWaiting, deleteBookings, timeRange, type BookingRow, type CheckinRow } from '../../db/classes'
import { downloadCsv } from '../../lib/csv'
import { fmtClock, fmtDateTime, fmtDay, fmtTime } from '../../lib/dates'
import { ClientCell } from '../../components/client'
import { Notice } from '../../components/controls'
import { fBatch, type RegisterCtx, type RegisterDef, type RegisterFilter } from '../../components/register'
import type { Column } from '../../components/table'
import { useToast } from '../../components/toast'
import { Sheet } from '../../components/ui'
import { bookingChip } from './Classes'

// YDL class registers: Class Attendance, Cancelled and Deleted Class Register, Class Waiting List,
// Batchwise Attendance List and Program Attendance, as definitions for the shared register engine.

const subChip = (s: string | null | undefined) => (s ? <span className={`chip ${stateChip(s as SubState)}`}>{STATE_LABEL[s as SubState] ?? s}</span> : '—')
const fCategory = (ctx: RegisterCtx, col: string): RegisterFilter => ({
  key: 'category', placeholder: 'Select Category', options: ctx.services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name })), apply: (q, v) => q.contains(col, [v]),
})
const fClassBatch = (ctx: RegisterCtx): RegisterFilter => ({
  ...fBatch(ctx), placeholder: 'All Batches', options: ctx.batches.map((b) => ({ value: b.id, label: `${timeRange(b.start_time, b.end_time)} (${b.batch_code ?? b.name})` })),
})
const panel = { gender: 'member_gender', state: 'subscription_state', payment: 'payment_status', end: 'subscription_end_date' }
const search = ['member_name', 'member_phone', 'member_email', 'client_code']
const searchPlaceholder = 'Search by Name or Mobile Number or Email'

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
const nameCol: Column<BookingRow> = { key: 'name', header: 'Customer Name', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> }
const classCols: Column<BookingRow>[] = [
  nameCol,
  { key: 'class', header: 'Class Name', cell: (r) => <><span className="font-semibold">{r.class_name}</span><div className="text-[12px] text-muted">{r.batch_code}</div></> },
  { key: 'when', header: 'Class Date-Time', className: 'nowrap', cell: (r) => <>{fmtDay(r.class_date)}<div className="text-[12px] text-muted">{timeRange(r.start_time, r.end_time)}</div></> },
  { key: 'svc', header: 'Service Categories', cell: (r) => <span className="text-[12px] text-muted">{r.service_names ?? '—'}</span> },
  { key: 'tr', header: 'Trainers', cell: (r) => r.trainer_names ?? '—' },
  { key: 'days', header: 'Days', cell: (r) => <span className="text-[12px]">{daysLabel(r.days, true)}</span> },
]
const bookingCsv = (): [string, (r: BookingRow) => unknown][] => [
  ['Customer Name', (r) => r.member_name], ['Customer Code', (r) => r.client_code], ['Mobile', (r) => r.member_phone], ['Class Name', (r) => r.class_name],
  ['Batch', (r) => r.batch_code], ['Class Date', (r) => r.class_date], ['Start', (r) => fmtClock(r.start_time)], ['End', (r) => fmtClock(r.end_time)],
  ['Service Categories', (r) => r.service_names], ['Trainers', (r) => r.trainer_names], ['Days', (r) => daysLabel(r.days)], ['Plan Name', (r) => r.plan_name],
  ['Booking On', (r) => r.created_at], ['Booking Status', (r) => r.booking_state], ['Token', (r) => r.token], ['Checked In', (r) => r.check_in],
  ['Cancelled On', (r) => r.cancelled_at], ['Cancel Source', (r) => r.cancel_source], ['Deleted On', (r) => r.deleted_at], ['Delete Source', (r) => r.delete_source],
]

export const classAttendance: RegisterDef<BookingRow> = {
  title: 'Class Attendance Listing', view: 'class_booking_overview', dateCol: 'class_date', defaultPreset: 'today', search, searchPlaceholder,
  base: (q) => q.eq('status', 'booked').is('cancelled_at', null).is('deleted_at', null),
  filters: (ctx) => [fClassBatch(ctx), fCategory(ctx, 'service_ids'),
    { key: 'att', placeholder: 'Attendance', options: [{ value: 'in', label: 'Checked in' }, { value: 'out', label: 'Not checked in' }], apply: (q, v) => (v === 'in' ? q.not('attendance_id', 'is', null) : q.is('attendance_id', null)) }],
  panel, order: [['class_date', false], ['start_time', true]],
  columns: () => [...classCols,
    { key: 'plan', header: 'By Plan Name', cell: (r) => r.plan_name ?? '—' },
    { key: 'on', header: 'Booking On', className: 'nowrap', cell: (r) => <>{fmtDateTime(r.created_at)}<div className="text-[12px] text-muted">{r.source === 'app' ? 'Client App' : r.booked_by_name ?? 'CRM'}</div></> },
    { key: 'in', header: 'Checked In', className: 'nowrap', cell: (r) => (r.check_in ? <span className="chip chip-green">{fmtTime(r.check_in)}</span> : <span className="text-muted">—</span>) },
  ],
  csv: bookingCsv, totals: (rows) => [['Total', String(rows.length)], ['Checked in', String(rows.filter((r) => r.check_in).length)]],
}

export const cancelledClasses: RegisterDef<BookingRow> = {
  title: 'Cancel Class History', view: 'class_booking_overview', dateCol: 'cancelled_at', defaultPreset: 'last_30', search, searchPlaceholder,
  notice: <Notice>Note: Past 30 days cancelled history will be displayed. Choose other dates to see older cancellations.</Notice>,
  base: (q) => q.not('cancelled_at', 'is', null), filters: (ctx) => [fClassBatch(ctx)], panel, order: [['cancelled_at', false]],
  columns: () => [...classCols,
    { key: 'on', header: 'Booking On', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) },
    { key: 'cx', header: 'Cancelled On', className: 'nowrap', cell: (r) => <>{fmtDateTime(r.cancelled_at)}{r.cancelled_by_name ? <div className="text-[12px] text-muted">by {r.cancelled_by_name}</div> : null}</> },
    { key: 'src', header: 'Cancel Source', cell: (r) => r.cancel_source ?? '—' },
  ],
  csv: bookingCsv,
}

export const deletedClasses: RegisterDef<BookingRow> = {
  title: 'Deleted Class History', view: 'class_booking_overview', dateCol: 'deleted_at', defaultPreset: 'last_30', search, searchPlaceholder,
  notice: <Notice>Note: Past 30 days Deleted history will be displayed. Choose other dates to see older deletions.</Notice>,
  base: (q) => q.not('deleted_at', 'is', null), filters: (ctx) => [fClassBatch(ctx), fCategory(ctx, 'service_ids')], order: [['deleted_at', false]],
  columns: () => [...classCols,
    { key: 'on', header: 'Booking On', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) },
    { key: 'dx', header: 'Deleted On', className: 'nowrap', cell: (r) => <>{fmtDateTime(r.deleted_at)}{r.deleted_by_name ? <div className="text-[12px] text-muted">by {r.deleted_by_name}</div> : null}</> },
    { key: 'src', header: 'Delete Source', cell: (r) => r.delete_source ?? '—' },
  ],
  csv: bookingCsv,
}

/** A button that asks first (YDL's "ARE YOU SURE ...?" pop-ups). */
function ConfirmButton({ label, question, onYes, danger, busy }: { label: string; question: string; onYes: () => void; danger?: boolean; busy?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={`btn btn-sm ${danger ? 'btn-danger' : ''}`} disabled={busy} onClick={() => setOpen(true)}>{label}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Are you sure?">
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px]">{question}</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setOpen(false)}>No</button>
            <button type="button" className={`flex-1 ${danger ? 'btn btn-danger' : 'btn-gold'}`} onClick={() => { setOpen(false); onYes() }}>Yes</button></div>
        </div>
      </Sheet>
    </>
  )
}

function WaitingBulk({ rows, done }: { rows: BookingRow[]; done: () => void }) {
  const toast = useToast()
  const ids = rows.map((r) => r.id)
  const run = useMutation({
    mutationFn: (a: 'approve' | 'reject' | 'delete') => (a === 'delete' ? deleteBookings(ids) : decideWaiting(ids, a === 'approve')),
    onSuccess: (n, a) => { done(); toast(`${n} ${n === 1 ? 'booking' : 'bookings'} ${a === 'approve' ? 'approved' : a === 'reject' ? 'rejected' : 'deleted'}`) },
    onError: (e: Error) => toast(e.message),
  })
  return <>
    <button type="button" className="btn btn-sm" disabled={run.isPending} onClick={() => run.mutate('approve')}>Approve</button>
    <button type="button" className="btn btn-sm" disabled={run.isPending} onClick={() => run.mutate('reject')}>Reject</button>
    <ConfirmButton label="Delete" danger busy={run.isPending} question="ARE YOU SURE YOU WANT TO DELETE SELECTED CLASS BOOKING ?" onYes={() => run.mutate('delete')} />
  </>
}

function WaitingActions({ r }: { r: BookingRow }) {
  const toast = useToast()
  const qc = useQueryClient()
  const run = useMutation({
    mutationFn: (approve: boolean) => decideWaiting([r.id], approve),
    onSuccess: (_n, approve) => { qc.invalidateQueries({ queryKey: ['registers'] }); qc.invalidateQueries({ queryKey: ['class-schedule'] }); toast(approve ? 'Approved: the client is booked' : 'Rejected') },
    onError: (e: Error) => toast(e.message),
  })
  if (r.booking_state !== 'pending') return <span className="text-muted">—</span>
  return <div className="flex gap-1.5"><button type="button" className="btn btn-sm" disabled={run.isPending} onClick={() => run.mutate(true)}>Approve</button>
    <button type="button" className="btn btn-sm" disabled={run.isPending} onClick={() => run.mutate(false)}>Reject</button></div>
}

export const waitingList: RegisterDef<BookingRow> = {
  title: 'Class Waiting List', view: 'class_booking_overview', dateCol: 'class_date', dateLabel: 'Class Booking Date', presetKind: 'register', defaultPreset: 'all',
  search, searchPlaceholder, panel,
  base: (q) => q.is('cancelled_at', null).is('deleted_at', null).or('status.in.(waiting,rejected),from_waiting_list.eq.true'),
  filters: () => [{ key: 'bs', placeholder: 'All Status', options: [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }],
    apply: (q, v) => q.eq('booking_state', v) }],
  order: [['class_date', false], ['created_at', true]],
  columns: () => [nameCol,
    { key: 'batch', header: 'Batch ID', cell: (r) => <><span className="nowrap">{r.batch_code}</span><div className="text-[12px] text-muted">{r.class_name}</div></> },
    { key: 'req', header: 'Request Date', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) },
    { key: 'cd', header: 'Class Booking Date', className: 'nowrap', cell: (r) => fmtDay(r.class_date) },
    { key: 'st', header: 'Class Start Time', className: 'nowrap', cell: (r) => fmtClock(r.start_time) },
    { key: 'et', header: 'Class End Time', className: 'nowrap', cell: (r) => fmtClock(r.end_time) },
    { key: 'bs', header: 'Booking Status', cell: (r) => (r.booking_state === 'pending' ? <span className="chip chip-amber">Pending</span> : bookingChip(r.booking_state)) },
    { key: 'tok', header: 'Booking Token', cell: (r) => <code>{r.token}</code> },
    { key: 'act', header: 'Action', cell: (r) => <WaitingActions r={r} /> },
  ],
  csv: bookingCsv,
  bulk: (rows, done) => <WaitingBulk rows={rows} done={done} />,
}

// ---------------------------------------------------------------------------
// Check-ins (Batchwise Attendance List)
// ---------------------------------------------------------------------------
const LIVE = ['class', 'live', 'manual', 'pt']
const SCAN = ['qr', 'biometric', 'app']
const checkinCsv = (): [string, (r: CheckinRow) => unknown][] => [
  ['Customer Name', (r) => r.member_name], ['Customer Code', (r) => r.client_code], ['Mobile', (r) => r.member_phone], ['Batch Name', (r) => r.batch_name],
  ['Date', (r) => r.date], ['Check-In', (r) => fmtTime(r.check_in)], ['Check-Out', (r) => fmtTime(r.check_out)], ['Conducted By', (r) => r.conducted_by],
  ['Category', (r) => r.batch_service_names], ['Subscription Status', (r) => r.subscription_state], ['Plan', (r) => r.plan_name], ['How', (r) => r.source],
]
export const inOut = (r: { check_in: string; check_out: string | null; date: string }) => (
  <span className="nowrap">{fmtDay(r.date)}<div className="text-[12px] text-muted">{fmtTime(r.check_in)} – {r.check_out ? fmtTime(r.check_out) : 'not out'}</div></span>
)
export const batchwiseAttendance: RegisterDef<CheckinRow> = {
  title: 'Batch Attendance Listing', view: 'checkin_overview', dateCol: 'date', presetKind: 'register', defaultPreset: 'today', dateLabel: 'Select Date Range',
  search: ['member_name', 'member_phone', 'client_code'], searchPlaceholder: 'Search by customer name',
  base: (q) => q.not('batch_id', 'is', null).eq('status', 'present'),
  filters: (ctx) => [{ ...fClassBatch(ctx), placeholder: 'Select The Batch' }, fCategory(ctx, 'batch_service_ids'),
    { key: 'type', placeholder: 'By Both Live & Scan QR', options: [{ value: 'live', label: 'By Live Session' }, { value: 'scan', label: 'By Scan QR' }],
      apply: (q, v) => q.in('source', v === 'live' ? LIVE : SCAN) }],
  order: [['date', false], ['check_in', false]],
  columns: () => [
    { key: 'name', header: 'Customer Name', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> },
    { key: 'batch', header: 'Batch Name', cell: (r) => <>{r.batch_name}<div className="text-[12px] text-muted">{r.batch_code}</div></> },
    { key: 'io', header: 'Check-In & Check-Out Time', cell: inOut },
    { key: 'by', header: 'Conducted By', cell: (r) => r.conducted_by ?? '—' },
    { key: 'cat', header: 'Category', cell: (r) => <span className="text-[12px] text-muted">{r.batch_service_names ?? '—'}</span> },
    { key: 'st', header: 'Subscription Status', cell: (r) => subChip(r.subscription_state) },
  ],
  csv: checkinCsv, totals: (rows) => [['Total', String(rows.length)]],
  bulk: (rows) => <button type="button" className="btn btn-sm" onClick={() => downloadCsv('batch-attendance-selected.csv', rows, checkinCsv())}>Export to CSV</button>,
}

// ---------------------------------------------------------------------------
// Program Attendance
// ---------------------------------------------------------------------------
interface ProgramAttendanceRow { id: string; program_id: string; member_id: string; date: string; joined_at: string; left_at: string | null; program_name: string
  start_time: string; end_time: string; member_name: string; client_code: string | null; member_country_code: string; member_phone: string | null }
export const programAttendance: RegisterDef<ProgramAttendanceRow> = {
  title: 'Program Attendance Listing', view: 'program_attendance_overview', dateCol: 'date', presetKind: 'register', defaultPreset: 'last_7', dateLabel: 'Select Date Range',
  search: ['member_name', 'member_phone', 'client_code'], requires: 'program',
  filters: (ctx) => [{ key: 'program', placeholder: 'Select Program', options: ctx.programs.map((p) => ({ value: p.id, label: p.name })), apply: (q, v) => q.eq('program_id', v) }],
  order: [['date', false], ['joined_at', false]],
  columns: () => [
    { key: 'name', header: 'Customer Name', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> },
    { key: 'prog', header: 'Program Name', cell: (r) => <>{r.program_name}<div className="text-[12px] text-muted">{timeRange(r.start_time, r.end_time)}</div></> },
    { key: 'date', header: 'Date', className: 'nowrap', cell: (r) => fmtDay(r.date) },
    { key: 'in', header: 'Joined At', className: 'nowrap', cell: (r) => fmtTime(r.joined_at) },
    { key: 'out', header: 'Left At', className: 'nowrap', cell: (r) => (r.left_at ? fmtTime(r.left_at) : '—') },
  ],
  csv: () => [['Customer Name', (r) => r.member_name], ['Customer Code', (r) => r.client_code], ['Mobile', (r) => r.member_phone], ['Program', (r) => r.program_name],
    ['Date', (r) => r.date], ['Joined At', (r) => r.joined_at], ['Left At', (r) => r.left_at]],
  totals: (rows) => [['Total', String(rows.length)]],
}

