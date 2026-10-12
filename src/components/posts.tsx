import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { mediaLinks, type FeedPost } from '../db/community'
import { fmtDateTime } from '../lib/dates'
import { Avatar, Icon } from './ui'

// A community or challenge post: the picture or video, who posted it, the text and the claps.

/** Signed links for the pictures of a list of posts. */
export function useMediaLinks(posts: FeedPost[] | undefined) {
  const paths = (posts ?? []).map((p) => p.media_path).filter(Boolean) as string[]
  return useQuery({ queryKey: ['community-media', paths.join(',')], queryFn: () => mediaLinks(paths), enabled: paths.length > 0, staleTime: 50 * 60_000 }).data ?? {}
}

export function PostCard({ post, url, top, actions, onClap, clapLabel = 'Clap' }: {
  post: FeedPost; url?: string; top?: ReactNode; actions?: ReactNode; onClap?: () => void; clapLabel?: string
}) {
  const [more, setMore] = useState(false)
  const long = (post.body ?? '').length > 220
  return (
    <article className="card flex flex-col overflow-hidden" aria-label={`Post by ${post.author_name}`}>
      {top}
      {post.media_path && (
        url
          ? post.media_type === 'video'
            ? <video src={url} controls preload="metadata" className="max-h-[420px] w-full bg-black object-contain" />
            : <img src={url} alt={post.body ? post.body.slice(0, 80) : `Photo by ${post.author_name}`} loading="lazy" className="max-h-[420px] w-full bg-surface-2 object-cover" />
          : <div className="flex h-40 items-center justify-center bg-surface-2 text-[13px] text-muted">Loading picture…</div>
      )}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={post.author_name} size={32} gold={post.author_is_staff} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">{post.author_name}{post.author_is_staff && <span className="chip chip-gold ml-1.5 align-middle">Gym</span>}</div>
            <div className="text-[12px] text-muted">{fmtDateTime(post.created_at)}</div>
          </div>
        </div>
        {post.body && (
          <p className="m-0 text-[14px] whitespace-pre-wrap">
            {long && !more ? `${post.body.slice(0, 220).trimEnd()}… ` : post.body}
            {long && <button type="button" className="link-btn text-[13px]" onClick={() => setMore(!more)}>{more ? 'Show less' : 'Show more...'}</button>}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onClap
            ? <button type="button" aria-pressed={post.clapped} onClick={onClap}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${post.clapped ? 'border-gold bg-accent-tint text-ink' : 'border-line text-muted'}`}>
                <Icon name="heart" size={16} />{clapLabel} · {post.claps}
              </button>
            : <span className="text-[13px] text-muted">❤ {post.claps}</span>}
          {actions}
        </div>
      </div>
    </article>
  )
}

/** Choose a photo or short video for a post. */
export function MediaPicker({ file, onFile, id }: { file: File | null; onFile: (f: File | null) => void; id: string }) {
  const preview = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="btn btn-sm cursor-pointer self-start"><Icon name="image" size={16} />{file ? 'Change photo or video' : 'Add photo or video'}</label>
      <input id={id} type="file" accept="image/*,video/mp4,video/quicktime" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {file && (
        <div className="flex items-center gap-3">
          {preview ? <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <span className="text-[13px]">{file.name}</span>}
          <button type="button" className="link-btn text-[13px]" onClick={() => onFile(null)}>Remove</button>
        </div>
      )}
    </div>
  )
}

export const checkMedia = (f: File | null) =>
  !f ? null : !(f.type.startsWith('image/') || f.type.startsWith('video/')) ? 'Choose a photo or a video.'
    : f.size > (f.type.startsWith('video/') ? 50 : 10) * 1024 * 1024 ? (f.type.startsWith('video/') ? 'Videos up to 50 MB, please.' : 'Photos up to 10 MB, please.') : null
