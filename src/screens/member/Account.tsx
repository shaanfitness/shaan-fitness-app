import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { addDays, addMonths, endOfMonth, format, getISODay, parseISO, startOfMonth } from 'date-fns'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import {
  gymTraffic, myCoaches, myFreezes, myPayments, myReferrals, mySubscriptions, myVisits, referFriend, requestFreeze, type Coach,
} from '../../db/memberApp'
import { fmtDay, fmtTime, plusDays, studioToday } from '../../lib/dates'
import { money, telLink, waLink } from '../../lib/format'
import { Field, Notice, TextArea, TextInput } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Avatar, Icon, Loading, Sheet } from '../../components/ui'
import type { SubscriptionOverview } from '../../db/types'
import { AskForm } from './Services'

// Member app: my memberships (payments, invoices, freeze requests), my attendance, how busy the gym is,
// refer a friend, and our coaches (call, WhatsApp, book an appointment when the gym allows it).

function Back({ to = '/app/profile' }: { to?: string }) {
  const { t } = useTranslation()
  return <Link to={to} className="flex items-center gap-1 self-start text-[13px] font-semibold no-underline lg:hidden"><Icon name="chevronLeft" size={16} />{t('app.back')}</Link>
}
function useAppSetting(key: string, fallback: boolean) {
  const { data: studio } = useStudio()
  const v = (studio?.settings.app as Record<string, unknown> | undefined)?.[key]
  return v === undefined || v === null ? fallback : v === true
}
const STATE_CHIP: Record<string, string> = { active: 'chip-green', frozen: 'chip-info', pending: 'chip-amber', expired: 'chip-muted', upcoming: 'chip-info' }

