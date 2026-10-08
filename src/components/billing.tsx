import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../auth'
import {
  amt, checkCoupon, downgradeSubscription, editSubscription, extendSubscription, freezeSubscription, isOpen, sellSubscriptions,
  transferSubscription, upgradeSubscription, type SellItem, type Sub,
} from '../db/billing'
import { findByCode } from '../db/clients'
import { useBatches, useList, usePlans, useServices, useStudio, useTeam } from '../db/studio'
import type { Plan } from '../db/types'
import { fmtClock, fmtDay, daysFrom, planEndDate, plusDays, studioToday } from '../lib/dates'
import { Checkbox, Field, MultiSelect, Notice, RadioGroup, Select, TextInput, opts } from './controls'
import { useToast } from './toast'
import { Sheet } from './ui'

// YDL "Membership Actions" pop-ups on a client's profile.

export type ActionKind = 'add' | 'renew' | 'pt' | 'renew_pt' | 'trial' | 'freeze' | 'extend' | 'transfer' | 'upgrade' | 'downgrade' | 'edit'
export interface ActionTarget { kind: ActionKind; memberId: string; memberName: string; memberLine: string; subs: Sub[]; sub?: Sub }

const TITLES: Record<ActionKind, string> = {
  add: 'Add Subscription', renew: 'Renew Subscription', pt: 'Assign Personal Training', renew_pt: 'Renew Personal Training',
  trial: 'Book a Trial', freeze: 'Freeze Subscription', extend: 'Extend Subscription', transfer: 'Transfer Subscription',
  upgrade: 'Upgrade Subscription', downgrade: 'Downgrade Subscription', edit: 'Edit Subscription',
}

export function MembershipActionDialog({ target, onClose }: { target: ActionTarget | null; onClose: () => void }) {
  const wide = !!target && ['add', 'renew', 'pt', 'renew_pt', 'upgrade', 'downgrade', 'trial'].includes(target.kind)
  return (
    <Sheet wide={wide} open={!!target} onClose={onClose} title={target ? TITLES[target.kind] : ''}>
      {target && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line px-4 py-3">
            <div className="text-[15px] font-bold">{target.memberName}</div>
            <div className="text-[12px] text-muted">{target.memberLine}</div>
          </div>
          {['add', 'renew', 'pt', 'renew_pt', 'trial'].includes(target.kind) && <SellForm target={target} onDone={onClose} />}
          {target.kind === 'freeze' && <FreezeForm target={target} onDone={onClose} />}
          {target.kind === 'extend' && <ExtendForm target={target} onDone={onClose} />}
          {target.kind === 'transfer' && <TransferForm target={target} onDone={onClose} />}
          {(target.kind === 'upgrade' || target.kind === 'downgrade') && <ChangePlanForm target={target} onDone={onClose} />}
          {target.kind === 'edit' && target.sub && <EditForm sub={target.sub} onDone={onClose} />}
        </div>
      )}
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
const subLabel = (s: Sub) => `${s.plan_name} (${fmtDay(s.start_date, 'dd/MM/yyyy')} - ${fmtDay(s.end_date, 'dd/MM/yyyy')})`
const tenureLabel = (p: Pick<Plan, 'tenure_value' | 'tenure_unit'>) =>
  `${p.tenure_value} ${p.tenure_value === 1 ? p.tenure_unit.replace(/s$/, '') : p.tenure_unit}`

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    for (const k of ['subs', 'clients', 'receipts', 'dashboard', 'followups', 'registers']) qc.invalidateQueries({ queryKey: [k] })
  }
}

function PlanNote({ plan }: { plan?: Plan }) {
  const { data: services = [] } = useServices()
  if (!plan) return null
  const names = services.filter((s) => plan.service_ids.includes(s.id)).map((s) => s.custom_name ?? s.name)
  return <p className="m-0 text-[12px] text-muted">The selected membership plan has a tenure of {tenureLabel(plan)} for the categories {names.join(', ') || '—'}.</p>
}

function Actions({ onCancel, busy, label }: { onCancel: () => void; busy: boolean; label: string }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" className="btn flex-1" onClick={onCancel}>Close</button>
      <button type="submit" className="btn-gold flex-1" disabled={busy}>{busy ? 'Saving…' : label}</button>
    </div>
  )
}

function useModes() {
  return opts(useList('payment_mode').map((i) => i.label))
}

