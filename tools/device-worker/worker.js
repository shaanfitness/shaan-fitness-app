// The studio's biometric device over plain HTTP (port 80), for devices whose menu has no HTTPS option.
// www.shaanfitness.com is served by Cloudflare Pages, which only answers HTTPS, so such a device talks to this Worker at
// device.shaanfitness.com instead. It does exactly what /iclock does on the website (public/_worker.js); keep the two the same.
// Set up once in Cloudflare: Workers & Pages → Create → Worker → paste this file → Deploy → Settings → Domains & Routes →
// Add → Custom domain: device.shaanfitness.com. If SSL/TLS → Edge Certificates → Always Use HTTPS is on, the device's
// plain HTTP is redirected and can't connect: turn it off (the website itself stays HTTPS-only either way).
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
    return new Response('Shaan Fitness device address', { status: 404, headers: { 'Content-Type': 'text/plain' } })
  },
}
