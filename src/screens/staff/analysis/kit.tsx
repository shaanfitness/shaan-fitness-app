import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addDays, endOfMonth, endOfYear, format, parseISO, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import { studioLine } from '../../../components/crud'
import { Notice, Select, TextInput, type Option } from '../../../components/controls'
import { Icon, PageHeader } from '../../../components/ui'
import { studioToday } from '../../../lib/dates'
import { money } from '../../../lib/format'
import { downloadCsv } from '../../../lib/csv'

// The building blocks of YDL's analysis pages: one filter row above everything it scopes,
// headline numbers as tiles, and quiet charts (thin marks, hairline grid, a tooltip on hover
// and focus, and every chart readable as a table). Series colours are theme tokens checked
// for colour-blind separation on each look's surface.

// ---------------------------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------------------------
/** Numbers arrive from the database as JSON numbers or numeric strings. */
export const num = (v: unknown) => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0)
const intFmt = new Intl.NumberFormat('en-IN')
export const count = (v: unknown) => intFmt.format(num(v))
export const dec = (v: unknown, digits = 2) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(num(v))
export const amount = (v: unknown) => money(num(v))
/** Axis ticks the Indian way: 500, 50K, 1.5L, 2Cr. */
export const compact = (n: number) => {
  const short = (v: number, unit: string) => `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(v)}${unit}`
  const a = Math.abs(n)
  return a >= 1e7 ? short(n / 1e7, 'Cr') : a >= 1e5 ? short(n / 1e5, 'L') : a >= 1e3 ? short(n / 1e3, 'K') : short(n, '')
}
export const pct = (part: unknown, whole: unknown) => (num(whole) > 0 ? `${dec((num(part) * 100) / num(whole), 1)}%` : '—')

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))
export const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55-64']
export const longDate = (d: string) => format(parseISO(d), 'MMMM dd, yyyy')
export const rangeTitle = (r: { from: string; to: string }) => `${longDate(r.from)} - ${longDate(r.to)}`

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------
/** One report's numbers. Refetching keeps the last numbers on screen (dimmed) instead of flashing. */
export function useReport<T>(name: string, args: unknown[], fn: () => Promise<T>, enabled = true) {
  const { studioId } = useMe()
  return useQuery({ queryKey: ['analysis', name, studioId, ...args], queryFn: fn, enabled, placeholderData: (p) => p, staleTime: 30_000 })
}

/** Loading, error and refetch states around a report's content. */
export function ReportBody<T>({ q, children }: { q: { data?: T; error: Error | null; isFetching: boolean; isLoading: boolean }; children: (data: T) => ReactNode }) {
  if (q.error && !q.data) return <div className="px-5 pt-5 lg:px-8"><Notice tone="error">{q.error.message}</Notice></div>
  if (!q.data) return <div className="px-5 py-10 text-center text-[14px] text-muted lg:px-8" role="status">Loading…</div>
  return <div className={`flex flex-col gap-6 transition-opacity ${q.isFetching ? 'opacity-60' : ''}`} aria-busy={q.isFetching}>{children(q.data)}</div>
}

// ---------------------------------------------------------------------------------------------
// Page frame and filters
// ---------------------------------------------------------------------------------------------
export function AnalysisPage({ title, actions, filters, children }: { title: string; actions?: ReactNode; filters?: ReactNode; children: ReactNode }) {
  const { data: studio } = useStudio()
  useEffect(() => { document.title = `${title} · Shaan Fitness` }, [title])
  return (
    <>
      <PageHeader title={title} sub={studioLine(studio)} actions={actions} />
      {filters && <div className="flex flex-wrap items-end gap-2 px-5 pt-4 lg:px-8">{filters}</div>}
      <div className="flex flex-col gap-6 pt-5 pb-12">{children}</div>
    </>
  )
}

export interface RangeValue { key: string; from: string; to: string }
type RangeKey = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'last_3' | 'last_7' | 'last_15' | 'last_30' | 'last_90' | 'this_year' | 'custom'
const RANGE_LABEL: Record<RangeKey, string> = {
  today: 'Today', yesterday: 'Yesterday', this_month: 'This Month', last_month: 'Last Month', last_3: 'Last 3 Days', last_7: 'Last 7 Days',
  last_15: 'Last 15 Days', last_30: 'Last 30 Days', last_90: 'Last 3 Months', this_year: 'This Year', custom: 'Custom',
}
const iso = (d: Date) => format(d, 'yyyy-MM-dd')

