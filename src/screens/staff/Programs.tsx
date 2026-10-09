import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useServices, useStudio, useTeam } from '../../db/studio'
import { AUDIENCE, audienceLabel, DAY_NAMES, daysLabel, timeRange, type Program } from '../../db/classes'
import { downloadCsv } from '../../lib/csv'
import { ActionMenu, Checkbox, CheckboxGroup, Field, Notice, RadioGroup, Select, TextInput } from '../../components/controls'
import { BulkBar } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'
import { CsvOnly } from '../../access-ui'

// YDL "Add Program" (Fitness Center Programs) and "Program List" (Fixed Program Listing):
// fixed online sessions with a meeting link, for the client groups chosen.

export function ProgramList() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs', me.studioId],
    queryFn: async () => throwIf(await supabase.from('program_overview').select('*').eq('studio_id', me.studioId).order('active', { ascending: false }).order('start_time')) as Program[],
  })
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { action: 'delete' | 'deactivate' | 'activate' | 'end'; ids: string[] }>(null)
  const rows = useMemo(() => programs.filter((p) => (!search || p.name.toLowerCase().includes(search.toLowerCase())) && (!type || p.audience === type)), [programs, search, type])

  const act = useMutation({
    mutationFn: async ({ action, ids }: { action: 'delete' | 'deactivate' | 'activate' | 'end'; ids: string[] }) => {
      if (action === 'delete') throwIf(await supabase.from('programs').delete().in('id', ids).select('id'))
      else if (action === 'end') throwIf(await supabase.from('programs').update({ live: false }).in('id', ids).select('id'))
      else throwIf(await supabase.from('programs').update({ active: action === 'activate', ...(action === 'deactivate' ? { live: false } : {}) }).in('id', ids).select('id'))
      return { action, n: ids.length }
    },
    onSuccess: ({ action, n }) => {
      qc.invalidateQueries({ queryKey: ['programs'] }); setSelected(new Set()); setConfirm(null)
      toast(action === 'end' ? 'Meeting ended' : `${n} ${n === 1 ? 'program' : 'programs'} ${action === 'delete' ? 'deleted' : action + 'd'}`)
    },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const start = useMutation({
    mutationFn: async (p: Program) => { throwIf(await supabase.from('programs').update({ live: true }).eq('id', p.id).select('id')); return p },
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ['programs'] }); window.open(p.meeting_link, '_blank', 'noopener'); toast('Meeting started') },
    onError: (e: Error) => toast(e.message),
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const exportCsv = () => downloadCsv('programs.csv', rows, [['Program Name', (p) => p.name], ['Program Days', (p) => daysLabel(p.days)], ['Time', (p) => timeRange(p.start_time, p.end_time)],
    ['Program Type', (p) => audienceLabel(p.audience)], ['Link', (p) => p.meeting_link], ['Conducted By', (p) => p.trainer_names], ['Status', (p) => (p.active ? 'Active' : 'Deactivated')]])

  return (
    <>
      <PageHeader title="Fixed Program Listing" sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={<>
          <CsvOnly><button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>
          <Link to="/programs/attendance" className="btn btn-sm">Program Attendance</Link>
          {desk && <Link to="/programs/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Add Program</Link>}
        </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={setSearch} placeholder="Search" className="pl-9" />
          </div>
          <Select small ariaLabel="Program Type" value={type} onChange={setType} placeholder="Select Program" className="w-auto" options={AUDIENCE.map(([v, l]) => ({ value: v, label: l }))} />
        </div>
        {desk && <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: 'deactivate', ids: [...selected] })}>Deactivate</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: 'activate', ids: [...selected] })}>Activate</button>
        </BulkBar>}
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No programs yet.{desk ? ' Add one for online sessions with a meeting link.' : ''}</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                {desk && <th style={{ width: 44 }}><input type="checkbox" className="check" aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))} /></th>}
                <th>Program Name</th><th>Program Days</th><th>Program Type</th><th>Link</th><th>Status</th><th>Action</th>
              </tr></thead>
              <tbody>{rows.map((p) => (
                <tr key={p.id}>
                  {desk && <td><input type="checkbox" className="check" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>}
                  <td><div className="font-semibold">{p.name}</div><div className="text-[12px] text-muted">{timeRange(p.start_time, p.end_time)} · {p.trainer_names ?? 'No trainer'}</div></td>
                  <td className="max-w-[220px] text-[12px]">{daysLabel(p.days)}</td>
                  <td>{audienceLabel(p.audience)}</td>
                  <td className="max-w-[200px] truncate"><a href={p.meeting_link} target="_blank" rel="noreferrer">{p.meeting_link}</a></td>
                  <td><div className="flex flex-col items-start gap-1">{p.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>}
                    {p.live && <span className="chip chip-red">Live now</span>}</div></td>
                  <td><ActionMenu actions={[
                    { label: 'Start Meeting', hidden: !p.active || p.live, onClick: () => start.mutate(p) },
                    { label: 'Join Meeting', hidden: !p.live, href: p.meeting_link, external: true },
                    { label: 'End Meeting', hidden: !p.live, onClick: () => setConfirm({ action: 'end', ids: [p.id] }) },
                    { label: 'Edit', hidden: !desk, onClick: () => navigate(`/programs/${p.id}/edit`) },
                    { label: p.active ? 'Deactivate' : 'Activate', hidden: !desk, onClick: () => setConfirm({ action: p.active ? 'deactivate' : 'activate', ids: [p.id] }) },
                    { label: 'Delete', danger: true, hidden: !desk, onClick: () => setConfirm({ action: 'delete', ids: [p.id] }) },
                  ]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px]">{confirm.action === 'end' ? 'ARE YOU SURE YOU WANT TO END MEETING ?' : `ARE YOU SURE YOU WANT TO ${confirm.action.toUpperCase()} ${confirm.ids.length === 1 ? 'THIS PROGRAM' : `${confirm.ids.length} PROGRAMS`} ?`}</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className={`flex-1 ${confirm.action === 'delete' ? 'btn btn-danger' : 'btn-gold'}`} disabled={act.isPending} onClick={() => act.mutate(confirm)}>Yes</button></div>
        </div>}
      </Sheet>
    </>
  )
}

