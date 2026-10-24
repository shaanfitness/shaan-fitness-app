import type { SiteBatch, SiteInfo, SitePlan } from '../db/site'
import { fill, type Copy, type Lang, type PageId } from './content'

// Facts the website works out from the CRM's public summary: the three tiers, open hours and "open now",
// money, and the questions each page answers (also sent to Google as FAQ data).

export type Tier = 'group' | 'semi' | 'elite'
export const tierOf = (p: Pick<SitePlan, 'name' | 'kind'>): Tier =>
  /1\s*:\s*1|elite|one[- ]to[- ]one|personal/i.test(p.name) ? 'elite' : /semi|side|duo|couple/i.test(p.name) ? 'semi' : p.kind === 'pt' ? 'elite' : 'group'
export const MEMBERS: Record<Tier, number> = { group: 8, semi: 2, elite: 1 }
export const batchTier = (b: Pick<SiteBatch, 'name'>): Tier => (/elite|1\s*:\s*1|personal/i.test(b.name) ? 'elite' : /semi|side/i.test(b.name) ? 'semi' : 'group')

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const rupees = (n: number) => inr.format(n)

/** Plans the site shows, cheapest first, not trials. */
export const salePlans = (site: SiteInfo) => site.plans.filter((p) => !p.is_free_trial).sort((a, b) => a.total_price - b.total_price)

/** "28 days" → "4 weeks", 30 → "1 month", 84 or 90 → "3 months", 365 → "1 year". */
export function term(p: Pick<SitePlan, 'tenure_value' | 'tenure_unit'>, c: Copy) {
  const t = c.common.term
  const n = p.tenure_value
  const say = (one: string, many: string, k: number) => (k === 1 ? one : fill(many, { n: k }))
  const u = p.tenure_unit.replace(/s$/, '')
  if (u === 'year') return say(t.year, t.years, n)
  if (u === 'month') return n % 12 === 0 ? say(t.year, t.years, n / 12) : say(t.month, t.months, n)
  if (u === 'week') return say(t.week, t.weeks, n)
  if (n >= 360 && n <= 366) return t.year
  if (n % 365 === 0) return say(t.year, t.years, n / 365)
  for (const m of [1, 3, 6, 12]) if (Math.abs(n - m * 30) <= (m === 1 ? 1 : 2) || (m === 3 && n === 84)) return m === 12 ? t.year : say(t.month, t.months, m)
  if (n % 7 === 0) return say(t.week, t.weeks, n / 7)
  return say(t.day, t.days, n)
}

/** Plans by tier, in the order group, semi, elite, each cheapest first. */
export function tierGroups(site: SiteInfo) {
  const out: { tier: Tier; plans: SitePlan[]; from: number }[] = []
  for (const t of ['group', 'semi', 'elite'] as Tier[]) {
    const plans = salePlans(site).filter((p) => tierOf(p) === t)
    if (plans.length) out.push({ tier: t, plans, from: plans[0].total_price })
  }
  return out
}

