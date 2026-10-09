import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fmtClock } from '../lib/dates'

// The public website's data: one safe summary from the database (no personal details),
// readable without a login.
export interface SiteStudio {
  name: string; branch: string | null; slug: string; tag_line: string | null; description: string | null
  mobile: string | null; landline: string | null; email: string | null; street1: string | null; street2: string | null
  city: string | null; state: string | null; pincode: string | null; facilities: string[]; logo_url: string | null
  currency: string; theme: string; locality?: string | null; landmark?: string | null
  timings?: { days: number[]; sessions: { from: string; to: string; gender: 'unisex' | 'men' | 'women' }[] } | null
  can_sign_up?: boolean
}
export interface SiteSettings {
  hero_title: string | null; hero_text: string | null; about: string | null; hero_image_url: string | null
  opening_hours: string | null; whatsapp: string | null; instagram: string | null; facebook: string | null; youtube: string | null
  map_url: string | null; show_prices: boolean; show_timings: boolean; show_trainers: boolean; show_results: boolean
  twitter?: string | null; linkedin?: string | null; video?: string | null
}
export interface SitePlan {
  id: string; name: string; kind: 'gym' | 'pt'; tenure_value: number; tenure_unit: 'days' | 'months' | 'years'
  session_count: number | null; unlimited_sessions: boolean; is_free_trial: boolean; price: number; discount_price: number | null
  total_price: number; image_url: string | null; description: string | null; services: string[]
}
export interface SiteBatch { id: string; name: string; start_time: string; end_time: string; days: number[]; gender: 'all' | 'male' | 'female'; services: string[] }
export interface SiteTrainer { id: string; name: string; title: string | null; designation: string | null; years_experience: number | null; star: boolean; photo_url: string | null; services: string[] }
export interface SiteResult { id: string; client_name: string; image_url: string | null; period_value: number; period_unit: string; title: string; description: string; trainer: string | null }
export interface SiteInfo {
  studio: SiteStudio; website: SiteSettings; services: { id: string; name: string; banner_url: string | null }[]
  plans: SitePlan[]; batches: SiteBatch[]; trainers: SiteTrainer[]; results: SiteResult[]
}

export async function siteInfo(slug?: string) {
  const res = await supabase.rpc('site_info', { p_slug: slug ?? null })
  if (res.error) throw new Error(res.error.message)
  return res.data as SiteInfo | null
}

export const useSite = () => useQuery({ queryKey: ['site'], queryFn: () => siteInfo(), staleTime: 5 * 60_000 })

export async function saveWebsite(studioId: string, p: { website?: Partial<SiteSettings>; studio?: Partial<SiteStudio> }) {
  const res = await supabase.rpc('save_website', { p_studio: studioId, p })
  if (res.error) throw new Error(res.error.message)
}

export async function requestCallback(memberId: string, what: 'trial' | 'callback' | 'plan', note?: string) {
  const res = await supabase.rpc('request_callback', { p_member: memberId, p_what: what, p_note: note ?? null })
  if (res.error) throw new Error(res.error.message)
  return res.data as 'sent' | 'already'
}

// ---------------------------------------------------------------------------
// Helpers for showing it
// ---------------------------------------------------------------------------
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toClock = (min: number) => fmtClock(`${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`)

export interface HoursRow { days: number[]; spans: string[] }

/** Opening hours from the batch timetable: each day's batches merged into spans, alike days grouped. */
export function openingHours(batches: SiteBatch[]): HoursRow[] {
  const perDay = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const spans = batches.filter((b) => b.days.includes(d)).map((b) => [toMin(b.start_time), toMin(b.end_time)] as [number, number]).sort((a, b) => a[0] - b[0])
    const merged: [number, number][] = []
    for (const s of spans) {
      const last = merged[merged.length - 1]
      if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1])
      else merged.push([...s])
    }
    return merged.map(([a, b]) => `${toClock(a)} – ${toClock(b)}`)
  })
  const rows: HoursRow[] = []
  perDay.forEach((spans, i) => {
    const last = rows[rows.length - 1]
    if (last && last.spans.join() === spans.join() && last.days[last.days.length - 1] === i) last.days.push(i + 1)
    else rows.push({ days: [i + 1], spans })
  })
  return rows
}

/** Opening hours from Fitness Center › Timings (days and up to three sessions), alike days grouped. */
export function centerHours(t: NonNullable<SiteStudio['timings']>): HoursRow[] {
  const spans = t.sessions.filter((x) => x.from && x.to).map((x) => `${toClock(toMin(x.from))} – ${toClock(toMin(x.to))}${x.gender === 'men' ? ' (men)' : x.gender === 'women' ? ' (women)' : ''}`)
  const rows: HoursRow[] = []
  for (let d = 1; d <= 7; d++) {
    const today = t.days.includes(d) ? spans : []
    const last = rows[rows.length - 1]
    if (last && last.spans.join() === today.join() && last.days[last.days.length - 1] === d - 1) last.days.push(d)
    else rows.push({ days: [d], spans: today })
  }
  return rows
}
/** The hours the website shows: the center's timings, else worked out from the batches. */
export const siteHours = (site: SiteInfo) => (site.studio.timings?.sessions?.length ? centerHours(site.studio.timings) : openingHours(site.batches))

/** Batch start times by part of the day. */
export function startTimes(batches: SiteBatch[]) {
  const starts = [...new Set(batches.map((b) => b.start_time.slice(0, 5)))].sort()
  const part = (t: string) => (toMin(t) < 12 * 60 ? 'morning' : toMin(t) < 17 * 60 ? 'afternoon' : 'evening')
  return (['morning', 'afternoon', 'evening'] as const).map((p) => ({ part: p, times: starts.filter((t) => part(t) === p).map((t) => fmtClock(t)) }))
    .filter((g) => g.times.length)
}

export const digitsOnly = (p: string | null | undefined) => (p ?? '').replace(/\D/g, '')
/** A WhatsApp chat link for an Indian mobile number (10 digits get +91). */
export function whatsappLink(num: string | null | undefined, text?: string) {
  let d = digitsOnly(num)
  if (!d) return null
  if (d.length === 10) d = `91${d}`
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
export const telLink = (num: string | null | undefined) => (digitsOnly(num) ? `tel:${(num ?? '').startsWith('+') ? '+' : ''}${digitsOnly(num)}` : null)
export function prettyPhone(num: string | null | undefined) {
  const d = digitsOnly(num)
  const ten = d.length >= 10 ? d.slice(-10) : d
  return ten.length === 10 ? `+91 ${ten.slice(0, 5)} ${ten.slice(5)}` : num ?? ''
}
export function mapsLink(s: SiteStudio, w: SiteSettings) {
  if (w.map_url) return w.map_url
  const q = [s.name, s.street1, s.street2, s.locality ?? s.branch, s.city, s.state, s.pincode].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
export const addressLines = (s: SiteStudio) =>
  [[s.street1, s.street2].filter(Boolean).join(', '), [s.landmark, s.locality ?? s.branch, s.city].filter(Boolean).join(', '), [s.state, s.pincode].filter(Boolean).join(' ')]
    .filter(Boolean)
