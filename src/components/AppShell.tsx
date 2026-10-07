import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Role } from '../data/types'
import { useSession } from '../session'
import { Avatar, Icon } from './ui'

interface NavItem { to: string; label: string; icon: string }

// Each login sees its own menu. The database decides what data they get.
export function navFor(role: Role, t: (k: string) => string): NavItem[] {
  switch (role) {
    case 'owner':
      return [
        { to: '/dashboard', label: t('nav.dashboard'), icon: 'chart' },
        { to: '/today', label: t('nav.today'), icon: 'home' },
        { to: '/slots', label: t('nav.slots'), icon: 'calendar' },
        { to: '/members', label: t('nav.members'), icon: 'people' },
        { to: '/more', label: t('nav.more'), icon: 'more' },
      ]
    case 'front_desk':
      return [
        { to: '/today', label: t('nav.today'), icon: 'home' },
        { to: '/slots', label: t('nav.slots'), icon: 'calendar' },
        { to: '/follow-ups', label: t('nav.followUps'), icon: 'list' },
        { to: '/members', label: t('nav.members'), icon: 'people' },
        { to: '/more', label: t('nav.more'), icon: 'more' },
      ]
    case 'coach':
      return [
        { to: '/coach', label: t('nav.today'), icon: 'home' },
        { to: '/slots', label: t('nav.mySlots'), icon: 'calendar' },
        { to: '/members', label: t('nav.members'), icon: 'people' },
        { to: '/follow-ups', label: t('nav.followUps'), icon: 'list' },
        { to: '/more', label: t('nav.more'), icon: 'more' },
      ]
    case 'doctor':
      return [
        { to: '/doctor', label: t('nav.consults'), icon: 'list' },
        { to: '/members', label: t('nav.members'), icon: 'people' },
        { to: '/chat', label: t('nav.chat'), icon: 'chat' },
        { to: '/more', label: t('nav.more'), icon: 'more' },
      ]
    case 'member':
      return [
        { to: '/home', label: t('nav.home'), icon: 'home' },
        { to: '/book', label: t('nav.book'), icon: 'calendar' },
        { to: '/plan', label: t('nav.plan'), icon: 'dumbbell' },
        { to: '/chat', label: t('nav.chat'), icon: 'chat' },
        { to: '/more', label: t('nav.profile'), icon: 'person' },
      ]
  }
}

const roleLabel: Record<Role, string> = { owner: 'Owner', front_desk: 'Front desk', coach: 'Coach', doctor: 'Doctor', member: 'Member' }

export function AppShell() {
  const { user } = useSession()
  const { t } = useTranslation()
  if (!user) return null
  const items = navFor(user.role, t)
  return (
    <div className="min-h-dvh lg:flex">
      {/* Sidebar on laptops */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-line bg-[#0F0F12] px-4 py-7 lg:flex">
        <div className="brand px-3">Shaan Fitness</div>
        <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to}
              className={({ isActive }) => `flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[14px] font-semibold no-underline ${isActive ? 'bg-surface-2 text-gold' : 'text-muted hover:text-ink'}`}>
              <Icon name={it.icon} size={20} />{it.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line p-3">
          <Avatar name={user.name} size={40} gold />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold">{user.name}</div>
            <div className="text-[12px] text-muted">{roleLabel[user.role]}</div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-28 lg:pb-12">
        <div className="mx-auto max-w-[1180px]">
          <Outlet />
        </div>
      </main>

      {/* Bottom bar on phones */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-[#0F0F12]/95 px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to}
            className={({ isActive }) => `flex min-h-[54px] flex-col items-center justify-center gap-1 text-[11px] font-semibold no-underline ${isActive ? 'text-gold' : 'text-muted hover:text-ink'}`}>
            <Icon name={it.icon} />{it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
