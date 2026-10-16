import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useStudio } from '../../db/studio'
import { iconFor, LIVE_LINKS, sendFeedback } from '../../db/center'
import { addressLines, mapsLink, prettyPhone, requestCallback, siteHours, telLink, useSite, whatsappLink } from '../../db/site'
import { fmtDateTime } from '../../lib/dates'
import { HoursList, PlanCard } from '../../site/Website'
import { Notice, TextArea } from '../../components/controls'
import { Avatar, Icon, Loading } from '../../components/ui'

// Member app screens fed by App Settings (action items, banners) and the Fitness Center
// (notices, rules, feedback, plans, coaches, contact).
interface Action { id: string; kind: 'action' | 'quick'; name: string; icon: string | null; color: string; link: string | null; link_id: string | null; show_to: string; ordering: number }
interface Banner { id: string; name: string; image_url: string; web_url: string | null; link: string | null; categories: string[]; show_to: string; ordering: number }

function useAppSettings() {
  const { data: studio } = useStudio()
  return ((studio?.settings as unknown as { app?: Record<string, unknown> })?.app ?? {}) as Record<string, unknown>
}

/** Who sees an item (YDL "Show the item to"): paid = a current plan, free = none. */
const visible = (showTo: string, paid: boolean, pt: boolean) =>
  showTo === 'both' || (showTo === 'paid' && paid) || (showTo === 'free' && !paid) || (showTo === 'active_pt' && pt)
  || (showTo === 'general_no_pt' && paid && !pt) || (showTo === 'all_expired' && !paid)

function Page({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[720px]">
      <Link to="/app" className="flex items-center gap-1 self-start text-[13px] font-semibold no-underline lg:hidden"><Icon name="chevronLeft" size={16} />{t('app.back')}</Link>
      <h1 className="title text-[36px]">{title}</h1>
      {children}
    </div>
  )
}

