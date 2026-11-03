// Cloudflare Pages: website pages and files are served as they are. Any other address without a file extension
// (/login, /app/plan, /dashboard, /clients/…) is a page of the app, so it gets the app shell, which handles its own routes.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request)
    const url = new URL(request.url)
    const isPage = (request.method === 'GET' || request.method === 'HEAD') && !/\.[a-z0-9]{1,8}$/i.test(url.pathname)
    if (res.status !== 404 || !isPage) return res
    const shell = await env.ASSETS.fetch(new Request(new URL('/app', url), { headers: request.headers }))
    return new Response(request.method === 'HEAD' ? null : shell.body, { status: 200, headers: shell.headers })
  },
}
