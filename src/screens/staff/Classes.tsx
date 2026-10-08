import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, addMonths, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useBatches, useServices, useStudio, useTeam } from '../../db/studio'
import {
  bookClass, cancelBookings, classBookings, classCheckIn, daysLabel, deleteBookings, isoDow, saveClassSession, timeRange, useSchedule,
  type BookingRow, type ClassSlot,
} from '../../db/classes'
import type { MemberOverview } from '../../db/types'
import { stateChip, STATE_LABEL, type SubState } from '../../db/billing'
import { fmtClock, fmtDateTime, fmtDay, fmtTime, studioToday } from '../../lib/dates'
import { ClientLookup } from '../../components/billing'
import { ClientCell } from '../../components/client'
import { CheckboxGroup, Field, Notice, Select, TextInput } from '../../components/controls'
import { BulkBar, Pager } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL Batches & Classes: Class Bookings (Mark Customer Attendance), Classes Calender,
// Classes Capacity Info, and the Class Details pop-up they share.

const subChip = (s: string | null | undefined) => (s ? <span className={`chip ${stateChip(s as SubState)}`}>{STATE_LABEL[s as SubState] ?? s}</span> : <span className="text-muted">—</span>)
const BOOKING_CHIP: Record<string, [string, string]> = {
  booked: ['chip-green', 'Booked'], approved: ['chip-green', 'Approved'], pending: ['chip-amber', 'Waiting List'], rejected: ['chip-red', 'Rejected'],
  cancelled: ['chip-muted', 'Cancelled'], deleted: ['chip-muted', 'Deleted'],
}
export const bookingChip = (s: string) => { const [c, l] = BOOKING_CHIP[s] ?? ['chip-muted', s]; return <span className={`chip ${c}`}>{l}</span> }
const slotLabel = (b: { start_time: string; end_time: string; batch_code: string | null }) => `${timeRange(b.start_time, b.end_time)}${b.batch_code ? ` (${b.batch_code})` : ''}`
const studioLine = (s?: { name: string; branch_name: string | null }) => `${s?.name ?? ''}${s?.branch_name ? ` (${s.branch_name})` : ''}`

// ---------------------------------------------------------------------------
// Class Bookings: "Mark Customer Attendance" (classwise bookings or batchwise fixed members)
// ---------------------------------------------------------------------------
interface Person { member_id: string; name: string; code: string | null; cc: string; phone: string | null; booking?: BookingRow; plan: string | null; state: string | null; check_in: string | null; check_out: string | null }

