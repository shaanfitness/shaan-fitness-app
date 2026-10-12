import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { addDays, format, parseISO } from 'date-fns'
import { useMe } from '../../auth'
import { memberHome } from '../../db/care'
import { mapsLink, prettyPhone, requestCallback, telLink, useSite, whatsappLink } from '../../db/site'
import { fmtClock, fmtDay, studioToday } from '../../lib/dates'
import { initials, isoWeekday, money } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { BrandMark, Icon, Loading, Sheet } from '../../components/ui'
import { Notice } from '../../components/controls'
import { PlanCard } from '../../site/Website'
import { LangToggle } from '../../site/chrome'
import { useStudio } from '../../db/studio'
import { useTheme } from '../../theme'
import type { Batch, SubscriptionOverview } from '../../db/types'
import { HomeExtras } from './AppPages'
import { NotificationBell } from './Notifications'

// Member home in the member's own look (Settings › Look):
//   A · Noir and gold   ring of sessions, serif headings
//   B · Club sport      "Ready, Ananya?", stripes, big session time, red renewal card
//   C · Clinic light    good-morning greeting, progress bar with facts, date tile
// Same facts in each: this cycle, the next session, renewal when it is near.
type T = (k: string, o?: Record<string, unknown>) => string

interface Next { date: string; today: boolean; time: string; batch: Batch }
/** The next time this member's batch meets (today if it hasn't started yet). */
function nextSession(batches: Batch[]): Next | null {
  const today = studioToday()
  const now = format(new Date(), 'HH:mm')
  let best: Next | null = null
  for (const b of batches) {
    for (let i = 0; i < 8; i++) {
      const d = format(addDays(parseISO(today), i), 'yyyy-MM-dd')
      if (!b.days.includes(isoWeekday(d)) || (i === 0 && b.start_time.slice(0, 5) < now)) continue
      if (!best || d < best.date || (d === best.date && b.start_time < best.batch.start_time)) best = { date: d, today: i === 0, time: b.start_time, batch: b }
      break
    }
  }
  return best
}

function useHomeData() {
  const me = useMe()
  const q = useQuery({ queryKey: ['memberHome', me.memberId], queryFn: () => memberHome(me.memberId!) })
  return q
}

export default function MemberHome() {
  const me = useMe()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: d, error } = useHomeData()
  const [qr, setQr] = useState(false)
  if (error) return <div className="p-8 text-red">{(error as Error).message}</div>
  if (!d) return <Loading />
  const c = d.subscriptions.find((s) => s.state === 'active' || s.state === 'frozen') ?? d.subscriptions[0]
  const first = me.name.split(' ')[0]
  const next = nextSession(d.batches)
  const look = theme === 'club' ? 'club' : theme === 'clinic' ? 'clinic' : 'noir'
  const pt = d.subscriptions.some((x) => x.kind === 'pt' && (x.state === 'active' || x.state === 'frozen'))
  const props = { c, first, next, t: t as T, onCheckIn: () => setQr(true) }
  return (
    <div className="pb-6 lg:mx-auto lg:max-w-[720px] lg:pt-4">
      <header className="flex items-center justify-between gap-3 px-5 pt-6 lg:hidden">
        <BrandMark logo={look === 'clinic'} />
        <div className="flex items-center gap-2.5">
          <NotificationBell />
          <LangToggle />
          <span className="me-avatar" aria-hidden="true">{initials(me.name)}</span>
        </div>
      </header>
      {look === 'club' ? <ClubHome {...props} /> : look === 'clinic' ? <ClinicHome {...props} /> : <NoirHome {...props} />}
      <HomeExtras paid={!!c} pt={pt} />
      {!c && <Welcome memberId={me.memberId!} />}
      <Sheet open={qr} onClose={() => setQr(false)} title={t('member.checkIn')}>{qr && <CheckInCode />}</Sheet>
    </div>
  )
}

interface LookProps { c: SubscriptionOverview | undefined; first: string; next: Next | null; t: T; onCheckIn: () => void }

const daysText = (c: SubscriptionOverview, t: T) =>
  c.days_left > 0 ? t('member.daysLeft', { count: c.days_left }) : c.days_left === 0 ? t('member.endsToday') : t('member.ended')
const whenLabel = (n: Next, t: T) => (n.today ? t('member.today') : format(parseISO(n.date), 'EEE d MMM'))

