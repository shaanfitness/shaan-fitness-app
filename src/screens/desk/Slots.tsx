import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { coachLoad, daySlots, markAttendance, type DaySlot } from '../../data/api'
import type { AttendanceStatus } from '../../data/types'
import { addDays, fmtDate, fmtTime, isoWeekday, tierLabel, todayISO } from '../../lib/format'
import { useSession } from '../../session'
import { Bar, Icon, Loading, ScreenHeader, Section } from '../../components/ui'

function SlotRow({ s, date, open, onToggle }: { s: DaySlot; date: string; open: boolean; onToggle: () => void }) {
  const qc = useQueryClient()
  const t = fmtTime(s.slot.start_time)
  const full = s.people.length >= s.slot.capacity
  const set = async (memberId: string, status: AttendanceStatus | null) => {
    await markAttendance({ memberId, slotId: s.slot.id, date, status })
    await qc.invalidateQueries()
  }
  const canMark = s.state !== 'upcoming' || date === todayISO()
  return (
    <div className={`border-b border-line-soft last:border-b-0 ${open ? 'bg-surface-3' : ''}`}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left text-ink">
        <div className={`w-[62px] flex-none font-display text-[19px] leading-tight ${s.state === 'live' ? 'text-gold' : s.state === 'done' ? 'text-muted' : ''}`}>
          {t.time}<small className="block font-sans text-[11px] font-semibold tracking-wider text-muted">{t.suffix}</small>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={`text-[15px] font-bold ${s.state === 'done' ? 'text-muted' : ''}`}>{tierLabel[s.slot.tier]}{s.state === 'live' ? ' · in progress' : ''}</span>
          <span className="text-[13px] text-muted">
            {s.coach}{s.state === 'done' ? ` · done, ${s.present} present` : s.state === 'live' ? ` · ${s.present} of ${s.people.length} checked in` : ''}
          </span>
        </div>
        {s.state === 'live' ? <span className="chip chip-green">Live</span>
          : full ? <span className="chip chip-gold">Full {s.people.length} / {s.slot.capacity}</span>
          : s.people.length === 0 ? <span className="text-[13px] font-semibold text-green">Open</span>
          : <span className="text-[13px] text-muted">{s.people.length} / {s.slot.capacity}</span>}
      </button>
      {open && (
        <div className="flex flex-col px-4 pb-4">
          {s.people.length === 0 && <div className="border-t border-line py-3 text-[13px] text-muted">Nobody booked yet.</div>}
          {s.people.map((p) => {
            const st = p.attendance?.status
            const c = p.cycle
            const note = p.risk.level === 'red' ? p.risk.reason : c ? `Session ${c.sessions_used + (st === 'present' ? 0 : 1)} of ${c.sessions_total}${c.days_left <= 5 && c.days_left >= 0 ? ' · renews soon' : ''}` : 'No active plan'
            return (
              <div key={p.member.id} className="flex items-center gap-2.5 border-t border-line py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{p.member.full_name}</div>
                  <div className={`text-[12px] ${p.risk.level === 'red' ? 'text-red' : 'text-muted'}`}>{note}</div>
                </div>
                {canMark ? (
                  <>
                    <button type="button" className="mark present" aria-pressed={st === 'present'} onClick={() => set(p.member.id, st === 'present' ? null : 'present')}>Present</button>
                    <button type="button" className="mark absent" aria-pressed={st === 'absent'} onClick={() => set(p.member.id, st === 'absent' ? null : 'absent')}>Absent</button>
                  </>
                ) : <span className="chip chip-muted">Booked</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Slots() {
  const { user } = useSession()
  const today = todayISO()
  const mondayOf = (d: string) => addDays(d, 1 - isoWeekday(d))
  const [date, setDate] = useState(isoWeekday(today) === 7 ? addDays(today, 1) : today)
  const week = mondayOf(date)
  const coachId = user?.role === 'coach' ? user.staffId : undefined
  const { data: slots } = useQuery({ queryKey: ['slots', date, coachId], queryFn: () => daySlots(date, coachId) })
  const { data: load } = useQuery({ queryKey: ['load', week], queryFn: () => coachLoad(week), enabled: user?.role !== 'coach' })
  const [open, setOpen] = useState<string | null>(null)
  const autoOpen = slots?.find((s) => s.state === 'live')?.slot.id ?? null
  const expanded = open ?? autoOpen

  return (
    <>
      <ScreenHeader title={user?.role === 'coach' ? 'My slots' : 'Slots'}
        right={
          <div className="flex items-center gap-2">
            <button className="icon-btn" type="button" aria-label="Previous week" onClick={() => { setDate(addDays(week, -7)); setOpen(null) }}><Icon name="chevronLeft" size={18} stroke={1.8} /></button>
            <div className="min-w-[84px] text-center text-[13px] font-semibold text-muted">{fmtDate(week, 'd')} – {fmtDate(addDays(week, 5), 'd MMM')}</div>
            <button className="icon-btn" type="button" aria-label="Next week" onClick={() => { setDate(addDays(week, 7)); setOpen(null) }}><Icon name="chevronRight" size={18} stroke={1.8} /></button>
          </div>
        } />

      <div role="group" aria-label="Day" className="grid grid-cols-6 gap-2 px-5 pt-3 lg:max-w-[640px] lg:px-8">
        {Array.from({ length: 6 }, (_, i) => addDays(week, i)).map((d) => {
          const on = d === date
          return (
            <button key={d} type="button" aria-pressed={on} onClick={() => { setDate(d); setOpen(null) }}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[14px] border text-[11px] font-semibold ${on ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface text-muted'}`}>
              {fmtDate(d, 'EEE')}
              <b className={`font-display text-[20px] font-medium ${on ? 'text-on-gold' : d === today ? 'text-gold' : 'text-ink'}`}>{fmtDate(d, 'd')}</b>
            </button>
          )
        })}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <Section title={undefined}>
          <h2 className="title text-[24px]">{fmtDate(date, 'EEEE')}{date === today ? <span className="ml-2 font-sans text-[13px] font-semibold text-gold">Today</span> : null}</h2>
          {!slots ? <Loading /> : (
            <div className="card overflow-hidden">
              {slots.length === 0 && <div className="p-5 text-[14px] text-muted">No slots on this day.</div>}
              {slots.map((s) => (
                <SlotRow key={s.slot.id} s={s} date={date} open={expanded === s.slot.id}
                  onToggle={() => setOpen(expanded === s.slot.id ? '__none__' : s.slot.id)} />
              ))}
            </div>
          )}
        </Section>

        {load && (
          <Section title="Coach load this week" id="load-h">
            <div className="card flex flex-col gap-3.5 p-[18px]">
              {load.map((l) => {
                const ratio = l.capacity ? l.booked / l.capacity : 0
                return (
                  <div key={l.coach.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="font-bold">{l.coach.full_name}</span>
                      <span className="flex items-center gap-2">
                        {ratio >= 0.85 && <span className="chip chip-amber">Near limit</span>}
                        <span className="text-muted">{l.booked} of {l.capacity}</span>
                      </span>
                    </div>
                    <Bar value={ratio} color={ratio >= 0.85 ? 'var(--color-amber)' : undefined} />
                  </div>
                )
              })}
              <p className="m-0 text-[12px] text-muted">Booked places across the week's slots.</p>
            </div>
          </Section>
        )}
      </div>
    </>
  )
}
