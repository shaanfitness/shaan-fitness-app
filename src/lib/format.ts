import { addDays as addDaysFns, differenceInCalendarDays, format, getISODay, parseISO } from 'date-fns'

// Dates travel through the app as 'YYYY-MM-DD' strings in the studio's local time.
export const toISO = (d: Date) => format(d, 'yyyy-MM-dd')
export const todayISO = () => toISO(new Date())
export const addDays = (iso: string, n: number) => toISO(addDaysFns(parseISO(iso), n))
export const daysBetween = (from: string, to: string) => differenceInCalendarDays(parseISO(to), parseISO(from))
export const isoWeekday = (iso: string) => getISODay(parseISO(iso)) // 1 = Monday
export const fmtDate = (iso: string, pattern = 'EEE d MMM') => format(parseISO(iso), pattern)

export function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return { time: `${h12}:${String(m).padStart(2, '0')}`, suffix, full: `${h12}:${String(m).padStart(2, '0')} ${suffix}` }
}

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const money = (n: number) => inr.format(Math.round(n))

export const initials = (name: string) =>
  name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')

export const tierLabel: Record<string, string> = {
  group: 'Group',
  semi_private: 'Semi-Private',
  elite: '1:1 Elite',
  custom: 'Custom',
}

export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
export const waLink = (phone: string, text?: string) => {
  const digits = phone.replace(/\D/g, '')
  const full = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