// My memberships --------------------------------------------------------------------------------------------------------
export function MemberMemberships() {
  const { t } = useTranslation()
  const me = useMe()
  const subs = useQuery({ queryKey: ['my-subscriptions', me.memberId], queryFn: () => mySubscriptions(me.memberId!), enabled: !!me.memberId })
  const pays = useQuery({ queryKey: ['my-payments', me.memberId], queryFn: () => myPayments(me.memberId!), enabled: !!me.memberId })
  const freezes = useQuery({ queryKey: ['my-freezes', me.memberId], queryFn: () => myFreezes(me.memberId!), enabled: !!me.memberId })
  const canFreeze = useAppSetting('fc_allow_freeze_memberships', true)
  const [freeze, setFreeze] = useState<SubscriptionOverview | null>(null)
  const rank = (s: SubscriptionOverview) => (['active', 'frozen', 'pending', 'upcoming'].includes(s.state) ? 0 : 1)
  const list = (subs.data ?? []).filter((s) => s.state !== 'deleted').sort((a, b) => rank(a) - rank(b) || b.start_date.localeCompare(a.start_date))
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <h1 className="title text-[36px]">{t('account.memberships')}</h1>
      {subs.isLoading ? <Loading /> : !list.length ? (
        <div className="card flex flex-col gap-3 px-5 py-8 text-center text-[14px] text-muted">{t('account.noMemberships')}<Link to="/app/plans" className="btn-gold self-center px-4 no-underline">{t('app.plans')}</Link></div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {list.map((s) => {
            const pending = (freezes.data ?? []).filter((f) => f.subscription_id === s.id && f.status !== 'rejected')
            const live = s.state === 'active' || s.state === 'frozen'
            return (
              <li key={s.id} className="card flex flex-col gap-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="m-0 text-[17px] font-bold">{s.plan_name}</h2>
                    <p className="m-0 text-[13px] text-muted">{t(`account.kind.${s.kind}`)} · {fmtDay(s.start_date, 'd MMM yyyy')} – {fmtDay(s.end_date, 'd MMM yyyy')}</p>
                  </div>
                  <span className={`chip ${STATE_CHIP[s.state] ?? 'chip-muted'}`}>{t(`account.state.${s.state}`, { defaultValue: s.state })}</span>
                </div>
                <dl className="m-0 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-2 px-2 py-2"><dt className="text-[11px] text-muted">{live ? t('account.daysLeft') : t('account.days')}</dt><dd className="m-0 text-[17px] font-bold">{live ? Math.max(s.days_left, 0) : '–'}</dd></div>
                  <div className="rounded-xl bg-surface-2 px-2 py-2"><dt className="text-[11px] text-muted">{t('account.sessions')}</dt><dd className="m-0 text-[17px] font-bold">{s.sessions_total ? `${s.sessions_used}/${s.sessions_total}` : s.sessions_used}</dd></div>
                  <div className="rounded-xl bg-surface-2 px-2 py-2"><dt className="text-[11px] text-muted">{t('account.balance')}</dt><dd className={`m-0 text-[17px] font-bold ${s.balance_amount > 0 ? 'text-amber' : ''}`}>{money(s.balance_amount)}</dd></div>
                </dl>
                <p className="m-0 text-[13px] text-muted">{t('account.paidOf', { paid: money(s.paid_amount), total: money(s.total_amount) })}{s.balance_amount > 0 && s.balance_due_date ? ` · ${t('account.dueOn', { date: fmtDay(s.balance_due_date, 'd MMM') })}` : ''}</p>
                {pending.map((f) => (
                  <Notice key={f.id} tone={f.status === 'requested' ? 'warn' : 'info'}>
                    {f.status === 'requested' ? t('account.freezeWaiting', { days: f.days, date: fmtDay(f.start_date, 'd MMM') }) : t('account.frozenFor', { days: f.days, from: fmtDay(f.start_date, 'd MMM'), to: fmtDay(f.end_date, 'd MMM') })}
                  </Notice>
                ))}
                <div className="flex flex-wrap gap-2">
                  {s.invoice_no && <Link to={`/print/invoice/${s.id}`} target="_blank" className="btn btn-sm no-underline"><Icon name="doc" size={15} />{t('account.invoice')}</Link>}
                  {canFreeze && s.state === 'active' && s.kind !== 'trial' && !pending.some((f) => f.status === 'requested') && (
                    <button type="button" className="btn btn-sm" onClick={() => setFreeze(s)}>{t('account.freeze')}</button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {(pays.data?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[15px] font-bold">{t('account.payments')}</h2>
          <ul className="card m-0 list-none p-0">
            {pays.data!.filter((p) => p.status === 'paid' && p.kind === 'payment').map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                <span className="text-[14px]"><span className="font-semibold">{money(p.amount)}</span><span className="block text-[12px] text-muted">{fmtDay(p.receipt_date, 'd MMM yyyy')}{p.mode ? ` · ${p.mode}` : ''}{p.receipt_no ? ` · ${p.receipt_no}` : ''}</span></span>
                <Link to={`/print/receipt/${p.id}`} target="_blank" className="link-btn text-[13px]">{t('account.receipt')}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Sheet open={!!freeze} onClose={() => setFreeze(null)} title={t('account.freezeTitle')}>{freeze && <FreezeForm sub={freeze} onDone={() => setFreeze(null)} />}</Sheet>
    </div>
  )
}

function FreezeForm({ sub, onDone }: { sub: SubscriptionOverview; onDone: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const today = studioToday()
  const [start, setStart] = useState(plusDays(today, 1))
  const [days, setDays] = useState('7')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: () => requestFreeze(sub.id, start, Number(days), note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-freezes'] }); toast(t('account.freezeSent')); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      if (!start || start < today) return setError(t('account.freezeFromToday'))
      if (!(Number(days) >= 1 && Number(days) <= 90 && Number.isInteger(Number(days)))) return setError(t('account.freezeDays'))
      m.mutate()
    }}>
      <p className="m-0 text-[14px]">{sub.plan_name} · {t('account.endsOn', { date: fmtDay(sub.end_date, 'd MMM yyyy') })}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('account.from')} required id="fz-start"><TextInput id="fz-start" type="date" value={start} onChange={setStart} /></Field>
        <Field label={t('account.forDays')} required id="fz-days"><TextInput id="fz-days" type="number" inputMode="numeric" value={days} onChange={setDays} /></Field>
      </div>
      <Field label={t('account.why')} id="fz-note"><TextArea id="fz-note" rows={2} value={note} onChange={setNote} /></Field>
      <p className="m-0 text-[12px] text-muted">{t('account.freezeHow')}</p>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-gold" disabled={m.isPending}>{t('account.sendRequest')}</button>
    </form>
  )
}

// My attendance ------------------------------------------------------------------------------------------------------------
export function MemberAttendance() {
  const { t } = useTranslation()
  const me = useMe()
  const today = studioToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const first = startOfMonth(parseISO(`${month}-01`))
  const from = format(first, 'yyyy-MM-dd')
  const to = format(endOfMonth(first), 'yyyy-MM-dd')
  const q = useQuery({ queryKey: ['my-visits', me.memberId, month], queryFn: () => myVisits(me.memberId!, from, to), enabled: !!me.memberId })
  const days = new Set((q.data ?? []).map((v) => v.date))
  const lead = getISODay(first) - 1
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: Number(to.slice(8)) }, (_, i) => format(addDays(first, i), 'yyyy-MM-dd'))]
  const weeks = Math.max(1, Math.ceil((Number(to.slice(8)) + lead) / 7))
  const shift = (n: number) => setMonth(format(addMonths(first, n), 'yyyy-MM'))
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <h1 className="title text-[36px]">{t('account.attendance')}</h1>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="icon-btn" aria-label={t('account.prevMonth')} onClick={() => shift(-1)}><Icon name="chevronLeft" size={18} /></button>
        <span className="text-[16px] font-bold">{format(first, 'MMMM yyyy')}</span>
        <button type="button" className="icon-btn" aria-label={t('account.nextMonth')} disabled={month >= today.slice(0, 7)} onClick={() => shift(1)}><Icon name="chevronRight" size={18} /></button>
      </div>
      <section className="card p-4" aria-label={t('account.calendar')}>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted" aria-hidden="true">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => d === null ? <span key={`e${i}`} /> : (
            <span key={d} aria-label={`${fmtDay(d, 'd MMMM')}${days.has(d) ? `: ${t('account.came')}` : ''}`}
              className={`flex aspect-square items-center justify-center rounded-xl text-[13px] font-semibold ${days.has(d) ? 'bg-gold text-on-gold' : d === today ? 'border border-gold' : 'text-muted'}`}>
              {Number(d.slice(8))}
            </span>
          ))}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4"><div className="text-[12px] text-muted">{t('account.visits')}</div><div className="text-[28px] font-bold">{days.size}</div></div>
        <div className="card p-4"><div className="text-[12px] text-muted">{t('account.perWeek')}</div><div className="text-[28px] font-bold">{(days.size / weeks).toFixed(1)}</div></div>
      </div>
      {q.isLoading ? <Loading /> : (q.data?.length ?? 0) > 0 && (
        <ul className="card m-0 list-none p-0">
          {[...q.data!].reverse().map((v) => (
            <li key={v.id} className="flex justify-between gap-3 border-b border-line-soft px-4 py-2.5 text-[14px] last:border-b-0">
              <span>{fmtDay(v.date, 'EEE d MMM')}</span><span className="text-muted">{fmtTime(v.check_in)}{v.check_out ? ` – ${fmtTime(v.check_out)}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// How busy the gym is --------------------------------------------------------------------------------------------------------
export function TrafficCard({ compact }: { compact?: boolean }) {
  const { t } = useTranslation()
  const me = useMe()
  const q = useQuery({ queryKey: ['gym-traffic', me.studioId], queryFn: () => gymTraffic(me.studioId), refetchInterval: 120_000 })
  const [nowH] = useState(() => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date())))
  if (!q.data) return null
  const d = q.data
  const peak = Math.max(1, ...d.hours.map((h) => h.avg))
  const hours = Array.from({ length: 18 }, (_, i) => i + 5).map((h) => ({ h, avg: d.hours.find((x) => x.h === h)?.avg ?? 0 }))
  const level = d.now <= 3 ? 'quiet' : d.now <= 10 ? 'normal' : 'busy'
  return (
    <section className="card flex flex-col gap-3 p-4" aria-label={t('traffic.title')}>
      <div className="flex items-center justify-between gap-3">
        <div>{compact && <h2 className="m-0 text-[15px] font-bold">{t('traffic.title')}</h2>}<p className={`m-0 ${compact ? 'text-[13px] text-muted' : 'text-[15px] font-semibold'}`}>{t(`traffic.${level}`)}</p></div>
        <div className="text-right"><div className="text-[28px] leading-none font-bold">{d.now}</div><div className="text-[12px] text-muted">{t('traffic.inNow')}</div></div>
      </div>
      {!compact && (
        <>
          <div className="flex h-24 items-end gap-[3px]" aria-hidden="true">
            {hours.map((x) => <div key={x.h} className={`flex-1 rounded-t ${x.h === nowH ? 'bg-gold' : 'bg-surface-3'}`} style={{ height: `${Math.max(4, (x.avg / peak) * 100)}%` }} />)}
          </div>
          <div className="flex justify-between text-[11px] text-muted" aria-hidden="true"><span>5 AM</span><span>12 PM</span><span>6 PM</span><span>10 PM</span></div>
          <p className="m-0 text-[12px] text-muted">{t('traffic.usual')}</p>
        </>
      )}
    </section>
  )
}

export function MemberTraffic() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back to="/app" />
      <h1 className="title text-[36px]">{t('traffic.title')}</h1>
      <TrafficCard />
    </div>
  )
}

// Refer a friend ------------------------------------------------------------------------------------------------------------------
export function MemberRefer() {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const allowed = useAppSetting('can_refer_friend', true)
  const list = useQuery({ queryKey: ['my-referrals'], queryFn: myReferrals })
  const [f, setF] = useState({ name: '', phone: '', note: '' })
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: () => referFriend(f.name, f.phone, f.note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-referrals'] }); toast(t('refer.sent', { name: f.name.trim().split(' ')[0] })); setF({ name: '', phone: '', note: '' }) },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <h1 className="title text-[36px]">{t('refer.title')}</h1>
      {!allowed ? <Notice>{t('refer.closed')}</Notice> : (
        <form className="card flex flex-col gap-4 p-4" noValidate onSubmit={(e) => {
          e.preventDefault(); setError(null)
          if (!f.name.trim()) return setError(t('refer.needName'))
          if (f.phone.replace(/\D/g, '').slice(-10).length !== 10) return setError(t('refer.needPhone'))
          m.mutate()
        }}>
          <p className="m-0 text-[14px]">{t('refer.intro')}</p>
          <Field label={t('refer.name')} required id="rf-name"><TextInput id="rf-name" value={f.name} onChange={(v) => setF({ ...f, name: v })} autoComplete="off" /></Field>
          <Field label={t('refer.phone')} required id="rf-phone"><TextInput id="rf-phone" type="tel" inputMode="tel" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} autoComplete="off" /></Field>
          <Field label={t('refer.note')} id="rf-note"><TextArea id="rf-note" rows={2} value={f.note} onChange={(v) => setF({ ...f, note: v })} /></Field>
          <p className="m-0 text-[12px] text-muted">{t('refer.privacy')}</p>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" className="btn-gold" disabled={m.isPending}>{t('refer.send')}</button>
        </form>
      )}
      {(list.data?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[15px] font-bold">{t('refer.yours')}</h2>
          <ul className="card m-0 list-none p-0">
            {list.data!.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                <span className="text-[14px] font-semibold">{r.name}<span className="block text-[12px] font-normal text-muted">{fmtDay(r.created_at, 'd MMM yyyy')}</span></span>
                <span className={`chip ${r.joined ? 'chip-green' : 'chip-muted'}`}>{r.joined ? t('refer.joined') : t('refer.invited')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// Our coaches ------------------------------------------------------------------------------------------------------------------------
export function MemberCoaches() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: ['my-coaches'], queryFn: myCoaches })
  const [book, setBook] = useState<Coach | null>(null)
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <h1 className="title text-[36px]">{t('app.coaches')}</h1>
      {q.isLoading ? <Loading /> : !q.data?.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('account.noCoaches')}</div> : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {q.data.map((c) => (
            <li key={c.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-center gap-4">
                {c.photo_url ? <img src={c.photo_url} alt="" className="h-16 w-16 rounded-2xl border border-line object-cover" /> : <Avatar name={c.name} size={64} gold />}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <strong className="text-[17px]">{c.name}</strong>
                  <span className="text-[13px] text-gold">{c.designation}{c.years_experience ? ` · ${t('account.years', { count: c.years_experience })}` : ''}</span>
                  {c.services && <span className="text-[12px] text-muted">{c.services}</span>}
                </div>
              </div>
              {(c.can_book || c.can_call || c.can_whatsapp) && (
                <div className="flex flex-wrap gap-2">
                  {c.can_book && <button type="button" className="btn btn-sm" onClick={() => setBook(c)}><Icon name="clock" size={15} />{t('account.bookWith')}</button>}
                  {c.can_call && c.phone && <a href={telLink(c.phone)} className="btn btn-sm no-underline"><Icon name="phone" size={15} />{t('account.call')}</a>}
                  {c.can_whatsapp && c.phone && <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className="btn btn-sm no-underline"><Icon name="whatsapp" size={15} />WhatsApp</a>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!book} onClose={() => setBook(null)} title={t('appt.ask')}>{book && <AskForm trainer={{ id: book.id, name: book.name }} onDone={() => setBook(null)} />}</Sheet>
    </div>
  )
}
