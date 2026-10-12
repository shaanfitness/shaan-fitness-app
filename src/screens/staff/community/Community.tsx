import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import { communityFeed, createPost, decidePosts, type FeedPost, type PostStatus } from '../../../db/community'
import { studioLine } from '../../../components/crud'
import { Field, Notice, TextArea, TextInput } from '../../../components/controls'
import { checkMedia, MediaPicker, PostCard, useMediaLinks } from '../../../components/posts'
import { BulkBar } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { Icon, PageHeader, Sheet } from '../../../components/ui'

// YDL App Settings › Community: Pending / Active / Decline / All posts, Accept, Decline, Delete, Upload Post.
// The same moderation is used for a challenge's posts (Challenge › Posts List).

const TABS: { v: PostStatus | 'all'; label: string }[] = [
  { v: 'pending', label: 'Pending Post' }, { v: 'active', label: 'Active Post' }, { v: 'declined', label: 'Decline post' }, { v: 'all', label: 'All Post' },
]
const statusChip = (s: PostStatus) =>
  <span className={`chip ${s === 'active' ? 'chip-green' : s === 'declined' ? 'chip-red' : 'chip-amber'}`}>{s === 'active' ? 'Accepted' : s === 'declined' ? 'Declined' : 'Pending'}</span>

export function PostModeration({ challengeId, initial = 'pending' }: { challengeId?: string | null; initial?: PostStatus | 'all' }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<PostStatus | 'all'>(initial)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { action: 'active' | 'declined' | 'delete'; ids: string[] }>(null)
  const q = useQuery({ queryKey: ['feed', me.studioId, challengeId ?? null, tab, search], queryFn: () => communityFeed(me.studioId, { status: tab, challenge: challengeId ?? null, search }) })
  const links = useMediaLinks(q.data)
  const act = useMutation({
    mutationFn: (c: NonNullable<typeof confirm>) => decidePosts(me.studioId, c.ids, c.action),
    onSuccess: (n, c) => {
      qc.invalidateQueries({ queryKey: ['feed'] }); qc.invalidateQueries({ queryKey: ['challenge-list'] }); setSelected(new Set()); setConfirm(null)
      toast(`${n} post${n === 1 ? '' : 's'} ${c.action === 'active' ? 'accepted' : c.action === 'declined' ? 'declined' : 'deleted'}`)
    },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const verb = (a: 'active' | 'declined' | 'delete') => (a === 'active' ? 'ACTIVATE' : a === 'declined' ? 'DECLINE' : 'DELETE')
  const posts = q.data ?? []
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Posts" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.v} type="button" role="tab" aria-selected={tab === t.v} onClick={() => { setTab(t.v); setSelected(new Set()) }}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${tab === t.v ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>{t.label}</button>
        ))}
      </div>
      <div className="relative w-full max-w-[420px]">
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <TextInput small value={search} onChange={setSearch} placeholder="Search by user name" className="pl-9" ariaLabel="Search by user name" />
      </div>
      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ action: 'delete', ids: [...selected] })}>Delete</button>
        <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: 'declined', ids: [...selected] })}>Decline</button>
        <button type="button" className="btn btn-sm btn-gold" onClick={() => setConfirm({ action: 'active', ids: [...selected] })}>Accept</button>
      </BulkBar>
      {q.isLoading ? <p className="m-0 text-muted">Loading…</p> : posts.length === 0
        ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{tab === 'pending' ? 'No Pending Post To Show.' : 'No posts here.'}</div>
        : (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((p: FeedPost) => (
              <PostCard key={p.id} post={p} url={p.media_path ? links[p.media_path] : undefined}
                top={(
                  <label className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                    <span className="flex items-center gap-2 text-[13px]"><input type="checkbox" className="check" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />Select</span>
                    {statusChip(p.status)}
                  </label>
                )}
                actions={(
                  <div className="flex gap-1.5">
                    {p.status !== 'active' && <button type="button" className="btn btn-sm btn-gold" onClick={() => setConfirm({ action: 'active', ids: [p.id] })}>Accept</button>}
                    {p.status !== 'declined' && <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: 'declined', ids: [p.id] })}>Decline</button>}
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm({ action: 'delete', ids: [p.id] })}>Delete Post</button>
                  </div>
                )} />
            ))}
          </div>
        )}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO {verb(confirm.action)} {confirm.ids.length === 1 ? 'THIS POST' : `THESE ${confirm.ids.length} POSTS`} ?</p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
              <button type="button" className={`btn flex-1 ${confirm.action === 'delete' ? 'btn-danger' : ''}`} disabled={act.isPending} onClick={() => act.mutate(confirm)}>Yes</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}

export function CommunityPage() {
  const { data: studio } = useStudio()
  const [upload, setUpload] = useState(false)
  return (
    <>
      <PageHeader title="Community Pending Posts" sub={studio ? studioLine(studio) : ''}
        actions={<button type="button" className="btn-gold min-h-10 px-4" onClick={() => setUpload(true)}><Icon name="plus" size={18} />Upload Post</button>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <PostModeration />
      </div>
      <Sheet wide open={upload} onClose={() => setUpload(false)} title="Upload Post">{upload && <UploadPost onDone={() => setUpload(false)} />}</Sheet>
    </>
  )
}

export function UploadPost({ challengeId, onDone }: { challengeId?: string | null; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => createPost({ studioId: me.studioId, staffId: me.staffId, challengeId, body, file }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed'] }); toast('Post published'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      const bad = checkMedia(file)
      if (bad) return setError(bad)
      if (!body.trim() && !file) return setError('Add a photo or write something.')
      save.mutate()
    }}>
      <Field label="Post Upload" id="up-file"><MediaPicker id="up-file" file={file} onFile={setFile} /></Field>
      <Field label="Post Description" id="up-body"><TextArea id="up-body" rows={5} value={body} onChange={setBody} /></Field>
      <p className="m-0 text-[12px] text-muted">Posts from the gym go live at once; members see them in the app’s community.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Posting…' : 'Submit'}</button></div>
    </form>
  )
}
