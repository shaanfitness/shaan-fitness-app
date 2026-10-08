import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useServices, useStudio, useTeam } from '../../db/studio'
import { DAY_NAMES, daysLabel, timeRange, uploadStudioMedia, useBatchList, type BatchRow } from '../../db/classes'
import { fmtDay } from '../../lib/dates'
import { downloadCsv } from '../../lib/csv'
import { ActionMenu, Checkbox, CheckboxGroup, Field, MultiSelect, Notice, RadioGroup, Select, TextArea, TextInput } from '../../components/controls'
import { BulkBar } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL "Add Batch" (New Batch Basic Information) and "Batch List" (Batch Listing).

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]
// YDL opens a batch's fixed members in the clients database, filtered to the batch.
const membersLink = (batchId: string, desk: boolean) => `${desk ? '/clients' : '/members'}?batch=${batchId}`

export function BatchList() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: batches = [], isLoading } = useBatchList()
  const { data: services = [] } = useServices()
  const { data: studio } = useStudio()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [days, setDays] = useState<string[]>([])
  const [deactivated, setDeactivated] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { action: 'delete' | 'deactivate' | 'activate'; ids: string[] }>(null)
  const desk = me.role === 'owner' || me.role === 'front_desk'

  const rows = useMemo(() => batches.filter((b) => b.active === !deactivated
    && (!search || `${b.name} ${b.batch_code} ${b.trainer_names ?? ''} ${timeRange(b.start_time, b.end_time)}`.toLowerCase().includes(search.toLowerCase()))
    && (!category || b.service_ids.includes(category))
    && (!days.length || days.some((d) => b.days.includes(Number(d))))), [batches, deactivated, search, category, days])

  const act = useMutation({
    mutationFn: async ({ action, ids }: { action: 'delete' | 'deactivate' | 'activate'; ids: string[] }) => {
      if (action === 'delete') {
        if (batches.some((b) => ids.includes(b.id) && b.in_use)) throw new Error('A batch with members, bookings or check-ins can’t be deleted. Deactivate it instead.')
        throwIf(await supabase.from('batches').delete().in('id', ids).select('id'))
      } else throwIf(await supabase.from('batches').update({ active: action === 'activate' }).in('id', ids).select('id'))
      return { action, n: ids.length }
    },
    onSuccess: ({ action, n }) => {
      qc.invalidateQueries({ queryKey: ['batch-overview'] }); qc.invalidateQueries({ queryKey: ['batches'] })
      setSelected(new Set()); setConfirm(null)
      toast(`${n} ${n === 1 ? 'batch' : 'batches'} ${action === 'delete' ? 'deleted' : action + 'd'}`)
    },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })

  const exportCsv = () => downloadCsv('batches.csv', selected.size ? rows.filter((r) => selected.has(r.id)) : rows, [
    ['Batch Name', (b) => b.name], ['Batch Code', (b) => b.batch_code], ['Time', (b) => timeRange(b.start_time, b.end_time)],
    ['Start Date', (b) => b.start_date], ['End Date', (b) => b.end_date], ['Service Categories', (b) => b.service_names], ['Capacity', (b) => b.capacity],
    ['Fixed Batch Members', (b) => b.member_count], ['Trainers', (b) => b.trainer_names], ['Days', (b) => daysLabel(b.days)], ['Room', (b) => b.room],
    ['Status', (b) => (b.active ? 'Active' : 'Deactivated')],
  ])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id))

  return (
    <>
      <PageHeader title={deactivated ? 'Deactivated Batches' : 'Batch Listing'} sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={<>
          <button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button>
          <Link to={desk ? '/clients' : '/members'} className="btn btn-sm">View Batchwise Members</Link>
          <Link to="/batches/attendance" className="btn btn-sm">Batchwise Attendance List</Link>
          {desk && <Link to="/batches/import" className="btn btn-sm">Import Batches</Link>}
          <button type="button" className="btn btn-sm" onClick={() => { setDeactivated(!deactivated); setSelected(new Set()) }}>{deactivated ? 'Active Batches' : 'Deactivated Batches'}</button>
          {desk && <Link to="/batches/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Add Batch</Link>}
        </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={setSearch} placeholder="Search" className="pl-9" />
          </div>
          <Select small ariaLabel="Category" value={category} onChange={setCategory} placeholder="Select Category" className="w-auto"
            options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
          <div className="w-[200px]"><MultiSelect small placeholder="Select Day(s)" values={days} onChange={setDays}
            options={[7, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: DAY_NAMES[d - 1] }))} /></div>
        </div>
        {desk && (
          <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
            <button type="button" className="btn btn-sm" onClick={exportCsv}>Export to CSV</button>
            <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: deactivated ? 'activate' : 'deactivate', ids: [...selected] })}>{deactivated ? 'Activate' : 'Deactivate'}</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ action: 'delete', ids: [...selected] })}>Delete</button>
          </BulkBar>
        )}
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No batches{search || category || days.length ? ' for these filters' : ''}.</div> : (
          <>
            <div className="card hidden overflow-x-auto lg:block">
              <table className="tbl">
                <thead><tr>
                  {desk && <th style={{ width: 44 }}><input type="checkbox" className="check" aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))} /></th>}
                  <th>Batch Name</th><th>Time</th><th>Date</th><th>Service Categories</th><th className="num">Capacity</th><th className="num">Fixed Batch Members</th><th>Trainers</th><th>Days</th><th>Action</th>
                </tr></thead>
                <tbody>{rows.map((b) => (
                  <tr key={b.id}>
                    {desk && <td><input type="checkbox" className="check" aria-label={`Select ${b.name}`} checked={selected.has(b.id)} onChange={() => toggle(b.id)} /></td>}
                    <td><div className="font-semibold">{b.name}</div><div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
                      {b.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>}<span className="nowrap">{b.batch_code}</span></div></td>
                    <td className="nowrap">{timeRange(b.start_time, b.end_time)}</td>
                    <td className="nowrap text-[12px]">{b.start_date || b.end_date ? `${fmtDay(b.start_date) || '…'} - ${fmtDay(b.end_date) || '…'}` : '—'}</td>
                    <td className="max-w-[240px] text-[12px] text-muted">{b.service_names ?? '—'}</td>
                    <td className="num">{b.capacity ?? '—'}</td>
                    <td className="num"><Link to={membersLink(b.id, desk)} className="font-semibold">{b.member_count}</Link></td>
                    <td className="max-w-[200px] text-[12px]">{b.trainer_names ?? '—'}</td>
                    <td className="max-w-[160px] text-[12px]">{daysLabel(b.days, true)}</td>
                    <td><BatchActions b={b} desk={desk} onConfirm={setConfirm} navigate={navigate} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2.5 lg:hidden">
              {rows.map((b) => (
                <div key={b.id} className="card flex gap-3 p-4">
                  {desk && <input type="checkbox" className="check mt-1" aria-label={`Select ${b.name}`} checked={selected.has(b.id)} onChange={() => toggle(b.id)} />}
                  <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13px]">
                    <div className="flex items-start justify-between gap-2"><span className="text-[15px] font-semibold">{b.name}</span><BatchActions b={b} desk={desk} onConfirm={setConfirm} navigate={navigate} /></div>
                    <div className="text-muted">{b.batch_code} · {timeRange(b.start_time, b.end_time)} · {daysLabel(b.days, true)}</div>
                    <div>{b.trainer_names ?? 'No trainer'} · Capacity {b.capacity ?? '—'} · <Link to={membersLink(b.id, desk)}>{b.member_count} fixed members</Link></div>
                    <div className="text-[12px] text-muted">{b.service_names}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-1 text-[13px] text-muted">{rows.length} {rows.length === 1 ? 'batch' : 'batches'}</div>
          </>
        )}
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO {confirm.action.toUpperCase()} {confirm.ids.length === 1 ? 'THIS BATCH' : `${confirm.ids.length} SELECTED BATCHES`}?</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className={`flex-1 ${confirm.action === 'delete' ? 'btn btn-danger' : 'btn-gold'}`} disabled={act.isPending} onClick={() => act.mutate(confirm)}>Yes</button></div>
        </div>}
      </Sheet>
    </>
  )
}

