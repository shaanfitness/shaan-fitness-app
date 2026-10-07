import { createClient } from '@supabase/supabase-js'

// The project URL and anon key are public by design: they only let the app ask
// for data, and the database's access rules decide what each login may see.
// Never put the service_role key or the database password in the app.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://lntcpgoazfddrcgferme.supabase.co'
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudGNwZ29hemZkZHJjZ2Zlcm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzA4MTAsImV4cCI6MjEwNjk0NjgxMH0.pdyQE75YK16EaVH8id2YqJH5K_4Px9MSiu5WstbiBzs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})
