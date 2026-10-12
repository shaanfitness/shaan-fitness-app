import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio, useTeam } from '../../../db/studio'
import { uploadStudioMedia } from '../../../db/classes'
import {
  addParticipants, challengeDay, clientChallenges, challengeList, CLIENT_LEVELS, copyChallenge, deleteTask, getChallenge, leaderboard, listTeams, recordEntry, removeParticipant,
  saveChallenge, saveTask, saveTeam, setParticipantTeam, tasksFor, teamBoard, UNITS, updateChallenges, updateTeams,
  type BoardRow, type ChallengeRow, type ChallengeTask, type Team, type TaskUnit,
} from '../../../db/community'
import { fmtDay, studioToday } from '../../../lib/dates'
import { studioLine } from '../../../components/crud'
import { ClientLookup } from '../../../components/billing'
import { ActionMenu, Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../../components/controls'
import { BulkBar, DataTable } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../../components/ui'
import { NotifyDialog } from '../ClientProfile'
import { PostModeration, UploadPost } from './Community'

// YDL App Settings › Challenges: Create Challenge (basic information, then tasks), Challenge List
// (Edit, View, Copy), the challenge's page (details, participants and points, posts, leaderboards),
// Create Teams and Team List.

const unitLabel = (u: TaskUnit) => UNITS.find((x) => x.value === u)?.label.toLowerCase() ?? u
const taskLine = (t: ChallengeTask) => `${t.target ? `${Number(t.target)} ${unitLabel(t.unit)}` : 'Done'} · ${t.points} pts · ${t.day ? `Day ${t.day}` : 'Every day'}`
const daysOf = (c: { start_date: string; end_date: string }) => challengeDay(c.start_date, c.end_date)
const state = (c: { start_date: string; end_date: string; active: boolean }) => {
  const t = studioToday()
  if (!c.active) return <span className="chip chip-muted">Deactivated</span>
  return t < c.start_date ? <span className="chip chip-info">Upcoming</span> : t > c.end_date ? <span className="chip chip-muted">Ended</span> : <span className="chip chip-green">Running</span>
}

function Confirm({ c, onClose, onYes, busy }: { c: { text: string; danger?: boolean } | null; onClose: () => void; onYes: () => void; busy: boolean }) {
  return (
    <Sheet open={!!c} onClose={onClose} title="Are you sure?">
      {c && (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px]">{c.text}</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>No</button>
            <button type="button" className={`btn flex-1 ${c.danger ? 'btn-danger' : ''}`} disabled={busy} onClick={onYes}>Yes</button></div>
        </div>
      )}
    </Sheet>
  )
}

// Challenge List --------------------------------------------------------------------------------------------------
export function ChallengeList() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const q = useQuery({ queryKey: ['challenge-list', me.studioId], queryFn: () => challengeList(me.studioId) })
  // From a client's profile: "View Participated Challenges".
  const client = new URLSearchParams(useLocation().search).get('client')
  const joined = useQuery({ queryKey: ['client-challenges', client], queryFn: () => clientChallenges(client!), enabled: !!client })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { verb: string; change: 'delete' | { active: boolean } }>(null)
  const rows = (q.data ?? []).filter((c) => (!search || c.name.toLowerCase().includes(search.toLowerCase())) && (!client || joined.data?.ids.includes(c.id)))
  const act = useMutation({
    mutationFn: async (c: NonNullable<typeof confirm>) => { await updateChallenges([...selected], c.change); return c },
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['challenge-list'] }); setSelected(new Set()); setConfirm(null); toast(`Challenges ${c.verb.toLowerCase()}d`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const copy = useMutation({
    mutationFn: copyChallenge,
    onSuccess: (id) => { qc.invalidateQueries({ queryKey: ['challenge-list'] }); toast('Challenge copied. Set its dates, then activate it.'); navigate(`/challenges/${id}/edit`) },
    onError: (e: Error) => toast(e.message),
  })
  const actions = (c: ChallengeRow) => [
    { label: 'Edit', onClick: () => navigate(`/challenges/${c.id}/edit`) },
    { label: 'View', onClick: () => navigate(`/challenges/${c.id}`) },
    { label: 'Copy', onClick: () => copy.mutate(c.id) },
  ]
  return (
    <>
      <PageHeader title="Challenges Listing" sub={studio ? studioLine(studio) : ''}
        actions={<Link to="/challenges/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Create Challenge</Link>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        {client && <Notice>Challenges {joined.data?.name ?? 'this client'} takes part in. <Link to="/challenges">Show all challenges</Link></Notice>}
        <div className="relative w-full max-w-[420px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={setSearch} placeholder="Search" className="pl-9" ariaLabel="Search" />
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ verb: 'DELETE', change: 'delete' })}>Delete</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ verb: 'DEACTIVATE', change: { active: false } })}>Deactivate</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ verb: 'ACTIVATE', change: { active: true } })}>Activate</button>
        </BulkBar>
        <DataTable<ChallengeRow> loading={q.isLoading} rows={rows} rowKey={(r) => r.id} caption="Challenges" selectable selected={selected} onSelect={setSelected}
          empty={search ? 'Nothing matches.' : 'No challenges yet. Create the first one.'}
          columns={[
            { key: 'name', header: 'Challenge Name', cell: (c) => <div><Link to={`/challenges/${c.id}`} className="font-semibold">{c.name}</Link>
              <div className="mt-1 flex flex-wrap gap-1.5">{state(c)}{c.pending_posts > 0 && <span className="chip chip-amber">{c.pending_posts} posts to check</span>}</div></div> },
            { key: 'start', header: 'Start Date', cell: (c) => fmtDay(c.start_date, 'dd/MM/yyyy') },
            { key: 'end', header: 'End Date', cell: (c) => fmtDay(c.end_date, 'dd/MM/yyyy') },
            { key: 'people', header: 'Participants', className: 'num', cell: (c) => c.participants },
            { key: 'teams', header: 'Teams', className: 'num', cell: (c) => c.teams },
            { key: 'action', header: 'Action', width: 90, cell: (c) => <ActionMenu actions={actions(c)} /> },
          ]}
          card={(c) => (
            <div className="flex items-start justify-between gap-3">
              <div><Link to={`/challenges/${c.id}`} className="font-semibold">{c.name}</Link>
                <div className="text-[13px] text-muted">{fmtDay(c.start_date)} to {fmtDay(c.end_date)} · {c.participants} joined</div><div className="mt-1">{state(c)}</div></div>
              <ActionMenu actions={actions(c)} />
            </div>
          )} />
      </div>
      <Confirm c={confirm && { text: `ARE YOU SURE YOU WANT TO ${confirm.verb} ${selected.size === 1 ? 'THIS Challenge' : 'THE SELECTED Challenges'} ?`, danger: confirm.change === 'delete' }}
        onClose={() => setConfirm(null)} onYes={() => confirm && act.mutate(confirm)} busy={act.isPending} />
    </>
  )
}