/** Look up a client by member code, enquiry code or phone (YDL "Lookup Member code"). */
function ClientLookup({ label, onFound, exclude, required }: { label: string; onFound: (c: { id: string; label: string } | null) => void; exclude?: string; required?: boolean }) {
  const me = useMe()
  const [code, setCode] = useState('')
  const [found, setFound] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const look = async () => {
    setErr(null)
    const rows = (await findByCode(me.studioId, code)).filter((r) => r.id !== exclude)
    if (!rows.length) { setFound(null); onFound(null); setErr('No client found with that code or number'); return }
    const r = rows[0]
    setFound(`${r.client_code ?? ''} ${r.full_name}`)
    onFound({ id: r.id, label: `${r.client_code ?? ''} ${r.full_name}` })
  }
  return (
    <Field label={label} required={required} id="lookup" error={err} hint={found ? `Found: ${found}` : undefined}>
      <div className="flex gap-2">
        <TextInput id="lookup" value={code} onChange={(v) => { setCode(v); setFound(null); onFound(null) }} placeholder="Enter Member Code/Enquiry Code/Phone Number" />
        <button type="button" className="btn btn-sm flex-none" onClick={look}>Lookup</button>
      </div>
    </Field>
  )
}

// ---------------------------------------------------------------------------
// Add / Renew Subscription · Assign / Renew Personal Training · Book a Trial
// ---------------------------------------------------------------------------
interface Row { key: number; plan_id: string; start: string; end: string; base: string; price: string; coupon: string; discount: number; couponMsg: string | null }

