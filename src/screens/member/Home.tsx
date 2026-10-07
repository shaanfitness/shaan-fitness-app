import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import { memberHome } from '../../db/care'
import { fmtClock, fmtDay } from '../../lib/dates'
import { setLanguage } from '../../i18n'
import { Avatar, BrandMark, Icon, Loading } from '../../components/ui'

// Member home: this plan's progress, their batch time, and renew when it's ending.
export default function MemberHome() {
  const me = useMe()
  const { t, i18n } = useTranslation()
  const { data: d, error } = useQuery({ queryKey: ['memberHome', me.memberId], queryFn: () => memberHome(me.memberId!) })
  if (error) return <div className="p-8 text-red">{(error as Error).message}</div>
  if (!d) return <Loading />
  const c = d.subscriptions.find((s) => s.state === 'active' || s.state === 'frozen') ?? d.subscriptions[0]
  const first = me.name.split(' ')[0]
  const total = c?.sessions_total ?? 0
  const pct = c && total ? c.sessions_used / total : 0
  const circ = 2 * Math.PI * 50
  const batch = d.batches[0]

  return (
    <div className="lg:mx-auto lg:max-w-[560px]">
      <header className="flex items-center justify-between px-5 pt-6">
        <BrandMark />
        <div className="flex items-center gap-2.5">
          <div role="group" aria-label={t('common.language')} className="flex rounded-xl border border-line p-[3px]">
            {(['en', 'te'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={i18n.language === l} onClick={() => setLanguage(l)}
                className={`min-h-9 rounded-[10px] px-3 text-[12px] font-semibold ${i18n.language === l ? 'bg-ink text-ground' : 'text-muted'}`}>{l === 'en' ? 'EN' : 'తెలుగు'}</button>
            ))}
          </div>
          <Avatar name={me.name} gold />
        </div>
      </header>

      <h1 className="title px-5 pt-5 text-[42px]">{t('member.hi', { name: first })}</h1>

      {c ? (
        <section aria-label={t('member.thisCycle')} className="px-5 pt-4">
          <div className="card flex items-center gap-5 p-5">
            <div className="relative h-[116px] w-[116px] flex-none">
              <svg width="116" height="116" viewBox="0 0 116 116" aria-hidden="true">
                <circle cx="58" cy="58" r="50" fill="none" stroke="var(--color-line)" strokeWidth="8" />
                <circle cx="58" cy="58" r="50" fill="none" stroke="var(--color-gold)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} transform="rotate(-90 58 58)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[34px] leading-none">{total ? c.sessions_used : Math.max(c.days_left, 0)}</span>
                <span className="text-[12px] text-muted">{total ? t('member.of', { total }) : 'days left'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="eyebrow">{t('member.thisCycle')}</p>
              <div className="text-[18px] leading-snug font-bold">
                {c.days_left > 0 ? t('member.daysLeft', { count: c.days_left }) : c.days_left === 0 ? t('member.endsToday') : t('member.ended')}
              </div>
              <div className="text-[13px] leading-snug text-muted">{t('member.summary', { plan: c.plan_name, date: fmtDay(c.end_date, 'EEE d MMM') })}</div>
            </div>
          </div>
        </section>
      ) : (
        <section className="px-5 pt-4"><div className="card p-5 text-[14px] text-muted">No current plan. Talk to the front desk to start one.</div></section>
      )}

      <section aria-labelledby="next-h" className="px-5 pt-3">
        <div className="card flex flex-col gap-3.5 p-5">
          <h2 id="next-h" className="eyebrow">{t('member.nextSession')}</h2>
          {batch ? (
            <>
              <div className="font-display text-[30px]">{fmtClock(batch.start_time)}</div>
              <div className="text-[14px] text-muted">{batch.name}</div>
              <button type="button" className="btn-gold"><Icon name="qr" size={18} stroke={1.7} />{t('member.checkIn')}</button>
            </>
          ) : <div className="text-[14px] text-muted">{t('member.noSlot')}</div>}
        </div>
      </section>

      {c && c.days_left <= 7 && (
        <section aria-labelledby="renew-h" className="px-5 pt-3">
          <div className="flex flex-col gap-3 rounded-[20px] border border-gold/50 bg-accent-tint p-5">
            <h2 id="renew-h" className="title text-[24px]">{t('member.momentum')}</h2>
            <p className="m-0 text-[14px] leading-normal text-ink-soft">Your {c.plan_name} plan ends {fmtDay(c.end_date, 'EEE d MMM')}. Renew at the front desk to keep your slot.</p>
          </div>
        </section>
      )}
    </div>
  )
}
