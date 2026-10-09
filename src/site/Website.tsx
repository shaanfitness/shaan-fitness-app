import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import {
  addressLines, mapsLink, prettyPhone, siteHours, startTimes, telLink, useSite, whatsappLink,
  type HoursRow, type SiteInfo, type SitePlan,
} from '../db/site'
import { fmtClock } from '../lib/dates'
import { money, setCurrency } from '../lib/format'
import { Avatar, Icon } from '../components/ui'
import { SitePage } from './chrome'

// The public website at the root of the address: who we are, plans and prices, timings,
// coaches, results and how to reach us. Everything comes from the CRM, so it stays current.
export default function Website() {
  const { data, isLoading } = useSite()
  setCurrency(data?.studio.currency)
  useEffect(() => {
    const s = data?.studio
    document.title = s ? `${s.name} · ${[s.branch, s.city].filter(Boolean).join(', ')}` : 'Shaan Fitness'
  }, [data])
  // Arriving at /#plans from another page: jump there once the sections exist.
  useEffect(() => {
    if (data && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [data])
  return (
    <SitePage home>
      <Hero site={data} />
      {data && (
        <>
          <Stats site={data} />
          <Training site={data} />
          <Plans site={data} />
          <Timings site={data} />
          <Coaches site={data} />
          <Results site={data} />
          <Cta site={data} />
          <Contact site={data} />
        </>
      )}
      {isLoading && <div className="py-16 text-center text-[14px] text-muted" role="status">Loading…</div>}
    </SitePage>
  )
}

function Block({ id, title, sub, children, tone }: { id?: string; title: string; sub?: ReactNode; children: ReactNode; tone?: 'alt' }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={`scroll-mt-16 border-b border-line ${tone === 'alt' ? 'bg-surface/40' : ''}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-14 lg:px-8 lg:py-20">
        <div className="flex max-w-[720px] flex-col gap-3">
          <h2 id={id ? `${id}-h` : undefined} className="m-0 font-display text-[40px] leading-[.95] font-extrabold uppercase lg:text-[56px]">{title}</h2>
          {sub && <div className="m-0 text-[16px] leading-relaxed text-muted">{sub}</div>}
        </div>
        {children}
      </div>
    </section>
  )
}

function Hero({ site }: { site?: SiteInfo | null }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const s = site?.studio
  const w = site?.website
  const title = w?.hero_title || s?.tag_line || t('login.tagline')
  const text = w?.hero_text || t('site.heroText', { city: s?.city ?? 'Kakinada' })
  const phone = s?.mobile
  const wa = whatsappLink(w?.whatsapp || phone, t('site.waHello'))
  return (
    <section className="relative overflow-hidden border-b border-line">
      {w?.hero_image_url
        ? <img src={w.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        : null}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(55% 65% at 78% 38%, color-mix(in srgb, var(--color-gold) 26%, transparent), transparent 72%)' }} />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-4 pt-12 pb-14 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:pt-20 lg:pb-24">
        <div className="flex flex-col gap-6">
          <p className="eyebrow">{[s?.name ?? 'Shaan Fitness', s?.branch, s?.city].filter(Boolean).join(' · ')}</p>
          <h1 className="m-0 font-display text-[54px] leading-[.9] font-extrabold uppercase sm:text-[76px] lg:text-[100px]">{title}</h1>
          <p className="m-0 max-w-[560px] text-[17px] leading-relaxed text-ink-soft">{text}</p>
          <div className="flex flex-wrap gap-3">
            {user?.role === 'member'
              ? <Link to="/app" className="btn-gold min-h-[54px] px-7 text-[15px]">{t('site.openApp')}</Link>
              : site?.studio.can_sign_up === false
                ? (phone ? <a href={telLink(phone) ?? undefined} className="btn-gold min-h-[54px] px-7 text-[15px]">{t('site.callUs')}</a> : null)
                : <Link to="/join" className="btn-gold min-h-[54px] px-7 text-[15px]">{t('site.join')}</Link>}
            <a href="#plans" className="btn min-h-[54px] px-6 text-[15px]">{t('site.seePlans')}</a>
          </div>
          {phone && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-semibold">
              <a href={telLink(phone) ?? undefined} className="flex items-center gap-2 text-ink no-underline hover:text-gold"><Icon name="phone" size={18} />{prettyPhone(phone)}</a>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-ink no-underline hover:text-gold"><Icon name="whatsapp" size={18} />{t('site.whatsapp')}</a>}
            </div>
          )}
        </div>
        <div className="relative hidden justify-center lg:flex">
          <img src="/icon-512.png" alt="Shaan Fitness" width="440" height="440" className="w-full max-w-[440px]"
            style={{ maskImage: 'radial-gradient(circle closest-side, #000 84%, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle closest-side, #000 84%, transparent 100%)' }} />
        </div>
      </div>
    </section>
  )
}

const dayRange = (days: number[], t: (k: string) => string) =>
  days.length === 1 ? t(`site.days.${days[0]}`) : `${t(`site.days.${days[0]}`)} – ${t(`site.days.${days[days.length - 1]}`)}`

function openSpan(site: SiteInfo) {
  const t = site.studio.timings
  const pairs = t?.sessions?.length ? t.sessions.filter((x) => x.from && x.to).map((x) => [x.from, x.to])
    : site.batches.map((b) => [b.start_time.slice(0, 5), b.end_time.slice(0, 5)])
  if (!pairs.length) return null
  const first = pairs.reduce((a, p) => (p[0] < a ? p[0] : a), pairs[0][0])
  const last = pairs.reduce((a, p) => (p[1] > a ? p[1] : a), pairs[0][1])
  return `${fmtClock(first)} – ${fmtClock(last)}`
}

function Stats({ site }: { site: SiteInfo }) {
  const { t } = useTranslation()
  const hours = siteHours(site)
  const openDays = hours.filter((r) => r.spans.length).flatMap((r) => r.days)
  const contiguous = openDays.every((d, i) => i === 0 || d === openDays[i - 1] + 1)
  const items: [string, string][] = []
  const span = openSpan(site)
  if (span) items.push([t('site.statHours'), span.replace(/:00 /g, ' ')])
  if (openDays.length) items.push([t('site.statDays'), contiguous ? dayRange(openDays, t) : openDays.map((d) => t(`site.days.${d}`)).join(', ')])
  if (site.batches.length) items.push([t('site.statBatches'), String(site.batches.length)])
  if (site.plans.length) items.push([t('site.statPlans'), String(site.plans.length)])
  if (!items.length) return null
  return (
    <section aria-label="At a glance" className="border-b border-line">
      <dl className="mx-auto grid max-w-[1200px] grid-cols-2 lg:grid-cols-4">
        {items.map(([k, v], i) => (
          <div key={k} className={`flex flex-col gap-1 px-4 py-6 lg:px-8 ${i % 2 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
            <dt className="text-[12px] font-semibold tracking-[.12em] text-muted uppercase">{k}</dt>
            <dd className="m-0 font-display text-[24px] leading-tight font-bold sm:text-[28px] lg:text-[32px]">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Training({ site }: { site: SiteInfo }) {
  const { t } = useTranslation()
  const seen = new Set<string>()
  const items = [...site.services.map((v) => v.name), ...site.studio.facilities].filter((x) => {
    const k = x.trim().toLowerCase()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
  const about = site.website.about || site.studio.description
  if (!items.length && !about) return null
  return (
    <Block id="training" title={t('site.trainTitle')} sub={about ? <p className="m-0 whitespace-pre-line">{about}</p> : t('site.trainSub', { branch: site.studio.branch ?? site.studio.name })}>
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {items.map((x) => (
          <li key={x} className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />{x}
          </li>
        ))}
      </ul>
    </Block>
  )
}

export function planDuration(p: Pick<SitePlan, 'tenure_value' | 'tenure_unit'>, t: (k: string, o?: Record<string, unknown>) => string) {
  const v = p.tenure_value
  if (p.tenure_unit === 'months') return t('site.dur.months', { count: v })
  if (p.tenure_unit === 'years') return t('site.dur.years', { count: v })
  if (v === 365 || v === 366) return t('site.dur.years', { count: 1 })
  if (v % 7 === 0 && v <= 84) return t('site.dur.weeks', { count: v / 7 })
  return t('site.dur.days', { count: v })
}

export function PlanCard({ p, action, hidePrice }: { p: SitePlan; action: ReactNode; hidePrice?: boolean }) {
  const { t } = useTranslation()
  const extra = p.services.length - 4
  return (
    <article className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="m-0 text-[17px] leading-snug font-bold">{p.name}</h3>
        {p.is_free_trial && <span className="chip chip-gold">{t('site.trial')}</span>}
      </div>
      {!hidePrice && (
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-display text-[38px] leading-none font-bold">{money(p.total_price)}</span>
          {p.discount_price != null && p.discount_price < p.price && <s className="text-[15px] text-faint">{money(p.price)}</s>}
        </div>
      )}
      <div className="text-[13px] font-semibold text-muted">
        {[planDuration(p, t), p.unlimited_sessions ? t('site.unlimited') : p.session_count ? t('site.sessions', { count: p.session_count }) : null].filter(Boolean).join(' · ')}
      </div>
      {p.description && <p className="m-0 line-clamp-3 text-[14px] leading-relaxed text-ink-soft">{p.description}</p>}
      {p.services.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Includes">
          {p.services.slice(0, 4).map((x) => <li key={x} className="chip chip-muted">{x}</li>)}
          {extra > 0 && <li className="chip chip-muted">{t('site.more', { count: extra })}</li>}
        </ul>
      )}
      <div className="mt-auto pt-1">{action}</div>
    </article>
  )
}

function Plans({ site }: { site: SiteInfo }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const gym = site.plans.filter((p) => p.kind === 'gym')
  const pt = site.plans.filter((p) => p.kind === 'pt')
  const [tab, setTab] = useState<'gym' | 'pt'>(gym.length ? 'gym' : 'pt')
  if (!site.plans.length) return null
  const list = tab === 'gym' ? gym : pt
  const both = gym.length > 0 && pt.length > 0
  return (
    <Block id="plans" title={t('site.plansTitle')} sub={t('site.plansSub')} tone="alt">
      {both && (
        <div role="tablist" aria-label={t('site.plansTitle')} className="flex w-full max-w-[520px] rounded-2xl border border-line bg-surface p-1">
          {([['gym', t('site.gymTab'), gym.length], ['pt', t('site.ptTab'), pt.length]] as const).map(([k, label, n]) => (
            <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="plan-list" onClick={() => setTab(k)}
              className={`min-h-11 flex-1 rounded-xl px-3 text-[14px] font-bold ${tab === k ? 'bg-gold text-on-gold' : 'text-muted hover:text-ink'}`}>
              {label} <span className="font-semibold opacity-75">({n})</span>
            </button>
          ))}
        </div>
      )}
      <div id="plan-list" role={both ? 'tabpanel' : undefined} aria-labelledby={both ? `tab-${tab}` : undefined}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <PlanCard key={p.id} p={p} action={
            user?.role === 'member' || site.studio.can_sign_up !== false
              ? <Link to={user?.role === 'member' ? '/app/plans' : `/join?plan=${p.id}`} className="btn w-full">{t('site.choose')}</Link>
              : site.studio.mobile ? <a href={telLink(site.studio.mobile) ?? undefined} className="btn w-full">{t('site.callUs')}</a> : null
          } />
        ))}
      </div>
      <p className="m-0 text-[13px] text-faint">{t('site.priceNote')}</p>
    </Block>
  )
}

export function HoursList({ rows }: { rows: HoursRow[] }) {
  const { t } = useTranslation()
  return (
    <dl className="m-0 flex flex-col">
      {rows.map((r) => (
        <div key={r.days.join()} className="flex items-start justify-between gap-4 border-b border-line-soft py-3 last:border-b-0">
          <dt className="text-[15px] font-bold">{dayRange(r.days, t)}</dt>
          <dd className="m-0 flex flex-col items-end gap-0.5 text-right text-[15px]">
            {r.spans.length ? r.spans.map((x) => <span key={x}>{x}</span>) : <span className="text-muted">{t('site.closed')}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Timings({ site }: { site: SiteInfo }) {
  const { t } = useTranslation()
  const hours = siteHours(site)
  if (!hours.some((r) => r.spans.length) && !site.website.opening_hours) return null
  const groups = startTimes(site.batches)
  return (
    <Block id="timings" title={t('site.timingsTitle')} sub={t('site.timingsSub')}>
      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className="card flex flex-col gap-2 p-5">
          <h3 className="eyebrow">{t('site.hours')}</h3>
          <HoursList rows={hours} />
          {site.website.opening_hours && <p className="m-0 text-[14px] leading-relaxed whitespace-pre-line text-ink-soft">{site.website.opening_hours}</p>}
        </div>
        {groups.length > 0 && (
          <div className="card flex flex-col gap-5 p-5">
            <h3 className="eyebrow">{t('site.batchStarts')}</h3>
            {groups.map((g) => (
              <div key={g.part} className="flex flex-col gap-2">
                <div className="text-[13px] font-bold text-muted">{t(`site.${g.part}`)}</div>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {g.times.map((x) => <li key={x} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] font-semibold tabular-nums">{x}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Block>
  )
}

function Coaches({ site }: { site: SiteInfo }) {
  const { t } = useTranslation()
  if (!site.trainers.length) return null
  return (
    <Block id="coaches" title={t('site.coachesTitle')} tone="alt">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {site.trainers.map((c) => (
          <article key={c.id} className="card flex items-start gap-4 p-5">
            {c.photo_url
              ? <img src={c.photo_url} alt="" width="72" height="72" className="h-[72px] w-[72px] flex-none rounded-2xl border border-line object-cover" />
              : <Avatar name={c.name} size={72} gold />}
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className="m-0 text-[18px] leading-snug font-bold">{c.name}</h3>
              {(c.title || c.designation) && <div className="text-[14px] font-semibold text-gold">{c.title || c.designation}</div>}
              {c.years_experience ? <div className="text-[13px] text-muted">{t('site.yearsExp', { count: c.years_experience })}</div> : null}
              {c.services.length > 0 && (
                <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                  {c.services.slice(0, 4).map((x) => <li key={x} className="chip chip-muted">{x}</li>)}
                </ul>
              )}
            </div>
          </article>
        ))}
      </div>
    </Block>
  )
}

function Results({ site }: { site: SiteInfo }) {
  const { t } = useTranslation()
  if (!site.results.length) return null
  return (
    <Block id="results" title={t('site.resultsTitle')} sub={t('site.resultsSub')}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {site.results.map((r) => (
          <article key={r.id} className="card flex flex-col overflow-hidden">
            {r.image_url && <img src={r.image_url} alt={`${r.client_name}: ${r.title}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />}
            <div className="flex flex-col gap-2 p-5">
              <h3 className="m-0 text-[18px] font-bold">{r.title}</h3>
              <div className="text-[13px] font-semibold text-muted">{r.client_name} · {t('site.inPeriod', { value: r.period_value, unit: r.period_unit })}{r.trainer ? ` · ${r.trainer}` : ''}</div>
              <p className="m-0 line-clamp-4 text-[14px] leading-relaxed text-ink-soft">{r.description}</p>
            </div>
          </article>
        ))}
      </div>
    </Block>
  )
}

function Cta({ site }: { site: SiteInfo }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  if (user || site.studio.can_sign_up === false) return null
  const phone = site.studio.mobile
  return (
    <section className="bg-gold text-on-gold">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex max-w-[640px] flex-col gap-3">
          <h2 className="m-0 font-display text-[44px] leading-[.95] font-extrabold uppercase lg:text-[60px]">{t('site.ctaTitle')}</h2>
          <p className="m-0 text-[16px] leading-relaxed opacity-90">{t('site.ctaText')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/join" className="btn min-h-[54px] border-0 bg-white px-7 text-[15px] font-bold text-[#0A0A0C] hover:bg-white/90 hover:text-[#0A0A0C]">{t('site.join')}</Link>
          {phone && <a href={telLink(phone) ?? undefined} className="btn min-h-[54px] border-white/60 bg-transparent px-6 text-[15px] text-on-gold hover:border-white hover:text-on-gold"><Icon name="phone" size={18} />{t('site.callUs')}</a>}
        </div>
      </div>
    </section>
  )
}

function Contact({ site }: { site: SiteInfo }) {
  const { t } = useTranslation()
  const s = site.studio
  const w = site.website
  const wa = whatsappLink(w.whatsapp || s.mobile, t('site.waHello'))
  const social = ([['Instagram', w.instagram], ['Facebook', w.facebook], ['YouTube', w.youtube], ['X (Twitter)', w.twitter], ['LinkedIn', w.linkedin]] as const)
    .filter(([, u]) => u && /^https:\/\//.test(u))
  return (
    <Block id="contact" title={t('site.contactTitle')}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-5 p-5">
          <address className="flex flex-col gap-1 text-[16px] leading-relaxed not-italic">
            <strong className="text-[18px]">{s.name}{s.branch ? ` · ${s.branch}` : ''}</strong>
            {addressLines(s).map((l) => <span key={l} className="text-ink-soft">{l}</span>)}
          </address>
          <div className="flex flex-wrap gap-2.5">
            <a href={mapsLink(s, w)} target="_blank" rel="noreferrer" className="btn-gold">{t('site.directions')}</a>
            {s.mobile && <a href={telLink(s.mobile) ?? undefined} className="btn"><Icon name="phone" size={18} />{prettyPhone(s.mobile)}</a>}
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn"><Icon name="whatsapp" size={18} />{t('site.whatsapp')}</a>}
          </div>
          {s.email && <div className="text-[14px]"><span className="text-muted">{t('site.email')}: </span><a href={`mailto:${s.email}`}>{s.email}</a></div>}
          {social.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
              <span className="text-muted">{t('site.follow')}:</span>
              {social.map(([label, u]) => <a key={label} href={u!} target="_blank" rel="noreferrer">{label}</a>)}
            </div>
          )}
        </div>
        {(siteHours(site).some((r) => r.spans.length) || w.opening_hours) && (
          <div className="card flex flex-col gap-2 p-5">
            <h3 className="eyebrow">{t('site.hours')}</h3>
            <HoursList rows={siteHours(site)} />
            {w.opening_hours && <p className="m-0 text-[14px] leading-relaxed whitespace-pre-line text-ink-soft">{w.opening_hours}</p>}
          </div>
        )}
      </div>
    </Block>
  )
}
