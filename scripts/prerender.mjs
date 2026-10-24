// Writes every website page as finished HTML after `vite build` (see the "build" script):
//   dist/index.html, dist/personal-training-kakinada/index.html, …  the website, with its title, description,
//                                                                   Open Graph tags and structured data
//   dist/app.html                                                   the app shell for everything else (/login, /app, /dashboard …)
//   dist/sitemap.xml, dist/robots.txt
// The pages use the gym's live public summary (plans, timings, coaches) read with the public anon key at build time.
// If it can't be read, the pages are still written, just without those details, and the build carries on.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const ssr = await import(pathToFileURL(path.join(root, 'dist-ssr', 'ssr.js')).href)
const origin = (process.env.SITE_URL || process.env.URL || ssr.DEFAULT_ORIGIN).replace(/\/+$/, '')

async function readSite() {
  if (process.env.PRERENDER_SITE_JSON) return JSON.parse(await readFile(process.env.PRERENDER_SITE_JSON, 'utf8'))
  const url = (process.env.VITE_SUPABASE_URL || ssr.SUPABASE_URL).replace(/\/+$/, '')
  const key = process.env.VITE_SUPABASE_ANON_KEY || ssr.SUPABASE_ANON_KEY
  try {
    const res = await fetch(`${url}/rest/v1/rpc/site_info`, {
      method: 'POST', body: '{}', signal: AbortSignal.timeout(20_000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
    return await res.json()
  } catch (e) {
    console.warn(`prerender: could not read the gym's details (${e.message}); writing the pages without them`)
    return null
  }
}

const site = await readSite()
const template = await readFile(path.join(dist, 'index.html'), 'utf8')
const json = (v) => JSON.stringify(v).replace(/[<\u2028\u2029]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'))

// The app shell: never indexed by search engines.
await writeFile(path.join(dist, 'app.html'), template.replace('<head>', '<head>\n    <meta name="robots" content="noindex" />'))

// The website's own font, preloaded so the headline paints in it straight away.
const assets = await readdir(path.join(dist, 'assets'))
const font = assets.find((f) => /^archivo-latin-wdth-normal.*\.woff2$/.test(f))
const preload = font ? `<link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin />` : ''

let count = 0
for (const id of ssr.PAGE_IDS) {
  const page = ssr.renderPage(id, site, origin)
  if (!page.html.includes('id="sf-h1"')) throw new Error(`prerender: ${id} rendered without its headline`)
  const html = template
    .replace('<html lang="en">', '<html lang="en" data-prerendered="1">')
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${page.head}\n    ${preload}\n  </head>`)
    // The app's theme fonts load without holding up the page.
    .replace(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)" \/>/, '<link rel="stylesheet" href="$1" media="print" onload="this.media=\'all\'" />')
    .replace('<div id="root"></div>', `<div id="root">${page.html}</div>\n    <script>window.__SITE__ = ${json(site)}</script>`)
  const file = ssr.PATHS[id] === '/' ? path.join(dist, 'index.html') : path.join(dist, ssr.PATHS[id].slice(1), 'index.html')
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
  count++
}

const today = new Date().toISOString().slice(0, 10)
const priority = { home: '1.0', personal: '0.9', group: '0.9', weightLoss: '0.9', plans: '0.9', timings: '0.8', contact: '0.8', coaches: '0.6', results: '0.6', about: '0.6' }
await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ssr.PAGE_IDS.map((id) => `  <url><loc>${origin}${ssr.PATHS[id]}</loc><lastmod>${today}</lastmod><priority>${priority[id] ?? '0.5'}</priority></url>`).join('\n')}
</urlset>
`)
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /app$
Disallow: /app/
Disallow: /coach$
Disallow: /coach/
Disallow: /doctor
Disallow: /dashboard
Disallow: /login
Disallow: /join
Disallow: /print/

Sitemap: ${origin}/sitemap.xml
`)
console.log(`prerender: ${count} pages for ${origin}${site ? '' : ' (without the gym\'s details)'}, sitemap.xml, robots.txt, app.html`)
process.exit(0)
