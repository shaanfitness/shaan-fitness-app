import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { accessTypeLabel, ACCESS_TYPES, OWNER_TYPE, useAccess } from '../../access'
import { supabase } from '../../lib/supabase'
import { throwIf, useList, useServices, useStudio, useTeam } from '../../db/studio'
import { DAY_NAMES, uploadStudioMedia } from '../../db/classes'
import {
  createLogin, deleteStaff, linkStaffLogin, sendPasswordReset, STAFF_SWITCHES, staffCheckTime, TRAINER_SWITCHES, type StaffRow,
} from '../../db/team'
import { staffCheckIn } from '../../db/classes'
import { fmtDateTime, fmtDay, fmtTime, localInputToIso } from '../../lib/dates'
import { ActionMenu, Checkbox, CheckboxGroup, Field, Notice, RadioGroup, Select, TextInput } from '../../components/controls'
import { BulkBar } from '../../components/table'
import { useToast } from '../../components/toast'
import { Avatar, Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL "Add Trainer" / "My Trainers" and "Add Staff Account" / "Staff List" — one list and
// one form, shown as trainers (coaches and doctors) or as staff accounts (owner and front desk).

type Kind = 'trainer' | 'staff'
const studioLine = (s?: { name: string; branch_name: string | null }) => `${s?.name ?? ''}${s?.branch_name ? ` (${s.branch_name})` : ''}`
const yes = (v: boolean) => (v ? 'yes' : 'no')

export function PeopleList({ kind }: { kind: Kind }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const access = useAccess()
  const team = useTeam()
  const { data: studio } = useStudio()
  const [search, setSearch] = useState('')
  const [inactive, setInactive] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { action: 'deactivate' | 'activate'; ids: string[] }>(null)
  const [time, setTime] = useState<StaffRow | null>(null)
  const [remove, setRemove] = useState<StaffRow | null>(null)
  const [view, setView] = useState<StaffRow | null>(null)
  const right = kind === 'trainer' ? 'trainers' : 'staff_accounts'
  const { data: people = [], isLoading } = useQuery({
    queryKey: ['staff-overview', me.studioId],
    queryFn: async () => throwIf(await supabase.from('staff_overview').select('*').eq('studio_id', me.studioId).order('first_name')) as StaffRow[],
  })
  const rows = useMemo(() => people.filter((p) => (kind === 'trainer' ? p.role === 'coach' || p.role === 'doctor' : p.role === 'owner' || p.role === 'front_desk')
    && p.active === !inactive && (!search || `${p.full_name} ${p.email} ${p.phone} ${p.staff_code}`.toLowerCase().includes(search.toLowerCase()))), [people, kind, inactive, search])
  const refresh = () => { qc.invalidateQueries({ queryKey: ['staff-overview'] }); qc.invalidateQueries({ queryKey: ['staff'] }); qc.invalidateQueries({ queryKey: ['staff-attendance'] }) }
  const act = useMutation({
    mutationFn: async ({ action, ids }: { action: 'deactivate' | 'activate'; ids: string[] }) => {
      throwIf(await supabase.from('staff').update({ active: action === 'activate' }).in('id', ids).select('id')); return { action, n: ids.length }
    },
    onSuccess: ({ action, n }) => { refresh(); setSelected(new Set()); setConfirm(null); toast(`${n} ${action}d`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const punch = useMutation({
    mutationFn: ({ id, out }: { id: string; out: boolean }) => staffCheckIn(id, out),
    onSuccess: (_d, v) => { refresh(); toast(v.out ? 'Checked out' : 'Checked in') },
    onError: (e: Error) => toast(e.message),
  })
  const star = useMutation({
    mutationFn: async (p: StaffRow) => { throwIf(await supabase.from('staff').update({ star_trainer: !p.star_trainer }).eq('id', p.id).select('id')); return !p.star_trainer },
    onSuccess: (on) => { refresh(); toast(on ? 'Marked as star trainer' : 'Star removed') },
    onError: (e: Error) => toast(e.message),
  })
  const reset = useMutation({
    mutationFn: (p: StaffRow) => { if (!p.email) throw new Error('Add an email first'); return sendPasswordReset(p.email) },
    onSuccess: () => toast('Password reset email sent'),
    onError: (e: Error) => toast(e.message),
  })
  const link = useMutation({
    mutationFn: (p: StaffRow) => linkStaffLogin(p.id),
    onSuccess: (ok) => { refresh(); toast(ok ? 'Login linked' : 'No login with this email or mobile yet. Edit and set a password to make one.') },
    onError: (e: Error) => toast(e.message),
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const canEdit = access.can(right, 'edit')
  const canMark = access.can(right, 'view')
  const typeOf = (p: StaffRow) => (kind === 'trainer' ? (p.role === 'doctor' ? 'Doctor' : p.employee_type ?? 'Trainer') : p.role === 'owner' ? 'Owner' : accessTypeLabel(p.access_type))
  const status = (p: StaffRow) => (p.today_check_in && !p.today_check_out ? <span className="chip chip-green">In since {fmtTime(p.today_check_in)}</span>
    : p.today_check_out ? <span className="chip chip-muted">Out {fmtTime(p.today_check_out)}</span> : <span className="text-[12px] text-muted">Not in today</span>)
  const actions = (p: StaffRow) => <ActionMenu actions={[
    { label: 'View', onClick: () => setView(p) },
    { label: 'Edit', hidden: !canEdit || (p.role === 'owner' && !access.owner), onClick: () => navigate(`/${kind === 'trainer' ? 'trainers' : 'staff'}/${p.id}/edit`) },
    { label: 'Check In', hidden: !canMark || !p.active || (!!p.today_check_in && !p.today_check_out), onClick: () => punch.mutate({ id: p.id, out: false }) },
    { label: 'Check Out', hidden: !canMark || !p.today_check_in || !!p.today_check_out, onClick: () => punch.mutate({ id: p.id, out: true }) },
    { label: 'Add Time', hidden: !canMark, onClick: () => setTime(p) },
    { label: p.star_trainer ? 'Remove Star Trainer' : 'Make Star Trainer', hidden: kind !== 'trainer' || !canEdit, onClick: () => star.mutate(p) },
    { label: 'Send Password Reset', hidden: !p.email || !p.has_login, onClick: () => reset.mutate(p) },
    { label: 'Link Login', hidden: !!p.has_login, onClick: () => link.mutate(p) },
    { label: p.active ? 'Deactivate' : 'Activate', hidden: !canEdit || p.role === 'owner', onClick: () => setConfirm({ action: p.active ? 'deactivate' : 'activate', ids: [p.id] }) },
    { label: 'Delete & Migrate', danger: true, hidden: !access.owner || p.user_id === me.userId, onClick: () => setRemove(p) },
  ]} />
  const title = kind === 'trainer' ? (inactive ? 'Deactivated Trainers' : 'My Trainers Listing (Max Limit : 1000)') : inactive ? 'Deactivated Staff Accounts' : 'Staff Accounts Listing'
  return (
    <>
      <PageHeader title={title} sub={studioLine(studio)}
        actions={<>
          <button type="button" className="btn btn-sm" onClick={() => { setInactive(!inactive); setSelected(new Set()) }}>{inactive ? 'Active' : 'Deactivated'}</button>
          {kind === 'trainer' && <Link to="/trainers/leave" className="btn btn-sm">Leave Requests</Link>}
          {access.can(right, 'add') && <Link to={kind === 'trainer' ? '/trainers/new' : '/staff/new'} className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />{kind === 'trainer' ? 'Add Trainer' : 'Add Staff'}</Link>}
        </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <div className="relative max-w-[480px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={setSearch} placeholder="Search by Name, Mobile Number or Email Address" className="pl-9" />
        </div>
        {canEdit && <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: inactive ? 'activate' : 'deactivate', ids: [...selected].filter((i) => rows.find((r) => r.id === i)?.role !== 'owner') })}>{inactive ? 'Activate' : 'Deactivate'}</button>
        </BulkBar>}
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">{search ? 'No one matches.' : kind === 'trainer' ? 'No trainers yet.' : 'No staff accounts yet.'}</div> : (
          <>
            <div className="card hidden overflow-x-auto lg:block">
              <table className="tbl">
                <thead><tr>
                  {canEdit && <th style={{ width: 44 }}><input type="checkbox" className="check" aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))} /></th>}
                  <th>{kind === 'trainer' ? 'Trainer Name' : 'Account Name'}</th>{kind === 'staff' && <th>Staff Id</th>}<th>{kind === 'trainer' ? 'Trainer Type' : 'Account Type'}</th>
                  <th>Checkin Status</th><th>Email</th><th>Phone No.</th>{kind === 'trainer' && <th>Star Trainer</th>}<th>Login</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>{rows.map((p) => (
                  <tr key={p.id}>
                    {canEdit && <td><input type="checkbox" className="check" aria-label={`Select ${p.full_name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>}
                    <td><div className="flex min-w-[190px] items-center gap-2.5"><Avatar name={p.full_name} size={34} /><div><div className="font-semibold">{p.full_name}</div>
                      {kind === 'trainer' && <div className="text-[12px] text-muted">{p.staff_code}{p.client_count ? ` · ${p.client_count} clients` : ''}</div>}</div></div></td>
                    {kind === 'staff' && <td className="nowrap">{p.staff_code}</td>}
                    <td>{typeOf(p)}{p.designation ? <div className="text-[12px] text-muted">{p.designation}</div> : null}</td>
                    <td>{status(p)}</td>
                    <td className="max-w-[220px] truncate">{p.email ?? '—'}</td>
                    <td className="nowrap">{p.phone ? `${p.country_code} ${p.phone}` : '—'}</td>
                    {kind === 'trainer' && <td>{p.star_trainer ? <span className="chip chip-gold">★ Star</span> : '—'}</td>}
                    <td>{p.has_login ? <span className="chip chip-green">Linked</span> : <span className="chip chip-muted">No login</span>}</td>
                    <td>{p.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>}</td>
                    <td>{actions(p)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2.5 lg:hidden">
              {rows.map((p) => (
                <div key={p.id} className="card flex items-start gap-3 p-4">
                  <Avatar name={p.full_name} size={40} />
                  <div className="min-w-0 flex-1 text-[13px]"><div className="text-[15px] font-semibold">{p.full_name}{p.star_trainer ? ' ★' : ''}</div>
                    <div className="text-muted">{typeOf(p)} · {p.staff_code}</div><div className="mt-1">{status(p)}</div></div>
                  {actions(p)}
                </div>
              ))}
            </div>
          </>
        )}
        {kind === 'trainer' && <p className="m-0 text-[12px] text-muted">Copy or import trainers between branches comes when a second branch is added.</p>}
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && <div className="flex flex-col gap-4"><p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO {confirm.action.toUpperCase()} THE SELECTED {kind === 'trainer' ? 'TRAINER' : 'STAFF ACCOUNT'} ?</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className="btn-gold flex-1" disabled={act.isPending} onClick={() => act.mutate(confirm)}>Yes</button></div></div>}
      </Sheet>
      <AddTimeSheet person={time} onClose={() => setTime(null)} onDone={refresh} kind={kind} />
      <DeleteSheet person={remove} onClose={() => setRemove(null)} onDone={refresh} options={team.everyone.filter((t) => t.id !== remove?.id && (kind === 'trainer' ? t.role === 'coach' : t.role !== 'doctor'))} />
      <ProfileSheet person={view} onClose={() => setView(null)} kind={kind} />
    </>
  )
}

function AddTimeSheet({ person, onClose, onDone, kind }: { person: StaffRow | null; onClose: () => void; onDone: () => void; kind: Kind }) {
  const toast = useToast()
  const [inAt, setIn] = useState('')
  const [outAt, setOut] = useState('')
  const save = useMutation({
    mutationFn: () => staffCheckTime(person!.id, localInputToIso(inAt), outAt ? localInputToIso(outAt) : null),
    onSuccess: () => { onDone(); toast('Time added'); setIn(''); setOut(''); onClose() },
    onError: (e: Error) => toast(e.message),
  })
  return (
    <Sheet open={!!person} onClose={onClose} title={kind === 'trainer' ? 'Trainer Manual check In' : 'Staff Manual check In'}>
      {person && <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <p className="m-0 text-[14px] font-semibold">{person.full_name}</p>
        <Field label="Enter the check in date and time" required id="tin"><TextInput id="tin" type="datetime-local" value={inAt} onChange={setIn} /></Field>
        <Field label="Enter the check out date and time" id="tout"><TextInput id="tout" type="datetime-local" value={outAt} onChange={setOut} /></Field>
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-gold flex-1" disabled={!inAt || save.isPending}>Confirm</button></div>
      </form>}
    </Sheet>
  )
}

function DeleteSheet({ person, onClose, onDone, options }: { person: StaffRow | null; onClose: () => void; onDone: () => void; options: { id: string; full_name: string }[] }) {
  const toast = useToast()
  const [to, setTo] = useState('')
  const del = useMutation({
    mutationFn: () => deleteStaff(person!.id, to || null),
    onSuccess: () => { onDone(); toast(`${person!.full_name} deleted`); setTo(''); onClose() },
    onError: (e: Error) => toast(e.message),
  })
  return (
    <Sheet open={!!person} onClose={onClose} title={`Delete ${person?.role === 'coach' || person?.role === 'doctor' ? 'Trainer' : 'Staff'}`}>
      {person && <div className="flex flex-col gap-3">
        <p className="m-0 text-[14px]">Move <strong>{person.full_name}</strong>’s clients, batches, programs, open follow-ups and coming appointments to:</p>
        <Field label="Migrate to:" id="mig"><Select id="mig" value={to} onChange={setTo} placeholder="Select who takes over" options={options.map((o) => ({ value: o.id, label: o.full_name }))} /></Field>
        <Notice tone="warn">Old bills and records keep {person.full_name}’s name. Their login stops working.</Notice>
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger flex-1" disabled={!to || del.isPending} onClick={() => del.mutate()}>Delete &amp; Migrate</button></div>
      </div>}
    </Sheet>
  )
}

function ProfileSheet({ person: p, onClose, kind }: { person: StaffRow | null; onClose: () => void; kind: Kind }) {
  const { data: services = [] } = useServices()
  const rows: [string, string | null | undefined][] = p ? [
    ['Code', p.staff_code], ['Type', kind === 'trainer' ? p.employee_type : accessTypeLabel(p.access_type)], ['Designation', p.designation ?? p.title],
    ['Email', p.email], ['Mobile', p.phone ? `${p.country_code} ${p.phone}` : null], ['Emergency Contact', p.emergency_phone], ['Date of Birth', fmtDay(p.date_of_birth)],
    ['Gender', p.gender], ['Working Days', p.working_days.map((d) => DAY_NAMES[d - 1].slice(0, 3)).join(', ')],
    ['Shift', p.shift_start ? `${p.shift_start.slice(0, 5)} – ${p.shift_end?.slice(0, 5) ?? ''}` : null],
    ['Experience', p.years_experience != null ? `${p.years_experience} years` : null], ['Client Limit', p.client_limit != null ? String(p.client_limit) : null],
    ['Clients assigned', p.client_count != null ? String(p.client_count) : null], ['Services', services.filter((s) => p.service_ids.includes(s.id)).map((s) => s.custom_name ?? s.name).join(', ')],
    ['Address', [p.street1, p.street2, p.city, p.state, p.pincode].filter(Boolean).join(', ')], ['Added', fmtDateTime(p.created_at)],
  ] : []
  return (
    <Sheet wide open={!!p} onClose={onClose} title={p?.full_name ?? ''}>
      <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-[13px]">
        {rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="m-0">{v}</dd></div>)}
      </dl>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Add / edit a trainer or staff account
// ---------------------------------------------------------------------------
const blank = {
  first_name: '', last_name: '', email: '', password: '', country_code: '+91', phone: '', emergency_phone: '', date_of_birth: '', gender: '',
  years_experience: '', client_limit: '', show_in_member_app: 'yes', service_type: 'both', employee_type: '', service_ids: [] as string[],
  access_type: 'front_desk_exec', designation: '', working_days: ['1', '2', '3', '4', '5', '6'], shift_start: '', shift_end: '',
  street1: '', street2: '', city: '', state: '', country: 'India', pincode: '', title: '', photo_url: '',
  switches: {} as Record<string, boolean>, basic_pay: '', pay_per: 'month', deduct_for_absent: false, late_penalty: '',
}

export function PersonForm({ kind }: { kind: Kind }) {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const access = useAccess()
  const { data: services = [] } = useServices()
  const trainerTypes = useList('trainer_type')
  const designations = useList('staff_designation')
  const editing = !!id
  const existing = useQuery({ queryKey: ['person', id], enabled: editing, queryFn: async () => throwIf(await supabase.from('staff').select('*').eq('id', id!).single()) as StaffRow })
  const payroll = useQuery({ queryKey: ['staff-payroll', id], enabled: editing && access.owner,
    queryFn: async () => ((await supabase.from('staff_payroll').select('*').eq('staff_id', id!).maybeSingle()).data ?? null) as null | { basic_pay: number; pay_per: string; deduct_for_absent: boolean; late_penalty: number } })
  const [f, setF] = useState(blank)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)   // a new record already saved, if a later step failed
  useEffect(() => {
    const p = existing.data
    if (!p) return
    setF((x) => ({ ...x, first_name: p.first_name, last_name: p.last_name ?? '', email: p.email ?? '', country_code: p.country_code, phone: p.phone ?? '',
      emergency_phone: p.emergency_phone ?? '', date_of_birth: p.date_of_birth ?? '', gender: p.gender ?? '', years_experience: p.years_experience != null ? String(p.years_experience) : '',
      client_limit: p.client_limit != null ? String(p.client_limit) : '', show_in_member_app: yes(p.show_in_member_app), service_type: p.service_type,
      employee_type: p.role === 'doctor' ? 'Doctor' : p.employee_type ?? '', service_ids: p.service_ids, access_type: p.role === 'owner' ? 'owner' : p.access_type ?? 'front_desk_exec',
      designation: p.designation ?? '', working_days: p.working_days.map(String), shift_start: p.shift_start?.slice(0, 5) ?? '', shift_end: p.shift_end?.slice(0, 5) ?? '',
      street1: p.street1 ?? '', street2: p.street2 ?? '', city: p.city ?? '', state: p.state ?? '', country: p.country ?? 'India', pincode: p.pincode ?? '',
      title: p.title ?? '', photo_url: p.photo_url ?? '', switches: p.permissions ?? {} }))
  }, [existing.data])
  useEffect(() => {
    const pr = payroll.data
    if (pr) setF((x) => ({ ...x, basic_pay: String(pr.basic_pay), pay_per: pr.pay_per, deduct_for_absent: pr.deduct_for_absent, late_penalty: String(pr.late_penalty || '') }))
  }, [payroll.data])
  const set = <K extends keyof typeof blank>(k: K) => (v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }))
  const sw = (k: string) => f.switches[k] ?? (kind === 'trainer' ? !['assign_subscription', 'view_subscription', 'view_membership_plan', 'create_membership_plan', 'view_programs', 'create_programs', 'view_all_batches', 'view_self_batches', 'create_self_batches', 'create_all_batches'].includes(k) : k === 'allow_discounting')

  const save = useMutation({
    mutationFn: async (next: boolean) => {
      const photo = file ? await uploadStudioMedia(me.studioId, 'staff', file) : f.photo_url || null
      const role = kind === 'trainer' ? (f.employee_type === 'Doctor' ? 'doctor' : 'coach') : f.access_type === 'owner' ? 'owner' : 'front_desk'
      const row: Record<string, unknown> = {
        studio_id: me.studioId, first_name: f.first_name.trim(), last_name: f.last_name.trim() || null, email: f.email.trim().toLowerCase(),
        country_code: f.country_code.trim() || '+91', phone: f.phone.replace(/\D/g, ''), emergency_phone: f.emergency_phone.trim() || null,
        date_of_birth: f.date_of_birth || null, gender: f.gender || null, working_days: f.working_days.map(Number).sort(),
        shift_start: f.shift_start || null, shift_end: f.shift_end || null, street1: f.street1 || null, street2: f.street2 || null, city: f.city || null,
        state: f.state || null, country: f.country || null, pincode: f.pincode || null, photo_url: photo, title: f.title.trim() || null,
        permissions: { ...(existing.data?.permissions ?? {}), ...Object.fromEntries((kind === 'trainer' ? TRAINER_SWITCHES : STAFF_SWITCHES).map(([k]) => [k, sw(k)])) },
      }
      const rowId = id ?? savedId
      if (!rowId) row.role = role
      if (kind === 'trainer') Object.assign(row, {
        years_experience: f.years_experience === '' ? null : Number(f.years_experience), client_limit: f.client_limit === '' ? null : Number(f.client_limit),
        show_in_member_app: f.show_in_member_app === 'yes', service_type: f.service_type, employee_type: f.employee_type || null, service_ids: f.service_ids,
      })
      else Object.assign(row, { access_type: f.access_type, designation: f.designation || null })
      const res = rowId ? throwIf(await supabase.from('staff').update(row).eq('id', rowId).select('id').single())
        : throwIf(await supabase.from('staff').insert(row).select('id').single())
      const sid = (res as unknown as { id: string }).id
      if (!rowId) setSavedId(sid)
      if (access.owner && (f.basic_pay !== '' || payroll.data)) {
        throwIf(await supabase.from('staff_payroll').upsert({ staff_id: sid, studio_id: me.studioId, basic_pay: Number(f.basic_pay || 0), pay_per: f.pay_per,
          deduct_for_absent: f.deduct_for_absent, late_penalty: Number(f.late_penalty || 0), updated_at: new Date().toISOString() }, { onConflict: 'staff_id' }).select('staff_id'))
      }
      let login = 'kept'
      if (f.password) {
        await createLogin(row.email as string, f.password, `${f.first_name} ${f.last_name}`.trim())
        login = (await linkStaffLogin(sid)) ? 'linked' : 'pending'
      }
      return { next, id: sid, login }
    },
    onSuccess: ({ next, id: sid, login }) => {
      qc.invalidateQueries({ queryKey: ['staff-overview'] }); qc.invalidateQueries({ queryKey: ['staff'] }); qc.invalidateQueries({ queryKey: ['person', sid] })
      const who = kind === 'trainer' ? 'Trainer' : 'Staff account'
      toast(login === 'pending' ? `${who} saved. They’ll get an email to confirm, then sign in with this email and password.` : login === 'linked' ? `${who} saved with a login` : `${who} saved`)
      setSavedId(null)
      if (next) { setF(blank); setFile(null); navigate(kind === 'trainer' ? '/trainers/new' : '/staff/new', { replace: true }) }
      else navigate(kind === 'trainer' ? '/trainers' : '/staff', { replace: true })
    },
    onError: (e: Error) => setError(/staff_email_role_uq/i.test(e.message) ? `Someone with this email is already ${kind === 'trainer' ? 'a trainer' : 'a staff account'} here.`
      : /staff_user_role/i.test(e.message) ? 'This login is already linked to another account of the same kind.' : e.message),
  })
  const submit = (next: boolean) => {
    setError(null)
    if (!f.first_name.trim() || !f.last_name.trim()) return setError(`Enter the ${kind === 'trainer' ? 'trainer' : 'staff'}’s first and last name.`)
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError('Enter a valid email (it is their login).')
    if (!editing && f.password.length < 6) return setError('Set a password of at least 6 characters for their login.')
    if (editing && f.password && f.password.length < 6) return setError('The password needs at least 6 characters.')
    if (!/^\d{10}$/.test(f.phone.replace(/\D/g, ''))) return setError('Enter the 10-digit mobile number.')
    if (!editing && !f.date_of_birth) return setError('Enter the date of birth.')
    if (!f.gender) return setError('Choose the gender.')
    if (kind === 'trainer' && !f.employee_type) return setError('Choose the trainer category.')
    if (kind === 'trainer' && !f.service_ids.length) return setError('Select the trainer’s services.')
    if (kind === 'staff' && !f.access_type) return setError('Choose the employee type.')
    if (!f.working_days.length) return setError('Select the working days.')
    if (f.shift_start && f.shift_end && f.shift_end <= f.shift_start) return setError('The shift should end after it starts.')
    save.mutate(next)
  }
  if (editing && existing.isLoading) return <Loading />
  const card = 'card flex flex-col gap-4 p-5'
  const label = kind === 'trainer' ? 'Trainer' : 'Staff'
  const yn = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
  const typeOptions = [...(access.owner ? [OWNER_TYPE] : []), ...ACCESS_TYPES].map((t) => ({ value: t.key, label: t.label }))
  return (
    <>
      <PageHeader title={editing ? `Edit ${label}` : kind === 'trainer' ? 'Add Trainer' : 'Add Staff Account'} sub={`${label === 'Staff' ? 'Staff Account' : 'Trainer'} Basic Information`} />
      <form className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
        <section className={card}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`${label} Name`} required id="pfirst"><div className="flex gap-2"><TextInput id="pfirst" value={f.first_name} onChange={set('first_name')} placeholder="First name" />
              <TextInput value={f.last_name} onChange={set('last_name')} placeholder="Last name" /></div></Field>
            <Field label={`${label} Email`} required id="pemail" hint="Their login"><TextInput id="pemail" type="email" value={f.email} onChange={set('email')} autoComplete="off" /></Field>
            <Field label={`${label} Password`} required={!editing} id="ppass" hint={editing ? (existing.data?.user_id ? 'Leave empty to keep their password. Use “Send Password Reset” in the list to change it.' : 'Set one to give them a login.') : 'At least 6 characters. They confirm by email, then sign in.'}>
              <TextInput id="ppass" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
            <Field label="Mobile Number" required id="pphone"><div className="flex gap-2"><TextInput value={f.country_code} onChange={set('country_code')} className="w-[76px] flex-none" />
              <TextInput id="pphone" inputMode="tel" value={f.phone} onChange={set('phone')} /></div></Field>
            <Field label="Emergency Contact Number" id="pem"><TextInput id="pem" inputMode="tel" value={f.emergency_phone} onChange={set('emergency_phone')} /></Field>
            <Field label="Date of Birth" required={!editing} id="pdob"><TextInput id="pdob" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} /></Field>
          </div>
          <RadioGroup name="pgender" legend="Gender" required value={f.gender} onChange={set('gender')} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
          {kind === 'trainer' ? <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Trainer Experience" id="pexp" hint="Years"><TextInput id="pexp" type="number" value={f.years_experience} onChange={set('years_experience')} /></Field>
              <Field label="Trainer Client Limit" id="plim"><TextInput id="plim" type="number" value={f.client_limit} onChange={set('client_limit')} /></Field>
              <Field label="Trainer Service Type" id="pst"><Select id="pst" value={f.service_type} onChange={set('service_type')} options={[{ value: 'both', label: 'Both Online & Offline' }, { value: 'online', label: 'Only Online' }, { value: 'offline', label: 'Only Offline' }]} /></Field>
            </div>
            <RadioGroup name="papp" legend="Show Trainer in App" value={f.show_in_member_app} onChange={set('show_in_member_app')} options={yn} />
            <Field label="Title" id="ptitle" hint="Shown on the trainer’s profile, e.g. Head Coach"><TextInput id="ptitle" value={f.title} onChange={set('title')} /></Field>
            <RadioGroup name="pcat" legend="Category" required value={f.employee_type} onChange={set('employee_type')}
              options={[...trainerTypes.map((t) => ({ value: t.label, label: t.label })), ...(access.owner && !trainerTypes.some((t) => t.label === 'Doctor') ? [{ value: 'Doctor', label: 'Doctor' }] : [])]
                .filter((o) => o.value !== 'Doctor' || access.owner || f.employee_type === 'Doctor')} />
            {f.employee_type === 'Doctor' && <Notice>Doctors sign in to the doctor screens: consults, approvals and the clients assigned to them.</Notice>}
          </> : <>
            <RadioGroup name="ptype" legend="Employee Type" required value={f.access_type} onChange={set('access_type')} options={typeOptions} />
            <Field label="Designation" id="pdes"><Select id="pdes" value={f.designation} onChange={set('designation')} placeholder="Select Designation" options={designations.map((d) => ({ value: d.label, label: d.label }))} /></Field>
            {STAFF_SWITCHES.map(([k, l]) => <RadioGroup key={k} name={`sw-${k}`} legend={l} required value={yes(sw(k))} onChange={(v) => set('switches')({ ...f.switches, [k]: v === 'yes' })} options={yn} />)}
            <p className="m-0 text-[12px] text-muted">What each employee type may open and do is set in Staff › Staff Access Control.</p>
          </>}
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Working Days</h2>
          <CheckboxGroup legend="Working Days" columns={4} values={f.working_days} onChange={set('working_days')} options={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: DAY_NAMES[d - 1] }))} />
          <div className="grid grid-cols-2 gap-4 sm:max-w-[420px]">
            <Field label="Shift starts" id="pss" hint="For late marks in payroll"><TextInput id="pss" type="time" value={f.shift_start} onChange={set('shift_start')} /></Field>
            <Field label="Shift ends" id="pse"><TextInput id="pse" type="time" value={f.shift_end} onChange={set('shift_end')} /></Field>
          </div>
        </section>
        {kind === 'trainer' && <section className={card}>
          <CheckboxGroup legend="Trainer Services *" columns={3} values={f.service_ids} onChange={set('service_ids')} options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
        </section>}
        <section className={card}>
          <Field label={`${label} Profile Picture`} id="ppic" hint={f.photo_url && !file ? 'A picture is set. Choose a file to replace it.' : undefined}>
            <input id="ppic" type="file" accept="image/*" className="input py-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          {f.photo_url && !file && <img src={f.photo_url} alt="" className="h-24 w-24 rounded-xl border border-line object-cover" />}
        </section>
        {kind === 'trainer' && <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Trainer Coach App Settings</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {TRAINER_SWITCHES.map(([k, l]) => <RadioGroup key={k} name={`sw-${k}`} legend={l} value={yes(sw(k))} onChange={(v) => set('switches')({ ...f.switches, [k]: v === 'yes' })} options={yn} />)}
          </div>
        </section>}
        {access.owner && <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">{label} Payroll</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Basic Pay/Salary" id="ppay"><TextInput id="ppay" type="number" value={f.basic_pay} onChange={set('basic_pay')} /></Field>
            <Field label="Per" id="pper"><Select id="pper" value={f.pay_per} onChange={set('pay_per')} options={[{ value: 'month', label: 'Per Month' }, { value: 'week', label: 'Per Week' }, { value: 'day', label: 'Per Day' }]} /></Field>
            <Field label="Late Penalty" id="plate" hint="Rupees per late mark"><TextInput id="plate" type="number" value={f.late_penalty} onChange={set('late_penalty')} /></Field>
          </div>
          <Checkbox checked={f.deduct_for_absent} onChange={set('deduct_for_absent')} label="Deduct Salary for Absent" />
          <p className="m-0 text-[12px] text-muted">Only the owner sees pay.</p>
        </section>}
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">{label === 'Staff' ? 'Account' : 'Trainer'} Address</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Address" id="pa1"><TextInput id="pa1" value={f.street1} onChange={set('street1')} placeholder="Flat No., Building name" /></Field>
            <Field label="Street, Area" id="pa2"><TextInput id="pa2" value={f.street2} onChange={set('street2')} placeholder="Street, Area" /></Field>
            <Field label="City" id="pcity"><TextInput id="pcity" value={f.city} onChange={set('city')} /></Field>
            <Field label="State" id="pstate"><TextInput id="pstate" value={f.state} onChange={set('state')} /></Field>
            <Field label="Country" id="pctry"><TextInput id="pctry" value={f.country} onChange={set('country')} /></Field>
            <Field label="Pincode" id="ppin"><TextInput id="ppin" inputMode="numeric" value={f.pincode} onChange={set('pincode')} /></Field>
          </div>
        </section>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur lg:bottom-4">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Back</button>
          <div className="flex-1" />
          {!editing && <button type="button" className="btn" disabled={save.isPending} onClick={() => submit(true)}>Save & Next</button>}
          <button type="submit" className="btn-gold" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </>
  )
}