/** Action items, quick action items and banners on the member home. */
export function HomeExtras({ paid, pt }: { paid: boolean; pt: boolean }) {
  const me = useMe()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [msg, setMsg] = useState<string | null>(null)
  const items = useQuery({ queryKey: ['app_actions', me.studioId, 'member'], queryFn: async () =>
    throwIf(await supabase.from('app_actions').select('*').eq('studio_id', me.studioId).eq('active', true).order('ordering').order('created_at')) as Action[] })
  const banners = useQuery({ queryKey: ['app_banners', me.studioId, 'member'], queryFn: async () =>
    throwIf(await supabase.from('app_banners').select('*').eq('studio_id', me.studioId).eq('active', true).order('ordering').order('created_at', { ascending: false })) as Banner[] })
  const trial = useMutation({
    mutationFn: () => requestCallback(me.memberId!, 'trial'),
    onSuccess: (r) => setMsg(r === 'already' ? t('app.already') : t('app.sentTrial')),
    onError: (e: Error) => setMsg(e.message),
  })
  const open = (link: string | null, linkId: string | null) => {
    switch (link) {
      case 'SUBSCRIPTIONS': return navigate('/app/plans')
      case 'TRAINERS_LIST': return navigate('/app/coaches')
      case 'CONTACT': return navigate('/app/contact')
      case 'FITNESS_NOTICES': return navigate('/app/notices')
      case 'FITNESS_RULES': return navigate('/app/rules')
      case 'FEEDBACK': return navigate('/app/feedback')
      case 'TRANSFORMATIONS': return navigate('/app/results')
      case 'PROFILE': return navigate('/app/profile')
      case 'MY_SUBSCRIPTIONS': case 'PT_TAB': return navigate('/app/memberships')
      case 'TOTAL_CHECKINS': return navigate('/app/attendance')
      case 'TRAFFIC': return navigate('/app/traffic')
      case 'GIVE_REFERRAL': return navigate('/app/refer')
      case 'BROWSE_CLASSES': case 'OWN_PROGRAM_LIST': return navigate('/app/book')
      case 'TRAINER_PROFILE': return navigate('/app/coaches')
      case 'ABOUT_US': return navigate('/')
      case 'FREE_TRIAL': return trial.mutate()
      case 'WORKOUT_PLAN': case 'TRACK_WORKOUT': return navigate('/app/plan?tab=workout')
      case 'DIET_PLAN': return navigate('/app/plan?tab=diet')
      case 'ADD_MEASUREMENT': case 'MEASUREMENT_LIST': case 'LOG_WEIGHT': return navigate('/app/plan?tab=progress')
      case 'COMMUNITY_TAB': case 'ADD_POST': return navigate('/app/community')
      case 'CHALLENGE_LIST': return navigate('/app/challenges')
      case 'APPOINTMENTS': return navigate('/app/appointments')
      case 'STORE': return navigate('/app/store')
      case 'MY_ORDERS': return navigate('/app/orders')
      case 'WALLET': return navigate('/app/wallet')
      case 'ADD_DIARY': case 'DIARY_LISTING': return navigate('/app/diary')
      case 'DIET_ANALYSIS': case 'EXERCISE_VOLUME_GRAPHS': case 'WORKOUT_ANALYSIS': return navigate('/app/analysis')
      case 'HYDRATION': case 'SLEEP_TRACKER': case 'STEPS': return navigate('/app/track')
      case 'FITNESS_TOOLS': return navigate('/app/tools')
      case 'RECIPE_LIST': return navigate('/app/recipes')
      case 'RECIPE_DETAILS': return navigate(linkId && /^[0-9a-f-]{36}$/i.test(linkId) ? `/app/recipes/${linkId}` : '/app/recipes')
      case 'FREE_WORKOUT': return navigate('/app/free-plans?tab=workout')
      case 'FREE_DIET': return navigate('/app/free-plans?tab=diet')
      case 'WORKOUT_DIET_OPTIONS': return navigate('/app/free-plans')
      case 'VIEW_PARQ_FORM': return navigate('/app/health-form')
      case 'EXTERNAL_WEB': case 'WEB': if (linkId && /^https:\/\//.test(linkId)) window.open(linkId, '_blank', 'noopener'); return
    }
  }
  const live = (a: { link: string | null; link_id?: string | null }) => !!a.link && LIVE_LINKS.has(a.link) && (!['EXTERNAL_WEB', 'WEB'].includes(a.link) || /^https:\/\//.test(a.link_id ?? ''))
  const acts = (items.data ?? []).filter((a) => a.kind === 'action' && live(a) && visible(a.show_to, paid, pt))
  const quick = (items.data ?? []).filter((a) => a.kind === 'quick' && live(a) && visible(a.show_to, paid, pt))
  const top = (banners.data ?? []).filter((b) => visible(b.show_to, paid, pt) && (b.categories.includes('Top Sponsored') || b.categories.includes('Sponsored') || !b.categories.length))
  if (!acts.length && !quick.length && !top.length) return null
  return (
    <section className="flex flex-col gap-4 px-5 pt-5" aria-label="Shortcuts">
      {top.length > 0 && (
        <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1">
          {top.map((b) => {
            const body = <img src={b.image_url} alt={b.name} className="h-[150px] w-[300px] max-w-[85vw] rounded-2xl border border-line object-cover" />
            return b.web_url && /^https:\/\//.test(b.web_url)
              ? <a key={b.id} href={b.web_url} target="_blank" rel="noreferrer" className="flex-none snap-start">{body}</a>
              : live(b) ? <button key={b.id} type="button" className="flex-none snap-start border-0 bg-transparent p-0" onClick={() => open(b.link, null)}>{body}</button>
                : <div key={b.id} className="flex-none snap-start">{body}</div>
          })}
        </div>
      )}
      {quick.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quick.map((a) => (
            <button key={a.id} type="button" onClick={() => open(a.link, a.link_id)} className="chip chip-gold min-h-9 px-4 text-[12px]" style={a.color !== '#000000' ? { color: a.color } : undefined}>{a.name}</button>
          ))}
        </div>
      )}
      {acts.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {acts.map((a) => (
            <button key={a.id} type="button" className="qa border-line bg-surface" onClick={() => open(a.link, a.link_id)}>
              <span style={a.color !== '#000000' ? { color: a.color } : undefined} className="text-gold"><Icon name={iconFor(a.icon)} size={24} /></span>
              <span className="px-1 text-center leading-tight">{a.name}</span>
            </button>
          ))}
        </div>
      )}
      {msg && <Notice tone="success">{msg}</Notice>}
    </section>
  )
}