export function rangeFor(key: string, today = studioToday()): RangeValue {
  const t = parseISO(today)
  const r = (from: Date, to: Date) => ({ key, from: iso(from), to: iso(to) })
  switch (key as RangeKey) {
    case 'today': return r(t, t)
    case 'yesterday': return r(addDays(t, -1), addDays(t, -1))
    case 'this_month': return r(startOfMonth(t), endOfMonth(t))
    case 'last_month': return r(startOfMonth(subMonths(t, 1)), endOfMonth(subMonths(t, 1)))
    case 'last_3': return r(addDays(t, -3), t)
    case 'last_7': return r(addDays(t, -7), t)
    case 'last_15': return r(addDays(t, -15), t)
    case 'last_90': return r(subMonths(t, 3), t)
    case 'this_year': return r(startOfYear(t), endOfYear(t))
    default: return r(addDays(t, -30), t)
  }
}

/** YDL's date-range dropdown: presets as rows, then Custom with two dates. */
export function RangeControl({ value, onChange, keys = ['today', 'this_month', 'last_month', 'last_7', 'last_15', 'last_30', 'last_90', 'this_year'], label = 'Dates' }: {
  value: RangeValue; onChange: (v: RangeValue) => void; keys?: RangeKey[]; label?: string
}) {
  const id = useId()
  const options: Option[] = [...keys.map((k) => {
    const r = rangeFor(k)
    return { value: k, label: `${RANGE_LABEL[k]} (${format(parseISO(r.from), 'dd MMM')} - ${format(parseISO(r.to), 'dd MMM yyyy')})` }
  }), { value: 'custom', label: 'Custom' }]
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-[12px] font-semibold text-muted">{label}</label>
        <Select id={id} small value={value.key} options={options} className="w-auto min-w-[230px]"
          onChange={(k) => onChange(k === 'custom' ? { ...value, key: 'custom' } : rangeFor(k))} />
      </div>
      {value.key === 'custom' && (
        <div className="flex items-center gap-2">
          <TextInput small type="date" value={value.from} className="w-auto" onChange={(v) => v && onChange({ ...value, from: v, to: v > value.to ? v : value.to })} />
          <span className="text-[13px] text-muted">to</span>
          <TextInput small type="date" value={value.to} className="w-auto" onChange={(v) => v && onChange({ ...value, to: v, from: v < value.from ? v : value.from })} />
        </div>
      )}
    </div>
  )
}

export function Labeled({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[12px] font-semibold text-muted">{label}</label>
      {children(id)}
    </div>
  )
}

export function YearControl({ value, onChange, label = 'Year' }: { value: number; onChange: (y: number) => void; label?: string }) {
  const now = Number(studioToday().slice(0, 4))
  const years = Array.from({ length: now + 2 - 2021 }, (_, i) => 2021 + i)
  return (
    <Labeled label={label}>{(id) => (
      <Select id={id} small value={String(value)} className="w-auto min-w-[110px]" onChange={(v) => onChange(Number(v))}
        options={years.map((y) => ({ value: String(y), label: String(y) }))} />
    )}</Labeled>
  )
}

