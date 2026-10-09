import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROLE_LABEL, useAuth, useMe } from '../auth'
import { containsPath, navFor, nodeKey, type NavNode } from '../nav'
import { useAccess } from '../access'
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

const linkCls = (depth: number) => ({ isActive }: { isActive: boolean }) => depth === 0
  ? `flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-[14px] font-semibold no-underline ${isActive ? 'bg-surface-2 text-gold' : 'text-ink-soft hover:text-ink'}`
  : `flex min-h-[34px] items-center justify-between gap-2 rounded-lg px-2.5 text-[13px] no-underline ${isActive ? 'bg-surface-2 font-semibold text-gold' : 'text-muted hover:text-ink'}`

function MenuNodes({ nodes, depth, trail, open, toggle, pathname, onNavigate }: {
  nodes: NavNode[]; depth: number; trail: string[]; open: Set<string>; toggle: (k: string) => void; pathname: string; onNavigate?: () => void
}) {
  return (
    <>
      {nodes.map((n) => {
        const key = nodeKey(n, trail)
        if (n.page) {
          return (
            <NavLink key={key} to={n.page.path} end onClick={onNavigate} className={linkCls(depth)}>
              {depth === 0 && <Icon name={n.icon ?? 'list'} size={18} />}
              <span className={depth === 0 ? '' : 'min-w-0 flex-1'}>{n.label}</span>
              {depth > 0 && !n.page.built && <span aria-label="being built" title="Being built" className="h-1.5 w-1.5 flex-none rounded-full bg-line-strong" />}
            </NavLink>
          )
        }
        const isOpen = open.has(key)
        const here = containsPath(n, pathname)
        return (
          <div key={key}>
            <button type="button" aria-expanded={isOpen} onClick={() => toggle(key)}
              className={depth === 0
                ? `flex min-h-[42px] w-full items-center gap-3 rounded-xl border-0 bg-transparent px-3 text-left text-[14px] font-semibold ${here ? 'text-gold' : 'text-ink-soft hover:text-ink'}`
                : `flex min-h-[34px] w-full items-center gap-2 rounded-lg border-0 bg-transparent px-2.5 text-left text-[13px] font-semibold ${here ? 'text-gold' : 'text-ink-soft hover:text-ink'}`}>
              {depth === 0 && <Icon name={n.icon ?? 'list'} size={18} />}
              <span className="flex-1">{n.label}</span>
              <Icon name="chevronRight" size={depth === 0 ? 14 : 12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
              <div className={`mb-1 flex flex-col border-l border-line ${depth === 0 ? 'ml-[21px] pl-3' : 'ml-3 pl-2'}`}>
                <MenuNodes nodes={n.children ?? []} depth={depth + 1} trail={[...trail, n.label]} open={open} toggle={toggle} pathname={pathname} onNavigate={onNavigate} />
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// Every branch that leads to the page on screen, so the menu opens where you are.
function openTrail(nodes: NavNode[], path: string, trail: string[] = []): string[] {
  for (const n of nodes) {
    if (n.children && containsPath(n, path)) return [nodeKey(n, trail), ...openTrail(n.children, path, [...trail, n.label])]
  }
  return []
}

export function StaffMenu({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMe()
  const { pathname } = useLocation()
  const access = useAccess()
  const nodes = useMemo(() => navFor(me.role, access.page), [me.role, access.page])
  const [open, setOpen] = useState<Set<string>>(() => new Set(openTrail(nodes, pathname)))
  useEffect(() => { setOpen((o) => new Set([...o, ...openTrail(nodes, pathname)])) }, [nodes, pathname])
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n })
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {me.role === 'coach' && (
        <NavLink to="/coach" onClick={onNavigate} className={linkCls(0)}>
          <Icon name="home" size={18} />Today
        </NavLink>
      )}
      <MenuNodes nodes={nodes} depth={0} trail={[]} open={open} toggle={toggle} pathname={pathname} onNavigate={onNavigate} />
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
