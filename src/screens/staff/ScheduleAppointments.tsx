import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useList, useStudio, useTeam } from '../../db/studio'
import { APPOINTMENT_CHIP, APPOINTMENT_STATUS, saveAppointment, timeRange, type Appointment, type AppointmentStatus } from '../../db/classes'
import { fmtDay, studioToday } from '../../lib/dates'
import { studioLine } from '../../components/crud'
import { ClientLookup } from '../../components/billing'
import { Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL Appointments (Schedule Appointments): the week's appointments with Status, Purpose and Staff filters,
// Schedule Appointment and Edit Scheduled Appointment (with Delete), and members' requests from the app.

const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const statusLabel = (s: AppointmentStatus) => APPOINTMENT_STATUS.find(([k]) => k === s)?.[1] ?? s
const NEW_STATUSES: AppointmentStatus[] = ['open', 'no_action', 'attended', 'no_show', 'cancelled']

export function ScheduleAppointments() {
  const me = useMe()
  const team = useTeam()
  const purposes = useList('appointment_purpose')
  const { data: studio } = useStudio()
  const today = studioToday()
  const [week, setWeek] = useState(() => iso(startOfWeek(parseISO(today), { weekStartsOn: 1 })))
  const [status, setStatus] = useState('')
  const [purpose, setPurpose] = useState('')
  const [staff, setStaff] = useState('')
  const [form, setForm] = useState<Appointment | { date: string } | null>(null)
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const end = iso(addDays(parseISO(week), 6))
  const q = useQuery({
    queryKey: ['appointments', me.studioId, 'week', week],
    queryFn: async () => throwIf(await supabase.from('appointment_overview').select('*').eq('studio_id', me.studioId)
      .gte('appointment_date', week).lte('appointment_date', end).order('appointment_date').order('start_time')) as Appointment[],
  })
  const requests = useQuery({
    queryKey: ['appointments', me.studioId, 'requests'],
    queryFn: async () => throwIf(await supabase.from('appointment_overview').select('*').eq('studio_id', me.studioId).eq('status', 'wait_list')
      .gte('appointment_date', today).order('appointment_date').order('start_time').limit(50)) as Appointment[],
  })
  const rows = useMemo(() => (q.data ?? []).filter((a) => (!status || a.status === status) && (!purpose || (a.purpose ?? a.title) === purpose) && (!staff || a.handled_by === staff)), [q.data, status, purpose, staff])
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(parseISO(week), i)))
  return (
    <>
      <PageHeader title="Schedule Appointments" sub={studioLine(studio)}
        actions={desk && <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setForm({ date: today >= week && today <= end ? today : week })}><Icon name="plus" size={18} />Schedule Appointment</button>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        {(requests.data?.length ?? 0) > 0 && (
          <section className="card flex flex-col gap-2 border-l-[3px] border-l-amber p-4" aria-label="Requests from the app">
            <h2 className="m-0 text-[15px] font-bold">Requests from the app ({requests.data!.length})</h2>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {requests.data!.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                  <span><strong>{a.member_name}</strong> · {a.purpose ?? a.title} · {fmtDay(a.appointment_date, 'EEE dd MMM')} {timeRange(a.start_time, a.end_time)}{a.comments ? <span className="text-muted"> · “{a.comments}”</span> : null}</span>
                  <button type="button" className="btn btn-sm" onClick={() => setForm(a)}>Review</button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setWeek(iso(addDays(parseISO(week), -7)))}><Icon name="chevronLeft" size={18} /></button>
          <span className="min-w-[200px] text-center text-[14px] font-semibold">{fmtDay(week, 'dd MMM')} – {fmtDay(end, 'dd MMM yyyy')}</span>
          <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setWeek(iso(addDays(parseISO(week), 7)))}><Icon name="chevronRight" size={18} /></button>
          <button type="button" className="btn btn-sm" onClick={() => setWeek(iso(startOfWeek(parseISO(today), { weekStartsOn: 1 })))}>This week</button>
          <Select small ariaLabel="Status" value={status} onChange={setStatus} placeholder="All Status" className="w-auto" options={APPOINTMENT_STATUS.map(([v, l]) => ({ value: v, label: l }))} />
          <Select small ariaLabel="Purpose" value={purpose} onChange={setPurpose} placeholder="All purpose" className="w-auto" options={purposes.map((p) => ({ value: p.label, label: p.label }))} />
          {desk && <Select small ariaLabel="Staff" value={staff} onChange={setStaff} placeholder="All Staff" className="w-auto" options={team.everyone.map((s) => ({ value: s.id, label: s.full_name }))} />}
        </div>
        {q.isLoading ? <Loading /> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            {days.map((d) => {
              const list = rows.filter((a) => a.appointment_date === d)
              return (
                <section key={d} aria-label={fmtDay(d, 'EEEE dd MMM')} className={`card flex flex-col gap-2 p-3 xl:min-h-[120px] ${d === today ? 'border-gold' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[13px] font-bold ${d === today ? 'text-gold' : ''}`}>{fmtDay(d, 'EEE dd MMM')}</span>
                    {desk && <button type="button" className="icon-btn icon-sm" aria-label={`Schedule on ${fmtDay(d, 'EEEE dd MMM')}`} onClick={() => setForm({ date: d })}><Icon name="plus" size={14} /></button>}
                  </div>
                  {!list.length ? <span className="text-[12px] text-faint">No appointments</span> : list.map((a) => (
                    <button key={a.id} type="button" onClick={() => setForm(a)} className="rounded-xl border-l-[3px] border-info bg-surface-2 px-2.5 py-2 text-left text-[12.5px] hover:bg-surface-3">
                      <div className="font-semibold">{timeRange(a.start_time, a.end_time)}</div>
                      <div className="truncate">{a.member_name}</div>
                      <div className="truncate text-muted">{a.purpose ?? a.title}{a.handled_by_name ? ` · ${a.handled_by_name}` : ''}</div>
                      <span className={`chip mt-1 ${APPOINTMENT_CHIP[a.status]}`}>{statusLabel(a.status)}</span>
                    </button>
                  ))}
                </section>
              )
            })}
          </div>
        )}
        <p className="m-0 text-[12px] text-muted">{desk ? 'Classes and trainer-wise bookings are on ' : 'You see the appointments you handle. Classes are on '}<Link to="/appointments/daily">Daily Booking Appointment</Link>.</p>
      </div>
      <Sheet wide open={!!form} onClose={() => setForm(null)} title={form && 'id' in form ? 'Edit Scheduled Appointment' : 'Schedule Appointment'}>
        {form && <AppointmentDialog key={'id' in form ? form.id : form.date} value={form} onClose={() => setForm(null)} />}
      </Sheet>
    </>
  )
}

