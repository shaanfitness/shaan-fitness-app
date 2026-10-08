import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { amt, sellSubscriptions } from '../../db/billing'
import { listClients, saveClient } from '../../db/clients'
import { useBatches, useList, usePlans, useStudio, useTeam } from '../../db/studio'
import { fmtClock, planEndDate, studioToday } from '../../lib/dates'
import { Checkbox, Field, MultiSelect, Notice, RadioGroup, Select, TextInput, opts } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, PageHeader } from '../../components/ui'

// YDL "Quick Billing": pick a client (or add one) and sell a membership with its first receipt, in one step.

const PHONE_IN = /^[6-9]\d{9}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function QuickBilling() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const { data: plans = [] } = usePlans()
  const { data: batches = [] } = useBatches()
  const team = useTeam()
  const modes = opts(useList('payment_mode').map((i) => i.label))
  const sources = opts(useList('source_promotion').map((i) => i.label))
  const today = studioToday()

  const [search, setSearch] = useState('')
  const [client, setClient] = useState<{ id: string; label: string } | null>(null)
  const [n, setN] = useState({ first: '', last: '', email: '', cc: '+91', phone: '', withheld: false, gender: '', rep: me.staffId ?? '', dob: '', source: '', street: '' })
  const [b, setB] = useState({
    plan: '', start: today, end: '', base: '', price: '', received: '', mode: 'CASH', status: 'paid', next: '', note: '',
    trainer: '', sessions: '', receiptNo: '', invoiceDate: today, receiptDate: today, billRep: me.staffId ?? '', batches: [] as string[],
  })
  const [error, setError] = useState<string | null>(null)
  const found = useQuery({
    queryKey: ['clients', 'quick-search', search], enabled: search.trim().length >= 3,
    queryFn: () => listClients(me.studioId, { kind: 'all', search }, 0, 8, 'enquiry_date.desc'),
  })
  const plan = plans.find((p) => p.id === b.plan)
  const gst = studio?.settings.gst?.enabled ? Number(studio.settings.gst.rate ?? 0) : 0
  const total = useMemo(() => { const net = Number(b.price || 0); return net + Math.round(net * gst) / 100 }, [b.price, gst])
  const balance = Math.max(total - (b.status === 'paid' ? Number(b.received || 0) : 0), 0)

  const pickPlan = (id: string) => {
    const p = plans.find((x) => x.id === id)
    setB((x) => ({ ...x, plan: id, base: p ? String(p.price) : '', price: p ? String(p.total_price) : '', received: p ? String(p.total_price) : '',
      end: p ? planEndDate(x.start, p.tenure_value, p.tenure_unit) : '', sessions: p?.session_count != null ? String(p.session_count) : '' }))
  }

  const save = useMutation({
    mutationFn: async () => {
      let memberId = client?.id
      if (!memberId) {
        memberId = await saveClient({
          studio_id: me.studioId, kind: 'enquiry', first_name: n.first, last_name: n.last, email: n.email, country_code: n.cc,
          phone: n.withheld ? '' : n.phone.replace(/\D/g, ''), phone_withheld: n.withheld, gender: n.gender, added_by: n.rep || null,
          date_of_birth: n.dob || null, source_promotion: n.source, street1: n.street,
        })
      }
      const ids = await sellSubscriptions({
        member_id: memberId, invoice_date: b.invoiceDate, bill_rep_id: b.billRep || undefined, batch_ids: b.batches, note: b.note || undefined,
        items: [{ plan_id: b.plan, start_date: b.start, end_date: b.end, base_price: Number(b.base || 0), selling_price: Number(b.price || 0),
          ...(plan?.kind === 'pt' ? { trainer_id: b.trainer, sessions_total: b.sessions ? Number(b.sessions) : null } : {}) }],
        paid_amount: b.status === 'paid' ? Number(b.received || 0) : 0, mode: b.mode, receipt_date: b.receiptDate,
        receipt_no: b.receiptNo || undefined, reference: b.note || undefined, balance_due_date: b.next || b.start,
      })
      return { memberId, subId: ids[0] }
    },
    onSuccess: ({ memberId, subId }) => {
      for (const k of ['clients', 'subs', 'receipts', 'dashboard', 'followups']) qc.invalidateQueries({ queryKey: [k] })
      toast('Bill saved')
      navigate(`/clients/${memberId}/payments/${subId}`)
    },
    onError: (e: Error) => setError(e.message.replace('DUPLICATE_PHONE: ', '')),
  })

  const submit = () => {
    setError(null)
    if (!client) {
      if (!n.first.trim() || !n.last.trim()) return setError('Enter the member name (first and last).')
      if (!EMAIL.test(n.email.trim())) return setError('Enter the member email.')
      if (!n.withheld && !(n.cc.trim() === '+91' ? PHONE_IN.test(n.phone.replace(/\D/g, '')) : n.phone.replace(/\D/g, '').length >= 6)) return setError('Enter a valid mobile number.')
      if (!n.gender) return setError('Choose the gender.')
      if (!n.rep) return setError('Choose the client rep.')
    }
    if (!b.plan) return setError('Select the membership.')
    if (!b.start || !b.end) return setError('Enter the start and end dates.')
    if (b.price === '') return setError('Enter the selling price.')
    if (plan?.kind === 'pt' && !b.trainer) return setError('Assign a trainer for this personal training plan.')
    if (b.status === 'paid' && Number(b.received || 0) > total) return setError('The received amount is more than the total.')
    if (balance > 0 && b.status === 'paid' && Number(b.received || 0) > 0 && !b.next) return setError('Choose the next balance due date.')
    if (!b.invoiceDate) return setError('Enter the invoice date.')
    save.mutate()
  }

  const card = 'card flex flex-col gap-4 p-5'
  const grid = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
  return (
    <>
      <PageHeader title="Quick Billing" sub="Select a client, or add a new member, and assign a membership" />
      <form className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Select A Client</h2>
          {client ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gold/50 px-4 py-3">
              <span className="font-semibold">{client.label}</span>
              <button type="button" className="link-btn text-[13px]" onClick={() => setClient(null)}>Change</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                <TextInput value={search} onChange={setSearch} placeholder="Search by Name or Mobile Number or Email" className="pl-9" />
              </div>
              {(found.data?.rows ?? []).length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {found.data!.rows.map((r) => (
                    <li key={r.id}><button type="button" className="flex w-full items-center justify-between rounded-xl border border-line bg-transparent px-3 py-2 text-left text-[14px] text-ink hover:border-gold"
                      onClick={() => { setClient({ id: r.id, label: `${r.client_code} · ${r.full_name}${r.phone ? ` · ${r.country_code} ${r.phone}` : ''}` }); setSearch('') }}>
                      <span>{r.full_name} <span className="text-muted">({r.client_code})</span></span><span className="text-[12px] text-muted">{r.phone}</span></button></li>
                  ))}
                </ul>
              )}
              {search.trim().length >= 3 && found.data?.rows.length === 0 && <p className="m-0 text-[13px] text-muted">No client found. Add a new member below.</p>}
            </>
          )}
        </section>

        {!client && (
          <section className={card}>
            <h2 className="m-0 text-[16px] font-bold">Add New Member</h2>
            <div className={grid}>
              <Field label="Member Name" required id="qf"><div className="flex gap-2"><TextInput id="qf" value={n.first} onChange={(v) => setN({ ...n, first: v })} placeholder="First name" /><TextInput value={n.last} onChange={(v) => setN({ ...n, last: v })} placeholder="Last name" /></div></Field>
              <Field label="Member Email" required id="qe"><TextInput id="qe" type="email" value={n.email} onChange={(v) => setN({ ...n, email: v })} placeholder="e.g. abc@gmail.com" /></Field>
              <Field label="Mobile Number" required={!n.withheld} id="qm"><div className="flex gap-2"><TextInput value={n.cc} onChange={(v) => setN({ ...n, cc: v })} className="w-[76px] flex-none" /><TextInput id="qm" type="tel" value={n.phone} onChange={(v) => setN({ ...n, phone: v })} placeholder="e.g. 9876543210" /></div>
                <Checkbox checked={n.withheld} onChange={(v) => setN({ ...n, withheld: v })} label="Customer reluctant to give Mobile Number." /></Field>
              <RadioGroup name="qg" legend="Gender" required value={n.gender} onChange={(v) => setN({ ...n, gender: v })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
              <Field label="Client Rep" required id="qr"><Select id="qr" value={n.rep} onChange={(v) => setN({ ...n, rep: v })} placeholder="Select staff" options={team.staffAccounts.map((s) => ({ value: s.id, label: s.full_name }))} /></Field>
              <Field label="Date of Birth" id="qd"><TextInput id="qd" type="date" value={n.dob} onChange={(v) => setN({ ...n, dob: v })} /></Field>
              <Field label="Source Promotion" id="qs"><Select id="qs" value={n.source} onChange={(v) => setN({ ...n, source: v })} placeholder="Unknown" options={sources} /></Field>
              <Field label="Address" id="qa"><TextInput id="qa" value={n.street} onChange={(v) => setN({ ...n, street: v })} placeholder="Street/ Area" /></Field>
            </div>
            <p className="m-0 text-[12px] text-muted">Add the member's photo from their profile after billing (Open WebCam or Add a photo).</p>
          </section>
        )}

        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Assign Membership</h2>
          <div className={grid}>
            <Field label="Select Membership" required id="bp"><Select id="bp" value={b.plan} onChange={pickPlan} placeholder="Select Membership"
              options={plans.filter((p) => p.active && !p.is_free_trial).map((p) => ({ value: p.id, label: `${p.name} · ${amt(p.total_price)}` }))} /></Field>
            <Field label="Start Date" required id="bs"><TextInput id="bs" type="date" value={b.start} onChange={(v) => setB({ ...b, start: v, end: plan ? planEndDate(v, plan.tenure_value, plan.tenure_unit) : b.end })} /></Field>
            <Field label="End Date" required id="be"><TextInput id="be" type="date" value={b.end} onChange={(v) => setB({ ...b, end: v })} /></Field>
            <Field label="Base Price" id="bb"><TextInput id="bb" value={b.base} onChange={() => {}} className="opacity-70" /></Field>
            <Field label="Selling Price" required id="bsp"><TextInput id="bsp" type="number" value={b.price} onChange={(v) => setB({ ...b, price: v })} /></Field>
            <Field label={`Total (${gst ? `incl. ${gst}% GST` : 'no GST'})`} id="bt"><TextInput id="bt" value={amt(total)} onChange={() => {}} className="opacity-70" /></Field>
            <Field label="Payment Status" id="bst"><Select id="bst" value={b.status} onChange={(v) => setB({ ...b, status: v })} options={[{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }]} /></Field>
            {b.status === 'paid' && <>
              <Field label="Received Amount" id="br"><TextInput id="br" type="number" value={b.received} onChange={(v) => setB({ ...b, received: v })} /></Field>
              <Field label="Payment Method" required id="bm"><Select id="bm" value={b.mode} onChange={(v) => setB({ ...b, mode: v })} options={modes} /></Field>
              <Field label="Receipt Date" id="brd"><TextInput id="brd" type="date" value={b.receiptDate} onChange={(v) => setB({ ...b, receiptDate: v })} /></Field>
              {studio?.settings.receipt?.mode === 'manual' && <Field label="Receipt Number" id="brn"><TextInput id="brn" value={b.receiptNo} onChange={(v) => setB({ ...b, receiptNo: v })} /></Field>}
            </>}
            <Field label="Next Balance Due Date" required={balance > 0} id="bn" hint={balance > 0 ? `${amt(balance)} will be due` : undefined}><TextInput id="bn" type="date" value={b.next} onChange={(v) => setB({ ...b, next: v })} /></Field>
            <Field label="Notes" id="bno"><TextInput id="bno" value={b.note} onChange={(v) => setB({ ...b, note: v })} placeholder="e.g. Cheque no./NEFT Transaction" /></Field>
            {plan?.kind === 'pt' && <>
              <Field label="Assign Trainer" required id="btr"><Select id="btr" value={b.trainer} onChange={(v) => setB({ ...b, trainer: v })} placeholder="Select Trainer" options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} /></Field>
              <Field label="Total Sessions" id="bse"><TextInput id="bse" type="number" value={b.sessions} onChange={(v) => setB({ ...b, sessions: v })} /></Field>
            </>}
            <Field label="Invoice Date" required id="bid"><TextInput id="bid" type="date" value={b.invoiceDate} onChange={(v) => setB({ ...b, invoiceDate: v })} /></Field>
            <Field label="Bill Rep" id="brep"><Select id="brep" value={b.billRep} onChange={(v) => setB({ ...b, billRep: v })} options={team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: s.full_name }))} /></Field>
            <Field label="Batch" id="bbat"><MultiSelect id="bbat" values={b.batches} onChange={(v) => setB({ ...b, batches: v })} options={batches.filter((x) => x.active).map((x) => ({ value: x.id, label: `${fmtClock(x.start_time)} - ${fmtClock(x.end_time)} · ${x.name}` }))} placeholder="Select a batch" /></Field>
          </div>
        </section>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur lg:bottom-4">
          <button type="submit" className="btn-gold" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save & Continue'}</button>
        </div>
      </form>
    </>
  )
}
