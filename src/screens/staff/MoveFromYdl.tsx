import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import { guessColumns, importCounts, sendRows, STEPS, toRows, type ImportResult, type Step } from '../../db/ydlImport'
import { downloadCsv, parseCsv } from '../../lib/csv'
import { money } from '../../lib/format'
import { studioLine } from '../../components/crud'
import { Notice } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, PageHeader } from '../../components/ui'

// Move from YDL (owner): bring members, enquiries, subscriptions, receipts, follow-ups, freezes, extensions and
// check-ins over from YDL's own CSV exports. Each step finds YDL's columns by heading (the owner can change the match),
// shows what will come over and what can't, and sends the rows in parts. Running a step again never doubles anything.

const COUNT_LABELS: [string, string][] = [
  ['members', 'Members'], ['enquiries', 'Enquiries'], ['subscriptions', 'Subscriptions'], ['receipts', 'Receipts'], ['collected', 'Collected'],
  ['balance', 'Balance due'], ['follow_ups', 'Open follow-ups'], ['freezes', 'Freezes'], ['extensions', 'Extensions'], ['attendance', 'Check-ins'],
]

export default function MoveFromYdl() {
  const me = useMe()
  const { data: studio } = useStudio()
  const counts = useQuery({ queryKey: ['ydl-import-counts', me.studioId], queryFn: () => importCounts(me.studioId) })
  return (
    <>
      <PageHeader title="Move from YDL" sub={studioLine(studio)} />
      <div className="flex max-w-[1100px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <Notice>
          Do this on switch day, after the last bill in YDL. Go in order: members first, because the other files find clients by member code or mobile.
          Running a step again is safe: what is already here is skipped or filled in, never doubled. Nothing is sent to members while importing.
        </Notice>
        <section className="card flex flex-col gap-3 p-5" aria-labelledby="mv-counts">
          <div className="flex items-center justify-between gap-3">
            <h2 id="mv-counts" className="m-0 text-[17px] font-bold">Here now</h2>
            <button type="button" className="btn btn-sm" onClick={() => counts.refetch()}>Refresh</button>
          </div>
          <p className="m-0 text-[13px] text-muted">Compare with YDL’s totals after each step.</p>
          <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {COUNT_LABELS.map(([k, label]) => (
              <div key={k} className="rounded-xl bg-surface-2 px-3 py-2">
                <dt className="text-[12px] text-muted">{label}</dt>
                <dd className="m-0 text-[18px] font-bold">{counts.data ? (k === 'collected' || k === 'balance' ? money(Number(counts.data[k])) : Number(counts.data[k]).toLocaleString('en-IN')) : '…'}</dd>
              </div>
            ))}
          </dl>
        </section>
        {STEPS.map((s, i) => <StepCard key={s.id} n={i + 1} step={s} />)}
      </div>
    </>
  )
}

