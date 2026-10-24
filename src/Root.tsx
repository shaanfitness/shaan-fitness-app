import { Suspense, lazy, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { pageForPath } from './site/content'
import { SitePage } from './site/pages'

// The first split: website pages render straight away (and match their prebuilt HTML); the app — log in,
// member app, coach and doctor, the CRM — loads only when someone goes there.
const App = lazy(() => import('./App'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function Root() {
  const { pathname } = useLocation()
  const page = pageForPath(pathname)
  return (
    <>
      <ScrollToTop />
      {page ? <SitePage id={page} /> : (
        <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-ground text-[14px] text-muted" role="status">Loading…</div>}>
          <App />
        </Suspense>
      )}
    </>
  )
}