function AppointmentDialog({ value, onClose }: { value: Appointment | { date: string }; onClose: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const purposes = useList('appointment_purpose')
  const a = 'id' in value ? value : null
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const [f, setF] = useState({
    status: (a?.status ?? 'open') as AppointmentStatus, purpose: a?.purpose ?? a?.title ?? '', comments: a?.comments ?? '', date: a?.appointment_date ?? ('date' in value ? value.date : ''),
    start: a?.start_time.slice(0, 5) ?? '', end: a?.end_time.slice(0, 5) ?? '', handled_by: a?.handled_by ?? '', room: a?.room_no ?? '', notify: 'yes',
  })
  const [client, setClient] = useState<{ id: string; label: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }))
  const statuses = a ? APPOINTMENT_STATUS.map(([v]) => v) : NEW_STATUSES
  const done = (msg: string) => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast(msg); onClose() }
  const save = useMutation({
    mutationFn: () => saveAppointment({
      ...(a ? { id: a.id } : { studio_id: me.studioId, notify_client: f.notify === 'yes' }), status: f.status, purpose: f.purpose, ...(a && a.title !== a.purpose ? {} : { title: f.purpose }),
      comments: f.comments, appointment_date: f.date, start_time: f.start, end_time: f.end, room_no: f.room,
      ...(desk ? { handled_by: f.handled_by } : {}), ...(client ? { member_id: client.id } : {}),
    }),
    onSuccess: () => done(a ? 'Appointment saved' : 'Appointment scheduled'),
    onError: (e: Error) => setError(e.message),
  })
  const del = useMutation({
    mutationFn: async () => { throwIf(await supabase.from('appointments').delete().eq('id', a!.id).select('id')) },
    onSuccess: () => done('Appointment deleted'),
    onError: (e: Error) => setError(e.message),
  })
  const submit = () => {
    setError(null)
    if (!f.purpose) return setError('Choose the purpose.')
    if (!f.date) return setError('Choose the appointment date.')
    if (!f.start || !f.end) return setError('Appointment start and end time is required.')
    if (f.start >= f.end) return setError('Appointment start time should be less than end time.')
    if (!a && !client) return setError('Customer Code is required. Look the client up first.')
    save.mutate()
  }
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      {a?.requested_by_member && <Notice>{a.member_name} asked for this from the app{a.comments ? `: “${a.comments}”` : ''}. Set the time and who it is with, then mark it Confirmed; they are told in the app.</Notice>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status" id="sa-status"><Select id="sa-status" value={f.status} onChange={(v) => set('status')(v)} options={statuses.map((v) => ({ value: v, label: statusLabel(v) }))} /></Field>
        <Field label="Purpose" required id="sa-purpose"><Select id="sa-purpose" value={f.purpose} onChange={set('purpose')} placeholder="Select purpose"
          options={[...purposes.map((p) => ({ value: p.label, label: p.label })), ...(f.purpose && !purposes.some((p) => p.label === f.purpose) ? [{ value: f.purpose, label: f.purpose }] : [])]} /></Field>
        <Field label="Appointment Date" required id="sa-date"><TextInput id="sa-date" type="date" value={f.date} onChange={set('date')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Time" required id="sa-start"><TextInput id="sa-start" type="time" value={f.start} onChange={set('start')} /></Field>
          <Field label="End Time" required id="sa-end"><TextInput id="sa-end" type="time" value={f.end} onChange={set('end')} /></Field>
        </div>
      </div>
      {desk && <ClientLookup id="sa-client" label={a ? `Customer Code (now ${a.member_name} · ${a.client_code ?? ''})` : 'Customer Code'} required={!a} onFound={setClient} />}
      {!desk && a && <p className="m-0 text-[14px]">Client: <strong>{a.member_name}</strong> ({a.client_code})</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {desk && <Field label="Handled By" id="sa-with"><Select id="sa-with" value={f.handled_by} onChange={set('handled_by')} placeholder="Select Staff"
          options={team.everyone.map((s) => ({ value: s.id, label: `${s.full_name} (${s.role === 'coach' ? 'Trainer' : s.role === 'doctor' ? 'Doctor' : 'Staff'})` }))} /></Field>}
        <Field label="Room No." id="sa-room"><TextInput id="sa-room" value={f.room} onChange={set('room')} /></Field>
      </div>
      <Field label="Comments" id="sa-comments"><TextArea id="sa-comments" rows={3} value={f.comments} onChange={set('comments')} /></Field>
      {!a && <RadioGroup name="sa-notify" legend="Notify To Client" value={f.notify} onChange={set('notify')} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn flex-1" onClick={onClose}>Close</button>
        {a && desk && <button type="button" className="btn btn-danger flex-1" disabled={del.isPending} onClick={() => { if (window.confirm('Delete this appointment?')) del.mutate() }}>Delete</button>}
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  )
}
