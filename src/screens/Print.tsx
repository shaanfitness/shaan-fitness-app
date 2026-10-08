import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { throwIf, useStudio } from '../db/studio'
import { amt, getSubscription, subscriptionReceipts, type Receipt } from '../db/billing'
import { fmtDay } from '../lib/dates'

// Printable invoice (with its receipts) and single receipt, opened in a new tab and printed.
export default function Print({ kind }: { kind: 'invoice' | 'receipt' }) {
  const { id = '' } = useParams()
  const { data: studio } = useStudio()
  const receipt = useQuery({
    queryKey: ['print', 'receipt', id], enabled: kind === 'receipt',
    queryFn: async () => throwIf(await supabase.from('payment_overview').select('*').eq('id', id).single()) as Receipt & { subscription_id: string | null },
  })
  const subId = kind === 'invoice' ? id : receipt.data?.subscription_id ?? null
  const sub = useQuery({ queryKey: ['print', 'sub', subId], enabled: !!subId, queryFn: () => getSubscription(subId!) })
  const recs = useQuery({ queryKey: ['print', 'recs', subId], enabled: kind === 'invoice' && !!subId, queryFn: () => subscriptionReceipts(subId!) })
  const ready = !!studio && (kind === 'invoice' ? sub.data && recs.data : receipt.data && (!subId || sub.data))
  useEffect(() => { if (ready) setTimeout(() => window.print(), 300) }, [ready])

  if (!ready) return <p style={{ padding: 24 }}>Preparing…</p>
  const s = sub.data
  const r = receipt.data
  const rows: Receipt[] = kind === 'invoice' ? (recs.data ?? []).filter((x) => x.status === 'paid') : r ? [r] : []
  const address = [studio!.street1, studio!.street2, studio!.city, studio!.state, studio!.pincode].filter(Boolean).join(', ')
  const gstNo = studio!.settings.gst?.number
  return (
    <div className="print-page">
      <style>{`
        body { background: #fff !important; color: #111 !important; }
        .print-page { max-width: 760px; margin: 0 auto; padding: 32px; font: 13px/1.5 system-ui, sans-serif; color: #111; }
        .print-page h1 { font-size: 22px; margin: 0; } .print-page table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .print-page th, .print-page td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; } .print-page .r { text-align: right; }
        .print-page .muted { color: #555; } @media print { .noprint { display: none; } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src="/icon-192.png" alt="" width={56} height={56} style={{ borderRadius: 12 }} />
          <div><h1>{studio!.name}{studio!.branch_name ? ` (${studio!.branch_name})` : ''}</h1>
            <div className="muted">{address}</div><div className="muted">{[studio!.mobile, studio!.email].filter(Boolean).join(' · ')}</div>
            {gstNo && <div className="muted">GSTIN: {gstNo}</div>}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: 16 }}>{kind === 'invoice' ? (gstNo ? 'TAX INVOICE' : 'INVOICE') : 'RECEIPT'}</strong>
          {kind === 'invoice' && s && <><div>Invoice No: {s.invoice_no ?? '—'}</div><div>Invoice Date: {fmtDay(s.invoice_date, 'dd-MM-yyyy')}</div></>}
          {kind === 'receipt' && r && <><div>Receipt No: {r.receipt_no ?? '—'}</div><div>Date: {fmtDay(r.receipt_date, 'dd-MM-yyyy')}</div></>}
        </div>
      </div>
      {s && (
        <>
          <p style={{ marginTop: 20 }}><strong>Bill to:</strong> {s.member_name} ({s.client_code})<br />
            <span className="muted">{s.member_phone ? `${s.member_country_code} ${s.member_phone}` : ''} {s.member_email ?? ''} {s.customer_address ?? ''}</span></p>
          <table>
            <thead><tr><th>Membership</th><th>Period</th><th className="r">Plan Price</th><th className="r">Sign Up Fee</th><th className="r">Discount</th><th className="r">Taxes</th><th className="r">Total</th></tr></thead>
            <tbody><tr>
              <td>{s.plan_name}{s.trainer_name ? ` · Trainer: ${s.trainer_name}` : ''}</td>
              <td>{fmtDay(s.start_date, 'dd-MM-yyyy')} to {fmtDay(s.end_date, 'dd-MM-yyyy')}</td>
              <td className="r">{amt(s.selling_price)}</td><td className="r">{amt(s.sign_up_fee)}</td><td className="r">{amt(s.coupon_discount)}</td>
              <td className="r">{s.igst ? `IGST ${s.gst_rate}%` : `CGST ${s.gst_rate / 2}% + SGST ${s.gst_rate / 2}%`}<br />{amt(s.gst_amount)}</td>
              <td className="r"><strong>{amt(s.total_amount)}</strong></td>
            </tr></tbody>
          </table>
        </>
      )}
      <table>
        <thead><tr><th>Receipt No</th><th>Date</th><th>Method</th><th>Notes</th><th className="r">Amount</th></tr></thead>
        <tbody>
          {rows.map((x) => <tr key={x.id}><td>{x.receipt_no}</td><td>{fmtDay(x.receipt_date, 'dd-MM-yyyy')}</td><td>{x.kind === 'write_off' ? 'Write Off' : x.mode}</td><td>{x.reference ?? ''}</td><td className="r">{amt(x.amount)}</td></tr>)}
          {!rows.length && <tr><td colSpan={5} className="muted">No receipts.</td></tr>}
        </tbody>
      </table>
      {s && <p className="r" style={{ marginTop: 12 }}>Paid {amt(s.paid_amount)} · Balance {amt(s.balance_amount)}{s.balance_due_date && s.balance_amount > 0 ? ` (due ${fmtDay(s.balance_due_date, 'dd-MM-yyyy')})` : ''}</p>}
      <p className="muted" style={{ marginTop: 32 }}>This is a computer generated document. Thank you for training with {studio!.name}.</p>
      <button type="button" className="noprint" onClick={() => window.print()} style={{ marginTop: 16, padding: '8px 16px' }}>Print</button>
    </div>
  )
}

// Collection / Sales report "PDF": a printable summary for a date range.
export function PrintReport({ kind }: { kind: 'collection' | 'sales' }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const { data: studio } = useStudio()
  const rows = useQuery({
    queryKey: ['print', kind, from, to, studio?.id], enabled: !!studio,
    queryFn: async () => kind === 'collection'
      ? throwIf(await supabase.from('payment_overview').select('*').eq('studio_id', studio!.id).gte('receipt_date', from).lte('receipt_date', to).order('receipt_date').limit(20000)) as Record<string, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any
      : throwIf(await supabase.from('subscription_overview').select('*').eq('studio_id', studio!.id).is('deleted_at', null).is('cancelled_at', null).gte('invoice_date', from).lte('invoice_date', to).order('invoice_date').limit(20000)) as Record<string, any>[], // eslint-disable-line @typescript-eslint/no-explicit-any
  })
  useEffect(() => { if (rows.data) setTimeout(() => window.print(), 400) }, [rows.data])
  if (!rows.data || !studio) return <p style={{ padding: 24 }}>Preparing…</p>
  const data = kind === 'collection' ? rows.data.filter((r) => r.status === 'paid' && r.kind === 'payment') : rows.data
  const amount = (r: Record<string, number>) => Number(kind === 'collection' ? r.amount : r.total_amount)
  const group = (key: (r: Record<string, any>) => string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const m = new Map<string, { n: number; total: number }>()
    for (const r of data) { const k = key(r) || '—'; const x = m.get(k) ?? { n: 0, total: 0 }; x.n++; x.total += amount(r); m.set(k, x) }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total)
  }
  const total = data.reduce((t, r) => t + amount(r), 0)
  const sections: [string, [string, { n: number; total: number }][]][] = kind === 'collection'
    ? [['By payment method', group((r) => r.mode)], ['By day', group((r) => fmtDay(r.receipt_date, 'dd-MM-yyyy')).sort()], ['By plan', group((r) => r.plan_name ?? r.purpose)], ['By staff (receipt added by)', group((r) => r.added_by_name)]]
    : [['By plan', group((r) => r.plan_name)], ['New vs renewal', group((r) => (r.is_renewal ? 'Renewal' : 'New'))], ['By type', group((r) => (r.kind === 'pt' ? 'Personal training' : r.kind === 'trial' ? 'Trial' : 'Gym'))], ['By bill rep', group((r) => r.bill_rep_name)]]
  return (
    <div className="print-page">
      <style>{`body { background: #fff !important; color: #111 !important; } .print-page { max-width: 800px; margin: 0 auto; padding: 32px; font: 13px/1.5 system-ui, sans-serif; color: #111; }
        .print-page h1 { font-size: 20px; margin: 0; } .print-page h2 { font-size: 15px; margin: 20px 0 6px; } .print-page table { width: 100%; border-collapse: collapse; }
        .print-page th, .print-page td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; } .print-page .r { text-align: right; } @media print { .noprint { display: none; } }`}</style>
      <h1>{studio.name}{studio.branch_name ? ` (${studio.branch_name})` : ''} — {kind === 'collection' ? 'Collection report' : 'Sales report'}</h1>
      <p>{fmtDay(from, 'dd MMM yyyy')} to {fmtDay(to, 'dd MMM yyyy')} · {data.length} {kind === 'collection' ? 'receipts' : 'invoices'} · Total <strong>{amt(total)}</strong></p>
      {sections.map(([title, list]) => (
        <div key={title}>
          <h2>{title}</h2>
          <table><thead><tr><th>{title.replace('By ', '')}</th><th className="r">Count</th><th className="r">Amount</th></tr></thead>
            <tbody>{list.map(([k, v]) => <tr key={k}><td>{k}</td><td className="r">{v.n}</td><td className="r">{amt(v.total)}</td></tr>)}</tbody></table>
        </div>
      ))}
      <button type="button" className="noprint" onClick={() => window.print()} style={{ marginTop: 16, padding: '8px 16px' }}>Print</button>
    </div>
  )
}
