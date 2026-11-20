import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig'

// The website's public calls (the gym's details, the assessment form) go straight to the database's web API with
// the public key, so a visitor's phone doesn't download the full database client just to read a page.

/** Calls a public database function. Errors carry the database's own message (for example "Enter your name."). */
export async function publicRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) as unknown : null
  if (!res.ok) throw new Error((body as { message?: string } | null)?.message ?? `HTTP ${res.status}`)
  return body as T
}

/** The full database client, loaded the first time something needs it (signing in, the app, the dashboard). */
export const getSupabase = () => import('./supabase').then((m) => m.supabase)
