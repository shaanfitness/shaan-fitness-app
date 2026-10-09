import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { CsvOnly } from '../../access-ui'
import { supabase } from '../../lib/supabase'
import { throwIf, useList, useStudio, useTeam } from '../../db/studio'
import { amt } from '../../db/billing'
import type { ExpenseRow, VendorRow } from '../../db/team'
import { downloadCsv } from '../../lib/csv'
import { fmtDay, presets, rangeLabel, studioToday } from '../../lib/dates'
import { ActionMenu, Field, Notice, Select, TextArea, TextInput } from '../../components/controls'
import { BulkBar } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL Accounts › Expense: "Expense Listing" (Add Expense) and "Vendor Listing" (Add Vendor).

const studioLine = (s?: { name: string; branch_name: string | null }) => `${s?.name ?? ''}${s?.branch_name ? ` (${s.branch_name})` : ''}`

function useVendors() {
  const me = useMe()
  return useQuery({
    queryKey: ['vendors', me.studioId],
    queryFn: async () => throwIf(await supabase.from('vendors').select('*').eq('studio_id', me.studioId).order('name')) as VendorRow[],
  })
}

export function ExpenseList() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const { data: studio } = useStudio()
  const { data: vendors = [] } = useVendors()
  const today = studioToday()
  const choices = presets('register', today).filter((p) => p.range.from)
  const [rangeKey, setRangeKey] = useState('this_month')
  const [range, setRange] = useState(choices.find((c) => c.key === 'this_month')!.range as { from: string; to: string })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [form, setForm] = useState<ExpenseRow | 'new' | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<string[] | null>(null)
  const categories = useList('expense_category')
  const { data = [], isLoading } = useQuery({
    queryKey: ['expenses', me.studioId, range.from, range.to],
    queryFn: async () => throwIf(await supabase.from('expenses').select('*').eq('studio_id', me.studioId).gte('expense_date', range.from).lte('expense_date', range.to)
      .order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(5000)) as ExpenseRow[],
  })
  const vendorName = (id: string | null) => vendors.find((v) => v.id === id)?.name ?? ''
  const rows = useMemo(() => data.filter((e) => (!category || e.category === category)
    && (!search || `${e.title} ${vendorName(e.vendor_id)}`.toLowerCase().includes(search.toLowerCase()))), [data, category, search, vendors]) // eslint-disable-line react-hooks/exhaustive-deps
  const del = useMutation({
    mutationFn: async (ids: string[]) => { throwIf(await supabase.from('expenses').delete().in('id', ids).select('id')); return ids.length },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['expenses'] }); setSelected(new Set()); setConfirm(null); toast(`${n} ${n === 1 ? 'expense' : 'expenses'} deleted`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const sum = (f: (e: ExpenseRow) => number) => amt(rows.reduce((t, e) => t + Number(f(e)), 0))
  const exportCsv = () => downloadCsv(`expenses-${range.from}-${range.to}.csv`, rows, [['Expense Date', (e) => e.expense_date], ['Expense title', (e) => e.title],
    ['Vendor Name', (e) => vendorName(e.vendor_id)], ['Category', (e) => e.category], ['GST No.', (e) => e.gst_no], ['Payment Type', (e) => e.payment_type],
    ['Payment Price', (e) => e.amount], ['GST Price', (e) => e.gst_amount], ['Final Price', (e) => e.final_amount], ['Note', (e) => e.note], ['Added by', (e) => team.name(e.created_by)]])
  return (
    <>
      <PageHeader title="Expense Listing" sub={studioLine(studio)}
        actions={<>
          <Link to="/analysis/expenses" className="btn btn-sm">View Expense Analysis</Link>
          <CsvOnly><button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>
          <Link to="/vendors" className="btn btn-sm">Vendor List</Link>
          <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setForm('new')}><Icon name="plus" size={18} />Add Expense</button>
        </>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={setSearch} placeholder="Search By Expense title, Vendor Name" className="pl-9" />
          </div>
          <span className="text-[12px] text-muted">From</span>
          <Select small ariaLabel="Date range" value={rangeKey} className="w-auto min-w-[200px]" options={[...choices.map((c) => ({ value: c.key, label: `${c.label} (${rangeLabel(c.range)})` })), { value: 'custom', label: 'Custom' }]}
            onChange={(k) => { setRangeKey(k); const c = choices.find((x) => x.key === k); if (c) setRange(c.range as { from: string; to: string }) }} />
          {rangeKey === 'custom' && <><TextInput small type="date" value={range.from} onChange={(v) => setRange({ ...range, from: v || today })} className="w-auto" />
            <TextInput small type="date" value={range.to} onChange={(v) => setRange({ ...range, to: v || today })} className="w-auto" /></>}
          <Select small ariaLabel="Category" value={category} onChange={setCategory} placeholder="All Categories" className="w-auto" options={categories.map((c) => ({ value: c.label, label: c.label }))} />
        </div>
        <div className="flex flex-wrap gap-2 text-[13px]">
          {[['Payment Price', sum((e) => e.amount)], ['GST Price', sum((e) => e.gst_amount)], ['Final Price', sum((e) => e.final_amount)]].map(([k, v]) => (
            <span key={k} className="rounded-xl border border-line px-3 py-1.5"><span className="text-muted">{k} : </span><strong>{v}</strong></span>))}
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}><button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm([...selected])}>Delete</button></BulkBar>
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No expenses for these dates.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl text-[13px]">
              <thead><tr><th style={{ width: 44 }}><input type="checkbox" className="check" aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
                <th>Expense Date</th><th>Expense title</th><th>Vendor Name</th><th>Category</th><th>GST No.</th><th>Payment Type</th><th className="num">Payment Price</th>
                <th className="num">GST Price</th><th className="num">Final Price</th><th>Note</th><th>Action</th></tr></thead>
              <tbody>{rows.map((e) => (
                <tr key={e.id}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${e.title}`} checked={selected.has(e.id)} onChange={() => toggle(e.id)} /></td>
                  <td className="nowrap">{fmtDay(e.expense_date)}</td><td className="font-semibold">{e.title}</td><td>{vendorName(e.vendor_id) || '—'}</td><td>{e.category}</td>
                  <td>{e.gst_no ?? '—'}</td><td>{e.payment_type}</td><td className="num">{amt(e.amount)}</td><td className="num">{amt(e.gst_amount)}</td><td className="num font-semibold">{amt(e.final_amount)}</td>
                  <td className="max-w-[220px] text-muted">{e.note ?? ''}</td>
                  <td><ActionMenu actions={[{ label: 'Edit', onClick: () => setForm(e) }, { label: 'Delete', danger: true, onClick: () => setConfirm([e.id]) }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        <div className="flex flex-col gap-4"><p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO DELETE SELECTED EXPENSE ?</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className="btn btn-danger flex-1" disabled={del.isPending} onClick={() => confirm && del.mutate(confirm)}>Yes</button></div></div>
      </Sheet>
      <Sheet wide open={!!form} onClose={() => setForm(null)} title={form === 'new' ? 'Add Expense' : 'Edit Expense'}>
        {form && <ExpenseForm key={form === 'new' ? 'new' : form.id} value={form} vendors={vendors} onDone={() => setForm(null)} />}
      </Sheet>
    </>
  )
}

function ExpenseForm({ value, vendors, onDone }: { value: ExpenseRow | 'new'; vendors: VendorRow[]; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const categories = useList('expense_category')
  const types = useList('expense_payment_type')
  const e = value === 'new' ? null : value
  const [f, setF] = useState({ title: e?.title ?? '', vendor_id: e?.vendor_id ?? '', category: e?.category ?? '', expense_date: e?.expense_date ?? studioToday(),
    payment_type: e?.payment_type ?? '', amount: e ? String(e.amount) : '', gst_amount: e ? String(e.gst_amount) : '0', final_amount: e ? String(e.final_amount) : '', gst_no: e?.gst_no ?? '', note: e?.note ?? '' })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => {
    const n = { ...x, [k]: v }
    if (k === 'amount' || k === 'gst_amount') n.final_amount = String(Math.round((Number(n.amount || 0) + Number(n.gst_amount || 0)) * 100) / 100)
    return n
  })
  const save = useMutation({
    mutationFn: async () => {
      const row = { studio_id: me.studioId, title: f.title.trim(), vendor_id: f.vendor_id || null, category: f.category, expense_date: f.expense_date, payment_type: f.payment_type,
        amount: Number(f.amount), gst_amount: Number(f.gst_amount || 0), final_amount: Number(f.final_amount), gst_no: f.gst_no.trim() || null, note: f.note.trim() || null }
      if (e) throwIf(await supabase.from('expenses').update(row).eq('id', e.id).select('id'))
      else throwIf(await supabase.from('expenses').insert(row).select('id'))
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast(e ? 'Expense saved' : 'Expense added'); onDone() },
    onError: (x: Error) => setError(x.message),
  })
  const submit = () => {
    setError(null)
    if (!f.title.trim()) return setError('Enter the expense title.')
    if (!f.category) return setError('Choose the expense category.')
    if (!f.expense_date) return setError('Choose the expense date.')
    if (!f.payment_type) return setError('Choose the mode of payment.')
    if (!(Number(f.amount) >= 0) || f.amount === '') return setError('Enter the principal price.')
    if (!(Number(f.final_amount) >= 0) || f.final_amount === '') return setError('Enter the final price.')
    if (!f.note.trim()) return setError('Enter a description or note.')
    save.mutate()
  }
  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={(x) => { x.preventDefault(); submit() }}>
      <p className="m-0 text-[13px] font-semibold text-muted">{studioLine(studio)}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Expense Title" required id="ex-t"><TextInput id="ex-t" value={f.title} onChange={set('title')} placeholder="e.g. Posters for Diwali." /></Field>
        <Field label="Vendor Name" id="ex-v"><Select id="ex-v" value={f.vendor_id} onChange={set('vendor_id')} placeholder="Select a Vendor" options={vendors.filter((v) => v.active || v.id === f.vendor_id).map((v) => ({ value: v.id, label: v.name }))} /></Field>
        <Field label="Expense Category" required id="ex-c"><Select id="ex-c" value={f.category} onChange={set('category')} placeholder="Select a Category" options={categories.map((c) => ({ value: c.label, label: c.label }))} /></Field>
        <Field label="Expense Date" required id="ex-d"><TextInput id="ex-d" type="date" value={f.expense_date} onChange={set('expense_date')} /></Field>
        <Field label="Mode of Payment" required id="ex-m"><Select id="ex-m" value={f.payment_type} onChange={set('payment_type')} placeholder="Select" options={types.map((t) => ({ value: t.label, label: t.label }))} /></Field>
        <Field label="GST Number" id="ex-g"><TextInput id="ex-g" value={f.gst_no} onChange={set('gst_no')} placeholder="Enter GST number, If Applicable" /></Field>
        <Field label="Principal Price" required id="ex-a"><TextInput id="ex-a" type="number" value={f.amount} onChange={set('amount')} placeholder="Enter the Expense Amount" /></Field>
        <Field label="GST Price" required id="ex-gp"><TextInput id="ex-gp" type="number" value={f.gst_amount} onChange={set('gst_amount')} placeholder="Enter the Expense GST Amount" /></Field>
        <Field label="Final Price" required id="ex-f"><TextInput id="ex-f" type="number" value={f.final_amount} onChange={set('final_amount')} placeholder="Enter the Final Expense Amount" /></Field>
      </div>
      <Field label="Description/Note" required id="ex-n"><TextArea id="ex-n" value={f.note} onChange={set('note')} placeholder="e.g. Gave extra for Stationary." /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button><button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{e ? 'Save Expense' : 'Add Expense'}</button></div>
    </form>
  )
}

export function VendorList() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const { data: vendors = [], isLoading } = useVendors()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<VendorRow | 'new' | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | 'delete' | 'deactivate' | 'activate'>(null)
  const rows = vendors.filter((v) => !search || `${v.name} ${v.contact_name} ${v.phone1}`.toLowerCase().includes(search.toLowerCase()))
  const act = useMutation({
    mutationFn: async (a: 'delete' | 'deactivate' | 'activate') => {
      const ids = [...selected]
      if (a === 'delete') {
        const used = throwIf(await supabase.from('expenses').select('vendor_id').in('vendor_id', ids).limit(1)) as unknown[]
        if (used.length) throw new Error('A vendor with expenses can’t be deleted. Deactivate it instead.')
        throwIf(await supabase.from('vendors').delete().in('id', ids).select('id'))
      } else throwIf(await supabase.from('vendors').update({ active: a === 'activate' }).in('id', ids).select('id'))
      return { a, n: ids.length }
    },
    onSuccess: ({ a, n }) => { qc.invalidateQueries({ queryKey: ['vendors'] }); setSelected(new Set()); setConfirm(null); toast(`${n} ${n === 1 ? 'vendor' : 'vendors'} ${a === 'delete' ? 'deleted' : a + 'd'}`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <>
      <PageHeader title="Vendor Listing" sub={studioLine(studio)}
        actions={<><Link to="/expenses" className="btn btn-sm">Expense List</Link><button type="button" className="btn-gold min-h-10 px-4" onClick={() => setForm('new')}><Icon name="plus" size={18} />Add Vendor</button></>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="relative max-w-[480px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={setSearch} placeholder="Search" className="pl-9" />
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm('deactivate')}>Deactivate</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm('activate')}>Activate</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm('delete')}>Delete</button>
        </BulkBar>
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No vendors yet.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl text-[13px]">
              <thead><tr><th style={{ width: 44 }} /><th>Vendor title</th><th>Contact Name</th><th>Contact Number 1</th><th>Contact Number 2</th><th>Note</th><th>GST No.</th><th>Fitness Center</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{rows.map((v) => (
                <tr key={v.id}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${v.name}`} checked={selected.has(v.id)} onChange={() => toggle(v.id)} /></td>
                  <td className="font-semibold">{v.name}</td><td>{v.contact_name}</td><td>{v.phone1 ?? '—'}</td><td>{v.phone2 ?? '—'}</td><td className="max-w-[220px] text-muted">{v.note ?? ''}</td>
                  <td>{v.gst_no ?? '—'}</td><td>{studio?.name}</td>
                  <td>{v.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>}</td>
                  <td><ActionMenu actions={[{ label: 'Edit', onClick: () => setForm(v) }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        <div className="flex flex-col gap-4"><p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO {confirm?.toUpperCase()} SELECTED VENDOR ?</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className={`flex-1 ${confirm === 'delete' ? 'btn btn-danger' : 'btn-gold'}`} disabled={act.isPending} onClick={() => confirm && act.mutate(confirm)}>Yes</button></div></div>
      </Sheet>
      <Sheet open={!!form} onClose={() => setForm(null)} title={form === 'new' ? 'Add Vendor' : 'Edit Vendor'}>
        {form && <VendorForm key={form === 'new' ? 'new' : form.id} value={form} onDone={() => setForm(null)} />}
      </Sheet>
    </>
  )
}

function VendorForm({ value, onDone }: { value: VendorRow | 'new'; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const v = value === 'new' ? null : value
  const [f, setF] = useState({ name: v?.name ?? '', contact_name: v?.contact_name ?? '', phone1: v?.phone1 ?? '', phone2: v?.phone2 ?? '', gst_no: v?.gst_no ?? '', note: v?.note ?? '' })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (x: string) => setF((y) => ({ ...y, [k]: x }))
  const save = useMutation({
    mutationFn: async () => {
      const row = { studio_id: me.studioId, name: f.name.trim(), contact_name: f.contact_name.trim(), phone1: f.phone1.trim() || null, phone2: f.phone2.trim() || null, gst_no: f.gst_no.trim() || null, note: f.note.trim() || null }
      if (v) throwIf(await supabase.from('vendors').update(row).eq('id', v.id).select('id'))
      else throwIf(await supabase.from('vendors').insert(row).select('id'))
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast(v ? 'Vendor saved' : 'Vendor added'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); setError(null)
      if (!f.name.trim()) return setError('Enter the vendor title.'); if (!f.contact_name.trim()) return setError('Enter the contact name.'); if (!f.note.trim()) return setError('Enter a description or note.'); save.mutate() }}>
      <Field label="Vendor Title" required id="vn"><TextInput id="vn" value={f.name} onChange={set('name')} placeholder="e.g. Tea Vendor." /></Field>
      <Field label="Contact Name" required id="vc"><TextInput id="vc" value={f.contact_name} onChange={set('contact_name')} placeholder="Name of the Contact person" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact Number 1" id="v1"><TextInput id="v1" inputMode="tel" value={f.phone1} onChange={set('phone1')} /></Field>
        <Field label="Contact Number 2" id="v2"><TextInput id="v2" inputMode="tel" value={f.phone2} onChange={set('phone2')} /></Field>
      </div>
      <Field label="GST Number" id="vg"><TextInput id="vg" value={f.gst_no} onChange={set('gst_no')} placeholder="Enter the Gst number. If Applicable" /></Field>
      <Field label="Description/Note" required id="vnote"><TextArea id="vnote" value={f.note} onChange={set('note')} placeholder="e.g. Will serve 2 times a day Tea." /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button><button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{v ? 'Save Vendor' : 'Add Vendor'}</button></div>
    </form>
  )
}
