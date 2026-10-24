import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles.css'
import i18n from './i18n'
import Root from './Root'
import { AuthProvider } from './auth'
import { ThemeProvider } from './theme'
import { ToastProvider } from './components/toast'
import { registerServiceWorker } from './lib/install'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
})

// Website pages arrive as finished HTML with the gym's details from the build (scripts/prerender.mjs).
// Those details seed the page, marked old so the live ones load straight after.
const seed = (window as { __SITE__?: unknown }).__SITE__
if (seed !== undefined) queryClient.setQueryData(['site'], seed, { updatedAt: 0 })

registerServiceWorker()

const tree = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <Root />
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)

const root = document.getElementById('root')!
// The HTML is in English: pick it up where it is, unless this visitor reads the site in Telugu.
if (document.documentElement.dataset.prerendered === '1' && root.firstElementChild && i18n.language === 'en') hydrateRoot(root, tree)
else createRoot(root).render(tree)