// Create / Edit Challenge (Step 1) -----------------------------------------------------------------------------------
function Steps({ step, id, tasks }: { step: 1 | 2; id?: string; tasks: boolean }) {
  return (
    <ol className="m-0 flex list-none flex-wrap gap-5 p-0 text-[14px]" aria-label="Steps">
      <li className={`flex items-center gap-2 ${step === 1 ? 'text-ink' : 'text-muted'}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${step === 1 ? 'bg-gold text-on-gold' : 'bg-surface-3'}`}>1</span>
        {id && step !== 1 ? <Link to={`/challenges/${id}/edit`} className="font-semibold">Basic Information</Link> : <span className="font-semibold">Basic Information</span>}
      </li>
      {tasks && (
        <li className={`flex items-center gap-2 ${step === 2 ? 'text-ink' : 'text-muted'}`}>
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${step === 2 ? 'bg-gold text-on-gold' : 'bg-surface-3'}`}>2</span>
          {id && step !== 2 ? <Link to={`/challenges/${id}/tasks`} className="font-semibold">Tasks</Link> : <span className="font-semibold">Tasks</span>}
        </li>
      )}
    </ol>
  )
}

export function ChallengeForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['challenge', id], queryFn: () => getChallenge(id!), enabled: !!id })
  const [f, setF] = useState({ name: '', description: '', video_url: '', image_url: '', start_date: studioToday(), end_date: '', terms: '', has_tasks: false, client_level: '', active: true })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const c = q.data?.challenge
    if (c) setF({ name: c.name, description: c.description ?? '', video_url: c.video_url ?? '', image_url: c.image_url ?? '', start_date: c.start_date, end_date: c.end_date,
      terms: c.terms, has_tasks: c.has_tasks, client_level: c.client_level ?? '', active: c.active })
  }, [q.data])
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((o) => ({ ...o, [k]: v }))
  const save = useMutation({
    mutationFn: async (next: boolean) => {
      const image_url = file ? await uploadStudioMedia(me.studioId, 'challenges', file) : f.image_url || null
      const cid = await saveChallenge(me.studioId, id ?? null, {
        name: f.name.trim(), description: f.description.trim() || null, video_url: f.video_url.trim() || null, image_url, start_date: f.start_date, end_date: f.end_date,
        terms: f.terms.trim(), has_tasks: f.has_tasks, client_level: f.client_level || null, active: f.active,
      })
      return { cid, next }
    },
    onSuccess: ({ cid, next }) => {
      qc.invalidateQueries({ queryKey: ['challenge-list'] }); qc.invalidateQueries({ queryKey: ['challenge', cid] })
      toast(id ? 'Challenge saved' : 'Challenge created')
      navigate(next ? (f.has_tasks ? `/challenges/${cid}/tasks` : `/challenges/${cid}`) : '/challenges')
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (next: boolean) => {
    setError(null)
    if (!f.name.trim()) return setError('Challenge Name is required.')
    if (!f.start_date || !f.end_date) return setError('Enter the Challenge Start Date and End Date.')
    if (f.end_date < f.start_date) return setError('The end date can’t be before the start date.')
    if (!f.terms.trim()) return setError('Terms & Conditions are required.')
    if (f.video_url && !/^https:\/\//i.test(f.video_url.trim())) return setError('The video link should start with https://')
    if (file && (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) return setError('The image should be a picture up to 5 MB.')
    save.mutate(next)
  }
  if (id && q.isLoading) return <Loading />
  return (
    <>
      <PageHeader title={id ? 'Edit Challenge' : 'Create Challenge'} actions={<Link to="/challenges" className="btn btn-sm">Challenges Listing</Link>} />
      <form className="flex max-w-[900px] flex-col gap-5 px-5 pt-5 pb-10 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(true) }}>
        <Steps step={1} id={id} tasks={f.has_tasks} />
        <div className="card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Challenge Basic Information</h2>
          <Field label="Challenge Name" required id="ch-name"><TextInput id="ch-name" value={f.name} onChange={set('name')} placeholder="eg. Go fit fitness challenge" /></Field>
          <Field label="Description" id="ch-desc"><TextArea id="ch-desc" rows={6} value={f.description} onChange={set('description')} placeholder="Write nice & sweet challenge description." /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Video URL" id="ch-video"><TextInput id="ch-video" type="url" value={f.video_url} onChange={set('video_url')} placeholder="https://www.instagram.com/reel/…" /></Field>
            <Field label="Image" id="ch-image" hint={f.image_url && !file ? 'An image is set. Choose another to replace it.' : 'A banner for the app (up to 5 MB).'}>
              <input id="ch-image" type="file" accept="image/*" className="input py-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Challenge Start Date" required id="ch-start"><TextInput id="ch-start" type="date" value={f.start_date} onChange={set('start_date')} /></Field>
            <Field label="Challenge End Date" required id="ch-end"><TextInput id="ch-end" type="date" value={f.end_date} onChange={set('end_date')} /></Field>
          </div>
          {f.image_url && !file && <img src={f.image_url} alt="" className="max-h-40 self-start rounded-xl" />}
        </div>
        <div className="card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Challenge terms &amp; conditions</h2>
          <Field label="Terms & Conditions" required id="ch-terms"><TextArea id="ch-terms" rows={8} value={f.terms} onChange={set('terms')} placeholder="challenge related terms & conditions" /></Field>
          <RadioGroup name="ch-tasks" legend="Do you want to add task ?" required value={f.has_tasks ? 'yes' : 'no'} onChange={(v) => set('has_tasks')(v === 'yes')}
            options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client Challenge Level" id="ch-level"><Select id="ch-level" value={f.client_level} onChange={set('client_level')} placeholder="Any level" options={CLIENT_LEVELS.map((l) => ({ value: l, label: l }))} /></Field>
            <Field label="Status" id="ch-active"><Select id="ch-active" value={f.active ? 'yes' : 'no'} onChange={(v) => set('active')(v === 'yes')} options={[{ value: 'yes', label: 'Active (members see it)' }, { value: 'no', label: 'Deactivated' }]} /></Field>
          </div>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Link to="/challenges" className="btn flex-1">Cancel</Link>
          <button type="button" className="btn flex-1" disabled={save.isPending} onClick={() => submit(false)}>Save</button>
          <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save & Next'}</button>
        </div>
      </form>
    </>
  )
}

// Tasks (Step 2) --------------------------------------------------------------------------------------------------------
type TaskForm = { id: string | null; title: string; description: string; target: string; unit: TaskUnit; points: string; day: string; seq: string }
const blankTask = (seq: number): TaskForm => ({ id: null, title: '', description: '', target: '', unit: 'reps', points: '10', day: '', seq: String(seq) })

export function ChallengeTasks() {
  const { id = '' } = useParams()
  const toast = useToast()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['challenge', id], queryFn: () => getChallenge(id) })
  const [form, setForm] = useState<TaskForm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (t: TaskForm) => saveTask(id, t.id, {
      title: t.title.trim(), description: t.description.trim() || null, target: t.target ? Number(t.target) : null, unit: t.unit,
      points: Math.round(Number(t.points) || 0), day: t.day ? Number(t.day) : null, seq: Number(t.seq) || 0,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['challenge', id] }); toast(form?.id ? 'Task saved' : 'Task added'); setForm(null) },
    onError: (e: Error) => setError(e.message),
  })
  const del = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['challenge', id] }); toast('Task removed') },
    onError: (e: Error) => toast(e.message),
  })
  if (q.isLoading) return <Loading />
  if (!q.data) return <div className="px-5 py-10"><Notice tone="error">{(q.error as Error)?.message}</Notice></div>
  const { challenge: c, tasks } = q.data
  const days = daysOf(c)
  return (
    <>
      <PageHeader title="Challenge Tasks" sub={`${c.name} · ${fmtDay(c.start_date)} to ${fmtDay(c.end_date)} · ${days} days`}
        actions={<Link to={`/challenges/${c.id}`} className="btn btn-sm">View Challenge</Link>} />
      <div className="flex max-w-[960px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <Steps step={2} id={c.id} tasks />
        <p className="m-0 text-[14px] text-muted">Members log each task in the app (or a coach records it). Meeting the target earns the points; the leaderboard adds them up.</p>
        <div className="flex"><button type="button" className="btn-gold min-h-10 px-4" onClick={() => { setError(null); setForm(blankTask(tasks.length + 1)) }}><Icon name="plus" size={18} />Add Task</button></div>
        <DataTable<ChallengeTask> rows={tasks} rowKey={(t) => t.id} caption="Tasks" empty="No tasks yet."
          columns={[
            { key: 'seq', header: '#', width: 50, cell: (t) => t.seq },
            { key: 'title', header: 'Task', cell: (t) => <div><div className="font-semibold">{t.title}</div>{t.description && <div className="text-[12px] text-muted">{t.description}</div>}</div> },
            { key: 'target', header: 'Target', cell: (t) => (t.target ? `${Number(t.target)} ${unitLabel(t.unit)}` : 'Just done') },
            { key: 'points', header: 'Points', className: 'num', cell: (t) => t.points },
            { key: 'day', header: 'When', cell: (t) => (t.day ? `Day ${t.day} (${fmtDay(new Date(new Date(`${c.start_date}T00:00:00`).getTime() + (t.day - 1) * 86_400_000).toISOString().slice(0, 10))})` : 'Every day') },
            { key: 'a', header: 'Action', width: 90, cell: (t) => <ActionMenu actions={[
              { label: 'Edit', onClick: () => { setError(null); setForm({ id: t.id, title: t.title, description: t.description ?? '', target: t.target?.toString() ?? '', unit: t.unit, points: String(t.points), day: t.day?.toString() ?? '', seq: String(t.seq) }) } },
              { label: 'Delete', danger: true, onClick: () => { if (window.confirm('Delete this task? Entries logged for it go too.')) del.mutate(t.id) } },
            ]} /> },
          ]}
          card={(t) => <div><div className="font-semibold">{t.seq}. {t.title}</div><div className="text-[13px] text-muted">{taskLine(t)}</div></div>} />
        <div className="flex gap-2"><Link to={`/challenges/${c.id}/edit`} className="btn">Back</Link><Link to={`/challenges/${c.id}`} className="btn-gold">Done</Link></div>
      </div>
      <Sheet wide open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Task' : 'Add Task'}>
        {form && (
          <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
            e.preventDefault(); setError(null)
            if (!form.title.trim()) return setError('Enter the task.')
            if (form.target && !(Number(form.target) > 0)) return setError('The target should be more than 0.')
            if (!(Number(form.points) >= 0)) return setError('Points should be 0 or more.')
            save.mutate(form)
          }}>
            <Field label="Task" required id="tk-title"><TextInput id="tk-title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. 30 push-ups" /></Field>
            <Field label="How to do it" id="tk-desc"><TextArea id="tk-desc" value={form.description} onChange={(v) => setForm({ ...form, description: v })} /></Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Target" id="tk-target" hint="Empty: just done"><TextInput id="tk-target" type="number" inputMode="decimal" value={form.target} onChange={(v) => setForm({ ...form, target: v })} /></Field>
              <Field label="Unit" id="tk-unit"><Select id="tk-unit" value={form.unit} onChange={(v) => setForm({ ...form, unit: v as TaskUnit })} options={UNITS} /></Field>
              <Field label="Points" id="tk-points"><TextInput id="tk-points" type="number" inputMode="numeric" value={form.points} onChange={(v) => setForm({ ...form, points: v })} /></Field>
              <Field label="Sequence" id="tk-seq"><TextInput id="tk-seq" type="number" inputMode="numeric" value={form.seq} onChange={(v) => setForm({ ...form, seq: v })} /></Field>
            </div>
            <Field label="When" id="tk-day"><Select id="tk-day" value={form.day} onChange={(v) => setForm({ ...form, day: v })} placeholder="Every day"
              options={Array.from({ length: Math.min(days, 366) }, (_, i) => ({ value: String(i + 1), label: `Only Day ${i + 1}` }))} /></Field>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setForm(null)}>Close</button>
              <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save Task'}</button></div>
          </form>
        )}
      </Sheet>
    </>
  )
}

// The challenge's page ------------------------------------------------------------------------------------------------
type ViewTab = 'details' | 'people' | 'posts' | 'post-board' | 'teams'

export function ChallengeView() {
  const { id = '' } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['challenge', id], queryFn: () => getChallenge(id) })
  const board = useQuery({ queryKey: ['challenge-board', id], queryFn: () => leaderboard(id) })
  const teams = useQuery({ queryKey: ['teams', me.studioId], queryFn: () => listTeams(me.studioId) })
  const tBoard = useQuery({ queryKey: ['challenge-team-board', id], queryFn: () => teamBoard(id) })
  const [tab, setTab] = useState<ViewTab>('people')
  const [notify, setNotify] = useState(false)
  const [record, setRecord] = useState<BoardRow | null>(null)
  const [adding, setAdding] = useState<{ id: string; label: string } | null>(null)
  const [teamFor, setTeamFor] = useState('')
  const [post, setPost] = useState(false)
  const refresh = () => { qc.invalidateQueries({ queryKey: ['challenge-board', id] }); qc.invalidateQueries({ queryKey: ['challenge-team-board', id] }); qc.invalidateQueries({ queryKey: ['challenge-list'] }) }
  const add = useMutation({
    mutationFn: () => addParticipants(id, [adding!.id], teamFor || null),
    onSuccess: () => { refresh(); toast(`${adding?.label.trim()} added`); setAdding(null) },
    onError: (e: Error) => toast(e.message),
  })
  const move = useMutation({
    mutationFn: (a: { member: string; team: string }) => setParticipantTeam(id, [a.member], a.team || null),
    onMutate: (a) => qc.setQueryData<BoardRow[]>(['challenge-board', id], (rs) => rs?.map((r) => (r.member_id === a.member ? { ...r, team_id: a.team || null } : r))),
    onSuccess: () => toast('Team changed'),
    onSettled: refresh,
    onError: (e: Error) => toast(e.message),
  })
  const remove = useMutation({
    mutationFn: (member: string) => removeParticipant(id, member),
    onSuccess: () => { refresh(); toast('Removed from the challenge') },
    onError: (e: Error) => toast(e.message),
  })
  const copy = useMutation({
    mutationFn: () => copyChallenge(id),
    onSuccess: (nid) => { qc.invalidateQueries({ queryKey: ['challenge-list'] }); navigate(`/challenges/${nid}/edit`) },
    onError: (e: Error) => toast(e.message),
  })
  if (q.isLoading) return <Loading />
  if (!q.data) return <div className="px-5 py-10"><Notice tone="error">{(q.error as Error)?.message}</Notice></div>
  const { challenge: c, tasks } = q.data
  const myTeams = (teams.data ?? []).filter((t) => t.challenge_id === c.id && t.active)
  const rows = board.data ?? []
  const byClaps = [...rows].filter((r) => r.posts > 0).sort((a, b) => b.claps - a.claps || b.posts - a.posts)
  const tabs: { v: ViewTab; label: string }[] = [
    { v: 'people', label: `Participants & Points (${rows.length})` }, { v: 'details', label: 'Challenge Details' }, { v: 'posts', label: 'Posts List' },
    { v: 'post-board', label: 'Post Leader Board' }, { v: 'teams', label: `Teams (${myTeams.length})` },
  ]
  return (
    <>
      <PageHeader title={c.name} sub={<span className="flex flex-wrap items-center gap-2">{fmtDay(c.start_date)} to {fmtDay(c.end_date)} · {daysOf(c)} days {state(c)}</span>}
        actions={<>
          <Link to={`/challenges/${c.id}/edit`} className="btn btn-sm"><Icon name="edit" size={16} />Edit</Link>
          {c.has_tasks && <Link to={`/challenges/${c.id}/tasks`} className="btn btn-sm">Tasks</Link>}
          <button type="button" className="btn btn-sm" disabled={!rows.length} onClick={() => setNotify(true)}><Icon name="bell" size={16} />Send Notification</button>
          <button type="button" className="btn btn-sm" onClick={() => copy.mutate()}>Copy</button>
        </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <div role="tablist" aria-label="Challenge" className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button key={t.v} type="button" role="tab" aria-selected={tab === t.v} onClick={() => setTab(t.v)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${tab === t.v ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>{t.label}</button>
          ))}
        </div>
        {tab === 'details' && (
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className="card flex flex-col gap-3 p-5">
              {c.image_url && <img src={c.image_url} alt="" className="max-h-64 rounded-xl object-cover" />}
              <h2 className="m-0 text-[17px] font-bold">Challenge Description</h2>
              <p className="m-0 text-[14px] whitespace-pre-wrap">{c.description || 'No description.'}</p>
              {c.video_url && <a href={c.video_url} target="_blank" rel="noreferrer" className="link-btn self-start">Watch the video</a>}
              <h2 className="m-0 mt-2 text-[17px] font-bold">Terms &amp; Conditions</h2>
              <p className="m-0 text-[14px] whitespace-pre-wrap">{c.terms}</p>
            </section>
            <section className="card flex flex-col gap-2 p-5">
              <h2 className="m-0 text-[17px] font-bold">Tasks</h2>
              {!c.has_tasks ? <p className="m-0 text-[14px] text-muted">This challenge has no tasks; members post their progress.</p>
                : tasks.length === 0 ? <p className="m-0 text-[14px] text-muted">No tasks added yet. <Link to={`/challenges/${c.id}/tasks`}>Add tasks</Link></p>
                  : <ul className="m-0 flex list-none flex-col gap-2 p-0">{tasks.map((t) => <li key={t.id} className="text-[14px]"><b>{t.title}</b><div className="text-[12px] text-muted">{taskLine(t)}</div></li>)}</ul>}
              {c.client_level && <p className="m-0 text-[13px] text-muted">Client Challenge Level: {c.client_level}</p>}
            </section>
          </div>
        )}
        {tab === 'people' && (
          <>
            <section className="card flex flex-col gap-3 p-4">
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_200px_auto]">
                <ClientLookup label="Add a client" id="ch-add" onFound={setAdding} />
                <Field label="Into team" id="ch-add-team"><Select id="ch-add-team" value={teamFor} onChange={setTeamFor} placeholder="No team" options={myTeams.map((t) => ({ value: t.id, label: t.name }))} /></Field>
                <button type="button" className="btn-gold min-h-10 px-4" disabled={!adding || add.isPending} onClick={() => add.mutate()}>Add</button>
              </div>
              <p className="m-0 text-[12px] text-muted">Members can also join from the app (Challenges), after accepting the terms.</p>
            </section>
            <DataTable<BoardRow> loading={board.isLoading} rows={rows} rowKey={(r) => r.member_id} caption="Participants and points" empty="Nobody has joined yet."
              columns={[
                { key: 'rank', header: 'Rank', width: 60, cell: (r) => (r.points > 0 ? `#${r.rank}` : '-') },
                { key: 'name', header: 'Participant', cell: (r) => <Link to={`/clients/${r.member_id}`} className="font-semibold">{r.name}</Link> },
                { key: 'team', header: 'Team', cell: (r) => (
                  <Select small ariaLabel={`Team for ${r.name}`} value={r.team_id ?? ''} onChange={(v) => move.mutate({ member: r.member_id, team: v })} placeholder="No team"
                    options={myTeams.map((t) => ({ value: t.id, label: t.name }))} className="w-40" />) },
                { key: 'points', header: 'Points', className: 'num', cell: (r) => <b>{r.points}</b> },
                { key: 'entries', header: 'Tasks Logged', className: 'num', cell: (r) => r.entries },
                { key: 'posts', header: 'Posts', className: 'num', cell: (r) => r.posts },
                { key: 'claps', header: 'Claps', className: 'num', cell: (r) => r.claps },
                { key: 'a', header: 'Action', width: 90, cell: (r) => <ActionMenu actions={[
                  { label: 'Record a task', onClick: () => setRecord(r), hidden: !tasks.length },
                  { label: 'Remove', danger: true, onClick: () => { if (window.confirm(`Remove ${r.name} from the challenge? Their logged tasks go too.`)) remove.mutate(r.member_id) } },
                ]} /> },
              ]}
              card={(r) => (
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-semibold">{r.points > 0 ? `#${r.rank} ` : ''}{r.name}</div><div className="text-[13px] text-muted">{r.points} pts · {r.team_name ?? 'No team'} · {r.posts} posts</div></div>
                  {tasks.length > 0 && <button type="button" className="btn btn-sm" onClick={() => setRecord(r)}>Record</button>}
                </div>
              )} />
          </>
        )}
        {tab === 'posts' && (
          <>
            <button type="button" className="btn btn-sm self-start" onClick={() => setPost(true)}><Icon name="plus" size={16} />Post in this challenge</button>
            <PostModeration challengeId={c.id} initial="all" />
          </>
        )}
        {tab === 'post-board' && (
          <DataTable<BoardRow> rows={byClaps} rowKey={(r) => r.member_id} caption="Post leader board" empty="No accepted posts yet."
            columns={[
              { key: 'n', header: '#', width: 50, cell: (r) => byClaps.indexOf(r) + 1 },
              { key: 'name', header: 'Customer', cell: (r) => r.name },
              { key: 'posts', header: 'Posts', className: 'num', cell: (r) => r.posts },
              { key: 'claps', header: 'Total Claps', className: 'num', cell: (r) => <b>{r.claps}</b> },
            ]}
            card={(r) => <div><b>{byClaps.indexOf(r) + 1}. {r.name}</b><div className="text-[13px] text-muted">{r.claps} claps · {r.posts} posts</div></div>} />
        )}
        {tab === 'teams' && (
          <>
            <Link to={`/challenges/teams/new?challenge=${c.id}`} className="btn btn-sm self-start"><Icon name="plus" size={16} />Create Team</Link>
            <DataTable rows={tBoard.data ?? []} rowKey={(r) => r.team_id} caption="Team leader board" empty="No teams in this challenge yet, or nobody is in a team."
              columns={[
                { key: 'rank', header: 'Rank', width: 60, cell: (r) => `#${r.rank}` },
                { key: 'name', header: 'Team', cell: (r) => <Link to={`/challenges/teams/${r.team_id}/members`} className="font-semibold">{r.team_name}</Link> },
                { key: 'members', header: 'Members', className: 'num', cell: (r) => r.members },
                { key: 'points', header: 'Points', className: 'num', cell: (r) => <b>{r.points}</b> },
              ]}
              card={(r) => <div><b>#{r.rank} {r.team_name}</b><div className="text-[13px] text-muted">{r.points} pts · {r.members} members</div></div>} />
          </>
        )}
      </div>
      <NotifyDialog open={notify} onClose={() => setNotify(false)} memberIds={rows.map((r) => r.member_id)} name={`${rows.length} participants of ${c.name}`} />
      <Sheet open={!!record} onClose={() => setRecord(null)} title={`Record a task · ${record?.name ?? ''}`}>
        {record && <RecordTask challenge={c} tasks={tasks} member={record} onDone={() => { setRecord(null); refresh() }} />}
      </Sheet>
      <Sheet wide open={post} onClose={() => setPost(false)} title="Post in this challenge">{post && <UploadPost challengeId={c.id} onDone={() => setPost(false)} />}</Sheet>
    </>
  )
}

