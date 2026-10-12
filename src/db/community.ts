import { supabase } from '../lib/supabase'
import { throwIf } from './studio'

// Community posts and challenges (supabase/migrations/20261012000016_community.sql).

export type PostStatus = 'pending' | 'active' | 'declined'
export interface FeedPost {
  id: string; challenge_id: string | null; author_name: string; author_is_staff: boolean; author_member_id: string | null; is_mine: boolean
  body: string | null; media_path: string | null; media_type: 'image' | 'video' | null; status: PostStatus; claps: number; clapped: boolean
  created_at: string; decided_at: string | null
}
export interface Challenge {
  id: string; studio_id: string; name: string; description: string | null; video_url: string | null; image_url: string | null
  start_date: string; end_date: string; terms: string; has_tasks: boolean; client_level: string | null; active: boolean; created_at: string
}
export type TaskUnit = 'reps' | 'secs' | 'mins' | 'km' | 'kg' | 'steps' | 'litres' | 'times'
export interface ChallengeTask { id: string; challenge_id: string; title: string; description: string | null; target: number | null; unit: TaskUnit; points: number; day: number | null; seq: number }
export interface ChallengeRow { id: string; name: string; start_date: string; end_date: string; active: boolean; has_tasks: boolean; image_url: string | null; participants: number; teams: number; pending_posts: number; created_at: string }
export interface Team { id: string; studio_id: string; challenge_id: string; name: string; active: boolean; created_by: string | null; created_at: string }
export interface BoardRow { member_id: string; name: string; team_id: string | null; team_name: string | null; points: number; entries: number; posts: number; claps: number; is_me: boolean; rank: number }
export interface TeamBoardRow { team_id: string; team_name: string; members: number; points: number; rank: number }
export interface MyChallenge {
  id: string; name: string; description: string | null; image_url: string | null; video_url: string | null; start_date: string; end_date: string; terms: string
  has_tasks: boolean; joined: boolean; my_points: number; participants: number; team_name: string | null
}
export interface Entry { id: string; challenge_id: string; member_id: string; task_id: string | null; date: string; value: number; points: number; note: string | null; recorded_by: string | null }

export const UNITS: { value: TaskUnit; label: string }[] = [
  { value: 'reps', label: 'Reps' }, { value: 'secs', label: 'Seconds' }, { value: 'mins', label: 'Minutes' }, { value: 'km', label: 'Km' },
  { value: 'kg', label: 'Kg' }, { value: 'steps', label: 'Steps' }, { value: 'litres', label: 'Litres' }, { value: 'times', label: 'Times' },
]
export const CLIENT_LEVELS = ['LEVEL 0', 'LEVEL 1', 'LEVEL 2', 'LEVEL 3']

const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// Feed and posts --------------------------------------------------------------------------------------------
export const communityFeed = (studioId: string, a: { status?: PostStatus | 'all'; challenge?: string | null; search?: string } = {}) =>
  rpc<FeedPost[]>('community_feed', { p_studio: studioId, p_status: a.status ?? 'active', p_challenge: a.challenge ?? null, p_search: a.search || null, p_limit: 200 })
export const decidePosts = (studioId: string, ids: string[], action: 'active' | 'declined' | 'pending' | 'delete') =>
  rpc<number>('decide_posts', { p_studio: studioId, p_ids: ids, p_action: action })

export async function uploadCommunityMedia(studioId: string, file: File) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${studioId}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('community-media').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (up.error) throw new Error(`The picture couldn't be uploaded: ${up.error.message}`)
  return path
}
export async function createPost(a: { studioId: string; memberId?: string; staffId?: string; challengeId?: string | null; body: string; file?: File | null }) {
  let media_path: string | null = null
  let media_type: 'image' | 'video' | null = null
  if (a.file) {
    media_path = await uploadCommunityMedia(a.studioId, a.file)
    media_type = a.file.type.startsWith('video/') ? 'video' : 'image'
  }
  const row = { author_member_id: a.memberId ?? null, author_staff_id: a.staffId ?? null, challenge_id: a.challengeId ?? null, body: a.body.trim() || null, media_path, media_type }
  const res = await supabase.from('community_posts').insert(row).select('id,status').single()
  return throwIf(res) as { id: string; status: PostStatus }
}
export async function deleteMyPost(id: string) {
  throwIf(await supabase.from('community_posts').delete().eq('id', id).select('id'))
}
export async function clap(postId: string, on: boolean) {
  if (on) throwIf(await supabase.from('post_claps').insert({ post_id: postId }).select('post_id'))
  else throwIf(await supabase.from('post_claps').delete().eq('post_id', postId).select('post_id'))
}
/** Signed links for a page of posts' pictures (valid for an hour). */
export async function mediaLinks(paths: string[]) {
  if (!paths.length) return {} as Record<string, string>
  const res = await supabase.storage.from('community-media').createSignedUrls(paths, 3600)
  if (res.error) return {} as Record<string, string>
  return Object.fromEntries((res.data ?? []).filter((x) => x.signedUrl && x.path).map((x) => [x.path!, x.signedUrl])) as Record<string, string>
}