interface NoticeRow { id: string; title: string; description: string; created_at: string }

export function AppNotices({ kind }: { kind: 'notices' | 'rules' }) {
  const me = useMe()
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: [kind, me.studioId, 'member'], queryFn: async () => {
    let q = supabase.from(kind).select('id,title,description,created_at').eq('studio_id', me.studioId).eq('active', true)
    if (kind === 'notices') q = q.eq('audience', 'customer')
    return throwIf(await q.order('created_at', { ascending: false })) as NoticeRow[]
  } })
  return (
    <Page title={kind === 'notices' ? t('app.notices') : t('app.rules')}>
      {isLoading ? <Loading /> : !data?.length ? <div className="card p-5 text-[14px] text-muted">{kind === 'notices' ? t('app.noNotices') : t('app.noRules')}</div> : (
        data.map((n) => (
          <article key={n.id} className="card flex flex-col gap-2 p-5">
            <h2 className="m-0 text-[18px] font-bold">{n.title}</h2>
            {kind === 'notices' && <span className="text-[12px] text-muted">{fmtDateTime(n.created_at)}</span>}
            <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">{n.description}</p>
          </article>
        ))
      )}
    </Page>
  )
}

export function AppFeedback() {
  const me = useMe()
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const mine = useQuery({ queryKey: ['app_feedback', me.memberId], queryFn: async () =>
    throwIf(await supabase.from('app_feedback').select('id,feedback,created_at').eq('member_id', me.memberId!).order('created_at', { ascending: false }).limit(20)) as { id: string; feedback: string; created_at: string }[] })
  const send = useMutation({
    mutationFn: () => sendFeedback(me.memberId!, text),
    onSuccess: () => { setText(''); setSent(true); mine.refetch() },
  })
  return (
    <Page title={t('app.feedback')}>
      <p className="m-0 text-[14px] text-muted">{t('app.feedbackHint')}</p>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); setSent(false); if (text.trim()) send.mutate() }}>
        <label htmlFor="fb" className="sr-only">{t('app.yourFeedback')}</label>
        <TextArea id="fb" value={text} onChange={setText} rows={5} />
        {send.error && <Notice tone="error">{(send.error as Error).message}</Notice>}
        {sent && <Notice tone="success">{t('app.feedbackSent')}</Notice>}
        <button type="submit" className="btn-gold self-start px-8" disabled={send.isPending || !text.trim()}>{t('app.feedbackSend')}</button>
      </form>
      {(mine.data ?? []).length > 0 && (
        <section className="flex flex-col gap-2 pt-2">
          <h2 className="eyebrow">{t('app.yourFeedback')}</h2>
          {mine.data!.map((f) => <div key={f.id} className="card p-4"><div className="text-[12px] text-muted">{fmtDateTime(f.created_at)}</div><p className="m-0 mt-1 text-[14px] whitespace-pre-line">{f.feedback}</p></div>)}
        </section>
      )}
    </Page>
  )
}