/** The plan cycle most plans share (e.g. 28 days, 24 sessions). */
export function cycle(site: SiteInfo) {
  const ps = salePlans(site)
  const first = ps[0]
  if (!first) return null
  const days = first.tenure_unit === 'days' ? first.tenure_value : first.tenure_unit === 'months' ? first.tenure_value * 30 : null
  const same = ps.every((p) => p.tenure_value === first.tenure_value && p.tenure_unit === first.tenure_unit && p.session_count === first.session_count)
  return same && days ? { days, sessions: first.session_count } : null
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
export const clock = (min: number) => {
  const h = Math.floor(min / 60) % 24, m = min % 60
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

/** Open spans by weekday (1 = Monday), in minutes. */
export function openSpans(site: SiteInfo): Record<number, [number, number][]> {
  const out: Record<number, [number, number][]> = {}
  const t = site.studio.timings
  for (let d = 1; d <= 7; d++) {
    if (t?.sessions?.length) out[d] = t.days.includes(d) ? t.sessions.filter((s) => s.from && s.to).map((s) => [toMin(s.from), toMin(s.to)] as [number, number]) : []
    else {
      const spans = site.batches.filter((b) => b.days.includes(d)).map((b) => [toMin(b.start_time), toMin(b.end_time)] as [number, number]).sort((a, b) => a[0] - b[0])
      const merged: [number, number][] = []
      for (const s of spans) { const l = merged[merged.length - 1]; if (l && s[0] <= l[1]) l[1] = Math.max(l[1], s[1]); else merged.push([...s]) }
      out[d] = merged
    }
  }
  return out
}

/** "Open now, until 1 PM", "Opens today at 2 PM", "Opens Monday at 5 AM". */
export function liveStatus(site: SiteInfo, now: { day: number; min: number }, c: Copy) {
  const spans = openSpans(site)
  const today = spans[now.day] ?? []
  const open = today.find(([a, b]) => now.min >= a && now.min < b)
  if (open) return { open: true, text: fill(c.live.openUntil, { time: clock(open[1]) }) }
  const later = today.find(([a]) => a > now.min)
  if (later) return { open: false, text: fill(c.live.opensAt, { time: clock(later[0]) }) }
  for (let i = 1; i <= 7; i++) {
    const d = ((now.day - 1 + i) % 7) + 1
    if (spans[d]?.length) return { open: false, text: fill(c.live.opensOn, { day: c.common.daysLong[d - 1], time: clock(spans[d][0][0]) }) }
  }
  return { open: false, text: c.live.closedNow }
}

/** "Monday to Saturday" and "5 AM to 1 PM and 2 PM to 10 PM", for sentences. */
export function hoursSentence(site: SiteInfo, c: Copy, lang: Lang) {
  const spans = openSpans(site)
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => spans[d].length)
  const run = days.length && days.every((d, i) => i === 0 || d === days[i - 1] + 1)
  const to = lang === 'te' ? ' నుండి ' : ' to '
  const and = lang === 'te' ? ', ' : ' and '
  const dayText = !days.length ? '' : run && days.length > 1 ? `${c.common.daysLong[days[0] - 1]}${to}${c.common.daysLong[days[days.length - 1] - 1]}` : days.map((d) => c.common.daysLong[d - 1]).join(', ')
  const first = spans[days[0]] ?? []
  const hours = first.map(([a, b]) => `${clock(a)}${to}${clock(b)}`).join(and)
  return { days: dayText, hours }
}

export const addressText = (site: SiteInfo) => {
  const s = site.studio
  return [s.street1, s.street2, s.landmark, s.locality ?? s.branch, s.city, [s.state, s.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

export const services = (site: SiteInfo) => {
  const seen = new Set<string>()
  return site.services.map((v) => v.name).filter((x) => { const k = x.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true })
}

/** The questions each page answers, from live data. */
export function faqFor(id: PageId, site: SiteInfo | null, c: Copy, lang: Lang): { q: string; a: string }[] {
  const f = c.faqs
  const out: { q: string; a: string }[] = []
  const plans = site ? salePlans(site) : []
  const showPrices = site?.website.show_prices !== false && plans.length > 0
  const priced = (t: Tier) => plans.find((p) => tierOf(p) === t)
  const groups = site ? tierGroups(site) : []
  const fees = () => out.push(showPrices
    ? { q: f.fees.q, a: fill(f.fees.a, { from: rupees(plans[0].total_price), list: groups.map((g) => g.plans.length === 1 ? `${g.plans[0].name} ${rupees(g.from)}` : `${c.tiers.names[g.tier]} ${fill(c.tiers.from, { price: rupees(g.from) })}`).join(', ') }) }
    : f.feesNoPrice)
  const timings = () => { if (site) { const h = hoursSentence(site, c, lang); if (h.days) out.push({ q: f.timings.q, a: fill(f.timings.a, h) }) } }
  const where = () => { if (site) out.push({ q: f.where.q, a: fill(f.where.a, { address: addressText(site) }) }) }
  const sessions = () => { const cy = site ? cycle(site) : null; if (cy?.sessions) out.push({ q: f.sessions.q, a: fill(f.sessions.a, { count: cy.sessions, term: term({ tenure_value: cy.days, tenure_unit: 'days' }, c) }) }) }
  const steam = () => {
    const fac = (site?.studio.facilities ?? []).filter((x) => /steam|sauna|locker|shower|changing/i.test(x))
    if (fac.some((x) => /steam|sauna/i.test(x))) out.push({ q: f.facilities.q, a: fill(f.facilities.a, { list: fac.map((x) => x.toLowerCase()).join(', ') }) })
  }
  const cost = () => {
    const e = priced('elite'), s = priced('semi')
    if (showPrices && e) out.push({ q: f.cost.q, a: fill(f.cost.a, { elite: rupees(e.total_price) }) + (s ? fill(f.cost.semi, { semi: rupees(s.total_price) }) : '') })
  }
  switch (id) {
    case 'home': fees(); timings(); out.push(f.trial, f.women, f.weight, f.beginner); where(); steam(); break
    case 'personal': cost(); out.push(f.women); sessions(); out.push(f.trial, f.beginner); break
    case 'group': out.push(f.batchSize, f.beginner, f.women); timings(); out.push(f.trial); break
    case 'weightLoss': out.push(f.weight, f.pace, f.supplements, f.trial); break
    case 'plans': fees(); sessions(); out.push(f.freeze, f.trial); break
    case 'timings': timings(); where(); out.push(f.trial); break
    case 'contact': where(); timings(); out.push(f.trial); break
    case 'about': out.push(f.beginner, f.women); steam(); break
    default: break
  }
  return out
}