function RecordTask({ challenge: c, tasks, member, onDone }: { challenge: { id: string; start_date: string; end_date: string }; tasks: ChallengeTask[]; member: BoardRow; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const today = studioToday()
  const [date, setDate] = useState(today < c.start_date ? c.start_date : today > c.end_date ? c.end_date : today)
  const day = challengeDay(c.start_date, date)
  const dayTasks = useMemo(() => tasksFor(tasks, day), [tasks, day])
  const [task, setTask] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const t = dayTasks.find((x) => x.id === task)
  const save = useMutation({
    mutationFn: () => recordEntry({ challengeId: c.id, memberId: member.member_id, taskId: task, date, value: Number(value), staffId: me.staffId ?? null }),
    onSuccess: () => { toast('Task recorded'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); setError(null); if (!task) setError('Choose the task.'); else if (!(Number(value) >= 0) || value === '') setError('Enter what they did.'); else save.mutate() }}>
      <Field label="Date" id="rt-date" hint={`Day ${day} of the challenge`}><TextInput id="rt-date" type="date" value={date} onChange={setDate} /></Field>
      <Field label="Task" required id="rt-task"><Select id="rt-task" value={task} onChange={setTask} placeholder="Select task" options={dayTasks.map((x) => ({ value: x.id, label: `${x.title} (${taskLine(x)})` }))} /></Field>
      <Field label={t ? `Done (${unitLabel(t.unit)})` : 'Done'} required id="rt-value" hint={t?.target ? `Target ${Number(t.target)} for ${t.points} points` : undefined}>
        <TextInput id="rt-value" type="number" inputMode="decimal" value={value} onChange={setValue} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button><button type="submit" className="btn-gold flex-1" disabled={save.isPending}>Save</button></div>
    </form>
  )
}

// Teams ---------------------------------------------------------------------------------------------------------------
export function TeamList() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const team = useTeam()
  const { data: studio } = useStudio()
  const teams = useQuery({ queryKey: ['teams', me.studioId], queryFn: () => listTeams(me.studioId) })
  const challenges = useQuery({ queryKey: ['challenge-list', me.studioId], queryFn: () => challengeList(me.studioId) })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { verb: string; change: 'delete' | { active: boolean } }>(null)
  const act = useMutation({
    mutationFn: async (c: NonNullable<typeof confirm>) => { await updateTeams([...selected], c.change); return c },
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['teams'] }); setSelected(new Set()); setConfirm(null); toast(`Teams ${c.verb.toLowerCase()}d`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const cname = (id: string) => challenges.data?.find((c) => c.id === id)?.name ?? '-'
  const actions = (t: Team) => [
    { label: 'Edit', onClick: () => navigate(`/challenges/teams/${t.id}/edit`) },
    { label: 'Members', onClick: () => navigate(`/challenges/teams/${t.id}/members`) },
  ]
  return (
    <>
      <PageHeader title="Teams Listing" sub={studio ? studioLine(studio) : ''}
        actions={<Link to="/challenges/teams/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Create Team</Link>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ verb: 'DELETE', change: 'delete' })}>Delete</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ verb: 'DEACTIVATE', change: { active: false } })}>Deactivate</button>
          <button type="button" className="btn btn-sm" onClick={() => setConfirm({ verb: 'ACTIVATE', change: { active: true } })}>Activate</button>
        </BulkBar>
        <DataTable<Team> loading={teams.isLoading} rows={teams.data ?? []} rowKey={(t) => t.id} caption="Teams" selectable selected={selected} onSelect={setSelected}
          empty="No teams yet."
          columns={[
            { key: 'name', header: 'Team Name', cell: (t) => <div><Link to={`/challenges/teams/${t.id}/members`} className="font-semibold">{t.name}</Link>{!t.active && <span className="chip chip-muted ml-1.5">Deactivated</span>}</div> },
            { key: 'ch', header: 'Challenge Name', cell: (t) => <Link to={`/challenges/${t.challenge_id}`}>{cname(t.challenge_id)}</Link> },
            { key: 'by', header: 'Created by', cell: (t) => team.name(t.created_by) ?? '-' },
            { key: 'a', header: 'Action', width: 90, cell: (t) => <ActionMenu actions={actions(t)} /> },
          ]}
          card={(t) => <div className="flex items-start justify-between gap-3"><div><b>{t.name}</b><div className="text-[13px] text-muted">{cname(t.challenge_id)}</div></div><ActionMenu actions={actions(t)} /></div>} />
      </div>
      <Confirm c={confirm && { text: `ARE YOU SURE YOU WANT TO ${confirm.verb} ${selected.size === 1 ? 'THIS Group' : 'THE SELECTED Groups'} ?`, danger: confirm.change === 'delete' }}
        onClose={() => setConfirm(null)} onYes={() => confirm && act.mutate(confirm)} busy={act.isPending} />
    </>
  )
}

export function TeamForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const teams = useQuery({ queryKey: ['teams', me.studioId], queryFn: () => listTeams(me.studioId) })
  const challenges = useQuery({ queryKey: ['challenge-list', me.studioId], queryFn: () => challengeList(me.studioId) })
  const existing = teams.data?.find((t) => t.id === id)
  const preset = new URLSearchParams(window.location.search).get('challenge') ?? ''
  const [f, setF] = useState<{ name: string; challenge_id: string } | null>(null)
  const v = f ?? { name: existing?.name ?? '', challenge_id: existing?.challenge_id ?? preset }
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async (next: boolean) => ({ tid: await saveTeam(id ?? null, { name: v.name.trim(), challenge_id: v.challenge_id }), next }),
    onSuccess: ({ tid, next }) => { qc.invalidateQueries({ queryKey: ['teams'] }); toast(id ? 'Team saved' : 'Team created'); navigate(next ? `/challenges/teams/${tid}/members` : '/challenges/teams') },
    onError: (e: Error) => setError(/challenge_teams_name_uq|duplicate/.test(e.message) ? 'This challenge already has a team with that name.' : e.message),
  })
  const submit = (next: boolean) => { setError(null); if (!v.name.trim()) setError('Team Name is required.'); else if (!v.challenge_id) setError('Select the challenge.'); else save.mutate(next) }
  if (id && teams.isLoading) return <Loading />
  return (
    <>
      <PageHeader title={id ? 'Edit Team' : 'Create Team'} actions={<Link to="/challenges/teams" className="btn btn-sm">Teams Listing</Link>} />
      <form className="flex max-w-[720px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(true) }}>
        <div className="card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Team Basic Information</h2>
          <Field label="Team Name" required id="tm-name"><TextInput id="tm-name" value={v.name} onChange={(x) => setF({ ...v, name: x })} placeholder="eg. Team Beta" /></Field>
          <Field label="Select Challenge" required id="tm-ch">
            <Select id="tm-ch" value={v.challenge_id} onChange={(x) => setF({ ...v, challenge_id: x })} placeholder="Select Challenge" options={(challenges.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Link to="/challenges/teams" className="btn flex-1">Cancel</Link>
          <button type="button" className="btn flex-1" disabled={save.isPending} onClick={() => submit(false)}>Save</button>
          <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>Save &amp; Next</button>
        </div>
      </form>
    </>
  )
}

export function TeamMembers() {
  const { id = '' } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const teams = useQuery({ queryKey: ['teams', me.studioId], queryFn: () => listTeams(me.studioId) })
  const t = teams.data?.find((x) => x.id === id)
  const board = useQuery({ queryKey: ['challenge-board', t?.challenge_id], queryFn: () => leaderboard(t!.challenge_id), enabled: !!t })
  const [adding, setAdding] = useState<{ id: string; label: string } | null>(null)
  const refresh = () => { qc.invalidateQueries({ queryKey: ['challenge-board'] }); qc.invalidateQueries({ queryKey: ['challenge-team-board'] }) }
  const add = useMutation({
    mutationFn: () => addParticipants(t!.challenge_id, [adding!.id], t!.id),
    onSuccess: () => { refresh(); toast('Added to the team'); setAdding(null) },
    onError: (e: Error) => toast(e.message),
  })
  // The tick shows at once; the server's answer follows (a failed change puts it back).
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const toggle = useMutation({
    mutationFn: (a: { member: string; on: boolean }) => setParticipantTeam(t!.challenge_id, [a.member], a.on ? t!.id : null),
    onSettled: refresh,
    onError: (e: Error, a) => { setTicked((o) => { const n = { ...o }; delete n[a.member]; return n }); toast(e.message) },
  })
  const tick = (member: string, on: boolean) => { setTicked((o) => ({ ...o, [member]: on })); toggle.mutate({ member, on }) }
  if (teams.isLoading) return <Loading />
  if (!t) return <div className="px-5 py-10"><Notice tone="error">Team not found.</Notice></div>
  const rows = (board.data ?? []).map((r) => (r.member_id in ticked ? { ...r, team_id: ticked[r.member_id] ? t.id : r.team_id === t.id ? null : r.team_id, team_name: ticked[r.member_id] ? t.name : r.team_id === t.id ? null : r.team_name } : r))
  const inTeam = rows.filter((r) => r.team_id === t.id)
  return (
    <>
      <PageHeader title={`${t.name} · Members`} sub={`${inTeam.length} in the team · ${inTeam.reduce((s, r) => s + Number(r.points), 0)} points`}
        actions={<><Link to={`/challenges/${t.challenge_id}`} className="btn btn-sm">View Challenge</Link><Link to="/challenges/teams" className="btn btn-sm">Teams Listing</Link></>} />
      <div className="flex max-w-[960px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <section className="card flex flex-col gap-3 p-4">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
            <ClientLookup label="Add a client to this team" id="tm-add" onFound={setAdding} />
            <button type="button" className="btn-gold min-h-10 px-4" disabled={!adding || add.isPending} onClick={() => add.mutate()}>Add</button>
          </div>
        </section>
        <p className="m-0 text-[13px] text-muted">Tick the challenge’s participants who play for {t.name}. A participant is in one team at a time.</p>
        <DataTable<BoardRow> loading={board.isLoading} rows={rows} rowKey={(r) => r.member_id} caption="Participants" empty="Nobody has joined this challenge yet."
          columns={[
            { key: 'in', header: 'In team', width: 80, cell: (r) => <input type="checkbox" className="check" aria-label={`${r.name} in ${t.name}`} checked={r.team_id === t.id}
              onChange={(e) => tick(r.member_id, e.target.checked)} /> },
            { key: 'name', header: 'Participant', cell: (r) => r.name },
            { key: 'team', header: 'Current Team', cell: (r) => r.team_name ?? '-' },
            { key: 'points', header: 'Points', className: 'num', cell: (r) => r.points },
          ]}
          card={(r) => (
            <label className="flex items-center gap-3"><input type="checkbox" className="check" checked={r.team_id === t.id} onChange={(e) => tick(r.member_id, e.target.checked)} />
              <span><b>{r.name}</b><span className="block text-[12px] text-muted">{r.team_name ?? 'No team'} · {r.points} pts</span></span></label>
          )} />
      </div>
    </>
  )
}
