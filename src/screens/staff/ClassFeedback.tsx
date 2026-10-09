import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useBatches, useServices, useStudio } from '../../db/studio'
import { timeRange } from '../../db/classes'
import { downloadCsv } from '../../lib/csv'
import { fmtDateTime, fmtDay, plusDays, studioToday } from '../../lib/dates'
import { ClientCell } from '../../components/client'
import { Checkbox, Select, TextInput } from '../../components/controls'
import { Pager } from '../../components/table'
import { Icon, Loading, PageHeader } from '../../components/ui'
import { CsvOnly } from '../../access-ui'

// YDL "Class Feedbacks" (Class Feedback Listing): ratings clients give after a class,
// with "Group by Class" and the top trainers by rating.

interface Feedback {
  id: string; batch_id: string; member_id: string; class_date: string; rating: number; comment: string | null; created_at: string
  member_name: string; client_code: string | null; batch_name: string; batch_code: string | null; class_name: string; service_ids: string[]
  trainer_ids: string[]; trainer_names: string | null; service_names: string | null
}
const stars = (n: number) => <span aria-label={`${n} out of 5`} className="nowrap text-gold">{'★'.repeat(Math.round(n))}<span className="text-faint">{'★'.repeat(5 - Math.round(n))}</span></span>

export default function ClassFeedback() {
  const me = useMe()
  const { data: studio } = useStudio()
  const { data: batches = [] } = useBatches()
  const { data: services = [] } = useServices()
  const today = studioToday()
  const [from, setFrom] = useState(plusDays(today, -30))
  const [to, setTo] = useState(today)
  const [batch, setBatch] = useState('')
  const [category, setCategory] = useState('')
  const [rating, setRating] = useState('')
  const [group, setGroup] = useState(false)
  const [page, setPage] = useState(0)
  const { data = [], isLoading } = useQuery({
    queryKey: ['class-feedback', me.studioId, from, to],
    queryFn: async () => throwIf(await supabase.from('class_feedback_overview').select('*').eq('studio_id', me.studioId)
      .gte('created_at', `${from}T00:00:00+05:30`).lte('created_at', `${to}T23:59:59+05:30`).order('created_at', { ascending: false }).limit(5000)) as Feedback[],
  })
  const rows = useMemo(() => data.filter((f) => (!batch || f.batch_id === batch) && (!category || f.service_ids.includes(category)) && (!rating || f.rating === Number(rating))), [data, batch, category, rating])
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; class_name: string; batch_code: string | null; service_names: string | null; trainer_names: string | null; n: number; sum: number }>()
    for (const f of rows) {
      const g = m.get(f.batch_id) ?? { key: f.batch_id, class_name: f.batch_name, batch_code: f.batch_code, service_names: f.service_names, trainer_names: f.trainer_names, n: 0, sum: 0 }
      g.n++; g.sum += f.rating; m.set(f.batch_id, g)
    }
    return [...m.values()].sort((a, b) => b.sum / b.n - a.sum / a.n || b.n - a.n)
  }, [rows])
  const trainers = useMemo(() => {
    const m = new Map<string, { name: string; n: number; sum: number }>()
    for (const f of rows) for (const t of (f.trainer_names ?? '').split(', ').filter(Boolean)) {
      const x = m.get(t) ?? { name: t, n: 0, sum: 0 }; x.n++; x.sum += f.rating; m.set(t, x)
    }
    return [...m.values()].sort((a, b) => b.sum / b.n - a.sum / a.n || b.n - a.n).slice(0, 3)
  }, [rows])
  const exportCsv = () => downloadCsv('class-feedback.csv', rows, [['Customer', (f) => f.member_name], ['Customer Code', (f) => f.client_code], ['Class Name', (f) => f.class_name],
    ['Class Date', (f) => f.class_date], ['Category', (f) => f.service_names], ['Trainers', (f) => f.trainer_names], ['Rating', (f) => f.rating],
    ['Experience & Suggestions', (f) => f.comment], ['Submitted At', (f) => f.created_at]])
  const avg = rows.length ? rows.reduce((t, f) => t + f.rating, 0) / rows.length : 0
  const list = group ? groups : rows
  const shown = list.slice(page * 50, page * 50 + 50)

  return (
    <>
      <PageHeader title="Class Feedback Listing" sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={<CsvOnly><button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">From</span><TextInput small type="date" value={from} onChange={(v) => { setFrom(v); setPage(0) }} className="w-auto" />
          <span className="text-[12px] text-muted">To</span><TextInput small type="date" value={to} onChange={(v) => { setTo(v); setPage(0) }} className="w-auto" />
          <Select small ariaLabel="Select Batch" value={batch} onChange={(v) => { setBatch(v); setPage(0) }} placeholder="Select Batch" className="w-auto"
            options={batches.map((b) => ({ value: b.id, label: `${timeRange(b.start_time, b.end_time)} · ${b.name}` }))} />
          <Select small ariaLabel="Select Category" value={category} onChange={(v) => { setCategory(v); setPage(0) }} placeholder="Select Category" className="w-auto"
            options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
          <Select small ariaLabel="Rating" value={rating} onChange={(v) => { setRating(v); setPage(0) }} placeholder="Rating" className="w-auto"
            options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))} />
          <Checkbox checked={group} onChange={(v) => { setGroup(v); setPage(0) }} label="Group by Class" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-xl border border-line px-3 py-1.5"><span className="text-muted">Feedbacks : </span><strong>{rows.length}</strong></span>
          <span className="rounded-xl border border-line px-3 py-1.5"><span className="text-muted">Average : </span><strong>{avg ? avg.toFixed(1) : '—'}</strong> {avg ? stars(avg) : null}</span>
          {trainers.length > 0 && <span className="rounded-xl border border-gold/40 px-3 py-1.5">🏆 Top Trainers — highest-rated classes: {trainers.map((t) => `${t.name} (${(t.sum / t.n).toFixed(1)}★, ${t.n})`).join(' · ')}</span>}
        </div>
        {isLoading ? <Loading /> : !list.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No feedback for these dates.</div> : (
          <div className="card overflow-x-auto">
            {group ? (
              <table className="tbl">
                <thead><tr><th>Class Name</th><th>Category</th><th>Trainers</th><th>Rating</th><th className="num">Feedbacks</th></tr></thead>
                <tbody>{(shown as typeof groups).map((g) => (
                  <tr key={g.key}><td className="font-semibold">{g.class_name}<div className="text-[12px] font-normal text-muted">{g.batch_code}</div></td>
                    <td className="text-[12px] text-muted">{g.service_names}</td><td>{g.trainer_names ?? '—'}</td>
                    <td>{stars(g.sum / g.n)} {(g.sum / g.n).toFixed(1)}</td><td className="num">{g.n}</td></tr>
                ))}</tbody>
              </table>
            ) : (
              <table className="tbl">
                <thead><tr><th>Customer</th><th>Class Name</th><th>Category</th><th>Rating</th><th>Experience &amp; Suggestions</th><th>Submitted At</th></tr></thead>
                <tbody>{(shown as Feedback[]).map((f) => (
                  <tr key={f.id}><td><ClientCell id={f.member_id} name={f.member_name} code={f.client_code} /></td>
                    <td>{f.class_name}<div className="text-[12px] text-muted">{fmtDay(f.class_date)} · {f.trainer_names ?? 'No trainer'}</div></td>
                    <td className="text-[12px] text-muted">{f.service_names}</td><td>{stars(f.rating)}</td>
                    <td className="max-w-[320px] whitespace-pre-wrap">{f.comment ?? '—'}</td><td className="nowrap">{fmtDateTime(f.created_at)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}
        <Pager page={page} pageSize={50} total={list.length} onPage={setPage} />
        <p className="m-0 text-[12px] text-muted">Clients rate a class from the member app after attending it.</p>
      </div>
    </>
  )
}