function BatchActions({ b, desk, onConfirm, navigate }: { b: BatchRow; desk: boolean; onConfirm: (c: { action: 'delete' | 'deactivate' | 'activate'; ids: string[] }) => void; navigate: (p: string) => void }) {
  return <ActionMenu actions={[
    { label: 'Edit', hidden: !desk, onClick: () => navigate(`/batches/${b.id}/edit`) },
    { label: 'View Members', onClick: () => navigate(membersLink(b.id, desk)) },
    { label: 'Class Bookings', onClick: () => navigate(`/classes/bookings?batch=${b.id}`) },
    { label: b.active ? 'Deactivate' : 'Activate', hidden: !desk, onClick: () => onConfirm({ action: b.active ? 'deactivate' : 'activate', ids: [b.id] }) },
    { label: 'Delete', danger: true, hidden: !desk, onClick: () => onConfirm({ action: 'delete', ids: [b.id] }) },
  ]} />
}

// ---------------------------------------------------------------------------
// Add / edit a batch
// ---------------------------------------------------------------------------
const blank = {
  name: '', info: '', capacity: '', room: '', photo_url: '', trainer_ids: [] as string[], service_ids: [] as string[],
  start_date: '', end_date: '', days: ALL_DAYS.map(String), start_time: '', end_time: '', gender: 'all',
}

