import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig'

// The database client for signed-in work (the app, the dashboard). The website's public pages don't load it:
// they use lib/rest.ts. The URL and public key live in supabaseConfig.ts.
export { SUPABASE_ANON_KEY, SUPABASE_URL }

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})
