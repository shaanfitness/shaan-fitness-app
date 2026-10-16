import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { addDays, format, parseISO } from 'date-fns'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import { bookClass, cancelBookings, timeRange } from '../../db/classes'
import { joinProgram, livePrograms, myClasses, mySubscriptions, type MyClass, type Program } from '../../db/memberApp'
import { fmtDay, studioToday } from '../../lib/dates'
import { useToast } from '../../components/toast'
import { Icon, Loading } from '../../components/ui'

// Member app › Book (YDL customer app: Classes Listing, booking and the waiting list, Program List).

type Tab = 'classes' | 'mine' | 'programs'
const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const nowHHMM = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())

function useBookingRules() {
  const { data: studio } = useStudio()
  const b = (studio?.settings as Record<string, unknown> | undefined)?.booking as { advance_days?: number; cancel_cutoff_hours?: number } | undefined
  return { advance: Math.min(Math.max(Number(b?.advance_days ?? 7), 1), 30), cutoff: Number(b?.cancel_cutoff_hours ?? 2) }
}

export default function MemberBook() {
  const { t } = useTranslation()
  const me = useMe()
  const today = studioToday()
  const rules = useBookingRules()
  const [tab, setTab] = useState<Tab>('classes')
  const [day, setDay] = useState(today)
  const last = iso(addDays(parseISO(today), rules.advance))
  const q = useQuery({ queryKey: ['my-classes', me.memberId, today, last], queryFn: () => myClasses(today, last), enabled: !!me.memberId })
  const programs = useQuery({ queryKey: ['live-programs', me.studioId], queryFn: () => livePrograms(me.studioId) })
  const tabs: { v: Tab; label: string }[] = [
    { v: 'classes', label: t('book.classes') }, { v: 'mine', label: t('book.myBookings') },
    ...((programs.data?.length ?? 0) > 0 ? [{ v: 'programs' as const, label: t('book.programs') }] : []),
  ]
  const days = Array.from({ length: rules.advance + 1 }, (_, i) => iso(addDays(parseISO(today), i)))
  // Classes that have started drop off the list unless I'm booked into them.
  const list = (q.data ?? []).filter((c) => c.class_date === day && (c.booking_id || c.class_date !== today || c.start_time.slice(0, 5) > nowHHMM()))
  const mine = (q.data ?? []).filter((c) => c.booking_id)
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[720px]">
      <div className="flex items-end justify-between gap-3">
        <h1 className="title text-[36px]">{t('book.title')}</h1>
        <Link to="/app/appointments" className="btn btn-sm no-underline"><Icon name="clock" size={16} />{t('appt.title')}</Link>
      </div>
      <div role="tablist" aria-label={t('book.title')} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((x) => (
          <button key={x.v} type="button" role="tab" aria-selected={tab === x.v} onClick={() => setTab(x.v)}
            className={`min-h-9 rounded-full border px-2 py-1.5 text-[13px] font-semibold ${tab === x.v ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>
            {x.label}{x.v === 'mine' && mine.length ? ` (${mine.length})` : ''}
          </button>
        ))}
      </div>
      {tab === 'classes' && (
        <>
          <div role="tablist" aria-label={t('book.days')} className="flex gap-1.5 overflow-x-auto pb-1">
            {days.map((d) => (
              <button key={d} type="button" role="tab" aria-selected={day === d} onClick={() => setDay(d)}
                className={`flex min-w-[54px] flex-none flex-col items-center rounded-2xl border px-2 py-1.5 ${day === d ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>
                <span className="text-[11px] font-semibold uppercase">{d === today ? t('book.today') : fmtDay(d, 'EEE')}</span>
                <span className="text-[17px] leading-tight font-bold">{fmtDay(d, 'd')}</span>
              </button>
            ))}
          </div>
          {q.isLoading ? <Loading /> : q.error ? <div className="card p-5 text-[14px] text-red">{(q.error as Error).message}</div>
            : !list.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{day === today ? t('book.noMoreToday') : t('book.noClasses')}</div> : (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{list.map((c) => <ClassCard key={`${c.batch_id}-${c.class_date}`} c={c} today={today} cutoff={rules.cutoff} />)}</ul>
            )}
          <p className="m-0 text-[12px] text-muted">{t('book.cutoff', { count: rules.cutoff })}</p>
        </>
      )}
      {tab === 'mine' && (
        q.isLoading ? <Loading /> : !mine.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('book.noBookings')}</div> : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{mine.map((c) => <ClassCard key={`${c.batch_id}-${c.class_date}`} c={c} today={today} cutoff={rules.cutoff} showDate />)}</ul>
        )
      )}
      {tab === 'programs' && <Programs list={programs.data ?? []} />}
    </div>
  )
}

