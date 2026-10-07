import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addLead, addMember, getPlans, recordPayment, renewMember } from '../data/api'
import type { CycleOverview, PaymentMethod } from '../data/types'
import { addDays, fmtTime, money, tierLabel, todayISO } from '../lib/format'

const METHODS: Array<[PaymentMethod, string]> = [['upi', 'UPI'], ['cash', 'Cash'], ['card', 'Card'], ['bank_transfer', 'Bank']]

function MethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <div className="field">
      <label id="method-l">Paid by</label>
      <div role="radiogroup" aria-labelledby="method-l" className="grid grid-cols-4 gap-2">
        {METHODS.map(([m, l]) => (
          <button key={m} type="button" role="radio" aria-checked={value === m} onClick={() => onChange(m)}
            className={`min-h-11 rounded-xl border text-[13px] font-semibold ${value === m ? 'border-gold bg-gold text-on-gold' : 'border-[#3A3A42] text-ink'}`}>{l}</button>
        ))}
      </div>
    </div>
  )
}

export function PaymentForm({ memberId, cycle, onDone }: { memberId: string; cycle: CycleOverview | null; onDone: (msg: string) => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(Math.max(cycle?.amount_due ?? 0, 0) || ''))
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [busy, setBusy] = useState(false)
  const value = Number(amount)
  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault()
      if (!(value > 0)) return
      setBusy(true)
      const r = await recordPayment({ memberId, cycleId: cycle?.id ?? null, amount: value, method })
      await qc.invalidateQueries()
      setBusy(false)
      onDone(`${money(value)} recorded · receipt ${r.receipt}`)
    }}>
      {cycle && <p className="m-0 text-[14px] text-muted">{cycle.plan_name} · {money(cycle.amount_due)} due of {money(cycle.price - cycle.discount_amount)}</p>}
      <div className="field">
        <label htmlFor="amount">Amount (₹)</label>
        <input id="amount" className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} required />
      </div>
      <MethodPicker value={method} onChange={setMethod} />
      <button type="submit" className="btn-gold" disabled={busy || !(value > 0)}>Record {value > 0 ? money(value) : 'payment'}</button>
    </form>
  )
}

export function RenewForm({ memberId, current, onDone }: { memberId: string; current: CycleOverview | null; onDone: (msg: string) => void }) {
  const qc = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans })
  const nextStart = current && current.end_date >= todayISO() ? addDays(current.end_date, 1) : todayISO()
  const [planId, setPlanId] = useState(current?.plan_id ?? '')
  const [start, setStart] = useState(nextStart)
  const [discount, setDiscount] = useState('0')
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [busy, setBusy] = useState(false)
  const plan = plans?.find((p) => p.id === (planId || current?.plan_id))
  const total = Math.max((plan?.price ?? 0) - Number(discount || 0), 0)
  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault()
      if (!plan) return
      setBusy(true)
      await renewMember({ memberId, planId: plan.id, startDate: start, discount: Number(discount || 0), paid: paid === '' ? total : Number(paid), method })
      await qc.invalidateQueries()
      setBusy(false)
      onDone(`Renewed ${plan.name.split(' (')[0]} from ${start}`)
    }}>
      <div className="field">
        <label htmlFor="plan">Plan</label>
        <select id="plan" className="input" value={plan?.id ?? ''} onChange={(e) => setPlanId(e.target.value)}>
          {plans?.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)} · {p.sessions} sessions</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="start">Starts</label><input id="start" type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="field"><label htmlFor="disc">Discount (₹)</label><input id="disc" className="input" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d]/g, ''))} /></div>
      </div>
      <div className="field">
        <label htmlFor="paid">Paid now (₹) · blank = full amount</label>
        <input id="paid" className="input" inputMode="numeric" placeholder={String(total)} value={paid} onChange={(e) => setPaid(e.target.value.replace(/[^\d]/g, ''))} />
      </div>
      <MethodPicker value={method} onChange={setMethod} />
      <div className="flex items-center justify-between text-[14px]"><span className="text-muted">Total</span><span className="font-display text-[24px] text-gold-light">{money(total)}</span></div>
      <button type="submit" className="btn-gold" disabled={busy || !plan}>Renew and record {money(paid === '' ? total : Number(paid))}</button>
    </form>
  )
}

