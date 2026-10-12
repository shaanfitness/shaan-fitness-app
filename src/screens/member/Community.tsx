import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import {
  challengeDay, challengeTasks, clap, communityFeed, createPost, deleteMyPost, entries, joinChallenge, leaderboard, myChallenges, recordEntry, tasksFor, teamBoard, UNITS,
  type FeedPost, type MyChallenge,
} from '../../db/community'
import { fmtDay, studioToday } from '../../lib/dates'
import { Checkbox, Notice, TextArea, TextInput } from '../../components/controls'
import { checkMedia, MediaPicker, PostCard, useMediaLinks } from '../../components/posts'
import { useToast } from '../../components/toast'
import { Icon, Loading, Sheet } from '../../components/ui'

// Member app: the gym's community (posts, claps, a new post) and challenges (join, today's tasks,
// leaderboards, challenge posts). Other members show by first name only.

function Back() {
  const { t } = useTranslation()
  return <Link to="/app" className="flex items-center gap-1 self-start text-[13px] font-semibold no-underline lg:hidden"><Icon name="chevronLeft" size={16} />{t('app.back')}</Link>
}

function Feed({ challengeId }: { challengeId?: string | null }) {
  const { t } = useTranslation()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const key = ['member-feed', me.studioId, challengeId ?? null]
  const q = useQuery({ queryKey: key, queryFn: () => communityFeed(me.studioId, { challenge: challengeId ?? null }) })
  const links = useMediaLinks(q.data)
  const toggle = useMutation({
    mutationFn: (p: FeedPost) => clap(p.id, !p.clapped),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData<FeedPost[]>(key, (xs) => xs?.map((x) => (x.id === p.id ? { ...x, clapped: !p.clapped, claps: x.claps + (p.clapped ? -1 : 1) } : x)))
    },
    onError: (e: Error) => { toast(e.message); qc.invalidateQueries({ queryKey: key }) },
  })
  const del = useMutation({
    mutationFn: deleteMyPost,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member-feed'] }),
    onError: (e: Error) => toast(e.message),
  })
  if (q.isLoading) return <Loading />
  if (!q.data?.length) return <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('community.empty')}</div>
  return (
    <div className="flex flex-col gap-3">
      {q.data.map((p) => (
        <PostCard key={p.id} post={p} url={p.media_path ? links[p.media_path] : undefined} clapLabel={t('community.clap')}
          onClap={p.status === 'active' ? () => toggle.mutate(p) : undefined}
          top={p.is_mine && p.status !== 'active' ? <div className="border-b border-line px-4 py-2 text-[12px] text-muted">{p.status === 'pending' ? t('community.waiting') : t('community.declined')}</div> : undefined}
          actions={p.is_mine ? <button type="button" className="link-btn text-[13px]" onClick={() => { if (window.confirm(t('community.confirmDelete'))) del.mutate(p.id) }}>{t('community.delete')}</button> : undefined} />
      ))}
    </div>
  )
}

function NewPost({ challengeId, onDone }: { challengeId?: string | null; onDone: () => void }) {
  const { t } = useTranslation()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => createPost({ studioId: me.studioId, memberId: me.memberId, challengeId, body, file }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['member-feed'] }); qc.invalidateQueries({ queryKey: ['member-board'] }); toast(r.status === 'active' ? t('community.posted') : t('community.pending')); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      const bad = checkMedia(file)
      if (bad) return setError(bad)
      if (!body.trim() && !file) return setError(t('community.needContent'))
      save.mutate()
    }}>
      <MediaPicker id="np-file" file={file} onFile={setFile} />
      <TextArea id="np-body" rows={4} value={body} onChange={setBody} placeholder={t('community.placeholder')} />
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-gold" disabled={save.isPending}>{save.isPending ? t('community.posting') : t('community.post')}</button>
    </form>
  )
}

/** "Team Agni" stays as it is; a bare "Agni" becomes "Team Agni". */
const teamLabel = (t: (k: string, o?: Record<string, unknown>) => string, name: string) => (/^team\b/i.test(name.trim()) ? name : t('community.teamOf', { name }))

export function MemberCommunity() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <div className="flex items-end justify-between gap-3">
        <h1 className="title text-[36px]">{t('community.title')}</h1>
        <Link to="/app/challenges" className="btn btn-sm no-underline"><Icon name="trophy" size={16} />{t('community.challenges')}</Link>
      </div>
      <button type="button" className="btn-gold self-start px-4" onClick={() => setOpen(true)}><Icon name="plus" size={18} />{t('community.newPost')}</button>
      <Feed />
      <Sheet wide open={open} onClose={() => setOpen(false)} title={t('community.newPost')}>{open && <NewPost onDone={() => setOpen(false)} />}</Sheet>
    </div>
  )
}