export function BatchForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: services = [] } = useServices()
  const team = useTeam()
  const editing = !!id
  const existing = useQuery({ queryKey: ['batch', id], enabled: editing, queryFn: async () => throwIf(await supabase.from('batches').select('*').eq('id', id!).single()) as BatchRow })
  const [f, setF] = useState(blank)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const b = existing.data
    if (!b) return
    setF({
      name: b.name, info: b.info ?? '', capacity: b.capacity != null ? String(b.capacity) : '', room: b.room ?? '', photo_url: b.photo_url ?? '',
      trainer_ids: b.trainer_ids, service_ids: b.service_ids, start_date: b.start_date ?? '', end_date: b.end_date ?? '', days: b.days.map(String),
      start_time: b.start_time.slice(0, 5), end_time: b.end_time.slice(0, 5), gender: b.gender,
    })
  }, [existing.data])
  const set = <K extends keyof typeof blank>(k: K) => (v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }))

  const save = useMutation({
    mutationFn: async (close: boolean) => {
      const photo = file ? await uploadStudioMedia(me.studioId, 'batches', file) : f.photo_url || null
      const row = {
        studio_id: me.studioId, name: f.name.trim(), info: f.info.trim() || null, capacity: f.capacity === '' ? null : Number(f.capacity), room: f.room.trim() || null,
        photo_url: photo, trainer_ids: f.trainer_ids, service_ids: f.service_ids, start_date: f.start_date || null, end_date: f.end_date || null,
        days: f.days.map(Number).sort(), start_time: f.start_time, end_time: f.end_time, gender: f.gender,
      }
      const res = editing
        ? throwIf(await supabase.from('batches').update(row).eq('id', id!).select('id').single())
        : throwIf(await supabase.from('batches').insert(row).select('id').single())
      return { close, id: (res as unknown as { id: string }).id }
    },
    onSuccess: ({ close, id: bid }) => {
      qc.invalidateQueries({ queryKey: ['batch-overview'] }); qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['batch', bid] })
      toast(editing ? 'Batch saved' : 'Batch created')
      setFile(null)
      navigate(close ? '/batches' : `/batches/${bid}/edit`, { replace: true })
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (close: boolean) => {
    setError(null)
    if (!f.name.trim()) return setError('Enter the batch name.')
    if (f.capacity !== '' && !(Number(f.capacity) > 0)) return setError('Capacity should be a number above 0.')
    if (!f.trainer_ids.length) return setError('Select who conducts the batch.')
    if (!f.service_ids.length) return setError('Select at least one service.')
    if (!f.days.length) return setError('Select the working days.')
    if (f.start_date && f.end_date && f.end_date < f.start_date) return setError('The end date is before the start date.')
    if (!f.start_time) return setError('Enter the start time.')
    if (!f.end_time) return setError('Enter the end time.')
    if (f.end_time <= f.start_time) return setError('The batch should end after it starts.')
    save.mutate(close)
  }
  if (editing && existing.isLoading) return <Loading />
  const card = 'card flex flex-col gap-4 p-5'
  return (
    <>
      <PageHeader title={editing ? 'Edit Batch' : 'New Batch'} sub="Basic Information" />
      <form className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">New Batch Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Batch Name" required id="bname"><TextInput id="bname" value={f.name} onChange={set('name')} placeholder="Cardio Batch" /></Field>
            <Field label="Room Name" id="broom"><TextInput id="broom" value={f.room} onChange={set('room')} placeholder="Room name eg: Seminar Hall" /></Field>
            <Field label="Capacity" id="bcap"><TextInput id="bcap" type="number" inputMode="numeric" value={f.capacity} onChange={set('capacity')} placeholder="Batch capacity in digits" /></Field>
            <Field label="Batch Banner photo" id="bphoto" hint={f.photo_url && !file ? 'A banner is set. Choose a file to replace it.' : 'Shown on the class in the member app.'}>
              <input id="bphoto" type="file" accept="image/*" className="input py-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
          </div>
          <Field label="Batch Info" id="binfo"><TextArea id="binfo" value={f.info} onChange={set('info')} rows={3} /></Field>
          {f.photo_url && !file && <img src={f.photo_url} alt="Batch banner" className="max-h-40 w-auto self-start rounded-xl border border-line" />}
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Assign a Trainer</h2>
          <Checkbox checked={team.trainers.length > 0 && f.trainer_ids.length === team.trainers.length} onChange={(on) => set('trainer_ids')(on ? team.trainers.map((t) => t.id) : [])} label="Select All" />
          <CheckboxGroup legend="Conducted by *" columns={3} values={f.trainer_ids} onChange={set('trainer_ids')} options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} />
        </section>
        <section className={card}>
          <CheckboxGroup legend="Services *" columns={3} values={f.service_ids} onChange={set('service_ids')} options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Working Days</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start Date" id="bsd"><TextInput id="bsd" type="date" value={f.start_date} onChange={set('start_date')} /></Field>
            <Field label="End Date" id="bed"><TextInput id="bed" type="date" value={f.end_date} onChange={set('end_date')} /></Field>
          </div>
          <CheckboxGroup legend="Working Days" columns={4} values={f.days} onChange={set('days')} options={ALL_DAYS.map((d) => ({ value: String(d), label: DAY_NAMES[d - 1] }))} />
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Timing</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start Time" required id="bst"><TextInput id="bst" type="time" value={f.start_time} onChange={set('start_time')} /></Field>
            <Field label="End Time" required id="bet"><TextInput id="bet" type="time" value={f.end_time} onChange={set('end_time')} /></Field>
          </div>
          <RadioGroup name="bgender" legend="Batch for" required value={f.gender} onChange={set('gender')} options={[{ value: 'all', label: 'Unisex' }, { value: 'male', label: 'Men' }, { value: 'female', label: 'Women' }]} />
        </section>
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
