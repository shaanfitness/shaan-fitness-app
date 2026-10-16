import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { coachToday } from '../../db/care'
import { askLeave, coachDay, coachRoster, recordSession, setAppointmentStatus, type CoachDay } from '../../db/coach'
import { classCheckIn, staffCheckIn } from '../../db/classes'
import { cancelLeave, LEAVE_MODE } from '../../db/team'
import { fmtClock, fmtDateTime, fmtDay, fmtTime, plusDays, studioToday } from '../../lib/dates'
import { ContactButtons } from '../../components/client'
import { Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../components/controls'
import { FollowUpDialog, type FollowUpTarget } from '../../components/FollowUp'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Section, Sheet } from '../../components/ui'

// The coach app (YDL trainer app), phone first: my own check-in, today's classes with attendance,
// PT sessions to record, appointments, follow-ups due, the members I train, and leave requests.

type PtRow = CoachDay['pt'][number]
type ClassRow = CoachDay['classes'][number]
const APPT_CHIP: Record<string, string> = { attended: 'chip-green', confirmed: 'chip-info', no_show: 'chip-red', wait_list: 'chip-amber', open: 'chip-muted' }
const APPT_LABEL: Record<string, string> = { open: 'Open', confirmed: 'Confirmed', attended: 'Attended', no_show: 'No show', wait_list: 'Requested', no_action: 'No action', rescheduled: 'Rescheduled', other: 'Other' }
const LEAVE_CHIP: Record<string, string> = { pending: 'chip-amber', approved: 'chip-green', rejected: 'chip-red' }