function StepCard({ n, step }: { n: number; step: Step }) {
  const me = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  const [file, setFile] = useState<string | null>(null)
  const [grid, setGrid] = useState<string[][] | null>(null)
  const [cols, setCols] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  // The column list opens by itself when a needed column wasn't found, and stays as the owner leaves it.
  const [openCols, setOpenCols] = useState(false)
  const read = async (f: File) => {
    setError(null); setGrid(null); setResult(null); setFile(f.name); setDone(0)
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') return setError('Choose the CSV file. If YDL gave an Excel file, open it and save it as CSV.')
    if (f.size > 20 * 1024 * 1024) return setError('The file is larger than 20 MB. Export a shorter date range and import it in parts.')
    const g = parseCsv(await f.text())
    if (g.length < 2) return setError('The file has no rows under the heading.')
    const guessed = guessColumns(step, g[0])
    setGrid(g)
    setCols(guessed)
    setOpenCols(step.fields.some((x) => x.required && guessed[x.key] === undefined))
  }
  const parsed = useMemo(() => (grid ? toRows(step, grid, cols) : []), [grid, cols, step])
  const ready = parsed.filter((p) => !p.problems.length && !p.skipped)
  const bad = parsed.filter((p) => p.problems.length && !p.skipped)
  const skipped = parsed.filter((p) => p.skipped)
  const missing = step.fields.filter((f) => f.required && cols[f.key] === undefined)
  const go = useMutation({
    mutationFn: () => sendRows(me.studioId, step.kind, ready, setDone),
    onSuccess: (r) => {
      setResult(r)
      qc.invalidateQueries({ queryKey: ['ydl-import-counts'] })
      toast(`${step.title}: ${r.added} added, ${r.updated} updated${r.problems.length ? `, ${r.problems.length} with problems` : ''}`)
    },
    onError: (e: Error) => setError(e.message),
  })
  const headers = grid?.[0] ?? []
  const shown = step.fields.filter((f) => cols[f.key] !== undefined).slice(0, 6)
  const allProblems = [...bad.map((p) => ({ line: p.line, message: p.problems.join('; ') })), ...(result?.problems ?? [])].sort((a, b) => a.line - b.line)
  return (
    <section className="card flex flex-col gap-3 p-5" aria-labelledby={`mv-${step.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`mv-${step.id}`} className="m-0 text-[17px] font-bold">{n}. {step.title}</h2>
        {result && <span className="chip chip-green">Done</span>}
      </div>
      <p className="m-0 text-[13px] text-muted"><strong className="text-ink-soft">In YDL:</strong> {step.ydl}. {step.hint}</p>
      <input type="file" accept=".csv,text/csv" className="input py-2" aria-label={`${step.title} CSV file`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f) }} />
      {error && <Notice tone="error">{error}</Notice>}
      {grid && (
        <>
          <p className="m-0 text-[14px]" role="status">
            {file}: <strong>{ready.length}</strong> ready{bad.length ? <>, <strong className="text-red">{bad.length}</strong> with problems</> : ''}
            {skipped.length ? <>, {skipped.length} left out ({[...new Set(skipped.map((s) => s.skipped))].join('; ')})</> : ''}.
          </p>
          {missing.length > 0 && <Notice tone="warn">Choose the column for {missing.map((f) => f.label).join(', ')} below.</Notice>}
          <details className="rounded-xl border border-line p-3" open={openCols} onToggle={(e) => setOpenCols(e.currentTarget.open)}>
            <summary className="cursor-pointer text-[13px] font-semibold">Columns ({Object.keys(cols).length} of {step.fields.length} matched)</summary>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {step.fields.map((f) => (
                <label key={f.key} className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
                  <span>{f.label}{f.required && <span className="text-red"> *</span>}</span>
                  <select className="input input-sm" value={cols[f.key] ?? ''} onChange={(e) => {
                    const v = e.target.value
                    setCols((c) => { const x = { ...c }; if (v === '') delete x[f.key]; else x[f.key] = Number(v); return x })
                    setResult(null)
                  }}>
                    <option value="">— not in the file —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </details>
          {ready.length > 0 && shown.length > 0 && (
            <div className="overflow-auto rounded-xl border border-line">
              <table className="tbl">
                <caption className="sr-only">First rows that will come over</caption>
                <thead><tr><th>Line</th>{shown.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
                <tbody>
                  {ready.slice(0, 5).map((p) => (
                    <tr key={p.line}><td>{p.line}</td>{shown.map((f) => <td key={f.key}>{f.type === 'sessions' ? [p.row.sessions_used, p.row.sessions_total].filter(Boolean).join(' / ') : p.row[f.key] ?? ''}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-gold px-5" disabled={!ready.length || missing.length > 0 || go.isPending} onClick={() => { setError(null); setResult(null); setDone(0); go.mutate() }}>
              {go.isPending ? `Sending ${done} of ${ready.length}…` : `Bring ${ready.length.toLocaleString('en-IN')} ${ready.length === 1 ? 'row' : 'rows'} over`}
            </button>
            {allProblems.length > 0 && (
              <button type="button" className="btn btn-sm" onClick={() => downloadCsv(`${step.id}-problems.csv`, allProblems, [['Line', (r) => r.line], ['Problem', (r) => r.message]])}>
                <Icon name="download" size={15} />Download problems
              </button>
            )}
          </div>
          {result && (
            <Notice tone={result.problems.length ? 'warn' : 'success'}>
              {result.added.toLocaleString('en-IN')} added, {result.updated.toLocaleString('en-IN')} updated, {result.same.toLocaleString('en-IN')} already here
              {result.problems.length ? `; ${result.problems.length} couldn’t come over (listed below).` : '.'}
            </Notice>
          )}
          {allProblems.length > 0 && (
            <div className="max-h-[260px] overflow-auto rounded-xl border border-line">
              <table className="tbl">
                <caption className="sr-only">Lines that can’t come over</caption>
                <thead><tr><th>Line</th><th>Problem</th></tr></thead>
                <tbody>{allProblems.slice(0, 200).map((p, i) => <tr key={`${p.line}-${i}`}><td>{p.line}</td><td className="text-red">{p.message}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