// Challenges ---------------------------------------------------------------------------------------------------------
function when(c: Pick<MyChallenge, 'start_date' | 'end_date'>, t: (k: string, o?: Record<string, unknown>) => string) {
  const today = studioToday()
  return today < c.start_date ? <span className="chip chip-info">{t('community.upcoming', { date: fmtDay(c.start_date, 'd MMM') })}</span>
    : today > c.end_date ? <span className="chip chip-muted">{t('community.ended')}</span> : <span className="chip chip-green">{t('community.running')}</span>
}

export function MemberChallenges() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: ['my-challenges'], queryFn: myChallenges })
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <h1 className="title text-[36px]">{t('community.challenges')}</h1>
      {q.isLoading ? <Loading /> : !q.data?.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('community.noChallenges')}</div> : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {q.data.map((c) => (
            <li key={c.id}>
              <Link to={`/app/challenges/${c.id}`} className="card flex flex-col overflow-hidden text-ink no-underline">
                {c.image_url && <img src={c.image_url} alt="" className="h-36 w-full object-cover" />}
                <div className="flex flex-col gap-1 p-4">
                  <div className="flex items-start justify-between gap-2"><h2 className="m-0 text-[17px] font-bold">{c.name}</h2>{when(c, t)}</div>
                  <p className="m-0 text-[13px] text-muted">{t('community.dates', { from: fmtDay(c.start_date, 'd MMM'), to: fmtDay(c.end_date, 'd MMM yyyy') })} · {t('community.participants', { n: c.participants })}</p>
                  {c.joined && <p className="m-0 text-[13px] font-semibold text-gold">{t('community.joined')} · {t('community.points', { n: c.my_points })}{c.team_name ? ` · ${teamLabel(t, c.team_name)}` : ''}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type Tab = 'today' | 'board' | 'posts' | 'about'

export function MemberChallenge() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['my-challenges'], queryFn: myChallenges })
  const c = list.data?.find((x) => x.id === id)
  const tasks = useQuery({ queryKey: ['member-challenge-tasks', id], queryFn: () => challengeTasks(id), enabled: !!c?.has_tasks })
  const mine = useQuery({ queryKey: ['member-entries', id], queryFn: () => entries(id, me.memberId), enabled: !!c?.joined })
  const board = useQuery({ queryKey: ['member-board', id], queryFn: () => leaderboard(id), enabled: !!c })
  const teams = useQuery({ queryKey: ['member-team-board', id], queryFn: () => teamBoard(id), enabled: !!c })
  const [tab, setTab] = useState<Tab | null>(null)
  const [accept, setAccept] = useState(false)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [posting, setPosting] = useState(false)
  const today = studioToday()
  const day = c ? challengeDay(c.start_date, today) : 0
  const todays = useMemo(() => (c && today >= c.start_date && today <= c.end_date ? tasksFor(tasks.data ?? [], day) : []), [c, tasks.data, day, today])
  const join = useMutation({
    mutationFn: () => joinChallenge(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-challenges'] }); qc.invalidateQueries({ queryKey: ['member-board', id] }); toast(t('community.joinedToast')) },
    onError: (e: Error) => toast(e.message),
  })
  const log = useMutation({
    mutationFn: (taskId: string) => recordEntry({ challengeId: id, memberId: me.memberId!, taskId, date: today, value: Number(vals[taskId]) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['member-entries', id] }); qc.invalidateQueries({ queryKey: ['member-board', id] }); qc.invalidateQueries({ queryKey: ['my-challenges'] }); toast(t('community.logged')) },
    onError: (e: Error) => toast(e.message),
  })
  if (list.isLoading) return <Loading />
  if (!c) return <div className="px-5 pt-6"><Notice>{t('community.noChallenges')}</Notice></div>
  const active = tab ?? (c.joined ? (c.has_tasks ? 'today' : 'board') : 'about')
  const tabs: { v: Tab; label: string }[] = [
    ...(c.joined && c.has_tasks ? [{ v: 'today' as const, label: t('community.today') }] : []),
    { v: 'board', label: t('community.leaderboard') }, { v: 'posts', label: t('community.posts') }, { v: 'about', label: t('community.details') },
  ]
  const unit = (u: string) => UNITS.find((x) => x.value === u)?.label.toLowerCase() ?? u
  const doneToday = (taskId: string) => mine.data?.find((e) => e.task_id === taskId && e.date === today)
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Link to="/app/challenges" className="flex items-center gap-1 self-start text-[13px] font-semibold no-underline"><Icon name="chevronLeft" size={16} />{t('community.challenges')}</Link>
      {c.image_url && <img src={c.image_url} alt="" className="max-h-48 w-full rounded-2xl object-cover" />}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2"><h1 className="title text-[32px]">{c.name}</h1>{when(c, t)}</div>
        <p className="m-0 text-[13px] text-muted">{t('community.dates', { from: fmtDay(c.start_date, 'd MMM'), to: fmtDay(c.end_date, 'd MMM yyyy') })} · {t('community.participants', { n: c.participants })}</p>
        {c.joined && <p className="m-0 text-[15px] font-bold">{t('community.myPoints')}: {c.my_points}{c.team_name ? <span className="font-normal text-muted"> · {teamLabel(t, c.team_name)}</span> : null}</p>}
      </div>
      {!c.joined && today <= c.end_date && (
        <section className="card flex flex-col gap-3 p-4">
          <Checkbox id="ch-accept" checked={accept} onChange={setAccept} label={t('community.accept')} />
          <button type="button" className="btn-gold" disabled={!accept || join.isPending} onClick={() => join.mutate()}>{t('community.join')}</button>
          {!accept && <p className="m-0 text-[12px] text-muted">{t('community.mustAccept')}</p>}
        </section>
      )}
      <div role="tablist" aria-label={c.name} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((x) => (
          <button key={x.v} type="button" role="tab" aria-selected={active === x.v} onClick={() => setTab(x.v)}
            className={`min-h-9 rounded-full border px-1.5 py-1.5 text-[12.5px] leading-tight font-semibold ${active === x.v ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>{x.label}</button>
        ))}
      </div>
      {active === 'today' && (
        todays.length === 0 ? <div className="card px-5 py-6 text-center text-[14px] text-muted">{today < c.start_date ? t('community.notStarted') : today > c.end_date ? t('community.ended') : t('community.restDay')}</div> : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            <li className="text-[13px] text-muted">{t('community.day', { n: day })}</li>
            {todays.map((x) => {
              const done = doneToday(x.id)
              return (
                <li key={x.id} className="card flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="font-semibold">{x.title}</div>
                      <div className="text-[12px] text-muted">{x.target ? t('community.target', { n: Number(x.target), unit: unit(x.unit) }) : ''} · {t('community.points', { n: x.points })}</div></div>
                    {done && <span className={`chip ${done.points > 0 ? 'chip-green' : 'chip-muted'}`}>{t('community.done')} · {done.points}</span>}
                  </div>
                  {x.description && <p className="m-0 text-[13px]">{x.description}</p>}
                  <div className="flex gap-2">
                    <TextInput type="number" inputMode="decimal" ariaLabel={x.title} value={vals[x.id] ?? (done ? String(Number(done.value)) : '')} onChange={(v) => setVals({ ...vals, [x.id]: v })} className="w-32" />
                    <span className="self-center text-[13px] text-muted">{unit(x.unit)}</span>
                    <button type="button" className="btn btn-sm ml-auto" disabled={log.isPending || !(Number(vals[x.id]) >= 0) || vals[x.id] === undefined || vals[x.id] === ''} onClick={() => log.mutate(x.id)}>{t('community.log')}</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      )}
      {active === 'board' && (
        <>
          {(teams.data?.length ?? 0) > 0 && (
            <section className="card flex flex-col gap-2 p-4">
              <h2 className="m-0 text-[15px] font-bold">{t('community.teams')}</h2>
              {teams.data!.map((x) => <div key={x.team_id} className="flex justify-between text-[14px]"><span>#{x.rank} {x.team_name}</span><b>{x.points}</b></div>)}
            </section>
          )}
          <section className="card overflow-hidden">
            {!board.data?.length ? <p className="m-0 p-4 text-[14px] text-muted">{t('community.empty')}</p> : (
              <ol className="m-0 list-none p-0">
                {board.data.slice(0, 50).map((r) => (
                  <li key={r.member_id} className={`flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0 ${r.is_me ? 'bg-accent-tint' : ''}`}>
                    <span className="flex items-center gap-3"><span className="w-8 text-[13px] font-bold text-muted">{r.points > 0 ? `#${r.rank}` : '-'}</span>
                      <span className="text-[14px] font-semibold">{r.is_me ? `${r.name} (${t('community.you')})` : r.name}</span></span>
                    <span className="text-[14px] font-bold">{r.points}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
      {active === 'posts' && (
        <>
          {c.joined && <button type="button" className="btn-gold self-start px-4" onClick={() => setPosting(true)}><Icon name="plus" size={18} />{t('community.postProgress')}</button>}
          <Feed challengeId={c.id} />
        </>
      )}
      {active === 'about' && (
        <section className="card flex flex-col gap-3 p-4">
          {c.description && <p className="m-0 text-[14px] whitespace-pre-wrap">{c.description}</p>}
          {c.video_url && <a href={c.video_url} target="_blank" rel="noreferrer" className="link-btn self-start">{t('community.video')}</a>}
          <h2 className="m-0 text-[15px] font-bold">{t('community.terms')}</h2>
          <p className="m-0 text-[13px] whitespace-pre-wrap">{c.terms}</p>
        </section>
      )}
      <Sheet wide open={posting} onClose={() => setPosting(false)} title={t('community.postProgress')}>{posting && <NewPost challengeId={c.id} onDone={() => setPosting(false)} />}</Sheet>
    </div>
  )
}
