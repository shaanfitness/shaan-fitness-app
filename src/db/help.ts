import { supabase } from '../lib/supabase'
import { throwIf } from './studio'

// Tutorial videos the owner links for staff or for members (help_videos).

export interface HelpVideo { id: string; studio_id: string; title: string; description: string | null; url: string; audience: 'staff' | 'members'; seq: number; active: boolean; created_at: string }

export async function helpVideos(studioId: string, audience?: 'staff' | 'members') {
  let q = supabase.from('help_videos').select('*').eq('studio_id', studioId)
  if (audience) q = q.eq('audience', audience)
  return throwIf(await q.order('seq').order('created_at')) as HelpVideo[]
}

/** The YouTube video id in a watch, share, shorts or embed link (others play on their own site). */
export function youtubeId(url: string) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/)
      return m ? m[2] : null
    }
  } catch { /* not a link */ }
  return null
}