function SellForm({ target, onDone }: { target: ActionTarget; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const { data: studio } = useStudio()
  const { data: plans = [] } = usePlans()
  const { data: batches = [] } = useBatches()
  const team = useTeam()
  const pt = target.kind === 'pt' || target.kind === 'renew_pt'
  const trial = target.kind === 'trial'
  const today = studioToday()

  const choices = plans.filter((p) => p.active && (trial ? p.is_free_trial : !p.is_free_trial && p.kind === (pt ? 'pt' : 'gym')))
  const renewables = target.subs.filter((s) => s.kind === (pt ? 'pt' : 'gym') && !['cancelled', 'deleted', 'transferred', 'upgraded', 'downgraded'].includes(s.state))
  const blank = (key: number, start = today): Row => ({ key, plan_id: '', start, end: '', base: '', price: '', coupon: '', discount: 0, couponMsg: null })
  const [rows, setRows] = useState<Row[]>([blank(1)])
  const [renewFrom, setRenewFrom] = useState('')
  const [trainer, setTrainer] = useState('')
  const [second, setSecond] = useState<string[]>([])
  const [points, setPoints] = useState('0')
  const [sessions, setSessions] = useState('')
  const [group, setGroup] = useState<{ id: string; label: string } | null>(null)
  const [divide, setDivide] = useState('0')
  const [signUp, setSignUp] = useState('0')
  const [batchIds, setBatchIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const planOf = (id: string) => plans.find((p) => p.id === id)
  const setRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const choosePlan = (key: number, id: string) => {
    const p = planOf(id)
    const row = rows.find((r) => r.key === key)!
    setRow(key, {
      plan_id: id, base: p ? String(p.price) : '', price: p ? String(p.total_price) : '',
      end: p ? planEndDate(row.start, p.tenure_value, p.tenure_unit) : '', coupon: '', discount: 0, couponMsg: null,
    })
    if (p && (pt || trial)) setSessions(p.session_count != null ? String(p.session_count) : '')
  }
  const chooseStart = (key: number, start: string) => {
    const r = rows.find((x) => x.key === key)!
    const p = planOf(r.plan_id)
    setRow(key, { start, end: p ? planEndDate(start, p.tenure_value, p.tenure_unit) : r.end })
  }
  const chooseRenew = (id: string) => {
    setRenewFrom(id)
    const s = target.subs.find((x) => x.id === id)
    if (!s) return
    const start = s.end_date >= today ? plusDays(s.end_date, 1) : today
    const p = planOf(s.plan_id)
    setRows([{ ...blank(1, start), plan_id: s.plan_id, base: p ? String(p.price) : '', price: p ? String(p.total_price) : '',
      end: p ? planEndDate(start, p.tenure_value, p.tenure_unit) : '' }])
    if (pt) { setTrainer(s.trainer_id ?? ''); setSecond(s.second_trainer_ids ?? []); if (p?.session_count != null) setSessions(String(p.session_count)) }
  }

  const applyCoupon = async (r: Row) => {
    if (!r.plan_id || !r.coupon.trim()) return setRow(r.key, { couponMsg: 'Choose the plan and enter a coupon code' })
    const res = await checkCoupon(me.studioId, r.coupon, r.plan_id, target.memberId, Number(r.price || 0) + Number(signUp || 0))
    setRow(r.key, { discount: res.ok ? res.discount ?? 0 : 0, couponMsg: res.message })
  }

  const gst = studio?.settings.gst?.enabled ? Number(studio.settings.gst.rate ?? 0) : 0
  const totals = useMemo(() => {
    const mrp = rows.reduce((s, r) => s + Number(r.base || 0), 0)
    const price = rows.reduce((s, r) => s + Number(r.price || 0), 0)
    const coupon = rows.reduce((s, r) => s + r.discount, 0)
    const fee = Number(signUp || 0)
    const net = Math.max(price + fee - coupon, 0)
    const tax = Math.round(net * gst) / 100
    return { mrp, discount: Math.max(mrp - price, 0), price, fee, coupon, net, tax, total: net + tax }
  }, [rows, signUp, gst])

  const sell = useMutation({
    mutationFn: () => {
      const items: SellItem[] = rows.map((r, i) => ({
        plan_id: r.plan_id, start_date: r.start, end_date: r.end, base_price: Number(r.base || 0), selling_price: Number(r.price || 0),
        sign_up_fee: i === 0 ? Number(signUp || 0) : 0, coupon_code: r.discount > 0 ? r.coupon.trim() : undefined,
        ...(pt || trial ? { trainer_id: trainer || undefined, sessions_total: sessions ? Number(sessions) : null } : {}),
        ...(pt ? { second_trainer_ids: second, pt_points: Number(points || 0) } : {}),
        ...(trial ? { kind: 'trial' as const } : {}),
      }))
      return sellSubscriptions({
        member_id: target.memberId, items, batch_ids: batchIds,
        group_member_ids: group ? [group.id] : [], divide_sessions: divide === '1',
      })
    },
    onSuccess: (ids) => {
      invalidate()
      toast(trial ? 'Trial booked' : 'Subscription added')
      onDone()
      if (!trial || totals.total > 0) navigate(`/clients/${target.memberId}/payments/${ids[0]}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  const submit = () => {
    setError(null)
    if (rows.some((r) => !r.plan_id)) return setError('Select the membership for every row.')
    if (rows.some((r) => !r.start || !r.end)) return setError('Enter the start and end dates.')
    if (rows.some((r) => r.end < r.start)) return setError('An end date is before its start date.')
    if ((pt || trial) && !trainer) return setError('Assign a trainer.')
    if (pt && !sessions) return setError('Enter the total sessions.')
    sell.mutate()
  }

  const batchOptions = batches.filter((b) => b.active).map((b) => ({ value: b.id, label: `${fmtClock(b.start_time)} - ${fmtClock(b.end_time)} · ${b.name}` }))
  const trainerOptions = team.trainers.map((t) => ({ value: t.id, label: `${t.full_name} (${t.staff_code})` }))
  const priceLocked = trial

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
      {!trial && (
        <Field label={pt ? 'Select Renew Membership' : 'Membership Plan to Renew'} id="renew">
          <Select id="renew" value={renewFrom} onChange={chooseRenew} placeholder="Select Membership Plan to Renew"
            options={renewables.map((s) => ({ value: s.id, label: `${s.plan_name} (${Math.max(s.days_left, 0)} days)` }))} />
        </Field>
      )}
      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-[14px] font-bold">Membership Selection</h3>
        {rows.map((r, i) => (
          <div key={r.key} className="flex flex-col gap-3 rounded-xl border border-line p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Select Membership" required id={`plan-${r.key}`}>
                <Select id={`plan-${r.key}`} value={r.plan_id} onChange={(v) => choosePlan(r.key, v)} placeholder="Select Membership"
                  options={choices.map((p) => ({ value: p.id, label: `${p.name} [${tenureLabel(p)}]` }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date" required id={`start-${r.key}`}><TextInput id={`start-${r.key}`} type="date" value={r.start} onChange={(v) => chooseStart(r.key, v)} /></Field>
                <Field label="End Date" required id={`end-${r.key}`}><TextInput id={`end-${r.key}`} type="date" value={r.end} onChange={(v) => setRow(r.key, { end: v })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base Price" id={`base-${r.key}`}><TextInput id={`base-${r.key}`} value={r.base} onChange={() => {}} className="opacity-70" /></Field>
                <Field label={trial ? 'Price' : 'Selling Price'} required id={`price-${r.key}`}>
                  <TextInput id={`price-${r.key}`} type="number" inputMode="decimal" value={r.price} onChange={(v) => !priceLocked && setRow(r.key, { price: v, discount: 0, couponMsg: null })} />
                </Field>
              </div>
              {!trial && (
                <Field label="Coupon Code" id={`coupon-${r.key}`} hint={r.couponMsg ?? undefined}>
                  <div className="flex gap-2">
                    <TextInput id={`coupon-${r.key}`} value={r.coupon} onChange={(v) => setRow(r.key, { coupon: v, discount: 0, couponMsg: null })} />
                    <button type="button" className="btn btn-sm flex-none" onClick={() => applyCoupon(r)}>Apply</button>
                  </div>
                </Field>
              )}
            </div>
            <PlanNote plan={planOf(r.plan_id)} />
            {rows.length > 1 && <button type="button" className="link-btn self-start text-[13px] text-red" onClick={() => setRows(rows.filter((x) => x.key !== r.key))}>Remove this plan</button>}
            {i === rows.length - 1 && !pt && !trial && (
              <button type="button" className="btn btn-sm self-start" onClick={() => setRows([...rows, blank(r.key + 1)])}>Add more plan</button>
            )}
          </div>
        ))}
      </div>

      {(pt || trial) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Assign Trainer" required id="trainer"><Select id="trainer" value={trainer} onChange={setTrainer} placeholder="Select Trainer" options={trainerOptions} /></Field>
          {pt && <Field label="Assign Secondary Trainer" id="second"><MultiSelect id="second" values={second} onChange={setSecond} options={trainerOptions.filter((t) => t.value !== trainer)} placeholder="Select" /></Field>}
          {pt && <Field label="Total Points" id="points"><TextInput id="points" type="number" value={points} onChange={setPoints} /></Field>}
          <Field label={trial ? 'Total PT Sessions' : 'Total Sessions'} required={pt} id="sessions"><TextInput id="sessions" type="number" value={sessions} onChange={setSessions} /></Field>
        </div>
      )}

      {!trial && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ClientLookup label="Group Members Id" exclude={target.memberId} onFound={setGroup} />
          {pt && group && (
            <RadioGroup name="divide" legend="Divide sessions between group members" value={divide} onChange={setDivide}
              options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]} />
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="tbl">
          <tbody>
            <tr><td>MRP</td><td className="num">{amt(totals.mrp)}</td></tr>
            <tr><td>Discount</td><td className="num">{amt(totals.discount)}</td></tr>
            <tr><td>Net Sales Amount</td><td className="num">{amt(totals.price)}</td></tr>
            <tr><td><label htmlFor="signup">Sign Up Fee</label></td><td className="num">
              {trial ? amt(0) : <input id="signup" className="input input-sm w-28 text-right" type="number" value={signUp} onChange={(e) => setSignUp(e.target.value)} />}
            </td></tr>
            <tr><td>Coupon Applied</td><td className="num">{amt(totals.coupon)}</td></tr>
            <tr><td>Taxes -CGST@{gst / 2}%</td><td className="num">{amt(totals.tax / 2)}</td></tr>
            <tr><td>Taxes -SGST@{gst / 2}%</td><td className="num">{amt(totals.tax / 2)}</td></tr>
            <tr><td className="font-bold">Total Amount to be Paid</td><td className="num font-bold">{amt(totals.total)}</td></tr>
          </tbody>
        </table>
      </div>

      {!trial && (
        <Field label="Select A Batch" id="batches" hint="Choose one or more, or none">
          <MultiSelect id="batches" options={batchOptions} values={batchIds} onChange={setBatchIds} placeholder="Select a batch (none for no batch)" />
        </Field>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <Actions onCancel={onDone} busy={sell.isPending} label="Add Subscription" />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Freeze · Extension · Transfer
// ---------------------------------------------------------------------------
function SubSelect({ target, value, onChange, filter, placeholder = 'Select Subscription' }: {
  target: ActionTarget; value: string; onChange: (v: string) => void; filter?: (s: Sub) => boolean; placeholder?: string
}) {
  const subs = target.subs.filter((s) => s.status === 'live' && isOpen(s) && s.kind !== 'trial' && (filter ? filter(s) : true))
  return (
    <Field label="Select Membership" required id="sub">
      <Select id="sub" value={value} onChange={onChange} placeholder={placeholder} options={subs.map((s) => ({ value: s.id, label: subLabel(s) }))} />
    </Field>
  )
}

function FeeFields({ fee, setFee, mode, setMode, label }: { fee: string; setFee: (v: string) => void; mode: string; setMode: (v: string) => void; label: string }) {
  const modes = useModes()
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={label} id="fee"><TextInput id="fee" type="number" inputMode="decimal" value={fee} onChange={setFee} /></Field>
      {Number(fee) > 0 && <Field label="Payment Method" id="feemode"><Select id="feemode" value={mode} onChange={setMode} options={modes} /></Field>}
    </div>
  )
}

function FreezeForm({ target, onDone }: { target: ActionTarget; onDone: () => void }) {
  const toast = useToast()
  const invalidate = useInvalidate()
  const [subId, setSubId] = useState(target.sub?.id ?? '')
  const [start, setStart] = useState(studioToday())
  const [days, setDays] = useState('')
  const [fee, setFee] = useState('0')
  const [mode, setMode] = useState('CASH')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const sub = target.subs.find((s) => s.id === subId)
  const m = useMutation({
    mutationFn: () => freezeSubscription({ subscription_id: subId, start_date: start, days: Number(days), fee: Number(fee || 0), mode, note }),
    onSuccess: () => { invalidate(); toast('Subscription frozen'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-3.5" noValidate onSubmit={(e) => { e.preventDefault(); setError(null); if (!subId || !days) setError('Select the subscription and the days to freeze.'); else m.mutate() }}>
      <p className="m-0 text-[13px] text-muted">Select the Customer's Subscription plan you wish to freeze.</p>
      <SubSelect target={target} value={subId} onChange={setSubId} />
      {sub && <p className="m-0 text-[12px] text-muted">This plan allows {sub.plan_freeze_days} freeze days; {sub.frozen_days} used. Ends {fmtDay(sub.end_date)}.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Freeze Start Date" id="fstart"><TextInput id="fstart" type="date" value={start} onChange={setStart} /></Field>
        <Field label="Freeze for Days" required id="fdays"><TextInput id="fdays" type="number" value={days} onChange={setDays} /></Field>
      </div>
      <FeeFields fee={fee} setFee={setFee} mode={mode} setMode={setMode} label="Freeze Fees" />
      <Field label="Add Note" id="fnote"><TextInput id="fnote" value={note} onChange={setNote} /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Actions onCancel={onDone} busy={m.isPending} label="Freeze Subscription" />
    </form>
  )
}

function ExtendForm({ target, onDone }: { target: ActionTarget; onDone: () => void }) {
  const toast = useToast()
  const invalidate = useInvalidate()
  const [subId, setSubId] = useState(target.sub?.id ?? '')
  const [days, setDays] = useState('')
  const [fee, setFee] = useState('0')
  const [mode, setMode] = useState('CASH')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const sub = target.subs.find((s) => s.id === subId)
  const m = useMutation({
    mutationFn: () => extendSubscription({ subscription_id: subId, days: Number(days), fee: Number(fee || 0), mode, note }),
    onSuccess: () => { invalidate(); toast('Subscription extended'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-3.5" noValidate onSubmit={(e) => { e.preventDefault(); setError(null); if (!subId || !days) setError('Select the subscription and the extension days.'); else m.mutate() }}>
      <p className="m-0 text-[13px] text-muted">Select the Customer's Subscription plan you wish to Extend.</p>
      <SubSelect target={target} value={subId} onChange={setSubId} />
      <Notice>Your Extension starts from the next day of selected Subscription End date{sub ? ` (${fmtDay(plusDays(sub.end_date, 1))})` : ''}.</Notice>
      <Field label="Extension Days" required id="edays"><TextInput id="edays" type="number" value={days} onChange={setDays} /></Field>
      {sub && Number(days) > 0 && <p className="m-0 text-[12px] text-muted">New end date: {fmtDay(plusDays(sub.end_date, Number(days)))}</p>}
      <FeeFields fee={fee} setFee={setFee} mode={mode} setMode={setMode} label="Extension Fees" />
      <Field label="Extension Note" id="enote"><TextInput id="enote" value={note} onChange={setNote} /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Actions onCancel={onDone} busy={m.isPending} label="Extend Subscription" />
    </form>
  )
}

function TransferForm({ target, onDone }: { target: ActionTarget; onDone: () => void }) {
  const toast = useToast()
  const invalidate = useInvalidate()
  const [subId, setSubId] = useState(target.sub?.id ?? '')
  const [to, setTo] = useState<{ id: string; label: string } | null>(null)
  const [start, setStart] = useState(studioToday())
  const [fee, setFee] = useState('0')
  const [mode, setMode] = useState('CASH')
  const [error, setError] = useState<string | null>(null)
  const sub = target.subs.find((s) => s.id === subId)
  const left = sub ? Math.max(daysFrom(studioToday() > sub.start_date ? studioToday() : sub.start_date, sub.end_date), 0) : 0
  const m = useMutation({
    mutationFn: () => transferSubscription({ subscription_id: subId, to_member_id: to!.id, start_date: start, fee: Number(fee || 0), mode }),
    onSuccess: () => { invalidate(); toast('Subscription transferred'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-3.5" noValidate onSubmit={(e) => { e.preventDefault(); setError(null); if (!subId || !to) setError('Select the subscription and the client to transfer to.'); else m.mutate() }}>
      <p className="m-0 text-[13px] text-muted">Select the Customer's Subscription plan you wish to transfer.</p>
      <SubSelect target={target} value={subId} onChange={setSubId} />
      <ClientLookup label="Member Code/Enquiry Code" required exclude={target.memberId} onFound={setTo} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date" required id="tstart"><TextInput id="tstart" type="date" value={start} onChange={setStart} /></Field>
        <Field label="End Date" id="tend"><TextInput id="tend" value={sub ? fmtDay(plusDays(start, left)) : ''} onChange={() => {}} className="opacity-70" /></Field>
      </div>
      <FeeFields fee={fee} setFee={setFee} mode={mode} setMode={setMode} label="Transfer Fees" />
      {error && <Notice tone="error">{error}</Notice>}
      <Actions onCancel={onDone} busy={m.isPending} label="Transfer Subscription" />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Upgrade · Downgrade
// ---------------------------------------------------------------------------
function ChangePlanForm({ target, onDone }: { target: ActionTarget; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const { data: plans = [] } = usePlans()
  const up = target.kind === 'upgrade'
  const [subId, setSubId] = useState(target.sub?.id ?? '')
  const [planId, setPlanId] = useState('')
  const [start, setStart] = useState(studioToday())
  const [end, setEnd] = useState('')
  const [price, setPrice] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponOff, setCouponOff] = useState(0)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [groupOn, setGroupOn] = useState(false)
  const [note, setNote] = useState('')
  const [trainer, setTrainer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const team = useTeam()
  const sub = target.subs.find((s) => s.id === subId)
  const plan = plans.find((p) => p.id === planId)
  const needsTrainer = plan?.kind === 'pt' && !sub?.trainer_id
  const paid = sub?.paid_amount ?? 0
  const difference = plan ? Math.max(plan.total_price - paid, 0) : 0
  const refund = plan && !up ? Math.max(paid - plan.total_price, 0) : 0
  const choices = plans.filter((p) => p.active && !p.is_free_trial && p.id !== sub?.plan_id
    && (!sub ? true : up ? p.total_price >= (sub.total_amount ?? 0) : p.total_price <= (sub.total_amount ?? 0)))

  const pick = (id: string) => {
    setPlanId(id)
    const p = plans.find((x) => x.id === id)
    if (!p || !sub) return
    const s = up ? sub.start_date : start
    setEnd(planEndDate(s, p.tenure_value, p.tenure_unit))
    setPrice(String(Math.max(p.total_price - paid, 0)))
    setCouponOff(0); setCouponMsg(null)
  }
  const pickSub = (id: string) => { setSubId(id); setPlanId(''); setEnd(''); setPrice('') }
  const apply = async () => {
    if (!planId || !coupon.trim()) return setCouponMsg('Choose the membership and enter a coupon code')
    const r = await checkCoupon(me.studioId, coupon, planId, target.memberId, Number(price || 0))
    setCouponOff(r.ok ? r.discount ?? 0 : 0); setCouponMsg(r.message)
  }
  const m = useMutation({
    mutationFn: () => up
      ? upgradeSubscription({ subscription_id: subId, plan_id: planId, end_date: end, selling_price: Number(price || 0), coupon_code: couponOff ? coupon : undefined, group: groupOn, trainer_id: trainer || undefined })
      : downgradeSubscription({ subscription_id: subId, plan_id: planId, start_date: start, end_date: end, selling_price: Number(price || 0), note, group: groupOn, trainer_id: trainer || undefined }),
    onSuccess: (id) => {
      invalidate(); toast(up ? 'Subscription upgraded' : 'Subscription downgraded'); onDone()
      if (Number(price || 0) - couponOff > 0) navigate(`/clients/${target.memberId}/payments/${id}`)
    },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-3.5" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      if (!subId || !planId || !end) setError('Select the subscription, the new membership and the dates.')
      else if (needsTrainer && !trainer) setError('Assign a trainer for this personal training plan.')
      else m.mutate()
    }}>
      <p className="m-0 text-[13px] text-muted">Select the Customer's Subscription plan you wish to {up ? 'upgrade' : 'Downgrade'}.</p>
      <SubSelect target={target} value={subId} onChange={pickSub} placeholder={up ? 'Select Subscription you wish to upgrade' : 'Select Subscription'} />
      <Checkbox checked={groupOn} onChange={setGroupOn} label="Group: check Group to add subscription" />
      <Field label={up ? 'Upgrade to Membership' : 'Downgrade to Membership'} required id="newplan">
        <Select id="newplan" value={planId} onChange={pick} placeholder={up ? 'Select Membership Upgrade to' : 'Please Select Subscription'}
          options={choices.map((p) => ({ value: p.id, label: `${p.name} [${tenureLabel(p)}] · ${amt(p.total_price)}` }))} />
      </Field>
      <PlanNote plan={plan} />
      {plan?.kind === 'pt' && (
        <Field label="Assign Trainer" required={needsTrainer} id="ctrainer" hint={sub?.trainer_name ? `Currently ${sub.trainer_name}` : undefined}>
          <Select id="ctrainer" value={trainer} onChange={setTrainer} placeholder={sub?.trainer_name ? 'Keep the current trainer' : 'Select Trainer'}
            options={team.trainers.map((t) => ({ value: t.id, label: `${t.full_name} (${t.staff_code})` }))} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date" id="cstart">
          {up ? <TextInput id="cstart" value={sub ? fmtDay(sub.start_date) : ''} onChange={() => {}} className="opacity-70" />
            : <TextInput id="cstart" type="date" value={start} onChange={(v) => { setStart(v); if (plan) setEnd(planEndDate(v, plan.tenure_value, plan.tenure_unit)) }} />}
        </Field>
        <Field label="End Date" required id="cend"><TextInput id="cend" type="date" value={end} onChange={setEnd} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Base Price" id="cbase"><TextInput id="cbase" value={plan ? amt(plan.total_price) : ''} onChange={() => {}} className="opacity-70" /></Field>
        <Field label={up ? 'Subscription Paid Price' : 'Previous Plan Paid Amount'} id="cpaid"><TextInput id="cpaid" value={sub ? amt(paid) : ''} onChange={() => {}} className="opacity-70" /></Field>
        <Field label="Sales Price" required id="cprice"><TextInput id="cprice" type="number" value={price} onChange={(v) => { setPrice(v); setCouponOff(0) }} /></Field>
      </div>
      {up && (
        <Field label="Coupon Code" id="ccoupon" hint={couponMsg ?? 'Have a coupon? Apply it to get a discount on the upgrade price.'}>
          <div className="flex gap-2"><TextInput id="ccoupon" value={coupon} onChange={(v) => { setCoupon(v); setCouponOff(0) }} placeholder="Enter coupon code" /><button type="button" className="btn btn-sm flex-none" onClick={apply}>Apply</button></div>
        </Field>
      )}
      <div className="card overflow-hidden">
        <table className="tbl"><tbody>
          <tr><td>New Plan Price</td><td className="num">{plan ? amt(plan.total_price) : '—'}</td></tr>
          <tr><td>Paid on Current Subscription</td><td className="num">{sub ? amt(paid) : '—'}</td></tr>
          <tr><td>Difference to Pay (Base − Paid)</td><td className="num">{plan ? amt(difference) : '—'}</td></tr>
          {!up && <tr><td>Refund Amount</td><td className="num">{plan ? amt(refund) : '—'}</td></tr>}
          {Number(price || 0) !== difference && plan && <tr><td>Manual Price Override</td><td className="num">CUSTOM</td></tr>}
          {up && <tr><td>Coupon Discount</td><td className="num">{amt(couponOff)}</td></tr>}
          <tr><td className="font-bold">Final Sales Price</td><td className="num font-bold">{amt(Math.max(Number(price || 0) - couponOff, 0))}</td></tr>
        </tbody></table>
      </div>
      {!up && <>
        <Field label="Add Note" id="cnote"><TextInput id="cnote" value={note} onChange={setNote} /></Field>
        {refund > 0 && <Notice>Note: This refund amount will be visible in the Downgrade register.</Notice>}
      </>}
      {error && <Notice tone="error">{error}</Notice>}
      <Actions onCancel={onDone} busy={m.isPending} label={up ? 'Upgrade Subscription' : 'Downgrade Subscription'} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Edit Subscription
// ---------------------------------------------------------------------------
function EditForm({ sub, onDone }: { sub: Sub; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const invalidate = useInvalidate()
  const team = useTeam()
  const { data: plans = [] } = usePlans()
  const [start, setStart] = useState(sub.start_date)
  const [end, setEnd] = useState(sub.end_date)
  const [trainer, setTrainer] = useState(sub.trainer_id ?? '')
  const [second, setSecond] = useState<string[]>(sub.second_trainer_ids ?? [])
  const [sessions, setSessions] = useState(sub.sessions_total != null ? String(sub.sessions_total) : '')
  const [invDate, setInvDate] = useState(sub.invoice_date)
  const [invNo, setInvNo] = useState(sub.invoice_no ?? '')
  const [error, setError] = useState<string | null>(null)
  const owner = me.role === 'owner'
  const plan = plans.find((p) => p.id === sub.plan_id)
  const trainerOptions = team.trainers.map((t) => ({ value: t.id, label: `${t.full_name} (${t.staff_code})` }))
  const m = useMutation({
    mutationFn: () => editSubscription({
      subscription_id: sub.id, start_date: start, end_date: end, trainer_id: trainer || null, second_trainer_ids: second,
      sessions_total: sessions ? Number(sessions) : null,
      ...(owner ? { invoice_date: invDate, invoice_no: invNo } : {}),
    }),
    onSuccess: () => { invalidate(); toast('Subscription updated'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-3.5" noValidate onSubmit={(e) => { e.preventDefault(); setError(null); m.mutate() }}>
      <div className="text-[14px] font-semibold">{sub.plan_name}</div>
      <PlanNote plan={plan} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date" id="es"><TextInput id="es" type="date" value={start} onChange={setStart} /></Field>
        <Field label="End Date" id="ee"><TextInput id="ee" type="date" value={end} onChange={setEnd} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Assign Trainer" required={sub.kind === 'pt'} id="et"><Select id="et" value={trainer} onChange={setTrainer} placeholder="Select Trainer" options={trainerOptions} /></Field>
        <Field label="Assign Secondary Trainer" id="es2"><MultiSelect id="es2" values={second} onChange={setSecond} options={trainerOptions.filter((t) => t.value !== trainer)} /></Field>
        <Field label="Total Sessions" id="ets"><TextInput id="ets" type="number" value={sessions} onChange={setSessions} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Invoice date" id="eid" hint={owner ? undefined : 'Only the owner can change this'}><TextInput id="eid" type="date" value={invDate} onChange={(v) => owner && setInvDate(v)} /></Field>
        <Field label="Invoice No." id="ein"><TextInput id="ein" value={invNo} onChange={(v) => owner && setInvNo(v)} /></Field>
      </div>
      <div className="card overflow-hidden">
        <table className="tbl"><tbody>
          <tr><td>Paid Plan Price</td><td className="num">{amt(sub.selling_price)}</td></tr>
          <tr><td>Sign Up Fee</td><td className="num">{amt(sub.sign_up_fee)}</td></tr>
          <tr><td>Taxes -CGST@{sub.gst_rate / 2}%</td><td className="num">{amt(sub.gst_amount / 2)}</td></tr>
          <tr><td>Taxes -SGST@{sub.gst_rate / 2}%</td><td className="num">{amt(sub.gst_amount / 2)}</td></tr>
          <tr><td className="font-bold">Total Amount</td><td className="num font-bold">{amt(sub.total_amount)}</td></tr>
        </tbody></table>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <Actions onCancel={onDone} busy={m.isPending} label="Save" />
    </form>
  )
}
