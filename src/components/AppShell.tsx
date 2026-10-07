import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROLE_LABEL, useAuth, useMe } from '../auth'
import { navFor } from '../nav'
import type { Role } from '../db/types'
import { Avatar, BrandMark, Icon } from './ui'

interface BarItem { to: string; label: string; icon: string }

// Phone bottom bar: the four places each role goes most, plus the full menu.
function barFor(role: Role, t: (k: string) => string): BarItem[] {
  switch (role) {
    case 'owner':
    case 'front_desk':
      return [
        { to: '/dashboard', label: t('nav.dashboard'), icon: 'chart' },
        { to: '/enquiries', label: 'Enquiries', icon: 'userPlus' },
        { to: '/follow-ups', label: t('nav.followUps'), icon: 'list' },
        { to: '/members', label: t('nav.members'), icon: 'people' },
        { to: '/menu', label: 'Menu', icon: 'more' },
      ]
    case 'coach':
      return [
        { to: '/coach', label: t('nav.today'), icon: 'home' },
        { to: '/follow-ups', label: t('nav.followUps'), icon: 'list' },
        { to: '/members', label: t('nav.members'), icon: 'people' },
        { to: '/menu', label: 'Menu', icon: 'more' },
      ]
    case 'doctor':
      return [
        { to: '/doctor', label: t('nav.consults'), icon: 'list' },
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

export function StaffMenu({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMe()
  const { pathname } = useLocation()
  const groups = navFor(me.role)
  const activeGroup = groups.find((g) => g.pages.some((p) => p.path === pathname || pathname.startsWith(p.path + '/')))?.key
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeGroup ? [activeGroup] : []))
  useEffect(() => { if (activeGroup) setOpen((o) => new Set(o).add(activeGroup)) }, [activeGroup])
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {me.role === 'coach' && (
        <NavLink to="/coach" onClick={onNavigate} className={({ isActive }) => `flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-[14px] font-semibold no-underline ${isActive ? 'bg-surface-2 text-gold' : 'text-ink-soft hover:text-ink'}`}>
          <Icon name="home" size={18} />Today
        </NavLink>
      )}
      {groups.map((g) => {
        if (g.pages.length === 1) {
          const p = g.pages[0]
          return (
            <NavLink key={g.key} to={p.path} end onClick={onNavigate}
              className={({ isActive }) => `flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-[14px] font-semibold no-underline ${isActive ? 'bg-surface-2 text-gold' : 'text-ink-soft hover:text-ink'}`}>
              <Icon name={g.icon} size={18} />{p.label}
            </NavLink>
          )
        }
        const isOpen = open.has(g.key)
        return (
          <div key={g.key}>
            <button type="button" aria-expanded={isOpen}
              onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n })}
              className={`flex min-h-[42px] w-full items-center gap-3 rounded-xl border-0 bg-transparent px-3 text-left text-[14px] font-semibold ${activeGroup === g.key ? 'text-gold' : 'text-ink-soft hover:text-ink'}`}>
              <Icon name={g.icon} size={18} /><span className="flex-1">{g.label}</span>
              <Icon name="chevronRight" size={14} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
              <div className="mb-1 ml-[21px] flex flex-col border-l border-line pl-3">
                {g.pages.map((p) => (
                  <NavLink key={p.path} to={p.path} end onClick={onNavigate}
                    className={({ isActive }) => `flex min-h-[36px] items-center justify-between gap-2 rounded-lg px-2.5 text-[13px] no-underline ${isActive ? 'bg-surface-2 font-semibold text-gold' : 'text-muted hover:text-ink'}`}>
                    <span>{p.label}</span>
                    {!p.built && <span aria-label="in progress" title="Being built" className="h-1.5 w-1.5 flex-none rounded-full bg-line-strong" />}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function RoleSwitch() {
  const { user, switchRole } = useAuth()
  if (!user || user.roles.length < 2) return null
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
      Open as
      <select className="input input-sm" value={user.role} onChange={(e) => switchRole(e.target.value as Role)}>
        {user.roles.map((r) => <option key={r.role} value={r.role}>{ROLE_LABEL[r.role]}</option>)}
      </select>
    </label>
  )
}

export function AppShell() {
  const me = useMe()
  const { t } = useTranslation()
  const items = barFor(me.role, t)
  const staff = me.role !== 'member' && me.role !== 'doctor'
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[260px] flex-none flex-col border-r border-line bg-nav lg:flex">
        <div className="px-6 pt-7 pb-5"><BrandMark size={36} /></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {staff ? <StaffMenu /> : (
            <nav aria-label="Main" className="flex flex-col gap-1">
              {items.map((it) => (
                <NavLink key={it.to} to={it.to}
                  className={({ isActive }) => `flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[14px] font-semibold no-underline ${isActive ? 'bg-surface-2 text-gold' : 'text-muted hover:text-ink'}`}>
                  <Icon name={it.icon} size={20} />{it.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-line p-4">
          <RoleSwitch />
          <NavLink to="/more" className="flex items-center gap-3 rounded-2xl border border-line p-3 no-underline hover:border-gold">
            <Avatar name={me.name} size={38} gold />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold text-ink">{me.name}</div>
              <div className="text-[12px] text-muted">{ROLE_LABEL[me.role]} · settings</div>
            </div>
          </NavLink>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-28 lg:pb-12">
        <div className="mx-auto max-w-[1280px]">
          <Outlet />
        </div>
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-nav/95 px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
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
