import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useStudio, useTeam } from '../../db/studio'
import { getSubscription, stateChip, STATE_LABEL } from '../../db/billing'
import { daysFrom, fmtDateTime, fmtDay, plusDays, studioToday } from '../../lib/dates'
import { downloadCsv } from '../../lib/csv'
import { Field, Notice, Select, TextInput } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'
import { RegisterPage, sessionRegister } from './registers'
import { CsvOnly } from '../../access-ui'

// Session Register (list, or one PT subscription's sessions) and the Collection Report.

export function SessionRegisterRoute() {
  const [params] = useSearchParams()
  const id = params.get('subscription')
  return id ? <SubscriptionSessions id={id} /> : <RegisterPage def={sessionRegister} />
}

interface SessionRow { id: string; check_in: string; status: string; trainer_name: string | null; marked_by_name: string | null; activity: string | null; source: string }

function SubscriptionSessions({ id }: { id: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const sub = useQuery({ queryKey: ['subs', 'one', id], queryFn: () => getSubscription(id) })
  const sessions = useQuery({
    queryKey: ['registers', 'sessions', id],
    queryFn: async () => throwIf(await supabase.from('session_overview').select('*').eq('subscription_id', id).order('check_in', { ascending: false })) as SessionRow[],
  })
  const [f, setF] = useState({ at: `${studioToday()}T${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}`, show: 'show', trainer: '', activity: '' })
  const [error, setError] = useState<string | null>(null)
  const [del, setDel] = useState<SessionRow | null>(null)
  const [reason, setReason] = useState('')
  const refresh = () => { for (const k of ['registers', 'subs', 'attendance', 'clients']) qc.invalidateQueries({ queryKey: [k] }) }
  const record = useMutation({
    mutationFn: async () => {
      const res = await supabase.rpc('record_session', { p: { subscription_id: id, at: new Date(`${f.at}:00+05:30`).toISOString(), show: f.show, trainer_id: f.trainer || null, activity: f.activity } })
      if (res.error) throw new Error(res.error.message)
    },
    onSuccess: () => { refresh(); toast(f.show === 'no_show' ? 'No-show recorded' : 'Session deducted'); setF((x) => ({ ...x, activity: '' })) },
    onError: (e: Error) => setError(e.message),
  })
  const remove = useMutation({
    mutationFn: async () => { const r = await supabase.rpc('delete_session', { p_id: del!.id, p_reason: reason }); if (r.error) throw new Error(r.error.message) },
    onSuccess: () => { refresh(); toast('Session deleted'); setDel(null); setReason('') },
    onError: (e: Error) => toast(e.message),
  })
  if (sub.isLoading) return <Loading />
  if (sub.error || !sub.data) return <div className="px-5 py-10 lg:px-8"><Notice tone="error">{(sub.error as Error)?.message ?? 'Not found'}</Notice></div>
  const s = sub.data
  const canRecord = s.status === 'live' && !s.cancelled_at && !s.deleted_at
  return (
    <>
      <PageHeader title="Session Register" sub={<Link to={`/clients/${s.member_id}`}>{s.member_name} · {s.client_code}</Link>}
        actions={<Link to="/registers/sessions" className="btn btn-sm">All PT subscriptions</Link>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <div className="card grid grid-cols-2 gap-4 p-5 text-[13px] md:grid-cols-4">
          <div><div className="text-muted">Plan</div><div className="font-semibold">{s.plan_name}</div><span className={`chip ${stateChip(s.state)} mt-1`}>{STATE_LABEL[s.state]}</span></div>
          <div><div className="text-muted">Trainer</div><div className="font-semibold">{s.trainer_name ?? '—'}</div></div>
          <div><div className="text-muted">Dates</div><div className="font-semibold">{fmtDay(s.start_date)} – {fmtDay(s.end_date)}</div></div>
          <div><div className="text-muted">Sessions</div><div className="text-[22px] font-bold">{s.sessions_used} <span className="text-[14px] font-normal text-muted">/ {s.sessions_total ?? '∞'} · {s.sessions_left ?? '∞'} left</span></div></div>
        </div>
        {canRecord && (
          <form className="card flex flex-col gap-3 p-5" onSubmit={(e) => { e.preventDefault(); setError(null); record.mutate() }}>
            <h2 className="eyebrow">Deduct a session</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Date & time" id="sat"><TextInput id="sat" type="datetime-local" value={f.at} onChange={(v) => setF({ ...f, at: v })} /></Field>
              <Field label="Client Show/No Show" id="sshow"><Select id="sshow" value={f.show} onChange={(v) => setF({ ...f, show: v })}
                options={[{ value: 'show', label: 'Show' }, { value: 'no_show_deduct', label: 'No show (deduct the session)' }, { value: 'no_show', label: 'No show (don’t deduct)' }]} /></Field>
              <Field label="Trainer" id="str"><Select id="str" value={f.trainer} onChange={(v) => setF({ ...f, trainer: v })} placeholder={s.trainer_name ? `${s.trainer_name} (assigned)` : 'Select Trainer'}
                options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} /></Field>
              <Field label="Activity" id="sact"><TextInput id="sact" value={f.activity} onChange={(v) => setF({ ...f, activity: v })} placeholder="e.g. Legs and core" /></Field>
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            <button type="submit" className="btn-gold self-end" disabled={record.isPending}>{record.isPending ? 'Saving…' : 'Deduct Session'}</button>
          </form>
        )}
        {sessions.isLoading ? <Loading /> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>#</th><th>Date-Time</th><th>Show/No Show</th><th>Trainer</th><th>Activity</th><th>Action Taken By</th><th /></tr></thead>
              <tbody>
                {(sessions.data ?? []).map((r, i, a) => (
                  <tr key={r.id}>
                    <td>{a.length - i}</td><td className="nowrap">{fmtDateTime(r.check_in)}</td>
                    <td>{r.status === 'present' ? <span className="chip chip-green">Show</span> : r.status === 'late_cancel' ? <span className="chip chip-amber">No show (deducted)</span> : <span className="chip chip-muted">No show</span>}</td>
                    <td>{r.trainer_name ?? '—'}</td><td>{r.activity ?? (r.source === 'pt' ? '—' : `Check-in (${r.source})`)}</td><td>{r.marked_by_name ?? '—'}</td>
                    <td>{me.role === 'owner' && <button type="button" className="btn btn-sm btn-danger" onClick={() => setDel(r)}><Icon name="trash" size={14} />Delete</button>}</td>
                  </tr>
                ))}
                {!sessions.data?.length && <tr><td colSpan={7} className="text-center text-muted">No sessions recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Sheet open={!!del} onClose={() => setDel(null)} title="Delete session">
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-[14px]">Delete the session on {del ? fmtDateTime(del.check_in) : ''}? It's given back to the client and listed in the Deleted Session Register.</p>
          <Field label="Reason" id="dreason"><TextInput id="dreason" value={reason} onChange={setReason} /></Field>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setDel(null)}>No</button>
            <button type="button" className="btn btn-danger flex-1" disabled={remove.isPending || !reason.trim()} onClick={() => remove.mutate()}>Delete</button></div>
        </div>
      </Sheet>
    </>
  )
}

// ---------------------------------------------------------------------------
// Collection Report (YDL: pick a report and dates, download it or print the PDF)
// ---------------------------------------------------------------------------
export function CollectionReport() {
  const me = useMe()
  const toast = useToast()
  const { data: studio } = useStudio()
  const today = studioToday()
  const [from, setFrom] = useState(today.slice(0, 8) + '01')
  const [to, setTo] = useState(today)
  const [report, setReport] = useState('collection')
  const [busy, setBusy] = useState(false)
  const tooLong = daysFrom(from, to) > 92
  const run = async () => {
    if (tooLong) return
    setBusy(true)
    try {
      if (report === 'collection') {
        const rows = throwIf(await supabase.from('payment_overview').select('*').eq('studio_id', me.studioId).gte('receipt_date', from).lte('receipt_date', to).order('receipt_date').limit(20000)) as Record<string, unknown>[]
        downloadCsv(`collection-report-${from}-to-${to}.csv`, rows, [
          ['Receipt No', (r) => r.receipt_no], ['Receipt Date', (r) => r.receipt_date], ['Invoice No', (r) => r.invoice_no], ['Customer Code', (r) => r.client_code],
          ['Customer Name', (r) => r.member_name], ['Mobile', (r) => r.member_phone], ['Plan', (r) => r.plan_name], ['Purpose', (r) => r.purpose], ['Kind', (r) => r.kind],
          ['Mode', (r) => r.mode], ['Amount', (r) => r.amount], ['Tax in amount', (r) => r.tax_amount], ['Status', (r) => r.status], ['Reference', (r) => r.reference],
          ['Added By', (r) => r.added_by_name], ['Bill Rep', (r) => r.bill_rep_name], ['Client Rep', (r) => r.client_rep_name],
        ])
      } else if (report === 'sales') {
        const rows = throwIf(await supabase.from('subscription_overview').select('*').eq('studio_id', me.studioId).gte('invoice_date', from).lte('invoice_date', to).order('invoice_date').limit(20000)) as Record<string, unknown>[]
        downloadCsv(`sales-report-${from}-to-${to}.csv`, rows, [
          ['Invoice No', (r) => r.invoice_no], ['Invoice Date', (r) => r.invoice_date], ['Customer Code', (r) => r.client_code], ['Customer Name', (r) => r.member_name],
          ['Mobile', (r) => r.member_phone], ['Plan', (r) => r.plan_name], ['Type', (r) => r.kind], ['Renewal', (r) => (r.is_renewal ? 'Yes' : 'No')], ['Start', (r) => r.start_date],
          ['End', (r) => r.end_date], ['Base Price', (r) => r.base_price], ['Selling Price', (r) => r.selling_price], ['Sign Up Fee', (r) => r.sign_up_fee],
          ['Coupon', (r) => r.coupon_code], ['Coupon Discount', (r) => r.coupon_discount], ['Net', (r) => r.net_amount], ['GST', (r) => r.gst_amount], ['Total', (r) => r.total_amount],
          ['Paid', (r) => r.paid_amount], ['Balance', (r) => r.balance_amount], ['Status', (r) => r.state], ['Trainer', (r) => r.trainer_name], ['Bill Rep', (r) => r.bill_rep_name],
          ['Client Rep', (r) => r.client_rep_name], ['Deleted', (r) => (r.deleted_at ? 'Yes' : '')], ['Cancelled', (r) => (r.cancelled_at ? 'Yes' : '')],
        ])
      } else {
        const rows = throwIf(await supabase.from('receipt_log_overview').select('*').eq('studio_id', me.studioId).gte('changed_at', from).lte('changed_at', `${to}T23:59:59+05:30`).order('changed_at').limit(20000)) as Record<string, unknown>[]
        downloadCsv(`updated-receipts-${from}-to-${to}.csv`, rows, [
          ['Changed At', (r) => r.changed_at], ['Changed By', (r) => r.changed_by_name], ['Receipt No', (r) => r.receipt_no], ['Customer', (r) => r.member_name],
          ['Old', (r) => JSON.stringify(r.old_values)], ['New', (r) => JSON.stringify(r.new_values)],
        ])
      }
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="Collection Report" sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <div className="card flex max-w-[760px] flex-col gap-4 p-5">
          <p className="m-0 text-[14px]">To generate a report, select the report and dates below, then download it. Download up to 3 months of data at one go.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Select CSV Report" id="crep"><Select id="crep" value={report} onChange={setReport} options={[
              { value: 'collection', label: 'Excel Collection report' }, { value: 'sales', label: 'Excel Sales report' }, { value: 'updated', label: 'Updated receipts data' }]} /></Field>
            <Field label="From" id="cfrom"><TextInput id="cfrom" type="date" value={from} onChange={setFrom} /></Field>
            <Field label="To" id="cto"><TextInput id="cto" type="date" value={to} onChange={setTo} /></Field>
          </div>
          {tooLong && <Notice tone="warn">Choose up to 3 months at a time.</Notice>}
          <div className="flex flex-wrap gap-2">
<CsvOnly><button type="button" className="btn-gold" disabled={busy || tooLong} onClick={run}><Icon name="download" size={16} />{busy ? 'Preparing…' : 'Download report'}</button></CsvOnly>
            <a className={`btn ${tooLong ? 'pointer-events-none opacity-50' : ''}`} href={`/print/collection?from=${from}&to=${to}`} target="_blank" rel="noreferrer">Collection report in PDF</a>
            <a className={`btn ${tooLong ? 'pointer-events-none opacity-50' : ''}`} href={`/print/sales?from=${from}&to=${to}`} target="_blank" rel="noreferrer">Sales report in PDF</a>
          </div>
          <div className="flex flex-wrap gap-2 text-[13px]">
            <span className="text-muted">Quick ranges:</span>
            {[['This month', today.slice(0, 8) + '01', today], ['Last 7 days', plusDays(today, -7), today], ['Last 30 days', plusDays(today, -30), today], ['Last 90 days', plusDays(today, -90), today]].map(([l, a, b]) => (
              <button key={l} type="button" className="link-btn" onClick={() => { setFrom(a); setTo(b) }}>{l}</button>
            ))}
          </div>
        </div>
        <p className="m-0 text-[12px] text-muted">The amounts match the Receipt Register (collections) and the Subscription Register (sales) for the same dates.</p>
      </div>
    </>
  )
}
