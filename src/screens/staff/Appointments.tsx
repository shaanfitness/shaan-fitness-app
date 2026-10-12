import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useBatches, useStudio, useTeam } from '../../db/studio'
import { APPOINTMENT_CHIP, APPOINTMENT_STATUS, saveAppointment, timeRange, useSchedule, type Appointment, type AppointmentStatus, type ClassSlot } from '../../db/classes'
import { fmtClock, fmtDay, studioToday } from '../../lib/dates'
import { ClientLookup } from '../../components/billing'
import { Field, Notice, RadioGroup, Select, TextInput } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Avatar, Icon, Loading, PageHeader, Sheet } from '../../components/ui'
import { ClassDetails } from './Classes'

// YDL "Daily Booking Appointment": a day's classes and appointments in one column per trainer,
// with "Book Appointment" (Schedule Appointment) and "Edit Class".

const STATUS_CHIP = APPOINTMENT_CHIP
const statusLabel = (s: AppointmentStatus) => APPOINTMENT_STATUS.find(([k]) => k === s)?.[1] ?? s

export function DailyAppointments() {
  const me = useMe()
  const team = useTeam()
  const { data: studio } = useStudio()
  const today = studioToday()
  const [date, setDate] = useState(today)
  const [trainer, setTrainer] = useState('')
  const [form, setForm] = useState<Appointment | 'new' | null>(null)
  const [slot, setSlot] = useState<ClassSlot | null>(null)
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const { data: slots = [], isLoading } = useSchedule(date, date)
  const appts = useQuery({
    queryKey: ['appointments', me.studioId, date],
    queryFn: async () => throwIf(await supabase.from('appointment_overview').select('*').eq('studio_id', me.studioId).eq('appointment_date', date).order('start_time')) as Appointment[],
  })
  const columns = useMemo(() => {
    const ids = new Set<string>()
    slots.forEach((s) => s.trainer_ids.forEach((t) => ids.add(t)))
    ;(appts.data ?? []).forEach((a) => ids.add(a.handled_by ?? ''))
    const list = [...ids].filter((id) => !trainer || id === trainer)
    return list.map((id) => ({
      id, name: id ? team.name(id) ?? 'Staff' : 'Not assigned',
      items: ([
        ...slots.filter((s) => s.trainer_ids.includes(id)).map((s) => ({ t: s.start_time, slot: s })),
        ...(appts.data ?? []).filter((a) => (a.handled_by ?? '') === id).map((a) => ({ t: a.start_time, appt: a })),
      ] as { t: string; slot?: ClassSlot; appt?: Appointment }[]).sort((a, b) => a.t.localeCompare(b.t)),
    })).sort((a, b) => (a.id === '' ? 1 : b.id === '' ? -1 : a.name.localeCompare(b.name)))
  }, [slots, appts.data, trainer, team])

  return (
    <>
      <PageHeader title="Daily Booking Appointment" sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={desk && <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setForm('new')}><Icon name="plus" size={18} />Book Appointment</button>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Select small ariaLabel="Trainer" value={trainer} onChange={setTrainer} placeholder="All Trainers" className="w-auto" options={team.everyone.filter((s) => s.role !== 'doctor').map((t) => ({ value: t.id, label: t.full_name }))} />
          <button type="button" className="icon-btn" aria-label="Previous day" onClick={() => setDate(shift(date, -1))}><Icon name="chevronLeft" size={18} /></button>
          <TextInput small type="date" value={date} onChange={(v) => setDate(v || today)} className="w-auto" />
          <button type="button" className="icon-btn" aria-label="Next day" onClick={() => setDate(shift(date, 1))}><Icon name="chevronRight" size={18} /></button>
          <span className="text-[14px] font-semibold">{fmtDay(date, 'EEEE, dd MMM yyyy')}</span>
        </div>
        {isLoading || appts.isLoading ? <Loading /> : !columns.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No classes or appointments on this day.</div> : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {columns.map((c) => (
              <section key={c.id || 'none'} className="card flex w-[280px] flex-none flex-col gap-2 p-3" aria-label={c.name}>
                <div className="flex items-center gap-2.5 border-b border-line pb-2"><Avatar name={c.name} size={36} /><div className="min-w-0"><div className="truncate font-semibold">{c.name}</div>
                  <div className="text-[12px] text-muted">{c.items.length} {c.items.length === 1 ? 'booking' : 'bookings'}</div></div></div>
                {c.items.map((it) => it.slot ? (
                  <div key={'s' + it.slot.batch_id} className="rounded-xl border-l-[3px] border-gold bg-accent-tint px-3 py-2 text-[13px]">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="link-btn text-left font-semibold text-ink" onClick={() => setSlot(it.slot!)}>{it.slot.title}</button>
                      {desk && <button type="button" className="icon-btn icon-sm" aria-label={`Edit ${it.slot.title}`} onClick={() => setSlot(it.slot!)}><Icon name="edit" size={14} /></button>}
                    </div>
                    <div className="text-muted">{timeRange(it.slot.start_time, it.slot.end_time)} · Class</div>
                    <div className="text-[12px]">Booked {it.slot.booked}/{it.slot.capacity ?? '∞'}{it.slot.waiting ? ` · ${it.slot.waiting} waiting` : ''}</div>
                  </div>
                ) : (
                  <button key={'a' + it.appt!.id} type="button" onClick={() => setForm(it.appt!)} className="rounded-xl border-l-[3px] border-info bg-surface-2 px-3 py-2 text-left text-[13px] hover:bg-surface-3">
                    <div className="flex items-start justify-between gap-2"><span className="font-semibold">{it.appt!.title}</span><span className={`chip ${STATUS_CHIP[it.appt!.status]}`}>{statusLabel(it.appt!.status)}</span></div>
                    <div className="text-muted">{timeRange(it.appt!.start_time, it.appt!.end_time)}{it.appt!.room_no ? ` · Room ${it.appt!.room_no}` : ''}</div>
                    <div className="text-[12px]">{it.appt!.member_name} ({it.appt!.client_code}){it.appt!.member_kind === 'enquiry' ? ' · Enquiry' : ''}</div>
                  </button>
                ))}
              </section>
            ))}
          </div>
        )}
        {!desk && <p className="m-0 text-[12px] text-muted">You see your own appointments and every class.</p>}
      </div>
      <AppointmentForm value={form} date={date} onClose={() => setForm(null)} />
      <ClassDetails slot={slot} onClose={() => setSlot(null)} />
    </>
  )
}

