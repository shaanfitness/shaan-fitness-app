import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, usePlans, useServices, useStudio, useTeam } from '../../db/studio'
import { amt } from '../../db/billing'
import { COUPON_TYPES, couponTypeLabel, type ComboRow, type CouponRow } from '../../db/team'
import { fmtDay } from '../../lib/dates'
import { ClientLookup } from '../../components/billing'
import { ActionMenu, Field, Notice, Select, TextArea, TextInput } from '../../components/controls'
import { BulkBar } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL Memberships › Coupon ("Create Coupon", "Coupon Listing") and Combo Offer
// ("Create Combo Offer", "Combo Offer Listing").

const studioLine = (s?: { name: string; branch_name: string | null }) => `${s?.name ?? ''}${s?.branch_name ? ` (${s.branch_name})` : ''}`
type Act = 'delete' | 'deactivate' | 'activate'

function Confirm({ open, question, note, danger, busy, onNo, onYes }: { open: boolean; question: string; note?: string; danger?: boolean; busy?: boolean; onNo: () => void; onYes: () => void }) {
  return (
    <Sheet open={open} onClose={onNo} title="Are you sure?">
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[15px]">{question}</p>
        {note && <p className="m-0 text-[13px] text-muted">{note}</p>}
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onNo}>No</button>
          <button type="button" className={`flex-1 ${danger ? 'btn btn-danger' : 'btn-gold'}`} disabled={busy} onClick={onYes}>Yes</button></div>
      </div>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Coupon Listing
// ---------------------------------------------------------------------------
export function CouponList() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { action: Act; ids: string[] }>(null)
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupon-list', me.studioId],
    queryFn: async () => throwIf(await supabase.from('coupon_overview').select('*').eq('studio_id', me.studioId).order('created_at', { ascending: false })) as CouponRow[],
  })
  const rows = useMemo(() => coupons.filter((c) => !search || `${c.name} ${c.code}`.toLowerCase().includes(search.toLowerCase())), [coupons, search])
  const act = useMutation({
    mutationFn: async ({ action, ids }: { action: Act; ids: string[] }) => {
      if (action === 'delete') {
        if (coupons.some((c) => ids.includes(c.id) && (c.used_count ?? 0) > 0)) throw new Error('A coupon that has been used can’t be deleted. Deactivate it instead.')
        throwIf(await supabase.from('coupons').delete().in('id', ids).select('id'))
      } else throwIf(await supabase.from('coupons').update({ active: action === 'activate' }).in('id', ids).select('id'))
      return { action, n: ids.length }
    },
    onSuccess: ({ action, n }) => {
      qc.invalidateQueries({ queryKey: ['coupon-list'] }); qc.invalidateQueries({ queryKey: ['coupons'] }); setSelected(new Set()); setConfirm(null)
      toast(`${n} ${n === 1 ? 'coupon' : 'coupons'} ${action === 'delete' ? 'deleted' : action + 'd'}`)
    },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const rule = (c: CouponRow) => [c.service_name, c.plan_name, c.member_name ? `only ${c.member_name}` : null,
    c.who_can_use === 'new' ? 'New members' : c.who_can_use === 'existing' ? 'Existing members' : null,
    c.min_order ? `min ${amt(c.min_order)}` : null, c.max_order ? `max ${amt(c.max_order)}` : null, c.max_discount ? `up to ${amt(c.max_discount)} off` : null,
    c.expiry_date ? `till ${fmtDay(c.expiry_date)}` : null].filter(Boolean).join(' · ')
  return (
    <>
      <PageHeader title="Coupon Listing" sub={studioLine(studio)}
        actions={<Link to="/coupons/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Create Coupon</Link>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <div className="relative max-w-[480px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={setSearch} placeholder="Search" className="pl-9" />
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: 'deactivate', ids: [...selected] })}>Deactivate</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: 'activate', ids: [...selected] })}>Activate</button>
        </BulkBar>
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No coupons yet.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 44 }}><input type="checkbox" className="check" aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
                <th>Coupon Name</th><th>Coupon Code</th><th>Coupon Type</th><th className="num">Used</th><th>Status</th><th>Action</th>
              </tr></thead>
              <tbody>{rows.map((c) => (
                <tr key={c.id}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${c.name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} /></td>
                  <td><div className="font-semibold">{c.name}</div><div className="max-w-[360px] text-[12px] text-muted">{rule(c)}</div></td>
                  <td><code className="text-[13px]">{c.code}</code></td>
                  <td>{couponTypeLabel(c.type)}<div className="text-[12px] text-muted">{c.type.startsWith('percentage') ? `${c.discount}%` : c.type === 'installments' ? `${c.installments} installments` : amt(c.discount)}</div></td>
                  <td className="num">{c.used_count ?? 0}</td>
                  <td>{c.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>}</td>
                  <td><ActionMenu actions={[
                    { label: 'Edit', onClick: () => navigate(`/coupons/${c.id}/edit`) },
                    { label: c.active ? 'Deactivate' : 'Activate', onClick: () => setConfirm({ action: c.active ? 'deactivate' : 'activate', ids: [c.id] }) },
                    { label: 'Delete', danger: true, onClick: () => setConfirm({ action: 'delete', ids: [c.id] }) },
                  ]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Confirm open={!!confirm} danger={confirm?.action === 'delete'} busy={act.isPending} onNo={() => setConfirm(null)} onYes={() => confirm && act.mutate(confirm)}
        question={`ARE YOU SURE YOU WANT TO ${confirm?.action.toUpperCase()} ${confirm && confirm.ids.length > 1 ? `${confirm.ids.length} COUPONS` : 'THIS COUPON'} ?`}
        note={confirm?.action === 'deactivate' ? 'By deactivating this coupon, you understand that: 1. All your Customers trying to use the coupon cannot use it.'
          : confirm?.action === 'activate' ? 'By activating this coupon, you understand that: 1. Customers can use the coupon.' : undefined} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Create / edit coupon
// ---------------------------------------------------------------------------
const blankCoupon = {
  name: '', code: '', type: 'flat', discount: '', service_id: '', plan_id: '', member_id: '', member_label: '', who_can_use: '', start_date: '', expiry_date: '',
  max_redemptions: '', max_per_user: '', min_order: '', max_order: '', max_discount: '', terms: '', installments: '1', installment_interval: '1',
  installment_unit: 'month', interest_rate: '0',
}
const n = (v: string) => (v === '' || Number(v) === 0 ? null : Number(v))

export function CouponForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: services = [] } = useServices()
  const { data: plans = [] } = usePlans()
  const editing = !!id
  const existing = useQuery({ queryKey: ['coupon', id], enabled: editing, queryFn: async () => throwIf(await supabase.from('coupon_overview').select('*').eq('id', id!).single()) as CouponRow })
  const [f, setF] = useState(blankCoupon)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const c = existing.data
    if (!c) return
    const s = (v: number | null | undefined) => (v == null ? '' : String(v))
    setF({ name: c.name, code: c.code, type: c.type, discount: String(c.discount), service_id: c.service_id ?? '', plan_id: c.plan_id ?? '', member_id: c.member_id ?? '',
      member_label: c.member_name ? `${c.member_code ?? ''} ${c.member_name}` : '', who_can_use: c.who_can_use, start_date: c.start_date ?? '', expiry_date: c.expiry_date ?? '',
      max_redemptions: s(c.max_redemptions), max_per_user: s(c.max_per_user), min_order: s(c.min_order), max_order: s(c.max_order), max_discount: s(c.max_discount),
      terms: c.terms ?? '', installments: s(c.installments ?? 1), installment_interval: s(c.installment_interval ?? 1), installment_unit: c.installment_unit ?? 'month',
      interest_rate: s(c.interest_rate ?? 0) })
  }, [existing.data])
  const set = <K extends keyof typeof blankCoupon>(k: K) => (v: (typeof blankCoupon)[K]) => setF((x) => ({ ...x, [k]: v }))
  const hasInstallments = f.type.includes('installments')
  const hasDiscount = f.type !== 'installments'
  const planOptions = plans.filter((p) => p.active && (!f.service_id || p.service_ids.includes(f.service_id)))

  const save = useMutation({
    mutationFn: async (close: boolean) => {
      const row = {
        studio_id: me.studioId, name: f.name.trim(), code: f.code.trim().toUpperCase(), type: f.type, discount: hasDiscount ? Number(f.discount || 0) : 0,
        service_id: f.service_id || null, plan_id: f.plan_id || null, member_id: f.member_id || null, who_can_use: f.who_can_use,
        start_date: f.start_date || null, expiry_date: f.expiry_date || null, max_redemptions: n(f.max_redemptions), max_per_user: n(f.max_per_user),
        min_order: n(f.min_order), max_order: n(f.max_order), max_discount: n(f.max_discount), terms: f.terms.trim() || null,
        installments: Number(f.installments), installment_interval: Number(f.installment_interval), installment_unit: f.installment_unit,
        interest_rate: Number(f.interest_rate || 0),
      }
      const res = editing ? throwIf(await supabase.from('coupons').update(row).eq('id', id!).select('id').single())
        : throwIf(await supabase.from('coupons').insert(row).select('id').single())
      return { close, id: (res as unknown as { id: string }).id }
    },
    onSuccess: ({ close, id: cid }) => {
      qc.invalidateQueries({ queryKey: ['coupon-list'] }); qc.invalidateQueries({ queryKey: ['coupons'] }); qc.invalidateQueries({ queryKey: ['coupon', cid] })
      toast(editing ? 'Coupon saved' : 'Coupon created')
      navigate(close ? '/coupons' : `/coupons/${cid}/edit`, { replace: true })
    },
    onError: (e: Error) => setError(/duplicate|unique/i.test(e.message) ? 'Another coupon already uses this code.' : /code_check/.test(e.message) ? 'Use 2 to 30 letters or digits for the code (no spaces).' : e.message),
  })
  const submit = (close: boolean) => {
    setError(null)
    if (!f.name.trim()) return setError('Enter the coupon name.')
    if (!/^[A-Za-z0-9_-]{2,30}$/.test(f.code.trim())) return setError('Enter the coupon code: 2 to 30 letters or digits, no spaces.')
    if (hasDiscount && !(Number(f.discount) > 0)) return setError('Enter the coupon discount.')
    if (f.type.startsWith('percentage') && Number(f.discount) > 100) return setError('A percentage discount can’t be more than 100.')
    if (!f.who_can_use) return setError('Choose who can use this coupon.')
    if (f.start_date && f.expiry_date && f.expiry_date < f.start_date) return setError('The expiry is before the start date.')
    if (f.min_order && f.max_order && Number(f.max_order) < Number(f.min_order)) return setError('Max Order is less than Min Order.')
    save.mutate(close)
  }
  if (editing && existing.isLoading) return <Loading />
  const card = 'card flex flex-col gap-4 p-5'
  return (
    <>
      <PageHeader title={editing ? 'Edit Coupon' : 'Create Coupon'} sub="Coupon Discounts" />
      <form className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
        <section className={card}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Coupon Name" required id="cname"><TextInput id="cname" value={f.name} onChange={set('name')} placeholder="e.g. 30% Off for first 100 memberships" /></Field>
            <Field label="Coupon Code" required id="ccode"><TextInput id="ccode" value={f.code} onChange={(v) => set('code')(v.toUpperCase())} placeholder="e.g. 40FIRST100" /></Field>
            <Field label="Coupon Type" required id="ctype"><Select id="ctype" value={f.type} onChange={set('type')} options={COUPON_TYPES.map(([v, l]) => ({ value: v, label: l }))} /></Field>
            {hasDiscount && <Field label="Coupon Discount" required id="cdisc" hint={f.type.startsWith('percentage') ? 'Percent off the bill' : 'Rupees off the bill'}>
              <TextInput id="cdisc" type="number" value={f.discount} onChange={set('discount')} placeholder="e.g. 40" /></Field>}
          </div>
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Terms &amp; Validations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Select Fitness Service" id="csvc"><Select id="csvc" value={f.service_id} onChange={(v) => setF((x) => ({ ...x, service_id: v, plan_id: '' }))} placeholder="Select Service"
              options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} /></Field>
            <Field label="Select Membership" id="cplan"><Select id="cplan" value={f.plan_id} onChange={set('plan_id')} placeholder="Select Membership"
              options={planOptions.map((p) => ({ value: p.id, label: p.name }))} /></Field>
            <Field label="Who can use this coupon?" required id="cwho"><Select id="cwho" value={f.who_can_use} onChange={set('who_can_use')} placeholder="Select Member Type"
              options={[{ value: 'new', label: 'New Members' }, { value: 'existing', label: 'Existing Members' }, { value: 'both', label: 'Both' }]} /></Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ClientLookup id="cmember" label={f.member_label ? `Member Id (now ${f.member_label})` : 'Member Id'} onFound={(c) => setF((x) => ({ ...x, member_id: c?.id ?? (x.member_label ? x.member_id : ''), member_label: c?.label ?? x.member_label }))} />
            {f.member_id && <div className="flex items-end"><button type="button" className="link-btn text-[13px]" onClick={() => setF((x) => ({ ...x, member_id: '', member_label: '' }))}>Remove the member (anyone may use it)</button></div>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Coupon Start Date" id="cstart"><TextInput id="cstart" type="date" value={f.start_date} onChange={set('start_date')} /></Field>
            <Field label="Coupon Expiry" id="cexp"><TextInput id="cexp" type="date" value={f.expiry_date} onChange={set('expiry_date')} /></Field>
            <Field label="Max Redemtions" id="cmax" hint="Empty or 0 = no limit"><TextInput id="cmax" type="number" value={f.max_redemptions} onChange={set('max_redemptions')} /></Field>
            <Field label="Max Redemtions Per Customer" id="cmaxp" hint="Empty or 0 = no limit"><TextInput id="cmaxp" type="number" value={f.max_per_user} onChange={set('max_per_user')} /></Field>
            <Field label="Min Order" id="cmin" hint="in Rupees"><TextInput id="cmin" type="number" value={f.min_order} onChange={set('min_order')} /></Field>
            <Field label="Max Order" id="cmaxo" hint="in Rupees"><TextInput id="cmaxo" type="number" value={f.max_order} onChange={set('max_order')} /></Field>
            <Field label="Max Discount Upto (₹)" id="cmaxd" hint="in Rupees"><TextInput id="cmaxd" type="number" value={f.max_discount} onChange={set('max_discount')} /></Field>
          </div>
          <Field label="Terms & Conditions" id="cterms"><TextArea id="cterms" value={f.terms} onChange={set('terms')} placeholder="e.g. Valid for new members only." /></Field>
        </section>
        {hasInstallments && (
          <section className={card}>
            <h2 className="m-0 text-[16px] font-bold">Payment Installments</h2>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Field label="No. of Installments" required id="cinst"><Select id="cinst" value={f.installments} onChange={set('installments')} options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} /></Field>
              <Field label="Intervals" required id="cint"><Select id="cint" value={f.installment_interval} onChange={set('installment_interval')} options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} /></Field>
              <Field label="Duration" required id="cdur"><Select id="cdur" value={f.installment_unit} onChange={set('installment_unit')} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'year', label: 'Year' }]} /></Field>
              <Field label="Interest Rate(% p.a)" required id="crate"><TextInput id="crate" type="number" value={f.interest_rate} onChange={set('interest_rate')} /></Field>
            </div>
            <p className="m-0 text-[12px] text-muted">The bill is split into {f.installments} payments, every {f.installment_interval} {f.installment_unit}{Number(f.installment_interval) > 1 ? 's' : ''}; each balance gets a due-date follow-up.</p>
          </section>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur lg:bottom-4">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Back</button>
          <div className="flex-1" />
          <button type="button" className="btn" disabled={save.isPending} onClick={() => submit(true)}>Save & Close</button>
          <button type="submit" className="btn-gold" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </>
  )
}

