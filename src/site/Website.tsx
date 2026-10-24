import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { HoursRow, SitePlan } from '../db/site'
import { money } from '../lib/format'
import { SitePage } from './pages'

// The public website starts here: the home page. The other pages are in pages.tsx. PlanCard and HoursList are
// also used inside the member app, so they stay in the app's own look.
export default function Website() {
  return <SitePage id="home" />
}

const dayRange = (days: number[], t: (k: string) => string) =>
  days.length === 1 ? t(`site.days.${days[0]}`) : `${t(`site.days.${days[0]}`)} – ${t(`site.days.${days[days.length - 1]}`)}`

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
