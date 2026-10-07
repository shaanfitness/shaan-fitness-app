import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { memberHome } from '../../data/api'
import { fmtDate, fmtTime, money, tierLabel, todayISO, addDays } from '../../lib/format'
import { setLanguage } from '../../i18n'
import { useSession } from '../../session'
import { Avatar, Icon, Loading } from '../../components/ui'

export default function MemberHome() {
  const { user } = useSession()
  const { t, i18n } = useTranslation()
  const { data: d } = useQuery({ queryKey: ['memberHome', user?.memberId], queryFn: () => memberHome(user!.memberId!) })
  if (!d) return <Loading />
  const c = d.cycle
  const first = d.member.full_name.split(' ')[0]
  const pct = c && c.sessions_total ? c.sessions_used / c.sessions_total : 0
  const circ = 2 * Math.PI * 50
  const plan = c ? tierLabel[c.plan_tier] : ''
  const coach = d.coach?.full_name.split(' ')[0] ?? ''
  const dayWord = (date: string) => date === todayISO() ? t('member.today') : date === addDays(todayISO(), 1) ? t('member.tomorrow') : fmtDate(date, 'EEE d MMM')

  return (
    <div className="lg:mx-auto lg:max-w-[560px]">
      <header className="flex items-center justify-between px-5 pt-6">
        <div className="brand">Shaan Fitness</div>
        <div className="flex items-center gap-2.5">
          <div role="group" aria-label={t('common.language')} className="flex rounded-xl border border-line p-[3px]">
            {(['en', 'te'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={i18n.language === l} onClick={() => setLanguage(l)}
                className={`min-h-9 rounded-[10px] px-3 text-[12px] font-semibold ${i18n.language === l ? 'bg-ink text-on-gold' : 'text-muted'}`}>{l === 'en' ? 'EN' : 'తెలుగు'}</button>
            ))}
          </div>
          <Avatar name={d.member.full_name} gold />
        </div>
      </header>

      <h1 className="title px-5 pt-5 text-[42px]">{t('member.hi', { name: first })}</h1>

      {c && (
        <section aria-label={t('member.thisCycle')} className="px-5 pt-4">
          <div className="card flex items-center gap-5 p-5">
            <div className="relative h-[116px] w-[116px] flex-none">
              <svg width="116" height="116" viewBox="0 0 116 116" aria-hidden="true">
                <circle cx="58" cy="58" r="50" fill="none" stroke="var(--color-line)" strokeWidth="8" />
                <circle cx="58" cy="58" r="50" fill="none" stroke="var(--color-gold)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} transform="rotate(-90 58 58)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[34px] leading-none">{c.sessions_used}</span>
                <span className="text-[12px] text-muted">{t('member.of', { total: c.sessions_total })}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="eyebrow">{t('member.thisCycle')}</p>
              <div className="text-[18px] leading-snug font-bold">
                {c.days_left > 0 ? t('member.daysLeft', { count: c.days_left }) : c.days_left === 0 ? t('member.endsToday') : t('member.ended')}
              </div>
              <div className="text-[13px] leading-snug text-muted">{t('member.summary', { plan, date: fmtDate(c.end_date, 'EEE d MMM') })}</div>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="next-h" className="px-5 pt-3">
        <div className="card flex flex-col gap-3.5 p-5">
          <h2 id="next-h" className="eyebrow">{t('member.nextSession')}</h2>
          {d.next ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[30px]">{dayWord(d.next.date)}, {fmtTime(d.next.slot.start_time).time}</span>
                <span className="text-[13px] text-muted">{fmtTime(d.next.slot.start_time).suffix}</span>
              </div>
              <div className="text-[14px] text-muted">{t('member.withCoach', { plan, coach })}</div>
              <div className="grid grid-cols-[2fr_1fr] gap-2.5">
                <button type="button" className="btn-gold"><Icon name="qr" size={18} stroke={1.7} />{t('member.checkIn')}</button>
                <button type="button" className="btn">{t('member.reschedule')}</button>
              </div>
            </>
          ) : <div className="text-[14px] text-muted">{t('member.noSlot')}</div>}
        </div>
      </section>

      {c && c.days_left <= 7 && d.plan && (
        <section aria-labelledby="renew-h" className="px-5 pt-3">
          <div className="flex flex-col gap-3 rounded-[20px] border border-gold/50 bg-[#1A1813] p-5">
            <h2 id="renew-h" className="title text-[24px]">{t('member.momentum')}</h2>
            <p className="m-0 text-[14px] leading-normal text-ink-soft">{t('member.renewText', { date: fmtDate(c.end_date, 'EEE d MMM'), plan, sessions: d.plan.sessions })}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-[28px] text-gold-light">{money(d.plan.price)}</span>
              <button type="button" className="btn-gold flex-1">{t('member.renew')}</button>
            </div>
            <button type="button" className="self-start text-[13px] font-semibold text-gold">{t('member.autopay')}</button>
          </div>
        </section>
      )}

      <section aria-labelledby="plan-h" className="px-5 pt-3">
        <div className="card flex flex-col gap-3.5 p-5">
          <div className="flex items-center justify-between">
            <h2 id="plan-h" className="eyebrow">{t('member.todaysPlan')}</h2>
            <span className="text-[12px] text-muted">{t('member.fromCoach', { coach })}</span>
          </div>
          {[['workout', 'member.workout', 'member.workoutMeta'], ['meals', 'member.meals', 'member.mealsMeta']].map(([k, title, meta]) => (
            <a key={k} href={`#${k}`} className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-3 p-3.5 text-ink no-underline hover:text-ink">
              <span className="flex flex-col gap-1"><span className="text-[15px] font-bold">{t(title)}</span><span className="text-[13px] text-muted">{t(meta)}</span></span>
              <Icon name="chevronRight" size={18} color="var(--color-muted)" />
            </a>
          ))}
        </div>
      </section>

      <section className="px-5 pt-3">
        <a href="#chat" className="card flex items-center gap-3.5 px-5 py-4 text-ink no-underline hover:text-ink">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-[#3A352A] bg-[#1C1A16] font-display text-gold-light">{coach[0]}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1"><span className="text-[15px] font-bold">Coach {coach}</span><span className="truncate text-[13px] text-muted">{t('member.chatPreview')}</span></span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gold text-[12px] font-bold text-on-gold">1</span>
        </a>
      </section>

      <section aria-labelledby="offers-h" className="flex flex-col gap-2.5 px-5 pt-5">
        <div className="flex items-center justify-between"><h2 id="offers-h" className="eyebrow">{t('member.offers')}</h2><span className="text-[12px] text-muted">{t('member.swipe')}</span></div>
        <a href="#offer" className="relative flex min-h-[200px] flex-col justify-end gap-2 overflow-hidden rounded-[20px] border border-[#3A352A] bg-[#16140F] p-[22px] text-ink no-underline hover:text-ink">
          <span aria-hidden="true" className="absolute inset-x-3.5 top-3.5 flex h-[92px] items-center justify-center rounded-xl border border-dashed border-[#3A352A] text-[11px] tracking-[.14em] text-[#8E887D] uppercase">{t('member.posterImage')}</span>
          <span className="font-display text-[26px] leading-tight">[Poster title]</span>
          <span className="text-[13px] text-muted">[Offer details] · till [end date]</span>
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-gold">{t('member.viewOffer')}<Icon name="chevronRight" size={16} stroke={1.8} /></span>
        </a>
      </section>
    </div>
  )
}
