import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { homeFor, useAuth } from '../auth'
import { setLanguage } from '../i18n'
import { asTheme, useForcedTheme } from '../theme'
import { addressLines, prettyPhone, telLink, useSite, whatsappLink } from '../db/site'
import { useInstall } from '../lib/install'
import { Icon } from '../components/ui'

// The public side of the one address: website header and footer, shared by the website,
// privacy notice and the sign-in pages. They wear the studio's member look (red and black).
export function useSiteLook() {
  const { data } = useSite()
  useForcedTheme(asTheme(data?.studio.theme) ?? 'club')
}

export function LangToggle({ compact }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  return (
    <div role="group" aria-label={t('common.language')} className="lang-switch">
      {(['en', 'te'] as const).map((l) => (
        <button key={l} type="button" aria-pressed={i18n.language === l} onClick={() => setLanguage(l)} style={compact ? { minHeight: 32 } : undefined}>
          {l === 'en' ? 'EN' : 'తెలుగు'}
        </button>
      ))}
    </div>
  )
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 text-ink no-underline hover:text-ink">
      <img src="/icon-192.png" alt="" width={size} height={size} className="flex-none rounded-[9px]" style={{ width: size, height: size }} />
      <span className="headline wordmark whitespace-nowrap">Shaan <span className="brand-2">Fitness</span></span>
    </Link>
  )
}

/** Log in / Join for visitors; "Open my app" or "Open dashboard" for someone signed in. */
export function AccountButtons({ stacked }: { stacked?: boolean }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: site } = useSite()
  if (user) {
    return (
      <Link to={homeFor(user.role)} className={`btn-gold ${stacked ? '' : 'btn-sm'} whitespace-nowrap`}>
        {user.role === 'member' ? t('site.openApp') : t('site.openDashboard')}
      </Link>
    )
  }
  return (
    <div className={`flex items-center gap-2 ${stacked ? 'flex-col items-stretch' : ''}`}>
      <Link to="/login" className={`btn ${stacked ? '' : 'btn-sm'} whitespace-nowrap`}>{t('site.login')}</Link>
      {site?.studio.can_sign_up !== false && <Link to="/join" className={`btn-gold ${stacked ? '' : 'btn-sm'} whitespace-nowrap`}>{t('site.join')}</Link>}
    </div>
  )
}

const LINKS = [['plans', '#plans'], ['timings', '#timings'], ['coaches', '#coaches'], ['contact', '#contact']] as const

export function SiteHeader({ home }: { home?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const href = (h: string) => (home ? h : `/${h}`)
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ground/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 lg:px-8">
        <Wordmark />
        <nav aria-label="Website" className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([k, h]) => (
            <a key={k} href={href(h)} className="rounded-lg px-3 py-2 text-[14px] font-semibold text-ink-soft no-underline hover:text-ink">{t(`site.${k}`)}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block"><LangToggle compact /></div>
          <div className="hidden sm:block"><AccountButtons /></div>
          <button type="button" className="icon-btn icon-sm lg:hidden" aria-expanded={open} aria-controls="site-menu" aria-label={open ? t('site.close') : t('site.menu')}
            onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'close' : 'list'} size={18} />
          </button>
        </div>
      </div>
      {open && (
        <div id="site-menu" className="border-t border-line bg-ground px-4 pt-2 pb-5 lg:hidden">
          <nav aria-label="Website" className="flex flex-col">
            {LINKS.map(([k, h]) => (
              <a key={k} href={href(h)} onClick={() => setOpen(false)}
                className="flex min-h-12 items-center border-b border-line-soft text-[16px] font-semibold text-ink no-underline">{t(`site.${k}`)}</a>
            ))}
          </nav>
          <div className="flex flex-col gap-3 pt-4">
            <LangToggle />
            <AccountButtons stacked />
          </div>
        </div>
      )}
    </header>
  )
}

export function InstallHint() {
  const { t } = useTranslation()
  const { canPrompt, installed, ios, prompt } = useInstall()
  const [show, setShow] = useState(false)
  if (installed) return null
  if (canPrompt) return <button type="button" className="link-btn text-[13px]" onClick={() => prompt()}>{t('site.getApp')}</button>
  return (
    <>
      <button type="button" className="link-btn text-[13px]" aria-expanded={show} onClick={() => setShow((s) => !s)}>{t('site.getApp')}</button>
      {show && <p className="m-0 basis-full text-[13px] text-muted">{ios ? t('site.installIos') : t('site.installOther')}</p>}
    </>
  )
}

export function SiteFooter() {
  const { t } = useTranslation()
  const { data } = useSite()
  const s = data?.studio
  const phone = s?.mobile ?? null
  return (
    <footer className="border-t border-line bg-nav">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col gap-3">
          <Wordmark />
          {s && <p className="m-0 text-[14px] leading-relaxed text-muted">{addressLines(s).join(', ')}</p>}
        </div>
        <div className="flex flex-col gap-2 text-[14px]">
          {phone && <a href={telLink(phone) ?? undefined} className="no-underline">{prettyPhone(phone)}</a>}
          {phone && <a href={whatsappLink(data?.website.whatsapp || phone) ?? undefined} target="_blank" rel="noreferrer" className="no-underline">WhatsApp</a>}
          {s?.email && <a href={`mailto:${s.email}`} className="no-underline">{s.email}</a>}
        </div>
        <div className="flex flex-wrap content-start gap-x-5 gap-y-2 text-[13px]">
          <Link to="/privacy" className="no-underline">{t('site.privacy')}</Link>
          <Link to="/login" className="no-underline">{t('site.staffLogin')}</Link>
          <InstallHint />
        </div>
      </div>
      <div className="border-t border-line-soft py-4 text-center text-[12px] text-faint">{t('site.rights', { year: new Date().getFullYear(), name: s?.name ?? 'Shaan Fitness' })}</div>
    </footer>
  )
}

export function SitePage({ children, home }: { children: ReactNode; home?: boolean }) {
  useSiteLook()
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <SiteHeader home={home} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
