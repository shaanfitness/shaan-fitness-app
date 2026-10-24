import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { homeFor, useAuth } from '../auth'
import { setLanguage } from '../i18n'
import { prettyPhone, telLink, useSite, whatsappLink } from '../db/site'
import { Ic } from './art'
import { COPY, PATHS, fill, type Copy, type Lang, type PageId } from './content'
import { clock, openSpans } from './data'
import { usePointerEffects, useScrolled } from './motion'
import './site.css'

// The website's frame: header with the Training menu, the full-screen menu on phones, the footer with every page
// (internal links help search), and the phone dock with Call, WhatsApp and Free trial.

export function useCopy() {
  const { i18n } = useTranslation()
  const lang: Lang = i18n.language === 'te' ? 'te' : 'en'
  return { c: COPY[lang], lang }
}

export const TRAINING: { id: PageId; icon: keyof typeof Ic; desc: Record<Lang, string> }[] = [
  { id: 'personal', icon: 'dumbbell', desc: { en: 'One coach, only you, with a plan written for your body.', te: 'ఒక కోచ్, మీరు మాత్రమే, మీ శరీరానికి రాసిన ప్లాన్‌తో.' } },
  { id: 'group', icon: 'people', desc: { en: 'Small coached batches, mornings and evenings.', te: 'ఉదయం, సాయంత్రం చిన్న కోచ్ బ్యాచ్‌లు.' } },
  { id: 'weightLoss', icon: 'flame', desc: { en: 'Fat loss with strength, conditioning and home food.', te: 'బలం, కండిషనింగ్, ఇంటి భోజనంతో ఫ్యాట్ లాస్.' } },
]
const navLabel = (c: Copy, id: PageId) => ({ home: c.nav.home, personal: c.nav.personal, group: c.nav.group, weightLoss: c.nav.weightLoss, plans: c.nav.plans,
  timings: c.nav.timings, coaches: c.nav.coaches, results: c.nav.results, about: c.nav.about, contact: c.nav.contact }[id])

export function LangSwitch() {
  const { lang } = useCopy()
  return (
    <div role="group" aria-label="Language / భాష" className="sf-lang">
      {(['en', 'te'] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} lang={l} onClick={() => setLanguage(l)}>{l === 'en' ? 'EN' : 'తెలుగు'}</button>
      ))}
    </div>
  )
}

function Brand() {
  return (
    <Link to="/" viewTransition className="sf-brand" aria-label="Shaan Fitness, home">
      <img src="/icon-192.png" alt="" width="40" height="40" />
      <span className="sf-brand-name" aria-hidden="true">SHAAN<small>FITNESS</small></span>
    </Link>
  )
}

function Account({ big }: { big?: boolean }) {
  const { c } = useCopy()
  const { user } = useAuth()
  if (user) return <Link to={homeFor(user.role)} className={`sf-btn ${big ? '' : 'sf-btn-sm'}`}>{user.role === 'member' ? c.nav.openApp : c.nav.openDashboard}</Link>
  return <Link to="/login" className={`sf-btn ${big ? '' : 'sf-btn-sm'}`}>{c.nav.login}</Link>
}

