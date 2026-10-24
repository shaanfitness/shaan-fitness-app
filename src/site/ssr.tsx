import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../i18n'
import Root from '../Root'
import { AuthProvider } from '../auth'
import { ThemeProvider } from '../theme'
import { ToastProvider } from '../components/toast'
import type { SiteInfo } from '../db/site'
import { PAGE_IDS, PATHS, type PageId } from './content'
import { DEFAULT_ORIGIN, headFor, headHtml } from './seo'
export { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/supabase'

// Used only by the build (scripts/prerender.mjs): each website page as finished HTML, so search engines and
// link previews see the full page and visitors see it before the JavaScript loads. The tree matches main.tsx,
// so the browser picks the page up where the HTML left off.

export { DEFAULT_ORIGIN, PAGE_IDS, PATHS }
export type { PageId }

export function renderPage(id: PageId, site: SiteInfo | null, origin: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, enabled: false } } })
  qc.setQueryData(['site'], site)
  const html = renderToString(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <StaticRouter location={PATHS[id]}>
              <Root />
            </StaticRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
  const head = headFor(id, site, origin)
  return { html, head: headHtml(head), title: head.title }
}