// Challenges (staff) --------------------------------------------------------------------------------------------
export const challengeList = (studioId: string) => rpc<ChallengeRow[]>('challenge_list', { p_studio: studioId })
export async function getChallenge(id: string) {
  const [c, t] = await Promise.all([
    supabase.from('challenges').select('*').eq('id', id).single(),
    supabase.from('challenge_tasks').select('*').eq('challenge_id', id).order('day', { nullsFirst: true }).order('seq').order('created_at'),
  ])
  return { challenge: throwIf(c) as Challenge, tasks: throwIf(t) as ChallengeTask[] }
}
export async function saveChallenge(studioId: string, id: string | null, v: Partial<Challenge>) {
  const res = id
    ? await supabase.from('challenges').update(v).eq('id', id).select('id').single()
    : await supabase.from('challenges').insert({ ...v, studio_id: studioId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function updateChallenges(ids: string[], change: 'delete' | { active: boolean }) {
  if (change === 'delete') throwIf(await supabase.from('challenges').delete().in('id', ids).select('id'))
  else throwIf(await supabase.from('challenges').update(change).in('id', ids).select('id'))
}
export const copyChallenge = (id: string) => rpc<string>('copy_challenge', { p_challenge: id })
export async function saveTask(challengeId: string, id: string | null, v: Partial<ChallengeTask>) {
  const res = id
    ? await supabase.from('challenge_tasks').update(v).eq('id', id).select('id').single()
    : await supabase.from('challenge_tasks').insert({ ...v, challenge_id: challengeId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function deleteTask(id: string) {
  throwIf(await supabase.from('challenge_tasks').delete().eq('id', id).select('id'))
}
export const leaderboard = (id: string) => rpc<BoardRow[]>('challenge_leaderboard', { p_challenge: id })
export const teamBoard = (id: string) => rpc<TeamBoardRow[]>('challenge_team_board', { p_challenge: id })
export const addParticipants = (challengeId: string, memberIds: string[], teamId?: string | null) =>
  rpc<number>('add_challenge_participants', { p_challenge: challengeId, p_member_ids: memberIds, p_team: teamId ?? null })
export async function removeParticipant(challengeId: string, memberId: string) {
  throwIf(await supabase.from('challenge_participants').delete().eq('challenge_id', challengeId).eq('member_id', memberId).select('id'))
}
export async function setParticipantTeam(challengeId: string, memberIds: string[], teamId: string | null) {
  throwIf(await supabase.from('challenge_participants').update({ team_id: teamId }).eq('challenge_id', challengeId).in('member_id', memberIds).select('id'))
}
export async function recordEntry(v: { challengeId: string; memberId: string; taskId: string | null; date: string; value: number; note?: string; staffId?: string | null }) {
  const row = { challenge_id: v.challengeId, member_id: v.memberId, task_id: v.taskId, date: v.date, value: v.value, note: v.note || null, recorded_by: v.staffId ?? null }
  throwIf(await supabase.from('challenge_entries').upsert(row, { onConflict: 'challenge_id,member_id,task_id,date' }).select('id'))
}
export async function entries(challengeId: string, memberId?: string) {
  let q = supabase.from('challenge_entries').select('*').eq('challenge_id', challengeId)
  if (memberId) q = q.eq('member_id', memberId)
  return throwIf(await q.order('date', { ascending: false }).limit(2000)) as Entry[]
}

export async function clientChallenges(memberId: string) {
  const [p, m] = await Promise.all([
    supabase.from('challenge_participants').select('challenge_id').eq('member_id', memberId),
    supabase.from('members').select('full_name').eq('id', memberId).maybeSingle(),
  ])
  return { ids: (throwIf(p) as { challenge_id: string }[]).map((r) => r.challenge_id), name: (m.data as { full_name: string } | null)?.full_name ?? null }
}

// Teams ------------------------------------------------------------------------------------------------------------
export async function listTeams(studioId: string) {
  return throwIf(await supabase.from('challenge_teams').select('*').eq('studio_id', studioId).order('created_at', { ascending: false }).limit(1000)) as Team[]
}
export async function saveTeam(id: string | null, v: Partial<Team>) {
  const res = id
    ? await supabase.from('challenge_teams').update(v).eq('id', id).select('id').single()
    : await supabase.from('challenge_teams').insert(v).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function updateTeams(ids: string[], change: 'delete' | { active: boolean }) {
  if (change === 'delete') throwIf(await supabase.from('challenge_teams').delete().in('id', ids).select('id'))
  else throwIf(await supabase.from('challenge_teams').update(change).in('id', ids).select('id'))
}

// The member app -------------------------------------------------------------------------------------------------------
export const myChallenges = () => rpc<MyChallenge[]>('my_challenges', {})
export const joinChallenge = (id: string) => rpc<string>('join_challenge', { p_challenge: id, p_accept: true })
export async function challengeTasks(id: string) {
  return throwIf(await supabase.from('challenge_tasks').select('*').eq('challenge_id', id).order('day', { nullsFirst: true }).order('seq')) as ChallengeTask[]
}

/** Which day of the challenge a date is (1 = the start day). */
export const challengeDay = (startIso: string, dateIso: string) =>
  Math.round((new Date(`${dateIso}T00:00:00`).getTime() - new Date(`${startIso}T00:00:00`).getTime()) / 86_400_000) + 1
/** The tasks for a day: every-day tasks and that day's own. */
export const tasksFor = (tasks: ChallengeTask[], day: number) => tasks.filter((t) => t.day === null || t.day === day)