function ClassCard({ c, today, cutoff, showDate }: { c: MyClass; today: string; cutoff: number; showDate?: boolean }) {
  const { t } = useTranslation()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const started = c.class_date === today && c.start_time.slice(0, 5) <= nowHHMM()
  const full = c.capacity !== null && c.booked >= c.capacity
  const left = c.capacity === null ? null : Math.max(c.capacity - c.booked, 0)
  const refresh = () => { qc.invalidateQueries({ queryKey: ['my-classes'] }); qc.invalidateQueries({ queryKey: ['memberHome'] }) }
  const book = useMutation({
    mutationFn: () => bookClass({ batch_id: c.batch_id, class_date: c.class_date, member_id: me.memberId!, waiting_list: true }),
    onSuccess: () => { refresh(); toast(full ? t('book.waitingToast') : t('book.bookedToast')) },
    onError: (e: Error) => toast(e.message),
  })
  const cancel = useMutation({
    mutationFn: () => cancelBookings([c.booking_id!]),
    onSuccess: () => { refresh(); toast(t('book.cancelledToast')) },
    onError: (e: Error) => toast(e.message),
  })
  const reason = c.blocked ? t(`book.blocked.${c.blocked}`) : null
  return (
    <li className={`card flex flex-col gap-2 p-4 ${c.booking_id ? 'border-gold' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showDate && <div className="text-[12px] font-semibold text-gold">{c.class_date === today ? t('book.today') : fmtDay(c.class_date, 'EEE d MMM')}</div>}
          <div className="text-[15px] font-bold">{timeRange(c.start_time, c.end_time)}</div>
          <h2 className="m-0 text-[16px] font-semibold">{c.title}</h2>
          <p className="m-0 text-[13px] text-muted">{[c.trainer_names && t('book.with', { name: c.trainer_names }), c.room, c.service_names].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          {c.attended ? <span className="chip chip-green">{t('book.attended')}</span>
            : c.booking_status === 'booked' ? <span className="chip chip-green">{t('book.booked')}</span>
              : c.booking_status === 'waiting' ? <span className="chip chip-amber">{t('book.waiting')}</span> : null}
          {left !== null && !c.booking_id && <span className="text-[12px] text-muted">{full ? t('book.full') : t('book.spotsLeft', { count: left })}</span>}
        </div>
      </div>
      {c.info && <p className="m-0 text-[13px]">{c.info}</p>}
      <div className="flex items-center justify-between gap-2">
        {c.booking_id && !c.attended && !started
          ? <button type="button" className="link-btn text-[13px]" disabled={cancel.isPending} onClick={() => { if (window.confirm(t('book.confirmCancel'))) cancel.mutate() }}>{t('book.cancel')}</button>
          : <span className="text-[12px] text-muted">{started && !c.booking_id ? t('book.started') : reason ?? (c.booking_id ? '' : t('book.cutoffShort', { count: cutoff }))}</span>}
        {!c.booking_id && !started && !c.blocked && (
          <button type="button" className={full ? 'btn btn-sm' : 'btn-gold px-4'} disabled={book.isPending} onClick={() => book.mutate()} aria-label={`${full ? t('book.joinWaiting') : t('book.book')} ${c.title} ${timeRange(c.start_time, c.end_time)}`}>
            {full ? t('book.joinWaiting') : t('book.book')}
          </button>
        )}
      </div>
    </li>
  )
}

function audienceOk(p: Program, s: { paid: boolean; trial: boolean; expired: boolean; enquiry: boolean }) {
  switch (p.audience) {
    case 'all': return true
    case 'paid': return s.paid
    case 'trial': return s.trial
    case 'paid_trial': return s.paid || s.trial
    case 'enquiry': return s.enquiry
    case 'enquiry_trial': return s.enquiry || s.trial
    case 'expired_trial': return s.expired || s.trial
    case 'expired': return s.expired
    default: return false
  }
}

function Programs({ list }: { list: Program[] }) {
  const { t } = useTranslation()
  const me = useMe()
  const toast = useToast()
  const today = studioToday()
  const subs = useQuery({ queryKey: ['my-subscriptions', me.memberId], queryFn: () => mySubscriptions(me.memberId!), enabled: !!me.memberId })
  const live = (subs.data ?? []).filter((s) => s.state === 'active' || s.state === 'frozen')
  const status = {
    paid: live.some((s) => s.kind !== 'trial'), trial: live.some((s) => s.kind === 'trial'),
    expired: !live.length && (subs.data?.length ?? 0) > 0, enquiry: !(subs.data?.length ?? 0),
  }
  const weekday = ((parseISO(today).getDay() + 6) % 7) + 1
  const join = useMutation({
    mutationFn: (p: Program) => joinProgram(me.studioId, p.id, me.memberId!, today),
    onError: (e: Error) => toast(e.message),
  })
  const shown = list.filter((p) => audienceOk(p, status))
  if (subs.isLoading) return <Loading />
  if (!shown.length) return <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('book.noPrograms')}</div>
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {shown.map((p) => {
        const todayToo = p.days.includes(weekday)
        return (
          <li key={p.id} className="card flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><div className="text-[15px] font-bold">{timeRange(p.start_time, p.end_time)}</div><h2 className="m-0 text-[16px] font-semibold">{p.name}</h2></div>
              {p.live && <span className="chip chip-red">{t('book.liveNow')}</span>}
            </div>
            <p className="m-0 text-[13px] text-muted">{p.days.length === 7 ? t('book.everyDay') : p.days.map((d) => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')}</p>
            {todayToo && /^https:\/\//i.test(p.meeting_link.trim()) && (
              <a href={p.meeting_link.trim()} target="_blank" rel="noreferrer" className="btn-gold self-start px-4 no-underline" onClick={() => join.mutate(p)}>{t('book.join')}</a>
            )}
          </li>
        )
      })}
    </ul>
  )
}