export default function CoachHome() {
  const me = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  const today = studioToday()
  const [respond, setRespond] = useState<FollowUpTarget | null>(null)
  const [roster, setRoster] = useState<ClassRow | null>(null)
  const [session, setSession] = useState<PtRow | null>(null)
  const [leave, setLeave] = useState(false)
  const day = useQuery({ queryKey: ['coach-day', me.staffId], queryFn: coachDay, refetchInterval: 120_000 })
  const { data: d, error } = useQuery({ queryKey: ['coach', 'today', me.staffId, today], queryFn: () => coachToday(me.studioId, me.staffId!, today) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['coach-day'] })
  const shift = useMutation({
    mutationFn: (out: boolean) => staffCheckIn(me.staffId!, out),
    onSuccess: (_, out) => { refresh(); toast(out ? 'Checked out. Thank you!' : 'Checked in. Have a good session!') },
    onError: (e: Error) => toast(e.message),
  })
  const appt = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setAppointmentStatus(id, status),
    onSuccess: (_, v) => { refresh(); toast(`Marked ${APPT_LABEL[v.status].toLowerCase()}`) },
    onError: (e: Error) => toast(e.message),
  })
  const dropLeave = useMutation({
    mutationFn: cancelLeave,
    onSuccess: () => { refresh(); toast('Leave request cancelled') },
    onError: (e: Error) => toast(e.message),
  })
  const [hour] = useState(() => Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date())))
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  if (error || day.error) return <div className="p-8 text-red">{((error ?? day.error) as Error).message}</div>
  if (!d || !day.data) return <Loading />
  const c = day.data
  const s = c.shift
  const first = c.staff.name.split(' ')[0]
  return (
    <>
      <PageHeader title={`${greet}, ${first}`} sub={`${fmtDay(c.date, 'EEE d MMM')} · ${c.classes.length} ${c.classes.length === 1 ? 'class' : 'classes'} · ${c.pt.length} PT · ${c.appointments.length} ${c.appointments.length === 1 ? 'appointment' : 'appointments'} · ${d.followUpCount} follow-ups due`} />

      <Section>
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4" role="region" aria-label="My attendance">
          <div>
            <div className="text-[15px] font-bold">{!s ? 'You’re not checked in' : s.check_out ? 'Day done' : 'You’re checked in'}</div>
            <div className="text-[13px] text-muted">{!s ? 'Check in when you reach the gym.' : s.check_out ? `${fmtTime(s.check_in)} – ${fmtTime(s.check_out)}` : `In since ${fmtTime(s.check_in)}`}</div>
          </div>
          {(!s || s.check_out) ? <button type="button" className="btn-gold px-5" disabled={shift.isPending} onClick={() => shift.mutate(false)}>Check in</button>
            : <button type="button" className="btn px-5" disabled={shift.isPending} onClick={() => shift.mutate(true)}>Check out</button>}
        </div>
      </Section>

      <div className="lg:grid lg:grid-cols-2">
        <Section title="My classes today" id="classes-h">
          <div className="flex flex-col gap-2.5">
            {c.classes.length === 0 && <div className="card p-5 text-[14px] text-muted">No classes today.</div>}
            {c.classes.map((b) => (
              <div key={b.id} className="card flex items-center gap-3 p-4">
                <div className="w-[76px] flex-none font-display text-[18px]">{fmtClock(b.start_time)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">{b.name}</div>
                  <div className="text-[13px] text-muted">{b.present} of {b.expected} in{b.capacity ? ` · capacity ${b.capacity}` : ''}</div>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setRoster(b)}>Attendance</button>
              </div>
            ))}
          </div>
        </Section>

        <Section title="PT sessions" id="pt-h">
          <div className="card overflow-hidden">
            {c.pt.length === 0 && <div className="p-5 text-[14px] text-muted">No personal training clients right now.</div>}
            {c.pt.map((p) => (
              <div key={p.subscription_id} className="row flex-wrap">
                <div className="min-w-0 flex-1">
                  <Link to={`/clients/${p.member_id}`} className="text-[14px] font-bold text-ink no-underline hover:text-gold">{p.name}</Link>
                  <div className="text-[12px] text-muted">{p.plan_name} · {p.sessions_total ? `${p.sessions_used} of ${p.sessions_total} sessions` : `${p.sessions_used} sessions`} · ends {fmtDay(p.end_date, 'd MMM')}{p.last_session ? ` · last ${fmtDay(p.last_session, 'd MMM')}` : ''}</div>
                </div>
                {p.done_today ? <span className="chip chip-green">Done today</span>
                  : <button type="button" className="btn btn-sm" onClick={() => setSession(p)}>Record session</button>}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Appointments today" id="appt-h">
          <div className="card overflow-hidden">
            {c.appointments.length === 0 && <div className="p-5 text-[14px] text-muted">No appointments today.</div>}
            {c.appointments.map((a) => (
              <div key={a.id} className="row flex-wrap">
                <div className="w-[76px] flex-none font-display text-[16px]">{fmtClock(a.start_time)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">{a.title}</div>
                  <div className="text-[12px] text-muted">{a.member_id ? <Link to={`/clients/${a.member_id}`} className="text-muted">{a.member_name}</Link> : a.member_name}{a.room_no ? ` · room ${a.room_no}` : ''}</div>
                </div>
                {['attended', 'no_show'].includes(a.status) ? <span className={`chip ${APPT_CHIP[a.status]}`}>{APPT_LABEL[a.status]}</span> : (
                  <div className="flex gap-1.5">
                    <button type="button" className="btn btn-sm" disabled={appt.isPending} aria-label={`${a.title}: attended`} onClick={() => appt.mutate({ id: a.id, status: 'attended' })}>Attended</button>
                    <button type="button" className="btn btn-sm" disabled={appt.isPending} aria-label={`${a.title}: no show`} onClick={() => appt.mutate({ id: a.id, status: 'no_show' })}>No show</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Follow-ups due" id="fu-h" action={<Link to="/follow-ups" className="text-[13px] font-semibold">See all</Link>}>
          <div className="card overflow-hidden">
            {d.followUps.length === 0 && <div className="p-5 text-[14px] text-muted">Nothing due. Well done.</div>}
            {d.followUps.map((f) => (
              <div key={f.id} className="row flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">{f.member_name}</div>
                  <div className={`text-[12px] ${f.due_date < today ? 'text-red' : 'text-muted'}`}>{f.type} · {fmtDateTime(f.due_at)}</div>
                  {f.notes && <div className="text-[13px] text-ink-soft">{f.notes}</div>}
                </div>
                <div className="flex gap-1.5">
                  <ContactButtons countryCode={f.member_country_code} phone={f.member_phone} />
                  <button type="button" className="btn btn-sm" onClick={() => setRespond({ memberId: f.member_id, memberName: f.member_name, followUp: f })}>Response</button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Members I train" id="members-h">
        <div className="card overflow-hidden">
          {d.members.length === 0 && <div className="p-5 text-[14px] text-muted">No members are assigned to you yet.</div>}
          {d.members.map((m) => (
            <div key={m.id} className="row">
              <div className="min-w-0 flex-1">
                <Link to={`/clients/${m.id}`} className="text-[14px] font-bold text-ink no-underline hover:text-gold">{m.full_name} <span className="font-normal text-muted">{m.client_code}</span></Link>
                <div className="text-[12px] text-muted">{m.current_plan_name ? `${m.current_plan_name}${m.sessions ? ` · ${m.sessions} sessions` : ''} · ends ${fmtDay(m.current_end_date)}` : 'No current plan'}{m.last_check_in ? ` · last in ${fmtDateTime(m.last_check_in)}` : ''}</div>
              </div>
              <ContactButtons countryCode={m.country_code} phone={m.phone} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="My leave" id="leave-h" action={<button type="button" className="btn btn-sm" onClick={() => setLeave(true)}><Icon name="plus" size={15} />Ask for leave</button>}>
        <div className="card overflow-hidden">
          {c.leave.length === 0 && <div className="p-5 text-[14px] text-muted">No leave coming up.</div>}
          {c.leave.map((l) => (
            <div key={l.id} className="row flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold">{l.start_date === l.end_date ? fmtDay(l.start_date, 'EEE d MMM') : `${fmtDay(l.start_date, 'd MMM')} – ${fmtDay(l.end_date, 'd MMM')}`}</div>
                <div className="text-[12px] text-muted">{LEAVE_MODE[l.mode]} · {Number(l.days)} {Number(l.days) === 1 ? 'day' : 'days'}{l.reason ? ` · ${l.reason}` : ''}</div>
              </div>
              <span className={`chip ${LEAVE_CHIP[l.status]}`}>{l.status === 'pending' ? 'Waiting' : l.status === 'approved' ? 'Approved' : 'Rejected'}</span>
              {l.status === 'pending' && <button type="button" className="btn btn-sm" disabled={dropLeave.isPending} onClick={() => { if (window.confirm('Cancel this leave request?')) dropLeave.mutate(l.id) }}>Cancel</button>}
            </div>
          ))}
        </div>
      </Section>

      <FollowUpDialog target={respond} onClose={() => setRespond(null)} />
      <Sheet open={!!roster} onClose={() => setRoster(null)} title={roster ? `${roster.name} · ${fmtClock(roster.start_time)}` : ''}>
        {roster && <Roster cls={roster} date={c.date} onDone={() => setRoster(null)} />}
      </Sheet>
      <Sheet open={!!session} onClose={() => setSession(null)} title="Record session">
        {session && <SessionForm row={session} onDone={() => setSession(null)} />}
      </Sheet>
      <Sheet open={leave} onClose={() => setLeave(false)} title="Ask for leave">
        {leave && <LeaveForm onDone={() => setLeave(false)} />}
      </Sheet>
    </>
  )
}

function Roster({ cls, date, onDone }: { cls: ClassRow; date: string; onDone: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: ['coach-roster', cls.id, date], queryFn: () => coachRoster(cls.id, date) })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const m = useMutation({
    mutationFn: () => classCheckIn(cls.id, date, [...picked]),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['coach-roster'] }); qc.invalidateQueries({ queryKey: ['coach-day'] }); toast(n ? `${n} checked in` : 'Already checked in'); setPicked(new Set()); onDone() },
    onError: (e: Error) => toast(e.message),
  })
  if (q.isLoading) return <Loading />
  if (q.error) return <Notice tone="error">{(q.error as Error).message}</Notice>
  const rows = q.data ?? []
  const waiting = rows.filter((r) => !r.present)
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-muted">{rows.filter((r) => r.present).length} of {rows.length} in. Tick who came, then check them in.</p>
      {!rows.length ? <Notice>No one is booked or in this batch yet.</Notice> : (
        <ul className="m-0 flex list-none flex-col p-0" aria-label="Class roster">
          {rows.map((r) => (
            <li key={r.member_id} className="flex min-h-12 items-center gap-3 border-b border-line-soft py-1.5 last:border-b-0">
              {r.present ? <span className="flex h-5 w-5 items-center justify-center text-green" aria-hidden="true"><Icon name="check" size={18} /></span>
                : <input type="checkbox" className="check" aria-label={`${r.name} came`} checked={picked.has(r.member_id)} onChange={() => toggle(r.member_id)} />}
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{r.name} <span className="font-normal text-muted">{r.code}</span></div>
                <div className="text-[12px] text-muted">{[r.in_batch ? 'Batch member' : '', r.booked ? 'Booked' : ''].filter(Boolean).join(' · ')}{r.present && r.check_in ? ` · in ${fmtTime(r.check_in)}` : ''}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {waiting.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => setPicked(picked.size === waiting.length ? new Set() : new Set(waiting.map((r) => r.member_id)))}>{picked.size === waiting.length ? 'Clear' : 'Tick all'}</button>
          <button type="button" className="btn-gold flex-1" disabled={!picked.size || m.isPending} onClick={() => m.mutate()}>Check in {picked.size || ''}</button>
        </div>
      )}
    </div>
  )
}

function SessionForm({ row, onDone }: { row: PtRow; onDone: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [show, setShow] = useState<'show' | 'no_show_deduct' | 'no_show'>('show')
  const [activity, setActivity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: () => recordSession({ subscription_id: row.subscription_id, show, activity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coach-day'] }); toast(show === 'no_show' ? 'No-show noted' : 'Session recorded'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate() }}>
      <p className="m-0 text-[14px]"><strong>{row.name}</strong> · {row.plan_name} · {row.sessions_total ? `${row.sessions_used} of ${row.sessions_total} used` : `${row.sessions_used} used`}</p>
      <RadioGroup name="ses-show" legend="Did the client come?" value={show} onChange={(v) => setShow(v as typeof show)}
        options={[{ value: 'show', label: 'Came' }, { value: 'no_show_deduct', label: 'No show (counts)' }, { value: 'no_show', label: 'No show (doesn’t count)' }]} />
      <Field label="What you did (optional)" id="ses-act"><TextInput id="ses-act" value={activity} onChange={setActivity} placeholder="Upper body, mobility…" /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-gold" disabled={m.isPending}>Save session</button>
    </form>
  )
}

function LeaveForm({ onDone }: { onDone: () => void }) {
  const me = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  const today = studioToday()
  const [f, setF] = useState({ start: plusDays(today, 1), end: plusDays(today, 1), mode: 'full', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: () => askLeave(me.studioId, me.staffId!, f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coach-day'] }); toast('Leave request sent to the owner'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      if (!f.start || !f.end || f.end < f.start) return setError('The leave should end on or after the day it starts.')
      if (f.start < today) return setError('Leave can start from today.')
      if (f.mode !== 'full' && f.start !== f.end) return setError('A half day is a single day.')
      m.mutate()
    }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From" required id="lv-from"><TextInput id="lv-from" type="date" value={f.start} onChange={(v) => setF({ ...f, start: v, end: f.end < v ? v : f.end })} /></Field>
        <Field label="To" required id="lv-to"><TextInput id="lv-to" type="date" value={f.end} onChange={(v) => setF({ ...f, end: v })} /></Field>
      </div>
      <Field label="Leave mode" id="lv-mode"><Select id="lv-mode" value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={Object.entries(LEAVE_MODE).map(([value, label]) => ({ value, label }))} /></Field>
      <Field label="Reason" id="lv-reason"><TextArea id="lv-reason" rows={2} value={f.reason} onChange={(v) => setF({ ...f, reason: v })} /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-gold" disabled={m.isPending}>Send request</button>
    </form>
  )
}
