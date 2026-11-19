// Cloudflare Pages (www.shaanfitness.com): website pages and files are served as they are. Any other address without a file extension
// (/login, /app/plan, /dashboard, /clients/…) is a page of the app, so it gets the app shell, which handles its own routes.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
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