/** Renew from the app: the front desk gets a follow-up to take the payment. */
function useRenew(c: SubscriptionOverview | undefined) {
  const me = useMe()
  const { t } = useTranslation()
  const { data: site } = useSite()
  const [msg, setMsg] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: () => requestCallback(me.memberId!, 'plan', c?.plan_name),
    onSuccess: (r) => setMsg(r === 'already' ? t('app.already') : t('member.renewSent', { plan: c?.plan_name })),
    onError: (e: Error) => setMsg(e.message),
  })
  const price = site?.plans.find((p) => p.id === c?.plan_id)?.total_price ?? c?.total_amount ?? null
  return { renew: () => m.mutate(), busy: m.isPending, msg, price }
}

const showRenew = (c: SubscriptionOverview | undefined) => !!c && c.days_left <= 7

// Look A · Noir and gold --------------------------------------------------------------------------------------
function NoirHome({ c, first, next, t, onCheckIn }: LookProps) {
  const total = c?.sessions_total ?? 0
  const pct = c && total ? Math.min(c.sessions_used / total, 1) : 0
  const circ = 2 * Math.PI * 50
  const r = useRenew(c)
  return (
    <>
      <h1 className="title px-5 pt-5 text-[42px]">{c ? t('member.hi', { name: first }) : t('app.welcome', { name: first })}</h1>
      {c && (
        <section aria-label={t('member.thisCycle')} className="px-5 pt-4">
          <div className="card flex items-center gap-5 p-5">
            <div className="relative h-[116px] w-[116px] flex-none">
              <svg width="116" height="116" viewBox="0 0 116 116" aria-hidden="true">
                <circle cx="58" cy="58" r="50" fill="none" stroke="var(--color-line)" strokeWidth="8" />
                <circle cx="58" cy="58" r="50" fill="none" stroke="var(--color-gold)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} transform="rotate(-90 58 58)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[34px] leading-none">{total ? c.sessions_used : Math.max(c.days_left, 0)}</span>
                <span className="text-[12px] text-muted">{total ? t('member.of', { total }) : t('member.daysLeftLabel')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="eyebrow">{t('member.thisCycle')}</p>
              <div className="text-[18px] leading-snug font-bold">{daysText(c, t)}</div>
              <div className="text-[13px] leading-snug text-muted">{t('member.summary', { plan: c.plan_name, date: fmtDay(c.end_date, 'EEE d MMM') })}</div>
            </div>
          </div>
        </section>
      )}
      {c && (
        <section aria-labelledby="next-h" className="px-5 pt-3">
          <div className="card flex flex-col gap-3.5 p-5">
            <h2 id="next-h" className="eyebrow">{t('member.nextSession')}</h2>
            {next ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-[30px] leading-tight">{whenLabel(next, t)}, {fmtClock(next.time).replace(/ (AM|PM)$/, '')}</span>
                  <span className="text-[14px] text-muted">{fmtClock(next.time).slice(-2)}</span>
                </div>
                <div className="text-[14px] text-muted">{next.batch.name}</div>
                <button type="button" className="btn-gold" onClick={onCheckIn}><Icon name="qr" size={18} stroke={1.7} />{t('member.checkIn')}</button>
              </>
            ) : <div className="text-[14px] text-muted">{t('member.noSlot')}</div>}
          </div>
        </section>
      )}
      {showRenew(c) && (
        <section aria-labelledby="renew-h" className="px-5 pt-3">
          <div className="flex flex-col gap-3 rounded-[20px] border border-gold/50 bg-accent-tint p-5">
            <h2 id="renew-h" className="title text-[24px]">{t('member.momentum')}</h2>
            <p className="m-0 text-[14px] leading-normal text-ink-soft">{t('member.renewKeep', { date: fmtDay(c!.end_date, 'EEE d MMM'), plan: c!.plan_name })}</p>
            <div className="flex items-center gap-3">
              {r.price !== null && <span className="font-display text-[28px]">{money(r.price)}</span>}
              <button type="button" className="btn-gold flex-1" disabled={r.busy} onClick={r.renew}>{t('member.renew')}</button>
            </div>
            {r.msg && <p className="m-0 text-[13px] font-semibold text-gold-light">{r.msg}</p>}
          </div>
        </section>
      )}
    </>
  )
}

