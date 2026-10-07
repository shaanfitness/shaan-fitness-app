import { useEffect, useRef, type ReactNode } from 'react'
import { initials as toInitials } from '../lib/format'
import type { RiskLevel } from '../data/api'

// Stroke icons used across the app (24px grid, currentColor).
const paths: Record<string, ReactNode> = {
  home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.7 2.5 3 5.2" /></>,
  person: <><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20c1-3.8 4-5.8 7.5-5.8s6.5 2 7.5 5.8" /></>,
  more: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  userPlus: <><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.4 0 2.7.4 3.8 1.1" /><path d="M19 14v6M16 17h6" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2z" /></>,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  dumbbell: <path d="M6 4v16M18 4v16M3 9v6M21 9v6M6 12h12" />,
  plate: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /></>,
  sparkle: <><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
  doc: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  logout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
}

export function Icon({ name, size = 22, stroke = 1.6, className, color }: { name: keyof typeof paths | string; size?: number; stroke?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

const avatarTints = [
  ['#2A2620', '#E8CF97'], ['#20262A', '#B9D3E0'], ['#262024', '#E4C2D2'], ['#20261F', '#B8D8B0'], ['#26221C', '#E9C08B'],
]
export function Avatar({ name, size = 44, gold = false }: { name: string; size?: number; gold?: boolean }) {
  const i = [...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % avatarTints.length
  const [bg, fg] = avatarTints[i]
  return (
    <span aria-hidden="true" className="inline-flex flex-none items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size * 0.3, background: gold ? 'transparent' : bg, color: gold ? 'var(--color-gold)' : fg, border: gold ? '1px solid var(--color-gold)' : '2px solid var(--color-surface)' }}>
      {toInitials(name)}
    </span>
  )
}

export function RiskChip({ level }: { level: RiskLevel }) {
  if (level === 'green') return <span className="chip chip-green">On track</span>
  return <span className={`chip ${level === 'red' ? 'chip-red' : 'chip-amber'}`}>{level === 'red' ? 'At risk' : 'Watch'}</span>
}

export function Bar({ value, color }: { value: number; color?: string }) {
  return <div className="bar" role="presentation"><span style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: color }} /></div>
}

export function ScreenHeader({ title, right, sub, brand = 'Shaan Fitness' }: { title: ReactNode; right?: ReactNode; sub?: ReactNode; brand?: string }) {
  return (
    <header className="flex flex-col gap-3 px-5 pt-6 pb-2 lg:px-8 lg:pt-8">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div className="brand">{brand}</div>
        {right}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 lg:justify-start lg:gap-4">
          <h1 className="title text-[40px] leading-none">{title}</h1>
          {sub && <div className="text-[13px] text-muted">{sub}</div>}
        </div>
        <div className="hidden lg:block">{right}</div>
      </div>
    </header>
  )
}

export function Section({ title, action, children, id, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; id?: string; className?: string }) {
  return (
    <section aria-labelledby={title ? id : undefined} className={`flex flex-col gap-3 px-5 pt-5 lg:px-8 ${className}`}>
      {title && (
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={id} className="eyebrow">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card px-5 py-8 text-center text-[14px] text-muted">{children}</div>
}

export function Loading() {
  return <div className="px-5 py-10 text-center text-[14px] text-muted lg:px-8" role="status">Loading…</div>
}

// A bottom sheet on phones, a centred dialog on wider screens.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} aria-label={title}
      className="m-0 mt-auto w-full max-w-none rounded-t-[22px] border border-line bg-surface p-0 text-ink backdrop:bg-black/70 sm:m-auto sm:max-w-[440px] sm:rounded-[22px]">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="title text-[26px]">{title}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button>
      </div>
      <div className="px-5 pt-4 pb-6">{open && children}</div>
    </dialog>
  )
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8">
      {message && <div className="rounded-full border border-gold/40 bg-surface-3 px-5 py-3 text-[14px] font-semibold text-ink shadow-lg">{message}</div>}
    </div>
  )
}