const blank = { name: '', meeting_link: '', days: [] as string[], gender: 'all', start_time: '', end_time: '', audience: 'all', trainer_ids: [] as string[], service_ids: [] as string[] }

export function ProgramForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const team = useTeam()
  const { data: services = [] } = useServices()
  const editing = !!id
  const existing = useQuery({ queryKey: ['program', id], enabled: editing, queryFn: async () => throwIf(await supabase.from('programs').select('*').eq('id', id!).single()) as Program })
  const [f, setF] = useState(blank)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const p = existing.data
    if (p) setF({ name: p.name, meeting_link: p.meeting_link, days: p.days.map(String), gender: p.gender, start_time: p.start_time.slice(0, 5), end_time: p.end_time.slice(0, 5),
      audience: p.audience, trainer_ids: p.trainer_ids, service_ids: p.service_ids })
  }, [existing.data])
  const set = <K extends keyof typeof blank>(k: K) => (v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }))
  const save = useMutation({
    mutationFn: async (next: boolean) => {
      const row = { studio_id: me.studioId, name: f.name.trim(), meeting_link: f.meeting_link.trim(), days: f.days.map(Number).sort(), gender: f.gender,
        start_time: f.start_time, end_time: f.end_time, audience: f.audience, trainer_ids: f.trainer_ids, service_ids: f.service_ids }
      const res = editing ? throwIf(await supabase.from('programs').update(row).eq('id', id!).select('id').single())
        : throwIf(await supabase.from('programs').insert(row).select('id').single())
      return { next, id: (res as unknown as { id: string }).id }
    },
    onSuccess: ({ next, id: pid }) => {
      qc.invalidateQueries({ queryKey: ['programs'] }); qc.invalidateQueries({ queryKey: ['program', pid] })
      toast(editing ? 'Program saved' : 'Program created')
      navigate(next ? '/programs/new' : '/programs', { replace: true })
      if (next) setF(blank)
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (next: boolean) => {
    setError(null)
    if (!f.name.trim()) return setError('Enter the program name.')
    if (!/^https?:\/\/\S+$/i.test(f.meeting_link.trim())) return setError('Enter the meeting link (starting with https://).')
    if (!f.days.length) return setError('Select the working days.')
    if (!f.start_time || !f.end_time) return setError('Enter the start and end time.')
    if (f.end_time <= f.start_time) return setError('The program should end after it starts.')
    if (!f.service_ids.length) return setError('Select at least one service.')
    save.mutate(next)
  }
  if (editing && existing.isLoading) return <Loading />
  const card = 'card flex flex-col gap-4 p-5'
  return (
    <>
      <PageHeader title={editing ? 'Edit Program' : 'Fitness Center Programs'} sub="Basic Information" />
      <form className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
        <section className={card}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Program Name" required id="pgname"><TextInput id="pgname" value={f.name} onChange={set('name')} /></Field>
            <Field label="Meeting Link" required id="pglink" hint="Zoom, Google Meet or any link the clients open to join."><TextInput id="pglink" value={f.meeting_link} onChange={set('meeting_link')} placeholder="https://" /></Field>
          </div>
        </section>
        <section className={card}>
          <Checkbox checked={f.days.length === 7} onChange={(on) => set('days')(on ? ['1', '2', '3', '4', '5', '6', '7'] : [])} label="All days" />
          <CheckboxGroup legend="Working Days" columns={4} values={f.days} onChange={set('days')} options={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: DAY_NAMES[d - 1] }))} />
          <RadioGroup name="pggender" legend="Gender" value={f.gender} onChange={set('gender')} options={[{ value: 'all', label: 'Unisex' }, { value: 'male', label: 'Men' }, { value: 'female', label: 'Women' }]} />
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Timings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Start Time" required id="pgst"><TextInput id="pgst" type="time" value={f.start_time} onChange={set('start_time')} /></Field>
            <Field label="End Time" required id="pget"><TextInput id="pget" type="time" value={f.end_time} onChange={set('end_time')} /></Field>
            <Field label="Program Type:" id="pgtype"><Select id="pgtype" value={f.audience} onChange={set('audience')} options={AUDIENCE.map(([v, l]) => ({ value: v, label: l }))} /></Field>
          </div>
        </section>
        <section className={card}>
          <CheckboxGroup legend="Conducted By" columns={3} values={f.trainer_ids} onChange={set('trainer_ids')} options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} />
        </section>
        <section className={card}>
          <CheckboxGroup legend="Services *" columns={3} values={f.service_ids} onChange={set('service_ids')} options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
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