// ---------------------------------------------------------------------------
// Combo offers
// ---------------------------------------------------------------------------
export function ComboList() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const { data: plans = [] } = usePlans()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<string[] | null>(null)
  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['combos', me.studioId],
    queryFn: async () => throwIf(await supabase.from('combo_offers').select('*').eq('studio_id', me.studioId).order('created_at', { ascending: false })) as ComboRow[],
  })
  const rows = combos.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
  const del = useMutation({
    mutationFn: async (ids: string[]) => { throwIf(await supabase.from('combo_offers').delete().in('id', ids).select('id')); return ids.length },
    onSuccess: (k) => { qc.invalidateQueries({ queryKey: ['combos'] }); setSelected(new Set()); setConfirm(null); toast(`${k} combo ${k === 1 ? 'offer' : 'offers'} deleted`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const toggleActive = useMutation({
    mutationFn: async (c: ComboRow) => { throwIf(await supabase.from('combo_offers').update({ active: !c.active }).eq('id', c.id).select('id')); return !c.active },
    onSuccess: (on) => { qc.invalidateQueries({ queryKey: ['combos'] }); toast(on ? 'Combo offer active' : 'Combo offer deactivated') },
    onError: (e: Error) => toast(e.message),
  })
  const toggle = (id: string) => setSelected((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x })
  return (
    <>
      <PageHeader title="Combo Offer Listing" sub={studioLine(studio)} actions={<Link to="/combos/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Create Combo Offer</Link>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <div className="relative max-w-[480px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={setSearch} placeholder="Search by offer name" className="pl-9" />
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm([...selected])}>Delete</button>
        </BulkBar>
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No combo offers yet.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr><th style={{ width: 44 }} /><th>Offer Name</th><th>Plans</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{rows.map((c) => (
                <tr key={c.id}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${c.name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} /></td>
                  <td className="font-semibold">{c.name}</td>
                  <td className="text-[13px]">{c.plan_ids.map((pid) => { const p = plans.find((x) => x.id === pid); const price = c.plan_prices?.[pid]
                    return <div key={pid}>{p?.name ?? 'Removed plan'}{price != null ? <span className="text-muted"> · {amt(price)}</span> : p ? <span className="text-muted"> · {amt(p.total_price)}</span> : null}</div> })}</td>
                  <td><button type="button" className={`chip ${c.active ? 'chip-green' : 'chip-muted'}`} onClick={() => toggleActive.mutate(c)} aria-label={c.active ? 'Deactivate' : 'Activate'}>{c.active ? 'Active' : 'Deactivated'}</button></td>
                  <td><ActionMenu actions={[{ label: 'Edit', onClick: () => navigate(`/combos/${c.id}/edit`) }, { label: 'Delete', danger: true, onClick: () => setConfirm([c.id]) }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Confirm open={!!confirm} danger busy={del.isPending} onNo={() => setConfirm(null)} onYes={() => confirm && del.mutate(confirm)} question="ARE YOU SURE YOU WANT TO DELETE THIS combo offer ?" />
    </>
  )
}

export function ComboForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const team = useTeam()
  const { data: plans = [] } = usePlans()
  const { data: services = [] } = useServices()
  const { data: studio } = useStudio()
  const editing = !!id
  const existing = useQuery({ queryKey: ['combo', id], enabled: editing, queryFn: async () => throwIf(await supabase.from('combo_offers').select('*').eq('id', id!).single()) as ComboRow })
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [remove, setRemove] = useState<string[]>([])
  const [pick, setPick] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const c = existing.data
    if (!c) return
    setName(c.name); setChosen(c.plan_ids)
    setPrices(Object.fromEntries(Object.entries(c.plan_prices ?? {}).map(([k, v]) => [k, String(v)])))
  }, [existing.data])
  const available = plans.filter((p) => p.active && !chosen.includes(p.id) && (!category || p.service_ids.includes(category)))
  const save = useMutation({
    mutationFn: async () => {
      const plan_prices = Object.fromEntries(chosen.filter((pid) => prices[pid] !== undefined && prices[pid] !== '').map((pid) => [pid, Number(prices[pid])]))
      const row = { studio_id: me.studioId, name: name.trim(), plan_ids: chosen, plan_prices }
      if (editing) throwIf(await supabase.from('combo_offers').update(row).eq('id', id!).select('id'))
      else throwIf(await supabase.from('combo_offers').insert(row).select('id'))
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['combos'] }); toast(editing ? 'Combo offer saved' : 'Combo offer created'); navigate('/combos') },
    onError: (e: Error) => setError(e.message),
  })
  const submit = () => {
    setError(null)
    if (!name.trim()) return setError('Enter the offer name.')
    if (chosen.length < 2) return setError('Add at least two membership plans to the combo.')
    if (chosen.some((pid) => prices[pid] && Number(prices[pid]) < 0)) return setError('A selling price can’t be negative.')
    save.mutate()
  }
  if (editing && existing.isLoading) return <Loading />
  const svc = (ids: string[]) => services.filter((s) => ids.includes(s.id)).map((s) => s.custom_name ?? s.name).join(', ')
  return (
    <>
      <PageHeader title={editing ? 'Edit Combo Offer' : 'Create Combo Offer'} sub={studioLine(studio)} actions={<Link to="/combos" className="btn btn-sm">Combo Offer List</Link>} />
      <form className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
        <section className="card flex flex-col gap-4 p-5">
          <Field label="Combo Offer Name" required id="coname"><TextInput id="coname" value={name} onChange={setName} placeholder="Enter offer name" /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[240px_1fr_auto] sm:items-end">
            <Field label="Select Plan Category" id="cocat"><Select id="cocat" value={category} onChange={setCategory} placeholder="Select Category" options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} /></Field>
            <Field label="Select Membership Plan" id="coplans" hint="Tick one or more, then Add.">
              <select id="coplans" multiple className="input h-36" value={pick} onChange={(e) => setPick([...e.target.selectedOptions].map((o) => o.value))}>
                {available.map((p) => <option key={p.id} value={p.id}>{p.name} · {amt(p.total_price)}</option>)}
              </select>
            </Field>
            <button type="button" className="btn" disabled={!pick.length} onClick={() => { setChosen([...chosen, ...pick]); setPick([]) }}>Add</button>
          </div>
        </section>
        <section className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th style={{ width: 44 }} /><th>Plan Name</th><th>Fitness center</th><th>Services</th><th>Status</th><th>Tenure</th><th className="num">Price</th><th className="num">Discount Price</th><th>Selling Price</th><th>Created by</th></tr></thead>
            <tbody>{chosen.map((pid) => { const p = plans.find((x) => x.id === pid); if (!p) return null
              return (
                <tr key={pid}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${p.name}`} checked={remove.includes(pid)} onChange={(e) => setRemove(e.target.checked ? [...remove, pid] : remove.filter((x) => x !== pid))} /></td>
                  <td className="font-semibold">{p.name}</td><td>{studio?.name}</td><td className="max-w-[220px] text-[12px] text-muted">{svc(p.service_ids)}</td>
                  <td>{p.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>}</td>
                  <td className="nowrap">{p.tenure_value} {p.tenure_unit}</td><td className="num">{amt(p.price)}</td><td className="num">{p.discount_price != null ? amt(p.discount_price) : 'None'}</td>
                  <td><TextInput small type="number" value={prices[pid] ?? ''} onChange={(v) => setPrices({ ...prices, [pid]: v })} placeholder={String(p.total_price)} className="w-[120px]" /></td>
                  <td>{team.name(p.created_by) ?? '—'}</td>
                </tr>
              ) })}
              {!chosen.length && <tr><td colSpan={10} className="py-8 text-center text-muted">No plans in this combo yet.</td></tr>}</tbody>
          </table>
        </section>
        {remove.length > 0 && <button type="button" className="btn btn-danger self-start" onClick={() => { setChosen(chosen.filter((x) => !remove.includes(x))); setRemove([]) }}>Delete {remove.length} from the combo</button>}
        <p className="m-0 text-[12px] text-muted">Leave a selling price empty to sell the plan at its own price in this combo.</p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2"><button type="button" className="btn" onClick={() => navigate(-1)}>Back</button><div className="flex-1" />
          <button type="submit" className="btn-gold" disabled={save.isPending}>{save.isPending ? 'Saving…' : editing ? 'Update' : 'Submit'}</button></div>
      </form>
    </>
  )
}
