import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'

// YDL's date-range dropdowns, with the same choices and labels.
export interface Range { from: string | null; to: string | null }
export interface Preset { key: string; label: string; range: Range }

const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const long = (s: string) => format(parseISO(s), 'dd MMMM yyyy')
export const rangeLabel = (r: Range) =>
  !r.from && !r.to ? '' : r.from === r.to ? long(r.from!) : `${r.from ? long(r.from) : '…'} - ${r.to ? long(r.to) : '…'}`

/** The studio's today (India time), as YYYY-MM-DD. */
export function studioToday(tz = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

type Kind = 'list' | 'dashboard' | 'batch' | 'missed' | 'register' | 'expiry'

export function presets(kind: Kind, todayIso = studioToday()): Preset[] {
  const t = parseISO(todayIso)
  const r = (from: Date | null, to: Date | null): Range => ({ from: from ? iso(from) : null, to: to ? iso(to) : null })
  const lastMonth = subMonths(t, 1)
  switch (kind) {
    case 'list': return [
      { key: 'all', label: 'All Data', range: r(null, null) },
      { key: 'this_month', label: 'This Month', range: r(startOfMonth(t), t) },
      { key: 'last_month', label: 'Last Month', range: r(startOfMonth(lastMonth), endOfMonth(lastMonth)) },
      { key: 'last_30', label: 'Last 30 Days', range: r(addDays(t, -30), t) },
      { key: 'last_15', label: 'Last 15 Days', range: r(addDays(t, -15), t) },
      { key: 'last_7', label: 'Last 7 Days', range: r(addDays(t, -7), t) },
      { key: 'last_3m', label: 'Last 3 Months', range: r(addDays(t, -90), t) },
      { key: 'last_6m', label: 'Last 6 Months', range: r(addDays(t, -180), t) },
    ]
    case 'register': return [
      { key: 'all', label: 'All Data', range: r(null, null) },
      { key: 'today', label: 'Today', range: r(t, t) },
      { key: 'this_month', label: 'This Month', range: r(startOfMonth(t), endOfMonth(t)) },
      { key: 'last_month', label: 'Last Month', range: r(startOfMonth(lastMonth), endOfMonth(lastMonth)) },
      { key: 'last_3', label: 'Last 3 Days', range: r(addDays(t, -3), t) },
      { key: 'last_7', label: 'Last 7 Days', range: r(addDays(t, -7), t) },
      { key: 'last_15', label: 'Last 15 Days', range: r(addDays(t, -15), t) },
      { key: 'last_30', label: 'Last 30 Days', range: r(addDays(t, -30), t) },
    ]
    case 'dashboard': return [
      { key: 'today', label: 'Today', range: r(t, t) },
      { key: 'last_3', label: 'Last 3 Days', range: r(addDays(t, -3), t) },
      { key: 'next_3', label: 'Next 3 Days', range: r(t, addDays(t, 3)) },
      { key: 'next_7', label: 'Next 7 Days', range: r(t, addDays(t, 7)) },
      { key: 'next_15', label: 'Next 15 Days', range: r(t, addDays(t, 15)) },
    ]
    case 'batch': return [
      { key: 'today', label: 'Today', range: r(t, t) },
      { key: 'last_3', label: 'Last 3 Days', range: r(addDays(t, -3), t) },
      { key: 'last_7', label: 'Last 7 Days', range: r(addDays(t, -7), t) },
      { key: 'last_15', label: 'Last 15 Days', range: r(addDays(t, -15), t) },
      { key: 'last_month', label: 'Last Month', range: r(addDays(t, -30), t) },
    ]
    case 'missed': return [
      { key: 'yesterday', label: 'Yesterday', range: r(addDays(t, -1), addDays(t, -1)) },
      { key: 'last_30', label: 'Last 30 days', range: r(addDays(t, -30), addDays(t, -1)) },
      { key: 'last_60', label: 'Last 60 days', range: r(addDays(t, -60), addDays(t, -1)) },
    ]
    case 'expiry': return [
      { key: 'next_7', label: 'Next 7 Days', range: r(t, addDays(t, 7)) },
      { key: 'next_30', label: 'Next 30 Days', range: r(t, addDays(t, 30)) },
      { key: 'last_30', label: 'Last 30 Days', range: r(addDays(t, -30), t) },
    ]
  }
}

export const fmtDay = (s: string | null | undefined, pattern = 'dd-MMM-yyyy') => (s ? format(parseISO(s.slice(0, 10)), pattern) : '')
export const fmtDateTime = (s: string | null | undefined) =>
  s ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(s)) : ''
export const fmtClock = (hhmm: string | null | undefined) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
/** A local date and time from an <input type="datetime-local"> as an ISO instant in India time. */
export const localInputToIso = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : '')
/** Now plus n days at a given hour, formatted for <input type="datetime-local"> in India time. */
export function localInput(daysAhead = 1, hour = 10) {
  const d = addDays(parseISO(studioToday()), daysAhead)
  return `${iso(d)}T${String(hour).padStart(2, '0')}:00`
}

/** Last day of a plan that starts on `start` (1 month from 7 Sep ends 6 Oct, like YDL). */
export function planEndDate(start: string, value: number, unit: 'days' | 'months' | 'years') {
  if (!start || !value) return ''
  const s = parseISO(start)
  const end = unit === 'days' ? addDays(s, value) : unit === 'years' ? addMonths(s, value * 12) : addMonths(s, value)
  return iso(addDays(end, -1))
}
/** Whole days from a to b (b - a). */
export const daysFrom = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
export const plusDays = (d: string, n: number) => iso(addDays(parseISO(d), n))