export function ClassBookings() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const { data: studio } = useStudio()
  const { data: batches = [] } = useBatches()
  const { data: services = [] } = useServices()
  const team = useTeam()
  const today = studioToday()
  const [search, setSearch] = useState('')
  const [trainer, setTrainer] = useState('')
  const [wise, setWise] = useState<'class' | 'batch'>((params.get('wise') as 'class' | 'batch') ?? 'class')
  const [category, setCategory] = useState('')
  const batchId = params.get('batch') ?? ''
  const date = params.get('date') ?? today
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [adding, setAdding] = useState<{ id: string; label: string } | null>(null)
  const [lookupKey, setLookupKey] = useState(0)
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); setSelected(new Set()); setPage(0) }

  const options = batches.filter((b) => b.active && (!trainer || b.trainer_ids.includes(trainer)) && (!category || b.service_ids.includes(category)))
  const batch = batches.find((b) => b.id === batchId)
  const runs = batch ? batch.days.includes(isoDow(date)) : false

  const people = useQuery({
    queryKey: ['class-people', wise, batchId, date], enabled: !!batchId,
    queryFn: async (): Promise<Person[]> => {
      if (wise === 'class') {
        return (await classBookings(batchId, date)).filter((b) => b.status !== 'rejected').map((b) => ({
          member_id: b.member_id, name: b.member_name, code: b.client_code, cc: b.member_country_code, phone: b.member_phone, booking: b,
          plan: b.plan_name, state: b.subscription_state, check_in: b.check_in, check_out: b.check_out,
        }))
      }
      const ids = (throwIf(await supabase.from('batch_members').select('member_id').eq('batch_id', batchId)) as { member_id: string }[]).map((r) => r.member_id)
      if (!ids.length) return []
      const [mo, att] = await Promise.all([
        supabase.from('member_overview').select('id,full_name,client_code,country_code,phone,current_plan_name,live_status').in('id', ids).order('full_name'),
        supabase.from('attendance').select('member_id,check_in,check_out').eq('batch_id', batchId).eq('date', date).in('member_id', ids),
      ])
      const seen = new Map(((throwIf(att) ?? []) as { member_id: string; check_in: string; check_out: string | null }[]).map((a) => [a.member_id, a]))
      return (throwIf(mo) as Pick<MemberOverview, 'id' | 'full_name' | 'client_code' | 'country_code' | 'phone' | 'current_plan_name' | 'live_status'>[]).map((m) => ({
        member_id: m.id, name: m.full_name, code: m.client_code, cc: m.country_code, phone: m.phone, plan: m.current_plan_name,
        state: m.live_status === 'active' ? 'active' : m.live_status === 'pending' ? 'pending' : m.live_status === 'inactive' ? 'expired' : null,
        check_in: seen.get(m.id)?.check_in ?? null, check_out: seen.get(m.id)?.check_out ?? null,
      }))
    },
  })
  const rows = useMemo(() => (people.data ?? []).filter((p) => !search || `${p.name} ${p.code} ${p.phone}`.toLowerCase().includes(search.toLowerCase())), [people.data, search])
  const shown = rows.slice(page * 50, page * 50 + 50)
  const refresh = () => { qc.invalidateQueries({ queryKey: ['class-people'] }); qc.invalidateQueries({ queryKey: ['class-schedule'] }); setSelected(new Set()) }

  const checkIn = useMutation({
    mutationFn: () => classCheckIn(batchId, date, rows.filter((r) => selected.has(r.member_id) && (!r.booking || r.booking.booking_state !== 'pending')).map((r) => r.member_id)),
    onSuccess: (n) => { refresh(); toast(n ? `${n} checked in` : 'Already checked in') },
    onError: (e: Error) => toast(e.message),
  })
  const cancel = useMutation({
    mutationFn: () => cancelBookings(rows.filter((r) => selected.has(r.member_id) && r.booking).map((r) => r.booking!.id)),
    onSuccess: (n) => { refresh(); toast(`${n} ${n === 1 ? 'booking' : 'bookings'} cancelled`) },
    onError: (e: Error) => toast(e.message),
  })
  const add = useMutation({
    mutationFn: () => bookClass({ batch_id: batchId, class_date: date, member_id: adding!.id }),
    onSuccess: async (id) => {
      const st = (throwIf(await supabase.from('class_bookings').select('status').eq('id', id).single()) as { status: string }).status
      refresh(); setAdding(null); setLookupKey((k) => k + 1); toast(st === 'waiting' ? 'The class is full: added to the waiting list' : 'Booked')
    },
    onError: (e: Error) => toast(e.message),
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = shown.length > 0 && shown.every((r) => selected.has(r.member_id))

  return (
    <>
      <PageHeader title="Mark Customer Attendance" sub={studioLine(studio)}
        actions={<><Link to="/classes/calendar" className="btn btn-sm"><Icon name="calendar" size={16} />Classes Calender</Link><Link to="/classes/waiting-list" className="btn btn-sm">Class Waiting List</Link></>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <h2 className="eyebrow">Attendance Listing</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search" className="pl-9" />
          </div>
          <Select small ariaLabel="Trainer" value={trainer} onChange={setTrainer} placeholder="All Trainers" className="w-auto" options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} />
          <Select small ariaLabel="Attendance type" value={wise} onChange={(v) => { setWise(v as 'class' | 'batch'); setSelected(new Set()) }} className="w-auto"
            options={[{ value: 'class', label: 'Classwise Attendance' }, { value: 'batch', label: 'Batchwise Attendance' }]} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select small ariaLabel="Batch" value={batchId} onChange={(v) => setParam('batch', v)} placeholder="Select The Batch" className="w-auto min-w-[240px]"
            options={options.map((b) => ({ value: b.id, label: `${slotLabel(b)} ${b.name}` }))} />
          <Select small ariaLabel="Category" value={category} onChange={setCategory} placeholder="Select Category" className="w-auto"
            options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
          <TextInput small type="date" value={date} onChange={(v) => setParam('date', v)} className="w-auto" />
        </div>
        {!batchId ? <Notice>Select the batch and the date to see {wise === 'class' ? 'who booked the class' : 'the batch’s fixed members'}.</Notice> : <>
          {batch && !runs && <Notice tone="warn">{batch.name} doesn’t run on {format(parseISO(date), 'EEEE')}s ({daysLabel(batch.days, true)}).</Notice>}
          {wise === 'class' && runs && (
            <div className="card flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-[260px] flex-1"><ClientLookup key={lookupKey} id="bk-lookup" label="Book a client into this class" onFound={setAdding} /></div>
              <button type="button" className="btn-gold min-h-10 px-4" disabled={!adding || add.isPending} onClick={() => add.mutate()}>Add Customer</button>
            </div>
          )}
          <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
            {wise === 'class' && <button type="button" className="btn btn-sm" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Cancel Booking</button>}
            <button type="button" className="btn-gold min-h-9 px-4 text-[13px]" disabled={checkIn.isPending || date > today} onClick={() => checkIn.mutate()}>Check In</button>
          </BulkBar>
          {people.isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No Customer Found</div> : <>
            <div className="flex flex-col gap-2.5 lg:hidden">
              <label className="flex min-h-9 items-center gap-2.5 px-1 text-[13px] text-muted"><input type="checkbox" className="check" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(shown.map((r) => r.member_id)))} />Select all</label>
              {shown.map((r) => (
                <label key={r.member_id} className="card flex cursor-pointer gap-3 p-4">
                  <input type="checkbox" className="check mt-1" aria-label={`Select ${r.name}`} checked={selected.has(r.member_id)} onChange={() => toggle(r.member_id)} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13px]">
                    <div className="flex items-start justify-between gap-2"><span className="text-[15px] font-semibold">{r.name}</span>{r.booking ? bookingChip(r.booking.booking_state) : null}</div>
                    <div className="text-muted">{r.code} · {r.plan ?? 'No plan'}</div>
                    <div>{r.check_in ? <span className="chip chip-green">In {fmtTime(r.check_in)}{r.check_out ? ` – out ${fmtTime(r.check_out)}` : ''}</span> : <span className="text-muted">Not checked in</span>}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="card hidden overflow-x-auto lg:block">
              <table className="tbl">
                <thead><tr>
                  <th style={{ width: 44 }}><input type="checkbox" className="check" aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(shown.map((r) => r.member_id)))} /></th>
                  <th>Customer Name</th><th>{wise === 'class' ? 'Booking' : 'Batch'}</th><th>Plan Name</th><th>Subscription Status</th><th>Check-In &amp; Check-Out Time</th>
                </tr></thead>
                <tbody>{shown.map((r) => (
                  <tr key={r.member_id}>
                    <td><input type="checkbox" className="check" aria-label={`Select ${r.name}`} checked={selected.has(r.member_id)} onChange={() => toggle(r.member_id)} /></td>
                    <td><ClientCell id={r.member_id} name={r.name} code={r.code} countryCode={r.cc} phone={r.phone} /></td>
                    <td>{r.booking ? <div className="flex flex-col items-start gap-1">{bookingChip(r.booking.booking_state)}<span className="text-[12px] text-muted">Token {r.booking.token} · {fmtDateTime(r.booking.created_at)}</span></div> : batch?.name}</td>
                    <td>{r.plan ?? '—'}</td>
                    <td>{subChip(r.state)}</td>
                    <td className="nowrap">{r.check_in ? <span className="chip chip-green">{fmtDateTime(r.check_in)}{r.check_out ? ` – ${fmtTime(r.check_out)}` : ''}</span> : <span className="text-muted">Not checked in</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>}
          <Pager page={page} pageSize={50} total={rows.length} onPage={setPage} />
          {!desk && <p className="m-0 text-[12px] text-muted">You see the classes you conduct.</p>}
        </>}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Class Details pop-up (Classes Calender, Capacity Info, Daily Booking Appointment)
// ---------------------------------------------------------------------------
export function ClassDetails({ slot, onClose }: { slot: ClassSlot | null; onClose: () => void }) {
  return (
    <Sheet wide open={!!slot} onClose={onClose} title="Class Details">
      {slot && <ClassDetailsBody key={`${slot.batch_id}${slot.class_date}`} slot={slot} onClose={onClose} />}
    </Sheet>
  )
}

function ClassDetailsBody({ slot, onClose }: { slot: ClassSlot; onClose: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const [title, setTitle] = useState(slot.title)
  const [start, setStart] = useState(slot.start_time.slice(0, 5))
  const [end, setEnd] = useState(slot.end_time.slice(0, 5))
  const [trainers, setTrainers] = useState<string[]>(slot.trainer_ids)
  const [remove, setRemove] = useState<string[]>([])
  const [adding, setAdding] = useState<{ id: string; label: string } | null>(null)
  const [lookupKey, setLookupKey] = useState(0)
  const bookings = useQuery({ queryKey: ['class-people', 'details', slot.batch_id, slot.class_date], queryFn: () => classBookings(slot.batch_id, slot.class_date) })
  const booked = (bookings.data ?? []).filter((b) => b.status === 'booked')
  const waiting = (bookings.data ?? []).filter((b) => b.status === 'waiting')
  const refresh = () => { qc.invalidateQueries({ queryKey: ['class-people'] }); qc.invalidateQueries({ queryKey: ['class-schedule'] }); qc.invalidateQueries({ queryKey: ['registers'] }) }
  const changed = title !== slot.title || start !== slot.start_time.slice(0, 5) || end !== slot.end_time.slice(0, 5) || trainers.join() !== slot.trainer_ids.join()

  const save = useMutation({
    mutationFn: () => saveClassSession({ batch_id: slot.batch_id, class_date: slot.class_date, title: title === slot.batch_name ? '' : title, start_time: start, end_time: end, trainer_ids: trainers }),
    onSuccess: () => { refresh(); toast('Class updated for ' + fmtDay(slot.class_date)); onClose() },
    onError: (e: Error) => toast(e.message),
  })
  const del = useMutation({
    mutationFn: () => deleteBookings(remove, 'Calendar'),
    onSuccess: (n) => { refresh(); setRemove([]); toast(`${n} removed from the class`) },
    onError: (e: Error) => toast(e.message),
  })
  const add = useMutation({
    mutationFn: () => bookClass({ batch_id: slot.batch_id, class_date: slot.class_date, member_id: adding!.id, source: 'calendar' }),
    onSuccess: () => { refresh(); setAdding(null); setLookupKey((k) => k + 1); toast('Customer added') },
    onError: (e: Error) => toast(e.message),
  })
  const remaining = slot.capacity != null ? Math.max(slot.capacity - booked.length, 0) : null
  const stat = (k: string, v: string | number) => <div className="rounded-xl border border-line px-3 py-2"><div className="text-[11px] text-muted uppercase">{k}</div><div className="text-[17px] font-bold">{v}</div></div>

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px] text-muted">{fmtDay(slot.class_date, 'EEEE, dd MMM yyyy')} · {slot.batch_code} · {slot.room ?? 'No room'}{slot.changed ? ' · changed for this day' : ''}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Class Name" id="cd-title" className="sm:col-span-3"><TextInput id="cd-title" value={title} onChange={setTitle} /></Field>
        <Field label="Start Time" id="cd-start"><TextInput id="cd-start" type="time" value={start} onChange={setStart} /></Field>
        <Field label="End Time" id="cd-end"><TextInput id="cd-end" type="time" value={end} onChange={setEnd} /></Field>
        <Field label="Trainer" id="cd-tr"><Select id="cd-tr" value={trainers[0] ?? ''} onChange={(v) => setTrainers(v ? [v, ...trainers.slice(1).filter((x) => x !== v)] : [])} placeholder="Select Trainer"
          options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} /></Field>
      </div>
      {trainers.length > 1 && <div className="text-[12px] text-muted">Also conducted by {trainers.slice(1).map((t) => team.name(t)).filter(Boolean).join(', ')}</div>}
      {desk && changed && <button type="button" className="btn-gold self-start px-4" disabled={save.isPending} onClick={() => save.mutate()}>Save Changes for this day</button>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat('Total Booked', booked.length)}{stat('Slot Remaining', remaining ?? 'No limit')}{stat('Total Capacity', slot.capacity ?? '—')}{stat('Total Enrolled', slot.enrolled)}
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="eyebrow">Customers</h3>
        {bookings.isLoading ? <Loading /> : !booked.length ? <div className="text-[13px] text-muted">No bookings yet.</div> : (
          <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {booked.map((b) => (
              <label key={b.id} className="flex cursor-pointer items-center gap-3 px-3 py-2">
                {desk && <input type="checkbox" className="check" checked={remove.includes(b.id)} onChange={(e) => setRemove(e.target.checked ? [...remove, b.id] : remove.filter((x) => x !== b.id))} />}
                <div className="min-w-0 flex-1"><div className="font-semibold">{b.member_name}</div><div className="text-[12px] text-muted">{b.client_code} · {b.plan_name ?? 'No plan'}</div></div>
                {b.check_in ? <span className="chip chip-green">Checked in</span> : bookingChip(b.booking_state)}
              </label>
            ))}
          </div>
        )}
        {waiting.length > 0 && <div className="text-[13px] text-muted">Waiting list: {waiting.map((w) => w.member_name).join(', ')}</div>}
        {desk && remove.length > 0 && <button type="button" className="btn btn-danger self-start" disabled={del.isPending} onClick={() => del.mutate()}>Remove Members ({remove.length})</button>}
      </section>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1"><ClientLookup key={lookupKey} id="cd-lookup" label="Customers Code" onFound={setAdding} /></div>
        <button type="button" className="btn-gold min-h-10 px-4" disabled={!adding || add.isPending} onClick={() => add.mutate()}>Add Customer</button>
      </div>
      {slot.info && <section className="flex flex-col gap-1"><h3 className="eyebrow">Basic Info</h3><p className="m-0 text-[14px] whitespace-pre-wrap">{slot.info}</p></section>}
      <Link to={`/classes/bookings?batch=${slot.batch_id}&date=${slot.class_date}`} className="btn self-start">Mark Attendance</Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Classes Calender: month, week, day and list views of every class
// ---------------------------------------------------------------------------
type View = 'month' | 'week' | 'day' | 'list'
export function ClassCalendar() {
  const team = useTeam()
  const { data: studio } = useStudio()
  const today = studioToday()
  const [view, setView] = useState<View>(() => (window.innerWidth < 768 ? 'day' : 'month'))
  const [cursor, setCursor] = useState(today)
  const [trainer, setTrainer] = useState('')
  const [open, setOpen] = useState<ClassSlot | null>(null)
  const c = parseISO(cursor)
  const range = useMemo(() => {
    if (view === 'month') return { from: format(startOfWeek(startOfMonth(c), { weekStartsOn: 0 }), 'yyyy-MM-dd'), to: format(endOfWeek(endOfMonth(c), { weekStartsOn: 0 }), 'yyyy-MM-dd') }
    if (view === 'week') return { from: format(startOfWeek(c, { weekStartsOn: 0 }), 'yyyy-MM-dd'), to: format(endOfWeek(c, { weekStartsOn: 0 }), 'yyyy-MM-dd') }
    if (view === 'list') return { from: format(startOfMonth(c), 'yyyy-MM-dd'), to: format(endOfMonth(c), 'yyyy-MM-dd') }
    return { from: cursor, to: cursor }
  }, [view, cursor]) // eslint-disable-line react-hooks/exhaustive-deps
  const { data: slots = [], isFetching } = useSchedule(range.from, range.to)
  const shown = slots.filter((s) => !trainer || s.trainer_ids.includes(trainer))
  const byDay = useMemo(() => { const m = new Map<string, ClassSlot[]>(); for (const s of shown) { const l = m.get(s.class_date) ?? []; l.push(s); m.set(s.class_date, l) } return m }, [shown])
  const move = (n: number) => setCursor(format(view === 'month' || view === 'list' ? addMonths(c, n) : view === 'week' ? addDays(c, 7 * n) : addDays(c, n), 'yyyy-MM-dd'))
  const title = view === 'day' ? format(c, 'MMMM d, yyyy') : view === 'week' ? `${format(parseISO(range.from), 'MMM d')} – ${format(parseISO(range.to), 'MMM d, yyyy')}` : format(c, 'MMMM yyyy')
  const days = (from: string, to: string) => { const out: string[] = []; for (let d = parseISO(from); d <= parseISO(to); d = addDays(d, 1)) out.push(format(d, 'yyyy-MM-dd')); return out }
  const ev = (s: ClassSlot, compact = false) => (
    <button key={s.batch_id + s.class_date} type="button" onClick={() => setOpen(s)}
      className={`w-full rounded-lg border-l-[3px] px-2 py-1 text-left text-[12px] leading-tight hover:bg-surface-3 ${s.capacity != null && s.booked >= s.capacity ? 'border-red bg-red/10' : 'border-gold bg-accent-tint'}`}>
      {s.title.startsWith(fmtClock(s.start_time)) ? <span className="font-semibold">{s.title}</span> : <><span className="font-semibold">{fmtClock(s.start_time)}</span> {s.title}</>}
      {!compact && <span className="block text-muted">{s.trainer_names ?? 'No trainer'} · {s.booked}/{s.capacity ?? '∞'}{s.waiting ? ` · ${s.waiting} waiting` : ''}</span>}
      {compact && <span className="text-muted"> · {s.booked}/{s.capacity ?? '∞'}</span>}
    </button>
  )
  return (
    <>
      <PageHeader title="Classes Calender" sub={studioLine(studio)}
        actions={<Select small ariaLabel="Trainer" value={trainer} onChange={setTrainer} placeholder="All Trainers" className="w-auto" options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} />} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button type="button" className="icon-btn" aria-label="Previous" onClick={() => move(-1)}><Icon name="chevronLeft" size={18} /></button>
            <button type="button" className="icon-btn" aria-label="Next" onClick={() => move(1)}><Icon name="chevronRight" size={18} /></button>
            <button type="button" className="btn btn-sm" disabled={cursor === today} onClick={() => setCursor(today)}>today</button>
          </div>
          <h2 className="title text-[24px]" aria-live="polite">{title}{isFetching ? '…' : ''}</h2>
          <div className="flex overflow-hidden rounded-xl border border-line" role="group" aria-label="View">
            {(['month', 'week', 'day', 'list'] as View[]).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                className={`min-h-9 px-3 text-[13px] font-semibold ${view === v ? 'bg-gold text-on-gold' : 'text-muted hover:bg-surface-2'}`}>{v}</button>
            ))}
          </div>
        </div>
        {view === 'month' && (
          <div className="card overflow-x-auto p-0">
            <div className="grid min-w-[760px] grid-cols-7">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="border-b border-line px-2 py-2 text-center text-[12px] font-bold text-muted">{d}</div>)}
              {days(range.from, range.to).map((d) => {
                const list = byDay.get(d) ?? []
                const off = d.slice(0, 7) !== cursor.slice(0, 7)
                return (
                  <div key={d} className={`min-h-[118px] border-r border-b border-line p-1.5 ${off ? 'opacity-45' : ''} ${d === today ? 'bg-accent-tint/40' : ''}`}>
                    <button type="button" className="mb-1 text-[12px] font-bold hover:text-gold" onClick={() => { setCursor(d); setView('day') }}>{Number(d.slice(8))}</button>
                    <div className="flex flex-col gap-1">{list.slice(0, 3).map((s) => ev(s, true))}
                      {list.length > 3 && <button type="button" className="link-btn text-left text-[12px]" onClick={() => { setCursor(d); setView('day') }}>+{list.length - 3} more</button>}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {view === 'week' && (
          <div className="card overflow-x-auto p-0">
            <div className="grid min-w-[980px] grid-cols-7">
              {days(range.from, range.to).map((d) => (
                <div key={d} className={`flex min-h-[300px] flex-col gap-1 border-r border-line p-1.5 ${d === today ? 'bg-accent-tint/40' : ''}`}>
                  <button type="button" className="mb-1 text-left text-[12px] font-bold hover:text-gold" onClick={() => { setCursor(d); setView('day') }}>{format(parseISO(d), 'EEE d/M')}</button>
                  {(byDay.get(d) ?? []).map((s) => ev(s))}
                </div>
              ))}
            </div>
          </div>
        )}
        {view === 'day' && <DayList slots={byDay.get(cursor) ?? []} onOpen={setOpen} />}
        {view === 'list' && (
          <div className="flex flex-col gap-4">
            {days(range.from, range.to).filter((d) => byDay.get(d)?.length).map((d) => (
              <section key={d} className="flex flex-col gap-2"><h3 className="eyebrow">{format(parseISO(d), 'EEEE, MMMM d, yyyy')}</h3><DayList slots={byDay.get(d)!} onOpen={setOpen} /></section>
            ))}
            {!shown.length && <div className="card px-5 py-10 text-center text-[14px] text-muted">No classes this month.</div>}
          </div>
        )}
      </div>
      <ClassDetails slot={open} onClose={() => setOpen(null)} />
    </>
  )
}

function DayList({ slots, onOpen }: { slots: ClassSlot[]; onOpen: (s: ClassSlot) => void }) {
  if (!slots.length) return <div className="card px-5 py-10 text-center text-[14px] text-muted">No classes on this day.</div>
  return (
    <div className="card divide-y divide-line">
      {slots.map((s) => (
        <button key={s.batch_id + s.class_date} type="button" onClick={() => onOpen(s)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
          <span className="w-[150px] flex-none text-[13px] font-semibold">{timeRange(s.start_time, s.end_time)}</span>
          <span className="min-w-[160px] flex-1"><span className="font-semibold">{s.title}</span><span className="block text-[12px] text-muted">{s.batch_code} · {s.trainer_names ?? 'No trainer'}</span></span>
          <span className={`chip ${s.capacity != null && s.booked >= s.capacity ? 'chip-red' : 'chip-green'}`}>{s.booked}/{s.capacity ?? '∞'} booked</span>
          {s.waiting > 0 && <span className="chip chip-amber">{s.waiting} waiting</span>}
          <span className="text-[12px] text-muted">{s.enrolled} enrolled</span>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Classes Capacity Info: every class on a date, booked against its limit
// ---------------------------------------------------------------------------
export function CapacityInfo() {
  const me = useMe()
  const team = useTeam()
  const { data: studio } = useStudio()
  const navigate = useNavigate()
  const today = studioToday()
  const [date, setDate] = useState(today)
  const [search, setSearch] = useState('')
  const [trainer, setTrainer] = useState('')
  const [panel, setPanel] = useState(false)
  const [genders, setGenders] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [payments, setPayments] = useState<string[]>([])
  const [open, setOpen] = useState<ClassSlot | null>(null)
  const [page, setPage] = useState(0)
  const { data: slots = [], isLoading } = useSchedule(date, date)
  const filtering = genders.length + states.length + payments.length > 0
  const bookings = useQuery({
    queryKey: ['class-people', 'capacity', me.studioId, date], enabled: filtering,
    queryFn: async () => throwIf(await supabase.from('class_booking_overview').select('batch_id,member_gender,subscription_state,payment_status')
      .eq('studio_id', me.studioId).eq('class_date', date).eq('status', 'booked').is('cancelled_at', null).is('deleted_at', null)) as
      { batch_id: string; member_gender: string | null; subscription_state: string | null; payment_status: string | null }[],
  })
  const counted = (s: ClassSlot) => !filtering ? s.booked : (bookings.data ?? []).filter((b) => b.batch_id === s.batch_id
    && (!genders.length || genders.includes(b.member_gender ?? ''))
    && (!states.length || states.includes(b.subscription_state ?? ''))
    && (!payments.length || payments.includes(b.payment_status ?? ''))).length
  const rows = slots.filter((s) => (!trainer || s.trainer_ids.includes(trainer)) && (!search || `${s.title} ${s.batch_name} ${s.batch_code}`.toLowerCase().includes(search.toLowerCase())))
  const shown = rows.slice(page * 50, page * 50 + 50)
  return (
    <>
      <PageHeader title="Classes Capacity Info" sub={studioLine(studio)} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search by Class Name or Batch ID" className="pl-9" />
          </div>
          <span className="text-[12px] text-muted">Conducted By</span>
          <Select small ariaLabel="Conducted By" value={trainer} onChange={(v) => { setTrainer(v); setPage(0) }} placeholder="All Trainers" className="w-auto" options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} />
          <span className="text-[12px] text-muted">Select Date</span>
          <TextInput small type="date" value={date} onChange={(v) => { setDate(v || today); setPage(0) }} className="w-auto" />
          <button type="button" className="btn btn-sm" onClick={() => setPanel(true)}><Icon name="filter" size={16} />Filters{filtering ? ` (${genders.length + states.length + payments.length})` : ''}</button>
        </div>
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No classes on {fmtDay(date)}.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Class Name</th><th>Conducted By</th><th>Start Time</th><th>End Time</th><th>Days</th><th className="num">Total Booked/Total Limit</th></tr></thead>
              <tbody>{shown.map((s) => {
                const n = counted(s)
                return (
                  <tr key={s.batch_id}>
                    <td><button type="button" className="link-btn text-left font-semibold text-ink" onClick={() => setOpen(s)}>{s.title}</button><div className="text-[12px] text-muted">{s.batch_code}{s.waiting ? ` · ${s.waiting} on waiting list` : ''}</div></td>
                    <td>{s.trainer_names ?? '—'}</td>
                    <td className="nowrap">{fmtClock(s.start_time)}</td>
                    <td className="nowrap">{fmtClock(s.end_time)}</td>
                    <td className="max-w-[220px] text-[12px]">{daysLabel(s.days)}</td>
                    <td className="num"><button type="button" className={`chip ${s.capacity != null && s.booked >= s.capacity ? 'chip-red' : 'chip-green'}`}
                      onClick={() => navigate(`/classes/bookings?batch=${s.batch_id}&date=${date}`)}>{n}/{s.capacity ?? '∞'}</button></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
        <Pager page={page} pageSize={50} total={rows.length} onPage={setPage} />
      </div>
      <Sheet open={panel} onClose={() => setPanel(false)} title="Filters" wide>
        <div className="flex flex-col gap-5">
          <CheckboxGroup legend="Gender" values={genders} onChange={setGenders} options={[{ value: 'male', label: 'Total Males' }, { value: 'female', label: 'Total Females' }]} />
          <CheckboxGroup legend="Subsciption Status" values={states} onChange={setStates} options={[{ value: 'active', label: 'Active Subscriptions' }, { value: 'pending', label: 'Pending Subscriptions' },
            { value: 'expired', label: 'Expired Subscriptions' }, { value: 'used', label: 'Used Subscriptions' }]} />
          <CheckboxGroup legend="Payment Status" columns={3} values={payments} onChange={setPayments} options={[{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }]} />
          <p className="m-0 text-[12px] text-muted">With filters on, Total Booked counts only the matching clients.</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => { setGenders([]); setStates([]); setPayments([]) }}>Clear</button>
            <button type="button" className="btn-gold flex-1" onClick={() => setPanel(false)}>Apply</button></div>
        </div>
      </Sheet>
      <ClassDetails slot={open} onClose={() => setOpen(null)} />
    </>
  )
}
