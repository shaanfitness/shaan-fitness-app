import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { ACCESS_SPEC, ACCESS_TYPES, useAccess, type Rights } from '../../access'
import { supabase } from '../../lib/supabase'
import { throwIf, useStudio, useTeam } from '../../db/studio'
import { uploadStudioMedia } from '../../db/classes'
import { amt } from '../../db/billing'
import {
  cancelLeave, decideLeave, LEAVE_MODE, MONTHS, saveAccessControl, TARGET_TYPES, type LeaveRow, type TargetRow, type TransformationRow,
} from '../../db/team'
import { fmtDateTime, fmtDay, studioToday } from '../../lib/dates'
import { ClientLookup } from '../../components/billing'
import { ActionMenu, Checkbox, Field, Notice, Select, TextArea, TextInput } from '../../components/controls'
import { BulkBar } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL Trainers › Manage Client Transformations and Trainer Leave Requests;
// Staff › Staff Access Control and Staff/Trainer Target.

const studioLine = (s?: { name: string; branch_name: string | null }) => `${s?.name ?? ''}${s?.branch_name ? ` (${s.branch_name})` : ''}`

// ---------------------------------------------------------------------------
// Manage Client Transformations
// ---------------------------------------------------------------------------
export function Transformations() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const { data: studio } = useStudio()
  const [trainer, setTrainer] = useState('')
  const [form, setForm] = useState<TransformationRow | 'new' | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<string[] | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: ['transformations', me.studioId],
    queryFn: async () => throwIf(await supabase.from('transformation_overview').select('*').eq('studio_id', me.studioId).order('created_at', { ascending: false })) as TransformationRow[],
  })
  const rows = data.filter((t) => !trainer || t.trainer_id === trainer)
  const del = useMutation({
    mutationFn: async (ids: string[]) => { throwIf(await supabase.from('transformations').delete().in('id', ids).select('id')); return ids.length },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['transformations'] }); setSelected(new Set()); setConfirm(null); toast(`${n} deleted`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <>
      <PageHeader title="Manage Client Transformations" sub={studioLine(studio)}
        actions={<button type="button" className="btn-gold min-h-10 px-4" onClick={() => setForm('new')}><Icon name="plus" size={18} />Add Transformations</button>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <Select small ariaLabel="Select Trainer" value={trainer} onChange={setTrainer} placeholder="Select Trainer" className="w-auto max-w-[260px]" options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} />
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}><button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm([...selected])}>Delete</button></BulkBar>
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No transformations yet. Add before-and-after results to show in the member app.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr><th style={{ width: 44 }} /><th>Transformation Image</th><th>Client Name</th><th>Durations</th><th>Description</th><th>Trainer Details</th><th>Action</th></tr></thead>
              <tbody>{rows.map((t) => (
                <tr key={t.id}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${t.client_name}`} checked={selected.has(t.id)} onChange={() => toggle(t.id)} /></td>
                  <td>{t.image_url ? <img src={t.image_url} alt={`${t.client_name} transformation`} className="h-20 w-28 rounded-lg border border-line object-cover" /> : <span className="text-muted">No image</span>}</td>
                  <td className="font-semibold">{t.client_name}{!t.show_in_app && <div className="text-[12px] font-normal text-muted">Hidden in app</div>}</td>
                  <td>{t.period_value} {t.period_value === 1 ? t.period_unit.replace(/s$/, '') : t.period_unit}</td>
                  <td className="max-w-[320px]"><div className="font-semibold">{t.title}</div><div className="text-[13px] text-muted whitespace-pre-wrap">{t.description}</div></td>
                  <td>{t.trainer_name ?? '—'}{t.trainer_code ? <div className="text-[12px] text-muted">{t.trainer_code}</div> : null}</td>
                  <td><ActionMenu actions={[{ label: 'Edit', onClick: () => setForm(t) }, { label: 'Delete', danger: true, onClick: () => setConfirm([t.id]) }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        <div className="flex flex-col gap-4"><p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO DELETE THE SELECTED TRANSFORMATION?</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className="btn btn-danger flex-1" disabled={del.isPending} onClick={() => confirm && del.mutate(confirm)}>Delete</button></div></div>
      </Sheet>
      <Sheet wide open={!!form} onClose={() => setForm(null)} title={form === 'new' ? 'Upload Transformation' : 'Edit Transformation'}>
        {form && <TransformationForm key={form === 'new' ? 'new' : form.id} value={form} onDone={() => setForm(null)} />}
      </Sheet>
    </>
  )
}

function TransformationForm({ value, onDone }: { value: TransformationRow | 'new'; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const t = value === 'new' ? null : value
  const [f, setF] = useState({ client_name: t?.client_name ?? '', member_id: t?.member_id ?? '', period_value: t ? String(t.period_value) : '', period_unit: t?.period_unit ?? 'months',
    trainer_id: t?.trainer_id ?? (me.role === 'coach' ? me.staffId ?? '' : ''), title: t?.title ?? '', description: t?.description ?? '', consent: t?.consent ?? false,
    show_in_app: t?.show_in_app ?? true, remove: false })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((x) => ({ ...x, [k]: v }))
  const save = useMutation({
    mutationFn: async () => {
      const image = file ? await uploadStudioMedia(me.studioId, 'transformations', file) : f.remove ? null : t?.image_url ?? null
      const row = { studio_id: me.studioId, image_url: image, client_name: f.client_name.trim(), member_id: f.member_id || null, period_value: Number(f.period_value),
        period_unit: f.period_unit, trainer_id: f.trainer_id || null, title: f.title.trim(), description: f.description.trim(), consent: f.consent, show_in_app: f.show_in_app }
      if (t) throwIf(await supabase.from('transformations').update(row).eq('id', t.id).select('id'))
      else throwIf(await supabase.from('transformations').insert(row).select('id'))
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transformations'] }); toast(t ? 'Transformation saved' : 'Transformation added'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  const submit = () => {
    setError(null)
    if (!t && !file) return setError('Choose the transformation image.')
    if (!f.client_name.trim()) return setError('Enter the client name.')
    if (!(Number(f.period_value) > 0)) return setError('Enter the transformation period.')
    if (!f.trainer_id) return setError('Choose the trainer.')
    if (!f.title.trim() || !f.description.trim()) return setError('Enter the title and description.')
    if (!f.consent) return setError('Confirm the client agreed to share their photos and story.')
    save.mutate()
  }
  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Field label="Transformation Image" required={!t} id="trimg" hint="One before-and-after picture."><input id="trimg" type="file" accept="image/*" className="input py-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      {t?.image_url && !file && <Checkbox checked={f.remove} onChange={set('remove')} label="Check to Delete image" />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Client Name" required id="trname"><TextInput id="trname" value={f.client_name} onChange={set('client_name')} placeholder="Eg. John Doe" /></Field>
        <ClientLookup id="trmember" label="Link to a client (optional)" onFound={(c) => setF((x) => ({ ...x, member_id: c?.id ?? '', client_name: x.client_name || (c?.label.replace(/^\S+\s/, '') ?? '') }))} />
        <Field label="Transformation Period" required id="trper"><div className="flex gap-2"><TextInput id="trper" type="number" value={f.period_value} onChange={set('period_value')} />
          <Select ariaLabel="Unit" value={f.period_unit} onChange={set('period_unit')} className="w-[120px] flex-none" options={[{ value: 'days', label: 'Days' }, { value: 'weeks', label: 'Weeks' }, { value: 'months', label: 'Months' }, { value: 'years', label: 'Year' }]} /></div></Field>
        <Field label="Trainer Name" required id="trtrainer"><Select id="trtrainer" value={f.trainer_id} onChange={set('trainer_id')} placeholder="Select Trainer" options={team.trainers.map((x) => ({ value: x.id, label: x.full_name }))} /></Field>
      </div>
      <Field label="Title / Name" required id="trtitle"><TextInput id="trtitle" value={f.title} onChange={set('title')} placeholder="Eg. Weight Loss" /></Field>
      <Field label="Description" required id="trdesc"><TextArea id="trdesc" value={f.description} onChange={set('description')} /></Field>
      <Checkbox checked={f.show_in_app} onChange={set('show_in_app')} label="Show in the member app" />
      <Checkbox checked={f.consent} onChange={set('consent')} label="The client agreed (in writing or on WhatsApp) to share these photos and their story" />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Submit'}</button></div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Trainer Leave Requests
// ---------------------------------------------------------------------------
export function LeaveRequests() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const access = useAccess()
  const team = useTeam()
  const { data: studio } = useStudio()
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [trainer, setTrainer] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | 'reject' | 'unpaid' | 'paid'>(null)
  const [ask, setAsk] = useState(false)
  const decide = access.can('trainers', 'leave')
  const { data = [], isLoading } = useQuery({
    queryKey: ['leave', me.studioId],
    queryFn: async () => throwIf(await supabase.from('leave_overview').select('*').eq('studio_id', me.studioId).order('created_at', { ascending: false }).limit(2000)) as LeaveRow[],
  })
  const rows = data.filter((l) => (!search || `${l.staff_name} ${l.staff_phone} ${l.staff_email}`.toLowerCase().includes(search.toLowerCase()))
    && (!mode || l.mode === mode) && (!type || (type === 'paid' ? l.paid === true : l.paid === false)) && (!status || l.status === status) && (!trainer || l.staff_id === trainer))
  const run = useMutation({
    mutationFn: (a: 'reject' | 'unpaid' | 'paid') => decideLeave([...selected], a === 'reject' ? 'rejected' : 'approved', a === 'paid'),
    onSuccess: (n, a) => { qc.invalidateQueries({ queryKey: ['leave'] }); setSelected(new Set()); setConfirm(null); toast(`${n} ${a === 'reject' ? 'rejected' : a === 'paid' ? 'approved as paid' : 'approved as un-paid'}`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const cancel = useMutation({
    mutationFn: (id: string) => cancelLeave(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave'] }); toast('Leave request cancelled') },
    onError: (e: Error) => toast(e.message),
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const chip = (s: string) => <span className={`chip ${s === 'approved' ? 'chip-green' : s === 'rejected' ? 'chip-red' : 'chip-amber'}`}>{s === 'pending' ? 'Pending' : s === 'approved' ? 'Approved' : 'Rejected'}</span>
  return (
    <>
      <PageHeader title="Trainer Leave requests Listing" sub={studioLine(studio)}
        actions={<button type="button" className="btn-gold min-h-10 px-4" onClick={() => setAsk(true)}><Icon name="plus" size={18} />Request Leave</button>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={setSearch} placeholder="Search by Mobile Number or Email Address" className="pl-9" />
          </div>
          <Select small ariaLabel="Leave mode" value={mode} onChange={setMode} placeholder="All" className="w-auto" options={Object.entries(LEAVE_MODE).map(([v, l]) => ({ value: v, label: l }))} />
          <Select small ariaLabel="Leave type" value={type} onChange={setType} placeholder="All" className="w-auto" options={[{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Un-paid' }]} />
          <Select small ariaLabel="Leave status" value={status} onChange={setStatus} placeholder="All" className="w-auto" options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
          {decide && <Select small ariaLabel="Select Trainer" value={trainer} onChange={setTrainer} placeholder="Select Trainer" className="w-auto" options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} />}
        </div>
        {decide && <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm('reject')}>Reject</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm('unpaid')}>Approve as Un-paid</button>
          <button type="button" className="btn-gold min-h-9 px-3 text-[13px]" onClick={() => setConfirm('paid')}>Approve as paid</button>
        </BulkBar>}
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No leave requests.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr>{decide && <th style={{ width: 44 }} />}<th>Trainer Name</th><th>Leave Start Date</th><th>Leave End Date</th><th className="num">Leave Days</th><th>Requested Date</th>
                <th>Leave Mode</th><th>Leave Type</th><th>Leave Status</th><th>Reason</th><th>Cancelled</th></tr></thead>
              <tbody>{rows.map((l) => (
                <tr key={l.id}>
                  {decide && <td><input type="checkbox" className="check" aria-label={`Select ${l.staff_name}`} checked={selected.has(l.id)} onChange={() => toggle(l.id)} disabled={l.cancelled} /></td>}
                  <td className="font-semibold">{l.staff_name}<div className="text-[12px] font-normal text-muted">{l.staff_code}</div></td>
                  <td className="nowrap">{fmtDay(l.start_date)}</td><td className="nowrap">{fmtDay(l.end_date)}</td><td className="num">{l.days}</td>
                  <td className="nowrap">{fmtDateTime(l.created_at)}</td><td>{LEAVE_MODE[l.mode]}</td>
                  <td>{l.paid == null ? '—' : l.paid ? 'Paid' : 'Un-paid'}</td>
                  <td>{chip(l.status)}{l.decided_by_name ? <div className="text-[12px] text-muted">by {l.decided_by_name}</div> : null}</td>
                  <td className="max-w-[240px] text-[13px]">{l.reason ?? '—'}</td>
                  <td>{l.cancelled ? <span className="chip chip-muted">Cancelled</span> : (l.staff_id === me.staffId || decide) && l.end_date >= studioToday()
                    ? <button type="button" className="link-btn text-[13px]" onClick={() => cancel.mutate(l.id)}>Cancel</button> : 'No'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        <div className="flex flex-col gap-4"><p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO {confirm === 'reject' ? 'REJECT' : confirm === 'paid' ? 'APPROVE AS PAID' : 'APPROVE AS UN-PAID'} SELECTED LEAVE ?</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className="btn-gold flex-1" disabled={run.isPending} onClick={() => confirm && run.mutate(confirm)}>Yes</button></div></div>
      </Sheet>
      <Sheet open={ask} onClose={() => setAsk(false)} title="Request Leave">{ask && <LeaveForm canPick={decide} onDone={() => setAsk(false)} />}</Sheet>
    </>
  )
}

function LeaveForm({ canPick, onDone }: { canPick: boolean; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const today = studioToday()
  const [f, setF] = useState({ staff_id: canPick ? '' : me.staffId ?? '', start: today, end: today, mode: 'full', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const save = useMutation({
    mutationFn: async () => { throwIf(await supabase.from('leave_requests').insert({ studio_id: me.studioId, staff_id: f.staff_id, start_date: f.start, end_date: f.end, mode: f.mode, reason: f.reason.trim() || null }).select('id')) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave'] }); toast('Leave requested'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); setError(null)
      if (!f.staff_id) return setError('Choose the trainer.'); if (f.end < f.start) return setError('The leave ends before it starts.'); save.mutate() }}>
      {canPick && <Field label="Trainer" required id="lvstaff"><Select id="lvstaff" value={f.staff_id} onChange={set('staff_id')} placeholder="Select Trainer"
        options={team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: s.full_name }))} /></Field>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Leave Start Date" required id="lvs"><TextInput id="lvs" type="date" value={f.start} onChange={set('start')} /></Field>
        <Field label="Leave End Date" required id="lve"><TextInput id="lve" type="date" value={f.end} onChange={set('end')} /></Field>
      </div>
      <Field label="Leave Mode" id="lvm"><Select id="lvm" value={f.mode} onChange={set('mode')} options={Object.entries(LEAVE_MODE).map(([v, l]) => ({ value: v, label: l }))} /></Field>
      <Field label="Reason" id="lvr"><TextArea id="lvr" value={f.reason} onChange={set('reason')} /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Cancel</button><button type="submit" className="btn-gold flex-1" disabled={save.isPending}>Request</button></div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Staff Accounts Access Control (owner)
// ---------------------------------------------------------------------------
type Acl = Record<string, Rights> & { nav_off?: Record<string, string[]> }
export function AccessControl() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const [acl, setAcl] = useState<Acl | null>(null)
  const [dirty, setDirty] = useState(false)
  const current = useQuery({
    queryKey: ['access-control', me.studioId],
    queryFn: async () => (throwIf(await supabase.from('studios').select('settings').eq('id', me.studioId).single()) as { settings: { access_control?: Acl } }).settings.access_control ?? null,
  })
  useEffect(() => {
    if (current.isLoading || acl) return
    const base: Acl = current.data ?? Object.fromEntries(ACCESS_TYPES.map((t) => [t.key, Object.fromEntries(ACCESS_SPEC.rows.map((r) => [r.key, r.default[t.key] ?? []]))])) as Acl
    if (!current.data) base.nav_off = ACCESS_SPEC.nav_off_default
    setAcl(base)
  }, [current.isLoading, current.data, acl])
  const save = useMutation({
    mutationFn: () => saveAccessControl(me.studioId, acl as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-control'] }); qc.invalidateQueries({ queryKey: ['my-access'] }); setDirty(false); toast('Access control saved') },
    onError: (e: Error) => toast(e.message),
  })
  if (!acl) return <Loading />
  const has = (type: string, key: string, sub: string) => !!acl[type]?.[key]?.includes(sub)
  const flip = (type: string, key: string, sub: string, on: boolean) => {
    setDirty(true)
    setAcl((a) => { const x = { ...(a as Acl) }; const t = { ...(x[type] ?? {}) }; const cur = new Set(t[key] ?? []); if (on) cur.add(sub); else cur.delete(sub); t[key] = [...cur]; x[type] = t; return x })
  }
  const navOff = (type: string) => new Set(acl.nav_off?.[type] ?? [])
  const flipNav = (type: string, item: string, visible: boolean) => {
    setDirty(true)
    setAcl((a) => { const x = { ...(a as Acl) }; const off = new Set(x.nav_off?.[type] ?? []); if (visible) off.delete(item); else off.add(item); x.nav_off = { ...(x.nav_off ?? {}), [type]: [...off] }; return x })
  }
  return (
    <>
      <PageHeader title="Staff Accounts Access Control Listing" sub={`${studioLine(studio)} · the owner can always do everything`}
        actions={<button type="button" className="btn-gold min-h-10 px-4" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</button>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        {!current.data && <Notice>These are your YDL access settings (read on 9 Oct 2026). Change any box and Save.</Notice>}
        <div className="card max-h-[calc(100dvh-180px)] overflow-auto">
          <table className="tbl text-[12px]">
            <thead className="sticky top-0 z-20 bg-surface"><tr><th className="sticky left-0 z-30 min-w-[260px] bg-surface">Operations/Employee</th>{ACCESS_TYPES.map((t) => <th key={t.key} className="min-w-[150px] bg-surface">{t.label}</th>)}</tr></thead>
            <tbody>
              {ACCESS_SPEC.rows.map((r) => (
                <tr key={r.key}>
                  <td className="sticky left-0 z-10 bg-surface font-semibold">{r.label}</td>
                  {ACCESS_TYPES.map((t) => (
                    <td key={t.key}>
                      {r.subs.length === 1 && r.subs[0][0] === 'on'
                        ? <input type="checkbox" className="check" aria-label={`${r.label}: ${t.label}`} checked={has(t.key, r.key, 'on')} onChange={(e) => flip(t.key, r.key, 'on', e.target.checked)} />
                        : <div className="flex flex-col gap-1">{r.subs.map(([s, l]) => (
                          <label key={s} className="flex items-center gap-1.5 whitespace-nowrap"><input type="checkbox" className="check" checked={has(t.key, r.key, s)} onChange={(e) => flip(t.key, r.key, s, e.target.checked)} />{l}</label>
                        ))}</div>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 z-10 bg-surface font-semibold">Nav Menu Access<div className="font-normal text-muted">Analysis and register pages shown in the menu</div></td>
                {ACCESS_TYPES.map((t) => { const off = navOff(t.key); return (
                  <td key={t.key}><div className="flex max-h-[280px] flex-col gap-1 overflow-auto pr-1">
                    <button type="button" className="link-btn self-start text-[12px]" onClick={() => ACCESS_SPEC.nav_menu.forEach((m) => flipNav(t.key, m, off.size > 0))}>{off.size > 0 ? 'Show all' : 'Hide all'}</button>
                    {ACCESS_SPEC.nav_menu.map((m) => (
                      <label key={m} className="flex items-center gap-1.5 whitespace-nowrap"><input type="checkbox" className="check" checked={!off.has(m)} onChange={(e) => flipNav(t.key, m, e.target.checked)} />{m}</label>
                    ))}</div></td>
                ) })}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex gap-2"><button type="button" className="btn" disabled={!dirty} onClick={() => { setAcl(null); setDirty(false) }}>Undo changes</button>
          <div className="flex-1" /><button type="button" className="btn-gold" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>Save</button></div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Staff/Trainer Target Info
// ---------------------------------------------------------------------------
export function Targets() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const access = useAccess()
  const { data: studio } = useStudio()
  const team = useTeam()
  const [search, setSearch] = useState('')
  const [person, setPerson] = useState('')
  const [month, setMonth] = useState('')
  const [add, setAdd] = useState<TargetRow | 'new' | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<string[] | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: ['targets', me.studioId],
    queryFn: async () => throwIf(await supabase.from('target_overview').select('*').eq('studio_id', me.studioId).order('year', { ascending: false }).order('month', { ascending: false })) as TargetRow[],
  })
  const rows = useMemo(() => data.filter((t) => (!search || `${t.staff_name} ${t.staff_code}`.toLowerCase().includes(search.toLowerCase())) && (!person || t.staff_id === person)
    && (!month || t.month === Number(month))), [data, search, person, month])
  const del = useMutation({
    mutationFn: async (ids: string[]) => { throwIf(await supabase.from('staff_targets').delete().in('id', ids).select('id')); return ids.length },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['targets'] }); setSelected(new Set()); setConfirm(null); toast(`${n} deleted`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const cell = (t: TargetRow, i: number) => { const x = t.tiers[i]; if (!x) return <span className="text-muted">—</span>
    return <span className={t.tier_reached != null && t.tier_reached > i ? 'font-bold text-green' : ''}>{amt(x.target)}{x.commission != null ? <div className="text-[11px] text-muted">{t.commission_type === 'percentage' ? `${x.commission}%` : amt(x.commission)}</div> : null}</span> }
  return (
    <>
      <PageHeader title="Staff/Trainer Target Info" sub={studioLine(studio)}
        actions={access.can('targets', 'add') && <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setAdd('new')}><Icon name="plus" size={18} />Add Target</button>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={setSearch} placeholder="Search by Name or ID" className="pl-9" />
          </div>
          <Select small ariaLabel="Staff or trainer" value={person} onChange={setPerson} placeholder="All Staff/Trainers" className="w-auto" options={team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: s.full_name }))} />
          <Select small ariaLabel="Month" value={month} onChange={setMonth} placeholder="All Months" className="w-auto" options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
        </div>
        {access.can('targets', 'delete') && <BulkBar count={selected.size} onClear={() => setSelected(new Set())}><button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm([...selected])}>Delete</button></BulkBar>}
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No targets yet.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr><th style={{ width: 44 }} /><th>Staff/Trainer Name</th>{[1, 2, 3, 4, 5].map((i) => <th key={i} className="num">Target {i}</th>)}
                <th>Target Month/Year</th><th className="num">Achieved</th><th className="num">Commission</th><th>Assigned Date</th><th>Action</th></tr></thead>
              <tbody>{rows.map((t) => (
                <tr key={t.id}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${t.staff_name}`} checked={selected.has(t.id)} onChange={() => toggle(t.id)} /></td>
                  <td className="font-semibold">{t.staff_name}<div className="text-[12px] font-normal text-muted">{t.staff_code} · {TARGET_TYPES.find(([k]) => k === t.target_type)?.[1] ?? 'All sales'}</div></td>
                  {[0, 1, 2, 3, 4].map((i) => <td key={i} className="num">{cell(t, i)}</td>)}
                  <td className="nowrap">{MONTHS[t.month - 1].slice(0, 3)} {t.year}</td>
                  <td className="num">{amt(t.achieved)}</td><td className="num font-semibold">{amt(t.commission_earned)}</td>
                  <td className="nowrap">{fmtDay(t.created_at)}</td>
                  <td><ActionMenu actions={[{ label: 'Edit', hidden: !access.can('targets', 'edit'), onClick: () => setAdd(t) },
                    { label: 'Delete', danger: true, hidden: !access.can('targets', 'delete'), onClick: () => setConfirm([t.id]) }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <p className="m-0 text-[12px] text-muted">Achieved counts the month’s sales (before GST) where the person is the bill rep or the trainer. The highest slab reached gives the commission; it goes into payroll.</p>
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        <div className="flex flex-col gap-4"><p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO DELETE THIS STAFF/TRAINER TARGET ?</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className="btn btn-danger flex-1" disabled={del.isPending} onClick={() => confirm && del.mutate(confirm)}>Yes</button></div></div>
      </Sheet>
      <Sheet wide open={!!add} onClose={() => setAdd(null)} title={add === 'new' ? 'Assign Target to Staff/Trainer' : 'Edit Target'}>{add && <TargetForm value={add} onDone={() => setAdd(null)} />}</Sheet>
    </>
  )
}

function TargetForm({ value, onDone }: { value: TargetRow | 'new'; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const t = value === 'new' ? null : value
  const now = new Date(`${studioToday()}T00:00:00`)
  const [person, setPerson] = useState(t?.staff_id ?? '')
  const [months, setMonths] = useState<number[]>(t ? [t.month] : [now.getMonth() + 1])
  const [year, setYear] = useState(String(t?.year ?? now.getFullYear()))
  const [type, setType] = useState(t?.target_type ?? '')
  const [ctype, setCtype] = useState(t?.commission_type ?? '')
  const [tiers, setTiers] = useState<{ target: string; commission: string }[]>(Array.from({ length: 5 }, (_, i) => ({ target: t?.tiers[i] ? String(t.tiers[i].target) : '', commission: t?.tiers[i]?.commission != null ? String(t.tiers[i].commission) : '' })))
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      const list = tiers.filter((x) => x.target !== '').map((x) => ({ target: Number(x.target), commission: x.commission === '' ? null : Number(x.commission) }))
      const base = { studio_id: me.studioId, staff_id: person, year: Number(year), target_type: type || null, commission_type: ctype || null, tiers: list }
      if (t) throwIf(await supabase.from('staff_targets').update({ ...base, month: months[0] }).eq('id', t.id).select('id'))
      else throwIf(await supabase.from('staff_targets').insert(months.map((m) => ({ ...base, month: m }))).select('id'))
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['targets'] }); toast(t ? 'Target saved' : 'Target added'); onDone() },
    onError: (e: Error) => setError(/duplicate|staff_targets_once/.test(e.message) ? 'This person already has a target of this type for one of those months.' : e.message),
  })
  const submit = () => {
    setError(null)
    const list = tiers.filter((x) => x.target !== '').map((x) => Number(x.target))
    if (!person) return setError('Select the staff or trainer.')
    if (!months.length) return setError('Select the target month(s).')
    if (!list.length || tiers[0].target === '') return setError('Enter Target 1.')
    if (list.some((x, i) => i > 0 && x <= list[i - 1])) return setError('Please assign target amounts in ascending order.')
    if (tiers.some((x) => x.commission !== '') && !ctype) return setError('Choose the commission type.')
    save.mutate()
  }
  const yearNow = now.getFullYear()
  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Field label="Select Staff/Trainer" required id="tgp"><Select id="tgp" value={person} onChange={setPerson} placeholder="Select Staff/Trainer" options={team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: `${s.full_name} (${s.staff_code})` }))} /></Field>
      <fieldset className="m-0 border-0 p-0"><legend className="mb-1.5 p-0 text-[12px] font-semibold text-muted">Target Month/Year <span className="text-red">*</span></legend>
        <div className="flex flex-wrap gap-x-3">
          {MONTHS.map((m, i) => <Checkbox key={m} label={m.slice(0, 1) + m.slice(1, 3).toLowerCase()} checked={months.includes(i + 1)}
            onChange={(on) => setMonths(t ? [i + 1] : on ? [...months, i + 1] : months.filter((x) => x !== i + 1))} />)}
          {!t && <Checkbox label="Select All" checked={months.length === 12} onChange={(on) => setMonths(on ? MONTHS.map((_, i) => i + 1) : [])} />}
        </div></fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Year" id="tgy"><Select id="tgy" value={year} onChange={setYear} options={[yearNow - 1, yearNow, yearNow + 1].map((y) => ({ value: String(y), label: String(y) }))} /></Field>
        <Field label="Target Type" id="tgt"><Select id="tgt" value={type} onChange={setType} placeholder="Select Target Type" options={TARGET_TYPES.map(([v, l]) => ({ value: v, label: l }))} /></Field>
        <Field label="Commission Type" id="tgc"><Select id="tgc" value={ctype} onChange={setCtype} placeholder="Select Commission Type" options={[{ value: 'flat', label: 'Flat Value' }, { value: 'percentage', label: 'Percentage' }]} /></Field>
      </div>
      <p className="m-0 text-[13px] font-semibold">Please Assign Target Amount In Ascending Order</p>
      {tiers.map((x, i) => (
        <div key={i} className="grid grid-cols-2 gap-3">
          <Field label={`Target ${i + 1}`} required={i === 0} id={`tg${i}`}><TextInput id={`tg${i}`} type="number" value={x.target} onChange={(v) => setTiers(tiers.map((y, j) => (j === i ? { ...y, target: v } : y)))} /></Field>
          <Field label="Commission" id={`tc${i}`}><TextInput id={`tc${i}`} type="number" value={x.commission} placeholder="eg.123" onChange={(v) => setTiers(tiers.map((y, j) => (j === i ? { ...y, commission: v } : y)))} /></Field>
        </div>
      ))}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button><button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{t ? 'Save Target' : 'Add Target'}</button></div>
    </form>
  )
}