const shift = (d: string, n: number) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }

function AppointmentForm({ value, date, onClose }: { value: Appointment | 'new' | null; date: string; onClose: () => void }) {
  return (
    <Sheet wide open={!!value} onClose={onClose} title={value === 'new' ? 'Schedule Appointment' : 'Appointment'}>
      {value && <AppointmentBody key={value === 'new' ? 'new' : value.id} value={value} date={date} onClose={onClose} />}
    </Sheet>
  )
}

function AppointmentBody({ value, date, onClose }: { value: Appointment | 'new'; date: string; onClose: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const { data: batches = [] } = useBatches()
  const a = value === 'new' ? null : value
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const [f, setF] = useState({
    status: a?.status ?? 'open', title: a?.title ?? '', batch_id: a?.batch_id ?? '', appointment_date: a?.appointment_date ?? date,
    start_time: a?.start_time.slice(0, 5) ?? '', end_time: a?.end_time.slice(0, 5) ?? '', handled_by: a?.handled_by ?? '', room_no: a?.room_no ?? '', notify: 'yes',
  })
  const [client, setClient] = useState<{ id: string; label: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const save = useMutation({
    mutationFn: () => saveAppointment({
      ...(a ? { id: a.id } : { studio_id: me.studioId }), status: f.status, title: f.title, batch_id: f.batch_id, appointment_date: f.appointment_date,
      start_time: f.start_time, end_time: f.end_time, room_no: f.room_no, ...(desk ? { handled_by: f.handled_by } : {}),
      ...(client ? { member_id: client.id } : {}), ...(a ? {} : { notify_client: f.notify === 'yes' }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast(a ? 'Appointment saved' : 'Appointment booked'); onClose() },
    onError: (e: Error) => setError(e.message),
  })
  const submit = () => {
    setError(null)
    if (!f.title.trim()) return setError('Title is required.')
    if (!f.start_time || !f.end_time) return setError('Appointment start and end time is required.')
    if (f.start_time >= f.end_time) return setError('Appointment start time should be less than end time.')
    if (!a && !client) return setError('Customer code is required. Look the client up first.')
    save.mutate()
  }
  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status" id="ap-status"><Select id="ap-status" value={f.status} onChange={set('status')} options={APPOINTMENT_STATUS.map(([v, l]) => ({ value: v, label: l }))} /></Field>
        <Field label="Title" required id="ap-title"><TextInput id="ap-title" value={f.title} onChange={set('title')} placeholder="e.g. Diet consultation" /></Field>
        <Field label="Service" id="ap-batch"><Select id="ap-batch" value={f.batch_id} onChange={set('batch_id')} placeholder="Select Service"
          options={batches.filter((b) => b.active).map((b) => ({ value: b.id, label: `${timeRange(b.start_time, b.end_time)} · ${b.name}` }))} /></Field>
        <Field label="Appointment Date" required id="ap-date"><TextInput id="ap-date" type="date" value={f.appointment_date} onChange={set('appointment_date')} /></Field>
        <Field label="Start Time" required id="ap-st"><TextInput id="ap-st" type="time" value={f.start_time} onChange={set('start_time')} /></Field>
        <Field label="End Time" required id="ap-et"><TextInput id="ap-et" type="time" value={f.end_time} onChange={set('end_time')} /></Field>
      </div>
      {desk && <ClientLookup id="ap-client" label={a ? `Customer Code (now ${a.member_name} · ${a.client_code})` : 'Customer Code'} required={!a} onFound={setClient} />}
      {!desk && a && <div className="text-[14px]">Client: <strong>{a.member_name}</strong> ({a.client_code})</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {desk && <Field label="Appointment With" id="ap-with"><Select id="ap-with" value={f.handled_by} onChange={set('handled_by')} placeholder="Select Staff"
          options={team.everyone.map((s) => ({ value: s.id, label: `${s.full_name} (${s.role === 'coach' ? 'Trainer' : s.role === 'doctor' ? 'Doctor' : 'Staff'})` }))} /></Field>}
        <Field label="Room No." id="ap-room"><TextInput id="ap-room" value={f.room_no} onChange={set('room_no')} /></Field>
      </div>
      {!a && <RadioGroup name="ap-notify" legend="Notify To Client" value={f.notify} onChange={set('notify')} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />}
      {a && <p className="m-0 text-[12px] text-muted">Booked {fmtDay(a.created_at)} by {a.created_by_name ?? '—'} · {fmtClock(a.start_time)} on {fmtDay(a.appointment_date)}</p>}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  )
}
