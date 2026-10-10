import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStudio } from '../db/studio'
import { setCurrency } from '../lib/format'
import { useMe } from '../auth'
import { Avatar, BrandMark, Icon } from './ui'

// The member app (/app): phone-first with tabs along the bottom; on a computer the same
// tabs sit in a top bar and the pages stay in a comfortable reading width.
export function MemberShell() {
  const me = useMe()
  const { data: studio } = useStudio()
  setCurrency(studio?.currency)
  const { t } = useTranslation()
  const items = [
    { to: '/app', label: t('nav.home'), icon: 'home', end: true },
    { to: '/app/book', label: t('nav.book'), icon: 'calendar' },
    { to: '/app/plan', label: t('nav.plan'), icon: 'dumbbell' },
    { to: '/app/chat', label: t('nav.chat'), icon: 'chat' },
    { to: '/app/profile', label: t('nav.profile'), icon: 'person' },
  ]
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 hidden border-b border-line bg-nav/95 backdrop-blur lg:block">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-6 px-8">
          <BrandMark />
          <nav aria-label="App" className="flex items-center gap-1">
            {items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end}
                className={({ isActive }) => `flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-[14px] font-semibold no-underline ${isActive ? 'bg-surface-2 text-gold' : 'text-muted hover:text-ink'}`}>
                <Icon name={it.icon} size={18} />{it.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-[13px] font-semibold text-muted no-underline hover:text-ink">{t('app.website')}</Link>
            <Link to="/app/profile" aria-label={t('nav.profile')} className="no-underline"><Avatar name={me.name} size={36} gold /></Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] pb-28 lg:pb-14">
        <Outlet />
      </main>
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-nav/95 px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <span className="tab-icon"><Icon name={it.icon} /></span>{it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
