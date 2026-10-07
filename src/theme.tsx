import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Role } from './data/types'
import { useSession } from './session'

// Looks a person can pick. The owner sets a default for each group;
// anyone can override it for themselves.
export type ThemeId = 'noir' | 'club' | 'clinic'
export type ThemeGroup = 'staff' | 'member' | 'doctor'

export const THEMES: Record<ThemeId, { name: string; note: string; ground: string; surface: string; accent: string; ink: string; font: string }> = {
  noir: { name: 'Black and gold', note: 'Quiet and premium', ground: '#0B0B0D', surface: '#141417', accent: '#D6B878', ink: '#F3EFE6', font: '"Bodoni Moda", Georgia, serif' },
  club: { name: 'Red and black', note: 'Bold, from the logo', ground: '#0A0A0C', surface: '#151518', accent: '#E01020', ink: '#F5F5F7', font: '"Barlow Condensed", "Arial Narrow", sans-serif' },
  clinic: { name: 'White and blue', note: 'Light and easy to read', ground: '#F4F6F8', surface: '#FFFFFF', accent: '#0B63B5', ink: '#0E1A2B', font: '"Bricolage Grotesque", system-ui, sans-serif' },
}

export const GROUP_LABEL: Record<ThemeGroup, string> = { staff: 'Owner, front desk and coaches', member: 'Members', doctor: 'Doctors' }
export const groupOf = (role: Role): ThemeGroup => (role === 'member' ? 'member' : role === 'doctor' ? 'doctor' : 'staff')
export const DEFAULT_THEMES: Record<ThemeGroup, ThemeId> = { staff: 'noir', member: 'club', doctor: 'clinic' }

const read = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
const write = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)) } catch { /* keep for this visit only */ }
}

interface ThemeValue {
  theme: ThemeId
  personal: ThemeId | null
  defaults: Record<ThemeGroup, ThemeId>
  setPersonal: (t: ThemeId | null) => void
  setDefault: (g: ThemeGroup, t: ThemeId) => void
}
const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  // Studio defaults: kept in the studio's settings once the database is connected.
  const [defaults, setDefaults] = useState<Record<ThemeGroup, ThemeId>>(() => ({ ...DEFAULT_THEMES, ...read('sf.themeDefaults', {}) }))
  const personalKey = user ? `sf.theme.${user.role}.${user.staffId ?? user.memberId ?? ''}` : 'sf.theme.guest'
  const [personal, setPersonalState] = useState<ThemeId | null>(() => read(personalKey, null))
  useEffect(() => { setPersonalState(read(personalKey, null)) }, [personalKey])

  const theme: ThemeId = user ? (personal ?? defaults[groupOf(user.role)]) : read('sf.lastTheme', 'noir')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[theme].ground)
    if (user) write('sf.lastTheme', theme)
  }, [theme, user])

  const value: ThemeValue = {
    theme, personal, defaults,
    setPersonal: (t) => { setPersonalState(t); write(personalKey, t) },
    setDefault: (g, t) => { const next = { ...defaults, [g]: t }; setDefaults(next); write('sf.themeDefaults', next) },
  }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