// Look B · Club sport -----------------------------------------------------------------------------------------
function ClubHome({ c, first, next, t, onCheckIn }: LookProps) {
  const total = c?.sessions_total ?? 0
  const r = useRenew(c)
  return (
    <>
      <section aria-label={t('member.greeting')} className="relative flex flex-col gap-2 px-5 pt-6">
        <div aria-hidden="true" className="stripes absolute top-[30px] right-[30px]"><span /><span /><span /></div>
        <p className="eyebrow relative">{c ? c.plan_name : 'Shaan Fitness'}</p>
        <h1 className="headline relative max-w-[78%] text-[56px]">{c ? t('member.ready', { name: first }) : t('app.welcome', { name: first })}</h1>
      </section>
      {c && (
        <section aria-label={t('member.thisCycle')} className="px-5 pt-4">
          <div className="card flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="eyebrow">{t('member.thisCycle')}</h2>
              <span className="font-display text-[22px] leading-none font-bold">{total ? `${c.sessions_used}/${total}` : daysText(c, t)}</span>
            </div>
            {total > 0 && total <= 36 ? (
              <div aria-hidden="true" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(total, 12)}, minmax(0, 1fr))` }}>
                {Array.from({ length: total }, (_, i) => (
                  <span key={i} className={`h-[18px] rounded-[3px] ${i < c.sessions_used ? 'bg-gold' : 'border border-line bg-surface-3'}`} />
                ))}
              </div>
            ) : (
              <div className="bar" aria-hidden="true"><span style={{ width: `${total ? Math.min(c.sessions_used / total, 1) * 100 : 50}%` }} /></div>
            )}
            <div className="text-[13px] text-muted">{t('member.summary', { plan: c.plan_name, date: fmtDay(c.end_date, 'EEE d MMM') })}</div>
          </div>
        </section>
      )}
      {c && (
        <section aria-labelledby="b-next-h" className="px-5 pt-3">
          <div className="card flex flex-col gap-3.5 p-5">
            <div className="flex items-center justify-between">
              <h2 id="b-next-h" className="eyebrow">{t('member.nextSession')}</h2>
              {next && <span className="inline-flex h-6 items-center rounded-[6px] bg-gold px-2.5 text-[11px] font-bold tracking-[.1em] text-on-gold uppercase">{whenLabel(next, t)}</span>}
            </div>
            {next ? (
              <>
                <div className="flex items-end gap-3">
                  <span className="font-display text-[68px] leading-[.82] font-extrabold">{fmtClock(next.time).replace(/ (AM|PM)$/, '')}</span>
                  <span className="flex flex-col gap-0.5 pb-0.5">
                    <span className="font-display text-[22px] font-bold">{fmtClock(next.time).slice(-2)}</span>
                    <span className="text-[14px] text-muted">{next.batch.name}</span>
                  </span>
                </div>
                <button type="button" className="btn-gold" onClick={onCheckIn}><Icon name="qr" size={18} stroke={1.8} />{t('member.checkInShort')}</button>
              </>
            ) : <div className="text-[14px] text-muted">{t('member.noSlot')}</div>}
          </div>
        </section>
      )}
      {showRenew(c) && (
        <section aria-labelledby="b-renew-h" className="px-5 pt-3">
          <div className="relative flex flex-col gap-3 overflow-hidden rounded-[14px] bg-gold px-5 py-[22px] text-on-gold">
            <div aria-hidden="true" className="absolute -top-[30px] -right-10 h-[260px] w-[140px] skew-x-[-20deg] bg-[rgba(10,16,32,.2)]" />
            <h2 id="b-renew-h" className="headline relative text-[36px]">{t('member.momentum')}</h2>
            <p className="relative m-0 text-[15px] leading-normal">{t('member.renewKeep', { date: fmtDay(c!.end_date, 'EEE d MMM'), plan: c!.plan_name })}</p>
            <div className="relative flex items-center justify-between gap-3.5">
              {r.price !== null && <span className="font-display text-[38px] font-extrabold">{money(r.price)}</span>}
              <button type="button" disabled={r.busy} onClick={r.renew}
                className="inline-flex min-h-[50px] flex-1 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-white text-[14px] font-bold tracking-[.06em] text-[#0A1020] uppercase">{t('member.renew')}</button>
            </div>
            {r.msg && <p className="relative m-0 text-[14px] font-semibold">{r.msg}</p>}
          </div>
        </section>
      )}
    </>
  )
}

// Look C · Clinic light ---------------------------------------------------------------------------------------
function ClinicHome({ c, first, next, t, onCheckIn }: LookProps) {
  const total = c?.sessions_total ?? 0
  const r = useRenew(c)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'member.goodMorning' : hour < 17 ? 'member.goodAfternoon' : 'member.goodEvening'
  const fact = (label: string, value: ReactNode, first?: boolean) => (
    <div className={`flex flex-col gap-1 px-3 ${first ? '' : 'border-l border-line'}`}><small className="text-[12px] font-semibold text-muted">{label}</small><span className="text-[16px] font-semibold">{value}</span></div>
  )
  return (
    <>
      <section aria-label={t('member.greeting')} className="flex flex-col gap-1.5 px-5 pt-6">
        <span className="text-[15px] font-semibold text-muted">{format(new Date(), 'EEEE, d MMMM')}</span>
        <h1 className="headline text-[32px]">{c ? t(greet, { name: first }) : t('app.welcome', { name: first })}</h1>
      </section>
      {c && (
        <section aria-label={t('member.thisCycle')} className="px-5 pt-5">
          <div className="card flex flex-col gap-3.5 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-semibold text-muted">{t('member.thisCycle')}</span>
              <span className="inline-flex h-7 items-center rounded-full bg-accent-tint px-3 text-[13px] font-semibold text-gold">{c.plan_name}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[56px] leading-none font-bold">{total ? c.sessions_used : Math.max(c.days_left, 0)}</span>
              <span className="text-[17px] text-muted">{total ? t('member.sessionsDone', { total }) : t('member.daysLeftLabel')}</span>
            </div>
            <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-gold" style={{ width: `${total ? Math.min(c.sessions_used / total, 1) * 100 : 100}%` }} />
            </div>
            <div className="-mx-3 mt-1 grid grid-cols-3">
              {fact(t('member.cycleEnds'), fmtDay(c.end_date, 'EEE d MMM'), true)}
              {fact(t('member.sessionsLeft'), total ? Math.max(total - c.sessions_used, 0) : '—')}
              {fact(t('member.daysLeftLabel'), Math.max(c.days_left, 0))}
            </div>
          </div>
        </section>
      )}
      {c && (
        <section aria-labelledby="c-next-h" className="px-5 pt-3">
          <div className="card flex flex-col gap-4 p-5">
            {next ? (
              <>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-[68px] w-16 flex-none flex-col items-center justify-center gap-0.5 rounded-2xl bg-accent-tint">
                    <span className="text-[12px] font-bold tracking-[.08em] text-gold uppercase">{format(parseISO(next.date), 'EEE')}</span>
                    <span className="font-display text-[28px] leading-none font-bold">{format(parseISO(next.date), 'd')}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 id="c-next-h" className="font-display m-0 text-[20px] font-semibold">{whenLabel(next, t)}, {fmtClock(next.time)}</h2>
                    <span className="text-[15px] text-muted">{next.batch.name}</span>
                  </div>
                </div>
                <button type="button" className="btn-gold" onClick={onCheckIn}><Icon name="qr" size={18} stroke={1.8} />{t('member.checkIn')}</button>
              </>
            ) : <><h2 id="c-next-h" className="eyebrow">{t('member.nextSession')}</h2><div className="text-[14px] text-muted">{t('member.noSlot')}</div></>}
          </div>
        </section>
      )}
      {showRenew(c) && (
        <section aria-labelledby="c-renew-h" className="px-5 pt-3">
          <div className="flex flex-col gap-3 rounded-[20px] bg-accent-tint px-5 py-[22px]">
            <span className="text-[13px] font-bold text-gold">{t('member.renewal')}</span>
            <h2 id="c-renew-h" className="font-display m-0 text-[22px] leading-tight font-semibold">{t('member.cycleEndsOn', { date: fmtDay(c!.end_date, 'EEE d MMM') })}</h2>
            <p className="m-0 text-[15px] leading-normal text-muted">{t('member.renewPlain', { plan: c!.plan_name })}</p>
            <div className="flex items-center justify-between gap-3.5">
              {r.price !== null && <span className="font-display text-[28px] font-bold">{money(r.price)}</span>}
              <button type="button" className="btn-gold flex-1" disabled={r.busy} onClick={r.renew}>{t('member.renew')}</button>
            </div>
            {r.msg && <p className="m-0 text-[14px] font-semibold text-gold">{r.msg}</p>}
          </div>
        </section>
      )}
    </>
  )
}

/** "Check-in QR": the member code as a QR for the front desk. */
function CheckInCode() {
  const me = useMe()
  const { t } = useTranslation()
  const [svg, setSvg] = useState('')
  const { data } = useQuery({ queryKey: ['my-code', me.memberId], queryFn: async () => {
    const res = await supabase.from('members').select('member_code,enquiry_code').eq('id', me.memberId!).maybeSingle()
    if (res.error) throw new Error(res.error.message)
    return (res.data?.member_code ?? res.data?.enquiry_code ?? null) as string | null
  } })
  useEffect(() => {
    if (!data) return
    let live = true
    QRCode.toString(data, { type: 'svg', margin: 1, width: 240 }).then((x) => { if (live) setSvg(x) }).catch(() => {})
    return () => { live = false }
  }, [data])
  if (!data) return <Loading />
  return (
    <div className="flex flex-col items-center gap-4 pb-2 text-center">
      <div role="img" aria-label={`${t('member.yourCode')}: ${data}`} className="h-[240px] w-[240px] overflow-hidden rounded-2xl bg-white p-3 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="font-display text-[28px] font-bold tracking-[.06em]">{data}</div>
      <p className="m-0 max-w-[300px] text-[14px] text-muted">{t('member.showAtDesk')}</p>
    </div>
  )
}

// Someone without a current plan (new from the website, or a past member): ask for a trial or a
// call, pick a plan, or reach the studio. Each request lands as a follow-up for the front desk.
function Welcome({ memberId }: { memberId: string }) {
  const { t } = useTranslation()
  const { data: site } = useSite()
  const { data: studio } = useStudio()
  const app = ((studio?.settings as unknown as { app?: Record<string, unknown> })?.app ?? {})
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const ask = useMutation({
    mutationFn: (v: { what: 'trial' | 'callback' | 'plan'; plan?: string }) => requestCallback(memberId, v.what, v.plan),
    onSuccess: (res, v) => setMsg({ tone: 'success', text: res === 'already' ? t('app.already')
      : v.what === 'trial' ? t('app.sentTrial') : v.what === 'plan' ? t('app.sentPlan', { plan: v.plan }) : t('app.sentCall') }),
    onError: (e: Error) => setMsg({ tone: 'error', text: e.message }),
  })
  const s = site?.studio
  const phone = s?.mobile
  return (
    <>
      <section className="px-5 pt-4" aria-label={t('app.talk')}>
        <div className="card flex flex-col gap-4 p-5">
          <p className="m-0 text-[15px] leading-relaxed text-ink-soft">{t('app.ready')}</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button type="button" className="btn-gold" disabled={ask.isPending} onClick={() => ask.mutate({ what: 'trial' })}>{t('app.bookTrial')}</button>
            <button type="button" className="btn" disabled={ask.isPending} onClick={() => ask.mutate({ what: 'callback' })}><Icon name="phone" size={18} />{t('app.callMe')}</button>
          </div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        </div>
      </section>
      {site && site.plans.length > 0 && app.show_membership_plans !== false && (
        <section aria-labelledby="plans-h" className="flex flex-col gap-3 px-5 pt-6">
          <h2 id="plans-h" className="eyebrow">{t('app.plans')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {site.plans.map((p) => (
              <PlanCard key={p.id} p={p} hidePrice={app.show_membership_plans_prices === false} action={
                <button type="button" className="btn w-full" disabled={ask.isPending} onClick={() => ask.mutate({ what: 'plan', plan: p.name })}>{t('app.want')}</button>
              } />
            ))}
          </div>
        </section>
      )}
      {s && phone && (
        <section aria-labelledby="talk-h" className="flex flex-col gap-3 px-5 pt-6">
          <h2 id="talk-h" className="eyebrow">{t('app.talk')}</h2>
          <div className="card flex flex-wrap gap-2.5 p-4">
            <a href={telLink(phone) ?? undefined} className="btn"><Icon name="phone" size={18} />{prettyPhone(phone)}</a>
            <a href={whatsappLink(site.website.whatsapp || phone) ?? undefined} target="_blank" rel="noreferrer" className="btn"><Icon name="whatsapp" size={18} />WhatsApp</a>
            <a href={mapsLink(s, site.website)} target="_blank" rel="noreferrer" className="btn">{t('site.directions')}</a>
          </div>
        </section>
      )}
    </>
  )
}