export function EnquiryForm({ onDone }: { onDone: (msg: string) => void }) {
  const qc = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans })
  const [f, setF] = useState({ full_name: '', phone: '', source: 'Walk-in', planId: '', notes: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault()
      await addLead({ ...f, planId: f.planId || undefined })
      await qc.invalidateQueries()
      onDone(`Enquiry saved · follow-up added for today`)
    }}>
      <div className="field"><label htmlFor="e-name">Name</label><input id="e-name" className="input" required value={f.full_name} onChange={set('full_name')} /></div>
      <div className="field"><label htmlFor="e-phone">Mobile</label><input id="e-phone" className="input" type="tel" required value={f.phone} onChange={set('phone')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="e-src">Source</label>
          <select id="e-src" className="input" value={f.source} onChange={set('source')}>{['Walk-in', 'Instagram', 'Referral', 'Google', 'WhatsApp', 'Other'].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label htmlFor="e-plan">Interested in</label>
          <select id="e-plan" className="input" value={f.planId} onChange={set('planId')}><option value="">Not sure</option>{plans?.map((p) => <option key={p.id} value={p.id}>{tierLabel[p.tier]}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="e-notes">Notes</label><input id="e-notes" className="input" value={f.notes} onChange={set('notes')} placeholder="Goal, preferred time, injuries…" /></div>
      <button type="submit" className="btn-gold">Save enquiry</button>
    </form>
  )
}

const SLOT_TIMES: Record<string, string[]> = {
  group: ['05:30', '07:00', '16:00', '19:00'],
  semi_private: ['08:30', '17:30'],
  elite: ['10:00', '20:30'],
}

export function NewMemberForm({ onDone }: { onDone: (msg: string, memberId: string) => void }) {
  const qc = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans })
  const [f, setF] = useState({ full_name: '', phone: '', gender: '', planId: '', start: todayISO(), slot: '', discount: '0', paid: '', language: 'en' })
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const plan = plans?.find((p) => p.id === f.planId) ?? plans?.[0]
  const total = Math.max((plan?.price ?? 0) - Number(f.discount || 0), 0)
  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault()
      if (!plan) return
      const r = await addMember({
        full_name: f.full_name, phone: f.phone, gender: (f.gender || undefined) as 'female' | 'male' | undefined, planId: plan.id, startDate: f.start,
        discount: Number(f.discount || 0), paid: f.paid === '' ? total : Number(f.paid), method, slotTime: f.slot || undefined, language: f.language as 'en' | 'te',
      })
      await qc.invalidateQueries()
      onDone(`${f.full_name} added${r.receipt ? ` · receipt ${r.receipt}` : ''}`, r.memberId)
    }}>
      <div className="field"><label htmlFor="m-name">Full name</label><input id="m-name" className="input" required value={f.full_name} onChange={set('full_name')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="m-phone">Mobile</label><input id="m-phone" className="input" type="tel" required value={f.phone} onChange={set('phone')} /></div>
        <div className="field"><label htmlFor="m-gender">Gender</label>
          <select id="m-gender" className="input" value={f.gender} onChange={set('gender')}><option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></div>
      </div>
      <div className="field"><label htmlFor="m-plan">Plan</label>
        <select id="m-plan" className="input" value={plan?.id ?? ''} onChange={(e) => setF({ ...f, planId: e.target.value, slot: '' })}>
          {plans?.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
        </select></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="m-start">Starts</label><input id="m-start" type="date" className="input" value={f.start} onChange={set('start')} /></div>
        <div className="field"><label htmlFor="m-slot">Usual slot</label>
          <select id="m-slot" className="input" value={f.slot} onChange={set('slot')}>
            <option value="">Choose later</option>
            {(SLOT_TIMES[plan?.tier ?? 'group'] ?? []).map((t) => <option key={t} value={t}>{fmtTime(t).full}</option>)}
          </select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field"><label htmlFor="m-disc">Discount (₹)</label><input id="m-disc" className="input" inputMode="numeric" value={f.discount} onChange={set('discount')} /></div>
        <div className="field"><label htmlFor="m-paid">Paid now (₹) · blank = full</label><input id="m-paid" className="input" inputMode="numeric" placeholder={String(total)} value={f.paid} onChange={set('paid')} /></div>
      </div>
      <MethodPicker value={method} onChange={setMethod} />
      <div className="field"><label htmlFor="m-lang">Language for messages</label>
        <select id="m-lang" className="input" value={f.language} onChange={set('language')}><option value="en">English</option><option value="te">తెలుగు (Telugu)</option></select></div>
      <div className="flex items-center justify-between text-[14px]"><span className="text-muted">Total</span><span className="font-display text-[24px] text-gold-light">{money(total)}</span></div>
      <button type="submit" className="btn-gold">Add member</button>
    </form>
  )
}
