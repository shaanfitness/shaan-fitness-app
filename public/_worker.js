// Cloudflare Pages (www.shaanfitness.com): website pages and files are served as they are. Any other address without a file extension
// (/login, /app/plan, /dashboard, /clients/…) is a page of the app, so it gets the app shell, which handles its own routes.

// The studio's biometric device (eSSL / ZKTeco "push", also called ADMS) talks to /iclock/…: it says hello, uploads
// punches and its users, asks for commands and reports what it did. Each request goes to a database function
// (supabase/migrations/…_device_push.sql), which only acts for devices added in the Biometric Manager. The project URL
// and key are the app's public ones; they can do nothing the database's rules don't allow.
const SUPABASE_URL = 'https://lntcpgoazfddrcgferme.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudGNwZ29hemZkZHJjZ2Zlcm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzA4MTAsImV4cCI6MjEwNjk0NjgxMH0.pdyQE75YK16EaVH8id2YqJH5K_4Px9MSiu5WstbiBzs'

async function rpc(env, fn, args) {
  const base = env?.SUPABASE_URL || SUPABASE_URL
  const key = env?.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
  const res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

async function iclock(request, env, url) {
  const q = Object.fromEntries(url.searchParams)
  const sn = q.SN || q.sn || ''
  // Some eSSL firmware adds ".aspx" (eTimeTrackLite's server ran on IIS): the same requests.
  const path = url.pathname.replace(/\.aspx$/i, '').replace(/\/+$/, '').toLowerCase()
  const text = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  try {
    if (path === '/iclock/cdata' && request.method !== 'POST') {
      // Hello: the device's settings; a device that wasn't added still gets an OK, so it keeps trying (nothing is kept).
      return text((await rpc(env, 'device_hello', { p_serial: sn, p_query: q })) ?? 'OK')
    }
    if (path === '/iclock/cdata') {
      const body = await request.text()
      return text(await rpc(env, 'device_upload', { p_serial: sn, p_table: q.table || q.Table || '', p_body: body, p_stamp: q.Stamp || q.stamp || null }))
    }
    if (path === '/iclock/getrequest') return text(await rpc(env, 'device_poll', { p_serial: sn, p_query: q }))
    if (path === '/iclock/devicecmd') return text(await rpc(env, 'device_report', { p_serial: sn, p_body: await request.text() }))
    return text('OK')   // ping, file uploads and anything else the firmware sends
  } catch (e) {
    console.error('iclock', path, sn, String(e))
    return text('ERROR', 500)   // the device tries again after ErrorDelay; nothing it sent is lost
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (/^\/iclock(\/|$)/i.test(url.pathname)) return iclock(request, env, url)
    // One address for everyone: shaanfitness.com goes to www.shaanfitness.com.
    if (url.hostname === 'shaanfitness.com') {
      url.hostname = 'www.shaanfitness.com'
      return Response.redirect(url.toString(), 301)
    }
    // The Dandiya Nights lucky draw stays on its own site, exactly as it was (people registered there). This address
    // only points to it, keeping the rest of the path (/live, /admin, /display) and the query.
    if (url.pathname === '/luckydraw' || url.pathname.startsWith('/luckydraw/')) {
      const rest = url.pathname.slice('/luckydraw'.length).replace(/^\//, '')
      return Response.redirect(`https://shaanfitness.github.io/luckydraw/${rest}${url.search}`, 302)
    }
    const res = await env.ASSETS.fetch(request)
    const isPage = (request.method === 'GET' || request.method === 'HEAD') && !/\.[a-z0-9]{1,8}$/i.test(url.pathname)
    if (res.status !== 404 || !isPage) return res
    const shell = await env.ASSETS.fetch(new Request(new URL('/app', url), { headers: request.headers }))
    return new Response(request.method === 'HEAD' ? null : shell.body, { status: 200, headers: shell.headers })
  },
}