function TrainingMenu() {
  const { c, lang } = useCopy()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  const here = TRAINING.some((t) => PATHS[t.id] === pathname)
  return (
    <div className="sf-nav-drop" ref={ref}>
      <button type="button" aria-expanded={open} aria-controls="sf-training" onClick={() => setOpen((o) => !o)} style={here ? { color: 'var(--sf-porcelain)' } : undefined}>
        {c.nav.training}{Ic.down(16)}
      </button>
      {open && (
        <div className="sf-drop" id="sf-training">
          {TRAINING.map((t) => (
            <Link key={t.id} to={PATHS[t.id]} viewTransition onClick={() => setOpen(false)}>
              <span className="sf-drop-icon">{Ic[t.icon](20)}</span>
              <span><strong>{navLabel(c, t.id)}</strong><span>{t.desc[lang]}</span></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

const MAIN_NAV: PageId[] = ['plans', 'timings', 'coaches', 'about', 'contact']

function Header() {
  const { c } = useCopy()
  const { solid } = useScrolled()
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setMenu(false) }, [pathname])
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [menu])
  // The phone menu sits outside the header: the header's frosted glass would otherwise trap it inside its own box.
  return (
    <>
    <header className={`sf-head ${solid ? 'is-solid' : ''}`}>
      <div className="sf-wrap sf-head-row">
        <Brand />
        <nav className="sf-nav" aria-label="Website">
          <TrainingMenu />
          {MAIN_NAV.map((id) => <NavLink key={id} to={PATHS[id]} viewTransition end>{navLabel(c, id)}</NavLink>)}
        </nav>
        <div className="sf-head-side">
          <span className="sf-hide-sm"><LangSwitch /></span>
          <span className="sf-hide-sm"><Account /></span>
          <a href="#free-trial" className="sf-btn sf-btn-red sf-btn-sm sf-hide-sm sf-magnet">{c.nav.trial}</a>
          <button type="button" className="sf-burger" aria-expanded={menu} aria-controls="sf-menu" aria-label={c.nav.menu} onClick={() => setMenu(true)}>{Ic.menu(22)}</button>
        </div>
      </div>
      <div className="sf-progress" aria-hidden="true" />
    </header>
    {menu && <PhoneMenu onClose={() => setMenu(false)} />}
    </>
  )
}

function PhoneMenu({ onClose }: { onClose: () => void }) {
  const { c, lang } = useCopy()
  const { data: site } = useSite()
  const phone = site?.studio.mobile
  const wa = whatsappLink(site?.website.whatsapp || phone, c.lead.waText)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { close.current?.focus() }, [])
  const items: PageId[] = ['home', 'personal', 'group', 'weightLoss', 'plans', 'timings', 'coaches', 'results', 'about', 'contact']
  return (
    <div className="sf-menu" id="sf-menu" role="dialog" aria-modal="true" aria-label={c.nav.menu}>
      <div className="sf-menu-top">
        <Brand />
        <button ref={close} type="button" className="sf-burger" style={{ display: 'inline-grid' }} aria-label={c.nav.close} onClick={onClose}>{Ic.close(22)}</button>
      </div>
      <nav aria-label="Website">
        {items.map((id, i) => (
          <NavLink key={id} to={PATHS[id]} viewTransition end onClick={onClose} style={{ animationDelay: `${i * 40}ms` }}>
            {navLabel(c, id)}{TRAINING.find((t) => t.id === id) && <small>{TRAINING.find((t) => t.id === id)!.desc[lang]}</small>}
          </NavLink>
        ))}
      </nav>
      <div className="sf-menu-foot">
        <a href="#free-trial" className="sf-btn sf-btn-red" onClick={onClose}>{c.nav.trial}</a>
        <div style={{ display: 'flex', gap: 10 }}>
          {phone && <a href={telLink(phone) ?? undefined} className="sf-btn" style={{ flex: 1 }}>{Ic.phone(18)}{c.nav.call}</a>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="sf-btn" style={{ flex: 1 }}>{Ic.whatsapp(18)}{c.nav.whatsapp}</a>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><LangSwitch /><Account /></div>
      </div>
    </div>
  )
}

function Footer() {
  const { c, lang } = useCopy()
  const { data: site } = useSite()
  const s = site?.studio
  const w = site?.website
  const spans = site ? openSpans(site) : null
  const social = w ? ([['Instagram', w.instagram, 'instagram'], ['Facebook', w.facebook, 'facebook'], ['YouTube', w.youtube, 'youtube'], ['X', w.twitter, 'x']] as const)
    .filter(([, u]) => u && /^https:\/\//.test(u)) : []
  const year = new Date().getFullYear()
  return (
    <footer className="sf-foot">
      <div className="sf-wrap">
        <div className="sf-foot-grid">
          <div>
            <h2>Shaan Fitness, {s?.city ?? 'Kakinada'}</h2>
            {s && (
              <address>
                {[s.street1, s.street2].filter(Boolean).join(', ')}<br />
                {[s.landmark, s.locality ?? s.branch].filter(Boolean).join(', ')}<br />
                {[s.city, s.state, s.pincode].filter(Boolean).join(', ')}<br />
                {s.mobile && <><a href={telLink(s.mobile) ?? undefined}>{prettyPhone(s.mobile)}</a><br /></>}
                {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
              </address>
            )}
            {social.length > 0 && (
              <div className="sf-social">
                {social.map(([label, u, icon]) => <a key={label} href={u!} target="_blank" rel="noreferrer me" aria-label={`${label}: Shaan Fitness`}>{Ic[icon](18)}</a>)}
              </div>
            )}
          </div>
          <nav aria-label={c.nav.training}>
            <h2>{c.nav.training}</h2>
            <ul>
              {TRAINING.map((t) => <li key={t.id}><Link to={PATHS[t.id]} viewTransition>{lang === 'en' ? ({ personal: 'Personal trainer in Kakinada', group: 'Group fitness classes', weightLoss: 'Weight loss program' } as Record<string, string>)[t.id] : navLabel(c, t.id)}</Link></li>)}
              <li><Link to={PATHS.plans} viewTransition>{lang === 'en' ? 'Gym membership fees' : c.nav.plans}</Link></li>
            </ul>
          </nav>
          <nav aria-label="Shaan Fitness">
            <h2>Shaan</h2>
            <ul>
              {(['timings', 'coaches', 'results', 'about', 'contact'] as PageId[]).map((id) => <li key={id}><Link to={PATHS[id]} viewTransition>{navLabel(c, id)}</Link></li>)}
            </ul>
          </nav>
          {spans && (
            <div>
              <h2>{c.common.hours}</h2>
              <ul>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <li key={d} className="sf-small" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>{c.common.days[d - 1]}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{spans[d].length ? spans[d].map(([a, b]) => `${clock(a)}–${clock(b)}`).join(', ') : c.common.closed}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="sf-foot-word" aria-hidden="true">SHAAN</div>
      </div>
      <div className="sf-foot-legal">
        <div className="sf-wrap" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          <span suppressHydrationWarning>{fill(c.common.rights, { year })}</span>
          <span style={{ display: 'flex', gap: 18 }}>
            <Link to="/privacy">{c.common.privacy}</Link>
            <Link to="/login">{c.common.staffLogin}</Link>
          </span>
        </div>
      </div>
    </footer>
  )
}

function Dock() {
  const { c } = useCopy()
  const { data: site } = useSite()
  const { y } = useScrolled()
  const phone = site?.studio.mobile
  const wa = whatsappLink(site?.website.whatsapp || phone, c.lead.waText)
  return (
    <nav className={`sf-dock ${y > 420 ? 'is-up' : ''}`} aria-label={c.nav.trial}>
      {phone ? <a href={telLink(phone) ?? undefined}>{Ic.phone(18)}{c.nav.call}</a> : <span />}
      {wa ? <a href={wa} target="_blank" rel="noreferrer">{Ic.whatsapp(18)}{c.nav.whatsapp}</a> : <span />}
      <a href="#free-trial" className="is-main">{c.nav.trial}</a>
    </nav>
  )
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { c, lang } = useCopy()
  usePointerEffects()
  useEffect(() => {
    const html = document.documentElement
    html.lang = lang === 'te' ? 'te' : 'en'
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    html.style.scrollPaddingTop = '88px'
    if (!reduce) html.style.scrollBehavior = 'smooth'
    return () => { html.style.scrollBehavior = ''; html.style.scrollPaddingTop = '' }
  }, [lang])
  return (
    <div className="sf sf-has-dock" lang={lang === 'te' ? 'te' : 'en'}>
      <a href="#main" className="sf-skip">{c.nav.skip}</a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <Dock />
    </div>
  )
}
