import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import {
  amt, cancelSubscription, deleteSubscription, editBillAmount, getSubscription, recordPayment, stateChip, STATE_LABEL, subscriptionReceipts, type Sub,
} from '../../db/billing'
import { useList, useStudio, useTeam } from '../../db/studio'
import { fmtDay, studioToday } from '../../lib/dates'
import { waLink } from '../../lib/format'
import { Checkbox, Field, Notice, RadioGroup, Select, TextArea, TextInput, opts } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL "Payments Details": the bill, its receipts, taking a payment or writing off,
// and Cancel Subscription / Delete Subscription / Edit Bill Amount.

export default function PaymentDetails() {
  const { id = '', subId = '' } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const team = useTeam()
  const { data: studio } = useStudio()
  const modes = opts(useList('payment_mode').map((i) => i.label))
  const subQ = useQuery({ queryKey: ['subs', 'one', subId], queryFn: () => getSubscription(subId) })
  const recQ = useQuery({ queryKey: ['receipts', subId], queryFn: () => subscriptionReceipts(subId) })
  const s = subQ.data
  const owner = me.role === 'owner'
  const manualReceipt = studio?.settings.receipt?.mode === 'manual'

  const [bill, setBill] = useState({ address: '', note: '', igst: '0', billRep: '', invoiceDate: '' })
  const [rec, setRec] = useState({ amount: '', date: studioToday(), mode: 'CASH', status: 'paid' as 'paid' | 'write_off', ref: '', next: '', no: '' })
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<null | 'cancel' | 'delete' | 'edit'>(null)

  useEffect(() => {
    if (!s) return
    setBill({ address: s.customer_address ?? '', note: s.note ?? '', igst: s.igst ? '1' : '0', billRep: s.bill_rep_id ?? '', invoiceDate: s.invoice_date })
    setRec((r) => ({ ...r, amount: s.balance_amount > 0 ? String(s.balance_amount) : '', next: '' }))
  }, [s?.id, s?.balance_amount]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => { for (const k of ['subs', 'receipts', 'clients', 'dashboard', 'followups', 'registers']) qc.invalidateQueries({ queryKey: [k] }) }
  const save = useMutation({
    mutationFn: () => recordPayment({
      subscription_id: subId, amount: rec.amount ? Number(rec.amount) : 0, mode: rec.mode, status: rec.status, receipt_date: rec.date,
      reference: rec.ref, receipt_no: rec.no || undefined, next_due_date: rec.next || null,
      bill_rep_id: bill.billRep || undefined, invoice_date: bill.invoiceDate, igst: bill.igst === '1', note: bill.note, customer_address: bill.address,
    }),
    onSuccess: () => { refresh(); toast(Number(rec.amount) > 0 ? (rec.status === 'write_off' ? 'Balance written off' : 'Payment received') : 'Saved'); setRec((r) => ({ ...r, ref: '', no: '' })) },
    onError: (e: Error) => setError(e.message),
  })

  if (subQ.isLoading) return <Loading />
  if (subQ.error || !s) return <div className="px-5 py-10 lg:px-8"><Notice tone="error">{(subQ.error as Error)?.message ?? 'Subscription not found'}</Notice></div>
  const receipts = recQ.data ?? []
  const closed = !!s.cancelled_at || !!s.deleted_at
  const after = Math.max(s.balance_amount - Number(rec.amount || 0), 0)
  const submit = () => {
    setError(null)
    const a = Number(rec.amount || 0)
    if (a < 0) return setError('The amount can’t be negative.')
    if (a > s.balance_amount + 0.009) return setError(`This is more than the balance due (${amt(s.balance_amount)}).`)
    if (a > 0 && after > 0 && !rec.next) return setError(`Choose the next balance due date for the remaining ${amt(after)}.`)
    if (a > 0 && rec.status === 'paid' && !rec.mode) return setError('Choose the payment method.')
    if (manualReceipt && a > 0 && !rec.no.trim()) return setError('Enter the receipt number.')
    save.mutate()
  }
  const summary = `${studio?.name ?? 'Shaan Fitness'}: ${s.plan_name} (${fmtDay(s.start_date, 'dd-MM-yyyy')} to ${fmtDay(s.end_date, 'dd-MM-yyyy')}). Bill ${amt(s.total_amount)}, paid ${amt(s.paid_amount)}, balance ${amt(s.balance_amount)}.${s.invoice_no ? ` Invoice ${s.invoice_no}.` : ''}`

  return (
    <>
      <PageHeader title="Payments Details" sub={<Link to={`/clients/${id}`}>{s.member_name} · {s.client_code}</Link>}
        actions={<>
          <Link to="/registers/receipts" className="btn btn-sm">Go to Receipt Register</Link>
          {s.member_email && <a className="btn btn-sm" href={`mailto:${s.member_email}?subject=${encodeURIComponent(`Receipt from ${studio?.name ?? 'Shaan Fitness'}`)}&body=${encodeURIComponent(summary)}`}>Email Receipt</a>}
          <a className="btn btn-sm" href={`/print/invoice/${s.id}`} target="_blank" rel="noreferrer"><Icon name="doc" size={16} />Print Receipt</a>
          {s.member_phone && <a className="btn btn-sm" href={waLink(`${s.member_country_code}${s.member_phone}`.replace(/\D/g, ''), summary)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} />Send Whatsapp</a>}
          {owner && !closed && <button type="button" className="btn btn-sm btn-danger" onClick={() => setDialog('cancel')}>Cancel Subscription</button>}
          {owner && !s.deleted_at && <button type="button" className="btn btn-sm btn-danger" onClick={() => setDialog('delete')}>Delete Subscription</button>}
          {!closed && <button type="button" className="btn btn-sm" onClick={() => setDialog('edit')}>Edit Bill Amount</button>}
        </>} />

      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        {closed && <Notice tone="warn">This subscription was {s.deleted_at ? `deleted (${s.delete_reason})` : `cancelled (${s.cancel_reason})`}.</Notice>}
        <div className="card grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
          <div className="text-[13px]">
            <div className="text-[16px] font-bold">{s.member_name}</div>
            <div className="text-muted">{s.member_phone ? `${s.member_country_code} ${s.member_phone}` : ''} {s.member_email ?? ''}</div>
            <div className="mt-2 text-muted">DOB: {s.member_date_of_birth ? fmtDay(s.member_date_of_birth) : '—'}</div>
            <div className="text-muted">Client Rep : {s.client_rep_name ?? '—'}</div>
            <div className="text-muted">Bill Rep : {s.bill_rep_name ?? '—'}</div>
            <div className="text-muted">Membership Added by : {s.created_by_name ?? '—'}</div>
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Street / Area" id="addr"><TextInput id="addr" value={bill.address} onChange={(v) => setBill({ ...bill, address: v })} placeholder="Enter Customer Street/Address" /></Field>
            <Field label="Note" id="note"><TextArea id="note" value={bill.note} onChange={(v) => setBill({ ...bill, note: v.slice(0, 300) })} placeholder="Enter notes (maximum 300 characters)" rows={2} /></Field>
          </div>
          <div className="flex flex-col gap-3">
            <RadioGroup name="igst" legend="Is IGST Bill" value={bill.igst} onChange={(v) => setBill({ ...bill, igst: v })} options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]} />
            <Field label="Bill Rep" required id="billrep">
              <Select id="billrep" value={bill.billRep} onChange={(v) => setBill({ ...bill, billRep: v })} options={team.everyone.filter((x) => x.role !== 'doctor').map((x) => ({ value: x.id, label: x.full_name }))} />
            </Field>
            <Field label="Invoice Date" id="invdate" hint={owner ? undefined : 'Only the owner can change the invoice date'}>
              <TextInput id="invdate" type="date" value={bill.invoiceDate} onChange={(v) => owner && setBill({ ...bill, invoiceDate: v })} />
            </Field>
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>#</th><th>Membership</th><th>Start Date</th><th>End Date</th><th className="num">Plan Price</th><th className="num">Discount Amount</th>
              <th className="num">Net Sale Amount</th><th className="num">Total Sale Amount</th><th className="num">Total Paid Amount</th><th className="num">Total Balance Amount</th><th>Payment Status</th></tr></thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><div className="font-semibold">{s.plan_name}</div><div className="text-[12px] text-muted">{s.invoice_no ?? 'No invoice number'} · <span className={`chip ${stateChip(s.state)}`}>{STATE_LABEL[s.state]}</span></div></td>
                <td className="nowrap">{fmtDay(s.start_date, 'dd-MM-yy')}</td>
                <td className="nowrap">{fmtDay(s.end_date, 'dd-MM-yy')}</td>
                <td className="num">{amt(s.base_price)}</td>
                <td className="num">{amt(Math.max(s.base_price - s.selling_price, 0) + s.coupon_discount)}</td>
                <td className="num">{amt(s.net_amount)}</td>
                <td className="num">{amt(s.total_amount)}</td>
                <td className="num">{amt(s.paid_amount)}</td>
                <td className="num font-bold">{amt(s.balance_amount)}</td>
                <td>{s.payment_status === 'paid' ? <span className="chip chip-green">Paid</span> : <span className="chip chip-amber">Pending</span>}</td>
              </tr>
            </tbody>
          </table>
          <BillBreakup s={s} />
        </div>

        <h2 className="eyebrow">Receipts</h2>
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>#</th><th>Receipt Number</th><th className="num">Received Amount</th><th>Receipt Date</th><th>Payment Method</th><th>Payment Status</th><th>Notes</th><th>Receipt added by</th><th /></tr></thead>
            <tbody>
              {receipts.map((r, i) => (
                <tr key={r.id} className={r.status === 'cancelled' ? 'opacity-60' : ''}>
                  <td>{i + 1}</td>
                  <td className="nowrap font-semibold">{r.receipt_no ?? '—'}</td>
                  <td className="num">{amt(r.amount)}</td>
                  <td className="nowrap">{fmtDay(r.receipt_date, 'dd-MM-yyyy')}</td>
                  <td>{r.purpose !== 'subscription' ? `${r.mode} (${r.purpose.replace('_', ' ')})` : r.mode}</td>
                  <td>{r.status === 'cancelled' ? <span className="chip chip-red">Cancelled</span> : r.kind === 'write_off' ? <span className="chip chip-muted">Write Off</span> : r.kind === 'refund' ? <span className="chip chip-info">Refund</span> : <span className="chip chip-green">Paid</span>}</td>
                  <td className="text-[12px]">{[r.reference, r.note, r.cancel_reason].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{r.added_by_name ?? '—'}</td>
                  <td><a href={`/print/receipt/${r.id}`} target="_blank" rel="noreferrer" className="text-[12px] font-semibold">Print Receipt</a></td>
                </tr>
              ))}
              {!receipts.length && <tr><td colSpan={9} className="text-center text-muted">No receipts yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {!closed && (
          <div className="card flex flex-col gap-3 p-5">
            <h2 className="eyebrow">{s.balance_amount > 0 ? 'Receive a payment' : 'Bill details'}</h2>
            {s.balance_amount > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Received Amount" required id="ramt" hint={`Balance due ${amt(s.balance_amount)}`}><TextInput id="ramt" type="number" inputMode="decimal" value={rec.amount} onChange={(v) => setRec({ ...rec, amount: v })} /></Field>
                <Field label="Receipt Date" id="rdate"><TextInput id="rdate" type="date" value={rec.date} onChange={(v) => setRec({ ...rec, date: v })} /></Field>
                <Field label="Payment Method" required id="rmode"><Select id="rmode" value={rec.mode} onChange={(v) => setRec({ ...rec, mode: v })} options={modes} /></Field>
                <Field label="Payment Status" id="rstatus">
                  <Select id="rstatus" value={rec.status} onChange={(v) => setRec({ ...rec, status: v as 'paid' | 'write_off' })}
                    options={[{ value: 'paid', label: 'Paid' }, ...(owner ? [{ value: 'write_off', label: 'Write Off' }] : [])]} />
                </Field>
                <Field label="Notes" id="rref"><TextInput id="rref" value={rec.ref} onChange={(v) => setRec({ ...rec, ref: v })} placeholder="e.g. Cheque no./NEFT Transaction" /></Field>
                <Field label="Next Balance Due Date" required={after > 0} id="rnext" hint={after > 0 ? `${amt(after)} will still be due` : undefined}>
                  <TextInput id="rnext" type="date" value={rec.next} onChange={(v) => setRec({ ...rec, next: v })} />
                </Field>
                {manualReceipt && <Field label="Receipt Number" required id="rno"><TextInput id="rno" value={rec.no} onChange={(v) => setRec({ ...rec, no: v })} /></Field>}
              </div>
            )}
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] text-muted">Note: Please ask the client if he is Interested in PT</span>
              <div className="flex gap-2">
                <button type="button" className="btn" onClick={() => navigate(`/clients/${id}`)}>Back</button>
                <button type="button" className="btn-gold" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CloseDialog kind={dialog} sub={s} receipts={receipts.filter((r) => r.status === 'paid').length} onClose={() => setDialog(null)}
        onDone={(k) => { refresh(); setDialog(null); toast(k === 'delete' ? 'Subscription deleted' : k === 'cancel' ? 'Subscription cancelled' : 'Bill amount changed'); if (k === 'delete') navigate(`/clients/${id}`) }} />
    </>
  )
}

function BillBreakup({ s }: { s: Sub }) {
  const half = s.gst_amount / 2
  return (
    <div className="flex justify-end border-t border-line-soft p-4">
      <dl className="m-0 grid w-full max-w-[360px] grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[13px]">
        <dt className="text-muted">Plan Price</dt><dd className="m-0 text-right">{amt(s.selling_price)}</dd>
        <dt className="text-muted">Sign Up Fee</dt><dd className="m-0 text-right">{amt(s.sign_up_fee)}</dd>
        {s.coupon_discount > 0 && <><dt className="text-muted">Coupon {s.coupon_code}</dt><dd className="m-0 text-right">-{amt(s.coupon_discount)}</dd></>}
        {s.igst
          ? <><dt className="text-muted">Taxes -IGST@{s.gst_rate}%</dt><dd className="m-0 text-right">{amt(s.gst_amount)}</dd></>
          : <><dt className="text-muted">Taxes -CGST@{s.gst_rate / 2}%</dt><dd className="m-0 text-right">{amt(half)}</dd><dt className="text-muted">Taxes -SGST@{s.gst_rate / 2}%</dt><dd className="m-0 text-right">{amt(half)}</dd></>}
        <dt className="font-bold">Total Amount</dt><dd className="m-0 text-right font-bold">{amt(s.total_amount)}</dd>
      </dl>
    </div>
  )
}

function CloseDialog({ kind, sub, receipts, onClose, onDone }: { kind: null | 'cancel' | 'delete' | 'edit'; sub: Sub; receipts: number; onClose: () => void; onDone: (k: 'cancel' | 'delete' | 'edit') => void }) {
  const [reason, setReason] = useState('')
  const [keep, setKeep] = useState(false)
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setReason(''); setKeep(false); setPrice(String(sub.selling_price)); setError(null) }, [kind, sub.selling_price])
  const m = useMutation({
    mutationFn: async () => {
      if (kind === 'cancel') await cancelSubscription(sub.id, reason, !keep)
      else if (kind === 'delete') await deleteSubscription(sub.id, reason)
      else await editBillAmount(sub.id, Number(price))
    },
    onSuccess: () => onDone(kind!),
    onError: (e: Error) => setError(e.message),
  })
  const title = kind === 'cancel' ? 'Cancel Subscription' : kind === 'delete' ? 'Delete Subscription' : 'Edit Bill Amount'
  return (
    <Sheet open={!!kind} onClose={onClose} title={title}>
      <form className="flex flex-col gap-3.5" onSubmit={(e) => {
        e.preventDefault(); setError(null)
        if (kind !== 'edit' && !reason.trim()) return setError(`Enter the reason for ${kind === 'cancel' ? 'cancellation' : 'deletion'}.`)
        if (kind === 'edit' && (price === '' || Number(price) < 0)) return setError('Enter the new price.')
        m.mutate()
      }}>
        <Notice tone="warn">
          {kind === 'cancel' && `You are about to cancel this subscription. Cancelling also cancels its ${receipts} receipt${receipts === 1 ? '' : 's'} unless you keep them below.`}
          {kind === 'delete' && 'You are about to delete this subscription. All its receipts and its invoice will be removed from the registers (kept in the Deleted Subscription Register).'}
          {kind === 'edit' && `You are about to edit the bill amount. Editing cancels all ${receipts} receipt${receipts === 1 ? '' : 's'} on this bill; take them again afterwards.`}
        </Notice>
        <div className="text-[13px]">{sub.plan_name} · Total {amt(sub.total_amount)} · Paid {amt(sub.paid_amount)}</div>
        {kind === 'cancel' && <Checkbox checked={keep} onChange={setKeep} label="Keep the receipts" />}
        {kind !== 'edit'
          ? <Field label={kind === 'cancel' ? 'Reason for Cancellation' : 'Reason for Deletion'} required id="reason"><TextInput id="reason" value={reason} onChange={setReason} /></Field>
          : <Field label="New Price" required id="newprice" hint={`Current plan price ${amt(sub.selling_price)}`}><TextInput id="newprice" type="number" value={price} onChange={setPrice} /></Field>}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Close</button>
          <button type="submit" className={`flex-1 ${kind === 'edit' ? 'btn-gold' : 'btn btn-danger'}`} disabled={m.isPending}>{title}</button></div>
      </form>
    </Sheet>
  )
}
