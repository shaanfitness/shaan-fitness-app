import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useServices, useStudio, useTeam } from '../../db/studio'
import { downloadCsv, parseCsv } from '../../lib/csv'
import { studioLine } from '../../components/crud'
import { Notice } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, PageHeader } from '../../components/ui'

// YDL "Import Batches" and "Import Membership": a CSV in the template's columns, checked row by row before
// anything is saved; rows with a problem are listed and left out, the rest are added in one go.

type Cells = Record<string, string>
interface Checked<T> { line: number; cells: Cells; row: T | null; problems: string[] }

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
const yesNo = (s: string, dflt: boolean) => (s.trim() === '' ? dflt : /^(y|yes|true|1)$/i.test(s.trim()))

/** 6:00, 06:00, 6 AM, 6:30 pm → HH:MM (24h), or null. */
export function parseTime(s: string) {
  const m = s.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2] ?? '0')
  const ap = m[3]?.toLowerCase()
  if (ap) { if (h < 1 || h > 12) return null; if (ap === 'pm' && h !== 12) h += 12; if (ap === 'am' && h === 12) h = 0 }
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
const DAY = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
/** "Mon-Sat", "Mon, Wed, Fri", "All", "Weekdays" → ISO weekdays. */
export function parseDays(s: string) {
  const v = norm(s)
  if (!v || v === 'all' || v === 'all days' || v === 'daily') return [1, 2, 3, 4, 5, 6, 7]
  if (v === 'weekdays') return [1, 2, 3, 4, 5]
  const out = new Set<number>()
  for (const part of v.split(/[,;/ ]+/).filter(Boolean)) {
    const r = part.match(/^([a-z]{3})[a-z]*-([a-z]{3})[a-z]*$/)
    if (r) {
      const a = DAY.indexOf(r[1]), b = DAY.indexOf(r[2])
      if (a < 0 || b < 0) return null
      for (let i = a; ; i = (i + 1) % 7) { out.add(i + 1); if (i === b) break }
      continue
    }
    const i = DAY.indexOf(part.slice(0, 3))
    if (i < 0) return null
    out.add(i + 1)
  }
  return out.size ? [...out].sort() : null
}
const isoDate = (s: string) => {
  const v = s.trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)      // dd-mm-yyyy, like YDL
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined
}