export function AppPlans() {
  const me = useMe()
  const { t } = useTranslation()
  const app = useAppSettings()
  const { data: site, isLoading } = useSite()
  const [msg, setMsg] = useState<string | null>(null)
  const ask = useMutation({
    mutationFn: (plan: string) => requestCallback(me.memberId!, 'plan', plan),
    onSuccess: (r, plan) => setMsg(r === 'already' ? t('app.already') : t('app.sentPlan', { plan })),
    onError: (e: Error) => setMsg(e.message),
  })
  if (isLoading || !site) return <Loading />
  const show = app.show_membership_plans !== false
  return (
    <Page title={t('app.plans')}>
      {msg && <Notice tone="success">{msg}</Notice>}
      {!show ? <div className="card p-5 text-[14px] text-muted">{t('app.soon')}</div> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {site.plans.map((p) => <PlanCard key={p.id} p={p} hidePrice={app.show_membership_plans_prices === false}
            action={<button type="button" className="btn w-full" disabled={ask.isPending} onClick={() => ask.mutate(p.name)}>{t('app.want')}</button>} />)}
        </div>
      )}
    </Page>
  )
}

export function AppCoaches() {
  const { t } = useTranslation()
  const { data: site, isLoading } = useSite()
  if (isLoading || !site) return <Loading />
  return (
    <Page title={t('app.coaches')}>
      {site.trainers.map((c) => (
        <article key={c.id} className="card flex items-center gap-4 p-4">
          {c.photo_url ? <img src={c.photo_url} alt="" className="h-16 w-16 rounded-2xl border border-line object-cover" /> : <Avatar name={c.name} size={64} gold />}
          <div className="flex min-w-0 flex-col gap-1"><strong className="text-[17px]">{c.name}</strong><span className="text-[13px] text-gold">{c.title || c.designation}</span>
            {c.services.length > 0 && <span className="text-[12px] text-muted">{c.services.slice(0, 4).join(' · ')}</span>}</div>
        </article>
      ))}
    </Page>
  )
}

export function AppResults() {
  const { t } = useTranslation()
  const { data: site, isLoading } = useSite()
  if (isLoading || !site) return <Loading />
  return (
    <Page title={t('app.results')}>
      {!site.results.length ? <div className="card p-5 text-[14px] text-muted">{t('app.soon')}</div> : site.results.map((r) => (
        <article key={r.id} className="card overflow-hidden">
          {r.image_url && <img src={r.image_url} alt={`${r.client_name}: ${r.title}`} className="aspect-[4/3] w-full object-cover" />}
          <div className="flex flex-col gap-1 p-4"><strong>{r.title}</strong><span className="text-[13px] text-muted">{r.client_name}</span><p className="m-0 text-[14px] text-ink-soft">{r.description}</p></div>
        </article>
      ))}
    </Page>
  )
}

export function AppContact() {
  const { t } = useTranslation()
  const { data: site, isLoading } = useSite()
  if (isLoading || !site) return <Loading />
  const s = site.studio
  const phone = s.mobile
  return (
    <Page title={t('app.contact')}>
      <div className="card flex flex-col gap-3 p-5">
        <strong className="text-[17px]">{s.name}{s.branch ? ` · ${s.branch}` : ''}</strong>
        <address className="flex flex-col text-[14px] text-ink-soft not-italic">{addressLines(s).map((l) => <span key={l}>{l}</span>)}</address>
        <div className="flex flex-wrap gap-2">
          {phone && <a href={telLink(phone) ?? undefined} className="btn"><Icon name="phone" size={18} />{prettyPhone(phone)}</a>}
          {phone && <a href={whatsappLink(site.website.whatsapp || phone) ?? undefined} target="_blank" rel="noreferrer" className="btn"><Icon name="whatsapp" size={18} />WhatsApp</a>}
          <a href={mapsLink(s, site.website)} target="_blank" rel="noreferrer" className="btn">{t('site.directions')}</a>
        </div>
      </div>
      <div className="card p-5"><h2 className="eyebrow mb-1">{t('site.hours')}</h2><HoursList rows={siteHours(site)} /></div>
    </Page>
  )
}
