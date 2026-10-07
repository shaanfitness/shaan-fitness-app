import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { useAuth } from './auth'
import type { Role } from './db/types'

// Looks a person can pick. The owner sets a default for each group (saved in the
// studio's settings); anyone can choose their own (saved on their profile).
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
const isTheme = (v: unknown): v is ThemeId => v === 'noir' || v === 'club' || v === 'clinic'

const readLast = (): ThemeId => { try { const v = localStorage.getItem('sf.lastTheme'); return isTheme(v) ? v : 'noir' } catch { return 'noir' } }

interface ThemeValue {
  theme: ThemeId
  personal: ThemeId | null
  defaults: Record<ThemeGroup, ThemeId>
  setPersonal: (t: ThemeId | null) => Promise<void>
  setDefault: (g: ThemeGroup, t: ThemeId) => Promise<void>
}
const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [last] = useState(readLast)
  const studio = useQuery({
    queryKey: ['studio-themes', user?.studioId], enabled: !!user, staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await supabase.from('studios').select('settings').eq('id', user!.studioId).maybeSingle()
      if (res.error) throw new Error(res.error.message)
      return (res.data?.settings ?? null) as Record<string, unknown> | null
    },
  })
  const profile = useQuery({
    queryKey: ['profile-theme', user?.userId], enabled: !!user, staleTime: 5 * 60_000,
    queryFn: async () => (await supabase.from('profiles').select('theme').eq('id', user!.userId).maybeSingle()).data?.theme ?? null,
  })
  const saved = (studio.data?.themes ?? {}) as Partial<Record<ThemeGroup, string>>
  const defaults: Record<ThemeGroup, ThemeId> = {
    staff: isTheme(saved.staff) ? saved.staff : DEFAULT_THEMES.staff,
    member: isTheme(saved.member) ? saved.member : DEFAULT_THEMES.member,
    doctor: isTheme(saved.doctor) ? saved.doctor : DEFAULT_THEMES.doctor,
  }
  const personal = isTheme(profile.data) ? profile.data : null
  const theme: ThemeId = user ? (personal ?? defaults[groupOf(user.role)]) : last

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[theme].ground)
    if (user) { try { localStorage.setItem('sf.lastTheme', theme) } catch { /* this visit only */ } }
  }, [theme, user])

  const value: ThemeValue = {
    theme, personal, defaults,
    setPersonal: async (t) => {
      if (!user) return
      const res = await supabase.from('profiles').update({ theme: t }).eq('id', user.userId)
      if (res.error) throw new Error(res.error.message)
      qc.setQueryData(['profile-theme', user.userId], t)
    },
    setDefault: async (g, t) => {
      if (!user || !studio.data) return
      const settings = { ...studio.data, themes: { ...defaults, [g]: t } }
      const res = await supabase.from('studios').update({ settings }).eq('id', user.studioId)
      if (res.error) throw new Error(res.error.message)
      qc.setQueryData(['studio-themes', user.studioId], settings)
      qc.invalidateQueries({ queryKey: ['studio'] })
    },
  }
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