function Importer<T>({ title, back, template, example, check, existing, save, noun }: {
  title: string; back: [string, string]; template: string[]; example: string[][]; noun: string
  check: (cells: Cells) => { row: T | null; problems: string[] }
  existing: (rows: T[]) => string[]
  save: (rows: T[]) => Promise<number>
}) {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const [file, setFile] = useState<string | null>(null)
  const [rows, setRows] = useState<Checked<T>[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const read = async (f: File) => {
    setError(null); setRows(null); setFile(f.name)
    if (f.size > 2 * 1024 * 1024) return setError('The file is larger than 2 MB. Split it and import in parts.')
    const grid = parseCsv(await f.text())
    if (grid.length < 2) return setError('The file has no rows under the header.')
    const head = grid[0].map(norm)
    const missing = template.filter((h, i) => i < 2 && !head.includes(norm(h)))
    if (missing.length) return setError(`The header must have the template's columns. Missing: ${missing.join(', ')}.`)
    const out: Checked<T>[] = grid.slice(1).slice(0, 1000).map((r, i) => {
      const cells: Cells = {}
      template.forEach((h) => { const at = head.indexOf(norm(h)); cells[h] = at >= 0 ? (r[at] ?? '').trim() : '' })
      const c = check(cells)
      return { line: i + 2, cells, row: c.row, problems: c.problems }
    })
    const dupes = existing(out.filter((x) => x.row).map((x) => x.row!))
    for (const x of out) if (x.row && dupes.length) {
      const key = String((x.row as Record<string, unknown>).batch_code ?? (x.row as Record<string, unknown>).plan_code ?? '')
      if (key && dupes.includes(key.toLowerCase())) { x.problems.push('This code is already used'); x.row = null }
    }
    setRows(out)
  }
  const good = (rows ?? []).filter((x) => x.row && !x.problems.length)
  const bad = (rows ?? []).filter((x) => !x.row || x.problems.length)
  const go = useMutation({
    mutationFn: () => save(good.map((x) => x.row!)),
    onSuccess: (n) => { qc.invalidateQueries(); toast(`${n} ${noun} imported`); setRows(null); setFile(null) },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <>
      <PageHeader title={title} sub={studioLine(studio)} actions={<Link to={back[0]} className="btn btn-sm">{back[1]}</Link>} />
      <div className="flex max-w-[1100px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="m-0 text-[17px] font-bold">1. Fill the template</h2>
          <p className="m-0 text-[14px] text-muted">Columns: {template.join(', ')}. Open it in Excel or Google Sheets, add one row per {noun.replace(/s$/, '')}, and save as CSV.</p>
          <button type="button" className="btn btn-sm self-start" onClick={() => downloadCsv(`${noun}-template.csv`, example, template.map((h, i) => [h, (r: string[]) => r[i]]))}><Icon name="download" size={16} />Download template</button>
        </section>
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="m-0 text-[17px] font-bold">2. Choose the CSV</h2>
          <input type="file" accept=".csv,text/csv" className="input py-2" aria-label="CSV file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f) }} />
          {file && rows && <p className="m-0 text-[14px]">{file}: <strong>{good.length}</strong> ready{bad.length ? <>, <strong className="text-red">{bad.length}</strong> with problems (left out)</> : ''}.</p>}
          {error && <Notice tone="error">{error}</Notice>}
        </section>
        {rows && (
          <section className="card overflow-auto">
            <table className="tbl">
              <caption className="sr-only">Rows in the file</caption>
              <thead><tr><th>Line</th>{template.slice(0, 6).map((h) => <th key={h}>{h}</th>)}<th>Check</th></tr></thead>
              <tbody>
                {rows.slice(0, 300).map((x) => (
                  <tr key={x.line}>
                    <td>{x.line}</td>{template.slice(0, 6).map((h) => <td key={h}>{x.cells[h]}</td>)}
                    <td>{x.problems.length ? <span className="text-[12px] text-red">{x.problems.join('; ')}</span> : <span className="chip chip-green">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {rows && good.length > 0 && <button type="button" className="btn-gold self-start px-5" disabled={go.isPending} onClick={() => go.mutate()}>{go.isPending ? 'Importing…' : `Import ${good.length} ${noun}`}</button>}
      </div>
    </>
  )
}

// Import Batches -----------------------------------------------------------------------------------------------------
const BATCH_COLS = ['Batch Name', 'Start Time', 'End Time', 'Days', 'Batch Code', 'Capacity', 'Gender', 'Trainers', 'Services', 'Room', 'Information', 'Start Date', 'End Date']
interface BatchIn { name: string; start_time: string; end_time: string; days: number[]; batch_code: string | null; capacity: number | null; gender: string; trainer_ids: string[]; service_ids: string[]; room: string | null; info: string | null; start_date: string | null; end_date: string | null }

export function ImportBatches() {
  const me = useMe()
  const team = useTeam()
  const { data: services = [] } = useServices()
  const existing = useQuery({ queryKey: ['batch-codes', me.studioId], queryFn: async () => (throwIf(await supabase.from('batches').select('batch_code').eq('studio_id', me.studioId)) as { batch_code: string | null }[]).map((b) => (b.batch_code ?? '').toLowerCase()).filter(Boolean) })
  const byName = (list: { id: string; names: string[] }[], s: string) => list.find((x) => x.names.some((n) => norm(n) === norm(s)))?.id
  const trainers = team.everyone.map((s) => ({ id: s.id, names: [s.full_name, s.staff_code ?? ''] }))
  const svc = services.map((s) => ({ id: s.id, names: [s.name, s.custom_name ?? ''] }))
  const check = (c: Cells) => {
    const p: string[] = []
    const st = parseTime(c['Start Time']), et = parseTime(c['End Time']), days = parseDays(c['Days'])
    if (!c['Batch Name']) p.push('Batch Name is empty')
    if (!st) p.push('Start Time not understood'); if (!et) p.push('End Time not understood')
    if (st && et && et <= st) p.push('End Time must be after Start Time')
    if (!days) p.push('Days not understood (e.g. Mon-Sat or Mon, Wed, Fri)')
    const cap = c['Capacity'] ? Number(c['Capacity']) : null
    if (cap !== null && !(Number.isInteger(cap) && cap > 0)) p.push('Capacity should be a whole number')
    const g = norm(c['Gender'] || 'all')
    const gender = ['all', 'male', 'female'].includes(g) ? g : g === 'men' ? 'male' : g === 'women' || g === 'ladies' ? 'female' : null
    if (!gender) p.push('Gender should be All, Male or Female')
    const tIds = c['Trainers'] ? c['Trainers'].split(/[;|]/).map((x) => x.trim()).filter(Boolean).map((n) => byName(trainers, n) ?? (p.push(`Trainer "${n}" not found`), '')) : []
    const sIds = c['Services'] ? c['Services'].split(/[;|]/).map((x) => x.trim()).filter(Boolean).map((n) => byName(svc, n) ?? (p.push(`Service "${n}" not found`), '')) : []
    const sd = isoDate(c['Start Date']), ed = isoDate(c['End Date'])
    if (sd === undefined || ed === undefined) p.push('Dates should be dd-mm-yyyy')
    return {
      row: p.length ? null : {
        name: c['Batch Name'], start_time: st!, end_time: et!, days: days!, batch_code: c['Batch Code'] || null, capacity: cap, gender: gender!,
        trainer_ids: tIds, service_ids: sIds, room: c['Room'] || null, info: c['Information'] || null, start_date: sd ?? null, end_date: ed ?? null,
      },
      problems: p,
    }
  }
  return (
    <Importer<BatchIn> title="Import Batches" back={['/batches', 'Batch List']} template={BATCH_COLS} noun="batches"
      example={[['Morning Strength', '6:00 AM', '7:00 AM', 'Mon-Sat', 'B-101', '12', 'All', team.trainers[0]?.full_name ?? 'Trainer name', services[0]?.name ?? 'Service name', 'Floor 1', '', '', '']]}
      check={check} existing={(rows) => { const have = existing.data ?? []; const seen = new Set<string>(); return rows.map((r) => (r.batch_code ?? '').toLowerCase()).filter((k) => k && (have.includes(k) || (seen.has(k) ? true : (seen.add(k), false)))) }}
      save={async (rows) => { throwIf(await supabase.from('batches').insert(rows.map((r) => ({ ...r, studio_id: me.studioId }))).select('id')); return rows.length }} />
  )
}

// Import Membership ---------------------------------------------------------------------------------------------------
const PLAN_COLS = ['Plan Name', 'Price', 'Duration', 'Duration Unit', 'Type', 'Plan Code', 'Services', 'Discount Price', 'Sessions', 'Freeze Days', 'Weekly Class Limit', 'Show In App', 'Free Trial', 'Terms']
interface PlanIn {
  name: string; price: number; tenure_value: number; tenure_unit: string; kind: string; plan_code: string | null; service_ids: string[]; discount_price: number | null
  session_count: number | null; unlimited_sessions: boolean; freeze_days: number; weekly_class_limit: number | null; show_in_app: boolean; is_free_trial: boolean; terms: string | null
}

export function ImportPlans() {
  const me = useMe()
  const { data: services = [] } = useServices()
  const existing = useQuery({ queryKey: ['plan-codes', me.studioId], queryFn: async () => (throwIf(await supabase.from('plans').select('plan_code').eq('studio_id', me.studioId)) as { plan_code: string | null }[]).map((b) => (b.plan_code ?? '').toLowerCase()).filter(Boolean) })
  const svc = services.map((s) => ({ id: s.id, names: [s.name, s.custom_name ?? ''] }))
  const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(/[₹,\s]/g, '')))
  const check = (c: Cells) => {
    const p: string[] = []
    if (!c['Plan Name']) p.push('Plan Name is empty')
    const price = num(c['Price']), dur = num(c['Duration']), disc = num(c['Discount Price']), sessions = num(c['Sessions']), fz = num(c['Freeze Days']) ?? 0, wk = num(c['Weekly Class Limit'])
    if (price === null || !(price >= 0)) p.push('Price should be a number')
    if (dur === null || !(Number.isInteger(dur) && dur > 0)) p.push('Duration should be a whole number')
    const unit = norm(c['Duration Unit'] || 'months').replace(/s?$/, 's')
    if (!['days', 'months', 'years'].includes(unit)) p.push('Duration Unit should be Days, Months or Years')
    const type = norm(c['Type'] || 'gym')
    const kind = type === 'gym' ? 'gym' : ['pt', 'p.t', 'personal training'].includes(type) ? 'pt' : null
    if (!kind) p.push('Type should be Gym or PT')
    if (disc !== null && !(disc >= 0 && price !== null && disc <= price)) p.push('Discount Price should be between 0 and the Price')
    if (sessions !== null && !(Number.isInteger(sessions) && sessions > 0)) p.push('Sessions should be a whole number (empty = unlimited)')
    if (!(Number.isInteger(fz) && fz >= 0)) p.push('Freeze Days should be a whole number')
    if (wk !== null && !(Number.isInteger(wk) && wk >= 0)) p.push('Weekly Class Limit should be a whole number')
    const sIds = c['Services'] ? c['Services'].split(/[;|]/).map((x) => x.trim()).filter(Boolean).map((n) => svc.find((x) => x.names.some((v) => norm(v) === norm(n)))?.id ?? (p.push(`Service "${n}" not found`), '')) : []
    return {
      row: p.length ? null : {
        name: c['Plan Name'], price: price!, tenure_value: dur!, tenure_unit: unit, kind: kind!, plan_code: c['Plan Code'] || null, service_ids: sIds, discount_price: disc,
        session_count: sessions, unlimited_sessions: sessions === null, freeze_days: fz, weekly_class_limit: wk, show_in_app: yesNo(c['Show In App'], true),
        is_free_trial: yesNo(c['Free Trial'], false), terms: c['Terms'] || null,
      },
      problems: p,
    }
  }
  return (
    <Importer<PlanIn> title="Import Membership" back={['/plans', 'My Membership Plans']} template={PLAN_COLS} noun="plans"
      example={[['Group Training 28 Days', '4999', '28', 'Days', 'Gym', 'GT-28', services[0]?.name ?? 'Service name', '', '24', '7', '6', 'Yes', 'No', '']]}
      check={check} existing={(rows) => { const have = existing.data ?? []; const seen = new Set<string>(); return rows.map((r) => (r.plan_code ?? '').toLowerCase()).filter((k) => k && (have.includes(k) || (seen.has(k) ? true : (seen.add(k), false)))) }}
      save={async (rows) => { throwIf(await supabase.from('plans').insert(rows.map((r) => ({ ...r, studio_id: me.studioId }))).select('id')); return rows.length }} />
  )
}
