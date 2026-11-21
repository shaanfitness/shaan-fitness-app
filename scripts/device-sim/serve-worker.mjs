// Runs the website's edge worker (public/_worker.js) on a local port, pointed at the local database, so the device
// simulator (scripts/e2e-device.py) can talk to it exactly as the studio's biometric device talks to Cloudflare.
//   node scripts/device-sim/serve-worker.mjs <port> <supabase url> <anon key> [worker file]
// The worker file defaults to the website's; tools/device-worker/worker.js is the plain-HTTP device address.
import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [port = '8787', SUPABASE_URL = 'http://127.0.0.1:54321', SUPABASE_ANON_KEY = '', file = 'public/_worker.js'] = process.argv.slice(2)
const worker = (await import(pathToFileURL(path.resolve(file)).href)).default
const env = { SUPABASE_URL, SUPABASE_ANON_KEY, ASSETS: { fetch: async () => new Response('not found', { status: 404 }) } }

http.createServer(async (req, res) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body: req.method === 'GET' ? undefined : body })
  const out = await worker.fetch(request, env)
  res.writeHead(out.status, Object.fromEntries(out.headers))
  res.end(Buffer.from(await out.arrayBuffer()))
}).listen(Number(port), '127.0.0.1', () => console.log(`worker on http://127.0.0.1:${port}`))