export function MonthControl({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  return (
    <Labeled label="Month">{(id) => (
      <Select id={id} small value={String(value)} className="w-auto min-w-[140px]" onChange={(v) => onChange(Number(v))}
        options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
    )}</Labeled>
  )
}

export function PickControl({ label, value, onChange, options, placeholder = 'All' }: {
  label: string; value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string
}) {
  return (
    <Labeled label={label}>{(id) => (
      <Select id={id} small value={value} onChange={onChange} options={options} placeholder={placeholder} className="w-auto min-w-[170px] max-w-[260px]" />
    )}</Labeled>
  )
}

export const thisYear = () => Number(studioToday().slice(0, 4))
export const thisMonth = () => Number(studioToday().slice(5, 7))

// ---------------------------------------------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------------------------------------------
export function Block({ title, sub, action, children, id }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  const auto = useId()
  const hid = id ?? auto
  return (
    <section aria-labelledby={hid} className="flex flex-col gap-3 px-5 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id={hid} className="m-0 text-[17px] font-bold">{title}</h2>
          {sub && <p className="m-0 mt-0.5 text-[13px] text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Card({ title, sub, children, className = '', action }: { title?: ReactNode; sub?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={`card flex min-w-0 flex-col gap-3 p-4 lg:p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h3 className="m-0 text-[14px] font-bold">{title}</h3>}
            {sub && <p className="m-0 mt-0.5 text-[12px] text-muted">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid grid-cols-1 gap-4 ${cols === 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-2'}`}>{children}</div>
}

export interface TileItem { label: string; value: ReactNode; hint?: ReactNode }
/** cols={3}: a fixed row of three, for tiles inside a half-width card. */
export function Tiles({ items, cols }: { items: TileItem[]; cols?: 3 }) {
  return (
    <div className={`grid gap-3 ${cols === 3 ? 'grid-cols-3 [&_.kpi]:p-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'}`}>
      {items.map((t) => (
        <div key={t.label} className="kpi">
          <span className="kpi-label">{t.label}</span>
          <span className="text-[24px] leading-tight font-bold">{t.value}</span>
          {t.hint && <span className="text-[12px] text-muted">{t.hint}</span>}
        </div>
      ))}
    </div>
  )
}

/** "62 male · 17 female" under a number. */
export const genderLine = (g: { male?: unknown; female?: unknown; other?: unknown } | undefined) =>
  g ? [`${count(g.male)} male`, `${count(g.female)} female`, num(g.other) ? `${count(g.other)} other` : ''].filter(Boolean).join(' · ') : ''

// ---------------------------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------------------------
export interface Col<T> { key: string; header: ReactNode; cell: (r: T) => ReactNode; num?: boolean; csv?: (r: T) => unknown; nowrap?: boolean }
/** wrapHeaders: let long headings wrap so wide tables (many columns) fit the screen. */
export function Table<T>({ cols, rows, total, rowKey, caption, empty = 'Nothing in these dates.', maxHeight, wrapHeaders }: {
  cols: Col<T>[]; rows: T[]; total?: T | null; rowKey: (r: T, i: number) => string; caption: string; empty?: string; maxHeight?: number; wrapHeaders?: boolean
}) {
  if (!rows.length) return <div className="card px-5 py-8 text-center text-[14px] text-muted">{empty}</div>
  const cls = (c: Col<T>) => [c.num ? 'num' : '', c.num || c.nowrap ? 'nowrap' : ''].join(' ')
  return (
    <div className="card overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
      <table className={`tbl ${wrapHeaders ? '[&_th]:align-bottom [&_th]:whitespace-normal' : ''}`}>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{cols.map((c) => <th key={c.key} className={c.num ? 'num' : ''}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={rowKey(r, i)}>{cols.map((c) => <td key={c.key} className={cls(c)}>{c.cell(r)}</td>)}</tr>)}
          {total && <tr className="font-bold">{cols.map((c) => <td key={c.key} className={`${cls(c)} border-t border-line`}>{c.cell(total)}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  )
}

/** "Export to CSV", for the tables YDL lets you export. */
export function CsvButton<T>({ filename, rows, cols }: { filename: string; rows: T[]; cols: Col<T>[] }) {
  return (
    <button type="button" className="btn btn-sm" disabled={!rows.length}
      onClick={() => downloadCsv(filename, rows, cols.map((c) => [typeof c.header === 'string' ? c.header : c.key, (r: T) => (c.csv ? c.csv(r) : c.cell(r))] as [string, (r: T) => unknown]))}>
      <Icon name="download" size={16} />Export to CSV
    </button>
  )
}

/** Label | total (with a bar) | male | female | other — YDL's "by age group / by level" tables. */
export interface SplitRow { label: string; total: unknown; male?: unknown; female?: unknown; other?: unknown }
export function SplitTable({ rows, first, caption, other = true }: { rows: SplitRow[]; first: string; caption: string; other?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => num(r.total)))
  return (
    <div className="card overflow-x-auto">
      <table className="tbl">
        <caption className="sr-only">{caption}</caption>
        <thead><tr><th>{first}</th><th className="num">Total</th><th className="num">Male</th><th className="num">Female</th>{other && <th className="num">Other</th>}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="nowrap">{r.label}</td>
              <td className="num">
                <div className="flex items-center justify-end gap-2.5">
                  <span className="hidden h-2.5 w-24 sm:block" aria-hidden="true">
                    <span className="block h-full rounded-r-[4px]" style={{ width: `${(num(r.total) / max) * 100}%`, background: 'var(--color-series-1)' }} />
                  </span>
                  <span className="min-w-[3ch] font-bold">{count(r.total)}</span>
                </div>
              </td>
              <td className="num">{count(r.male)}</td><td className="num">{count(r.female)}</td>{other && <td className="num">{count(r.other)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------------------------
export interface Series { name: string; values: number[]; color?: string }
const SERIES_COLORS = ['var(--color-series-1)', 'var(--color-series-2)']
const colorOf = (s: Series, i: number) => s.color ?? SERIES_COLORS[i] ?? SERIES_COLORS[0]

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { top: ticks, step: 1 }
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  return { top: step * Math.ceil(max / step), step }
}

/** A column's rounded data end (4px), square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[12px] text-muted">
      {series.map((s, i) => (
        <li key={s.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colorOf(s, i) }} />{s.name}</li>
      ))}
    </ul>
  )
}

function Tooltip({ x, title, series, index, format, width }: { x: number; title: string; series: Series[]; index: number; format: (n: number) => string; width: number }) {
  const left = Math.min(Math.max(x, 70), Math.max(70, width - 70))
  return (
    <div role="status" className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-line-strong bg-surface-3 px-3 py-2 text-[12px] shadow-lg" style={{ left }}>
      <div className="mb-1 font-semibold whitespace-nowrap text-muted">{title}</div>
      {series.map((s, i) => (
        <div key={s.name} className="flex items-center gap-2 whitespace-nowrap">
          <span className="h-0.5 w-3 rounded" style={{ background: colorOf(s, i) }} />
          <span className="font-bold text-ink">{format(s.values[index] ?? 0)}</span>
          {series.length > 1 && <span className="text-muted">{s.name}</span>}
        </div>
      ))}
    </div>
  )
}

/** The same numbers as a table, one click away, so nothing is only in the picture. */
function ChartTable({ labels, series, format, caption }: { labels: string[]; series: Series[]; format: (n: number) => string; caption: string }) {
  return (
    <details className="text-[13px]">
      <summary className="cursor-pointer text-muted select-none hover:text-ink">Show as table</summary>
      <div className="mt-2 max-h-80 overflow-auto rounded-xl border border-line">
        <table className="tbl">
          <caption className="sr-only">{caption}</caption>
          <thead><tr><th />{series.map((s) => <th key={s.name} className="num">{s.name}</th>)}</tr></thead>
          <tbody>{labels.map((l, i) => <tr key={l + i}><td className="nowrap">{l}</td>{series.map((s) => <td key={s.name} className="num">{format(s.values[i] ?? 0)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  )
}

interface ChartProps {
  labels: string[]
  /** Longer label for the tooltip and table (e.g. the full date). */
  titles?: string[]
  series: Series[]
  format?: (n: number) => string
  height?: number
  caption: string
}

function useActive(n: number) {
  const [active, setActive] = useState<number | null>(null)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setActive((a) => Math.min(n - 1, (a ?? -1) + 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setActive((a) => Math.max(0, (a ?? n) - 1)) }
    if (e.key === 'Escape') setActive(null)
  }
  return { active, setActive, keys: { tabIndex: 0, onKeyDown, onFocus: () => setActive((a) => a ?? n - 1), onBlur: () => setActive(null) } }
}

const AXIS_W = 44
const AXIS_H = 26
const TOP = 12

/** Columns: one series, or two side by side with a 2px gap. */
export function ColumnChart({ labels, titles, series, format = (n) => count(n), height = 220, caption }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const n = labels.length
  const { active, setActive, keys } = useActive(n)
  const max = Math.max(0, ...series.flatMap((s) => s.values))
  const { top, step } = niceScale(max)
  const plotW = Math.max(0, width - AXIS_W)
  const plotH = height - AXIS_H - TOP
  const band = n ? plotW / n : 0
  const barW = Math.max(2, Math.min(24, (band * 0.7 - (series.length - 1) * 2) / series.length))
  const groupW = barW * series.length + (series.length - 1) * 2
  const y = (v: number) => TOP + plotH - (v / top) * plotH
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 44))))
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  return (
    <div className="flex flex-col gap-2">
      <Legend series={series} />
      <div ref={ref} className="relative w-full" onMouseLeave={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${caption}. Use the arrow keys to read each value.`} {...keys} className="block outline-none focus-visible:outline-2 focus-visible:outline-gold">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={AXIS_W} x2={width} y1={y(t)} y2={y(t)} stroke="var(--color-line-soft)" strokeWidth={1} />
                <text x={AXIS_W - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-faint)" style={{ fontVariantNumeric: 'tabular-nums' }}>{compact(t)}</text>
              </g>
            ))}
            {labels.map((l, i) => {
              const gx = AXIS_W + i * band + (band - groupW) / 2
              return (
                <g key={l + i}>
                  {active === i && <rect x={AXIS_W + i * band} y={TOP} width={band} height={plotH} fill="var(--color-surface-2)" />}
                  {series.map((s, si) => {
                    const v = s.values[i] ?? 0
                    return <path key={s.name} d={columnPath(gx + si * (barW + 2), y(v), barW, y(0) - y(v))} fill={colorOf(s, si)} opacity={active === null || active === i ? 1 : 0.55} />
                  })}
                  {i % every === 0 && <text x={AXIS_W + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--color-muted)">{l}</text>}
                  <rect x={AXIS_W + i * band} y={0} width={band} height={height} fill="transparent" onMouseEnter={() => setActive(i)} onMouseMove={() => setActive(i)} />
                </g>
              )
            })}
            <line x1={AXIS_W} x2={width} y1={y(0)} y2={y(0)} stroke="var(--color-line-strong)" strokeWidth={1} />
          </svg>
        )}
        {active !== null && <Tooltip x={AXIS_W + active * band + band / 2} title={titles?.[active] ?? labels[active]} series={series} index={active} format={format} width={width} />}
      </div>
      <ChartTable labels={titles ?? labels} series={series} format={format} caption={caption} />
    </div>
  )
}

/** A line over time with a crosshair that snaps to the nearest point. One series gets a light wash below it. */
export function LineChart({ labels, titles, series, format = (n) => count(n), height = 220, caption }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const n = labels.length
  const { active, setActive, keys } = useActive(n)
  const max = Math.max(0, ...series.flatMap((s) => s.values))
  const { top, step } = niceScale(max)
  const plotW = Math.max(0, width - AXIS_W - 12)
  const plotH = height - AXIS_H - TOP
  const x = (i: number) => AXIS_W + 6 + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2)
  const y = (v: number) => TOP + plotH - (v / top) * plotH
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 56))))
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    setActive(Math.max(0, Math.min(n - 1, Math.round(((px - AXIS_W - 6) / Math.max(1, plotW)) * (n - 1)))))
  }
  return (
    <div className="flex flex-col gap-2">
      <Legend series={series} />
      <div ref={ref} className="relative w-full" onMouseLeave={() => setActive(null)}>
        {width > 0 && n > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${caption}. Use the arrow keys to read each value.`} {...keys} onMouseMove={onMove}
            className="block outline-none focus-visible:outline-2 focus-visible:outline-gold">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={AXIS_W} x2={width} y1={y(t)} y2={y(t)} stroke="var(--color-line-soft)" strokeWidth={1} />
                <text x={AXIS_W - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-faint)" style={{ fontVariantNumeric: 'tabular-nums' }}>{compact(t)}</text>
              </g>
            ))}
            {labels.map((l, i) => (i % every === 0 ? <text key={l + i} x={x(i)} y={height - 8} textAnchor={x(i) > width - 28 ? 'end' : 'middle'} fontSize={11} fill="var(--color-muted)">{l}</text> : null))}
            {series.length === 1 && (
              <path d={`M${x(0)},${y(0)} ${series[0].values.map((v, i) => `L${x(i)},${y(v)}`).join(' ')} L${x(n - 1)},${y(0)} Z`} fill={colorOf(series[0], 0)} opacity={0.1} />
            )}
            {series.map((s, si) => (
              <path key={s.name} d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colorOf(s, si)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {active !== null && <line x1={x(active)} x2={x(active)} y1={TOP} y2={y(0)} stroke="var(--color-line-strong)" strokeWidth={1} />}
            {series.map((s, si) => {
              const i = active ?? n - 1
              return <circle key={s.name} cx={x(i)} cy={y(s.values[i] ?? 0)} r={4} fill={colorOf(s, si)} stroke="var(--color-surface)" strokeWidth={2} />
            })}
            <line x1={AXIS_W} x2={width} y1={y(0)} y2={y(0)} stroke="var(--color-line-strong)" strokeWidth={1} />
          </svg>
        )}
        {active !== null && <Tooltip x={x(active)} title={titles?.[active] ?? labels[active]} series={series} index={active} format={format} width={width} />}
      </div>
      <ChartTable labels={titles ?? labels} series={series} format={format} caption={caption} />
    </div>
  )
}

/** Horizontal bars for categories (modes, sources, stages). The value sits at each bar's end. */
export interface BarRow { label: string; value: number; note?: string }
export function BarList({ rows, format = (n) => count(n), empty = 'Nothing in these dates.', caption, hideZero = false, share = true }: {
  rows: BarRow[]; format?: (n: number) => string; empty?: string; caption: string; hideZero?: boolean
  /** Show each row's share of the total (off for overlapping rows like "0-7 / 0-15 / 0-30 days"). */
  share?: boolean
}) {
  const shown = hideZero ? rows.filter((r) => r.value) : rows
  const max = Math.max(0, ...shown.map((r) => r.value))
  const total = shown.reduce((a, r) => a + r.value, 0)
  if (!shown.length || (hideZero && !total)) return <p className="m-0 py-4 text-center text-[13px] text-muted">{empty}</p>
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label={caption}>
      {shown.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(84px,38%)_1fr] items-center gap-3 text-[13px]" title={`${r.label}: ${format(r.value)}`}>
          <span className="min-w-0">
            <span className="block leading-snug break-words text-ink-soft">{r.label}</span>
            {r.note && <span className="block text-[11px] leading-snug text-faint">{r.note}</span>}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-3 min-w-0 flex-1" aria-hidden="true">
              <span className="block h-full rounded-r-[4px]" style={{ width: max ? `${(r.value / max) * 100}%` : 0, minWidth: r.value ? 2 : 0, background: 'var(--color-series-1)' }} />
            </span>
            <span className="min-w-[4.5ch] text-right font-bold whitespace-nowrap text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{format(r.value)}</span>
            {share && total > 0 && <span className="w-[5ch] text-right text-[11px] text-faint" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round((r.value / total) * 100)}%</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** One big number: the figure a page leads with. */
export function Hero({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-semibold text-muted">{label}</span>
      <span className="text-[44px] leading-none font-bold lg:text-[52px]">{value}</span>
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </div>
  )
}

/** A share of a whole, as a bar on a same-hue track. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const p = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-3 w-full overflow-hidden rounded-full"
      style={{ background: 'color-mix(in srgb, var(--color-series-1) 18%, transparent)' }}>
      <div className="h-full rounded-r-[4px]" style={{ width: `${p * 100}%`, background: 'var(--color-series-1)' }} />
    </div>
  )
}

/** YDL's "This v/s That": the same block for two periods (and staff), side by side. */
export function ThisThat({ render }: { render: (side: 'This' | 'That') => ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{render('This')}{render('That')}</div>
}

export function useThisThat(defaultKey = 'last_90') {
  const [thisRange, setThis] = useState<RangeValue>(() => rangeFor(defaultKey))
  const [thatRange, setThat] = useState<RangeValue>(() => rangeFor(defaultKey))
  const [thisStaff, setThisStaff] = useState('')
  const [thatStaff, setThatStaff] = useState('')
  return useMemo(() => ({
    range: (s: 'This' | 'That') => (s === 'This' ? thisRange : thatRange),
    setRange: (s: 'This' | 'That') => (s === 'This' ? setThis : setThat),
    staff: (s: 'This' | 'That') => (s === 'This' ? thisStaff : thatStaff),
    setStaff: (s: 'This' | 'That') => (s === 'This' ? setThisStaff : setThatStaff),
  }), [thisRange, thatRange, thisStaff, thatStaff])
}
