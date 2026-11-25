import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { telLink, whatsappLink, type SiteInfo } from '../../db/site'
import { Crest, Ic } from '../art'
import { useCopy } from '../layout'
import { prefersReducedMotion } from '../motion'
import { Facts, KineticWord, LiveChip } from '../sections'
import type { Emblem } from './emblem'
import { chooseFx, type Fx } from './fx'
import { LOGO, LOGO_COLORS } from './logoPaths'

// The home page hero, as the website opened on 24 Oct: the headline and the two buttons on the left, the crest on the
// right with its turning ring, the SHAAN wordmark edge to edge and the studio's numbers under it. Inside the ring,
// where the drawn barbell was, the Shaan logo turns in 3D (emblem.ts, as on 3 Nov): it arrives out of the dark,
// follows the pointer, and as you scroll the hero away it turns to face you and the barbell burns, throwing sparks.
// Before the 3D loads, and wherever it can't run, the flat logo stands in its place.

/** The flat logo, transparent, from the traced vectors. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" role="img" aria-label="Shaan Fitness logo">
      <path d={LOGO.white} fill={LOGO_COLORS.white} fillRule="evenodd" />
      <path d={LOGO.red} fill={LOGO_COLORS.red} fillRule="evenodd" />
      <path d={LOGO.blue} fill={LOGO_COLORS.blue} fillRule="evenodd" />
    </svg>
  )
}

// How long things may take. Times count from the page's first request, as the loader's drawing does.
const LOADER_MIN = 2200     // the logo draws and fills
const LOADER_BUDGET = 5500  // the longest the loader waits for the 3D; after that the page opens and the 3D fades in
                            // as soon as it is ready (a slow network), as it always did
const LOADER_CAP = 7000     // the longest the loader shows at all, whatever the network does

/** What the opening loader and the 3D know about each other. */
interface Ctl {
  fx: Fx
  loader: boolean
  fonts: boolean
  code: boolean
  ready: boolean
  steady: boolean
  dropped: boolean
  /** The loader stopped waiting for the 3D: it fades in over the page when it's ready. */
  late: boolean
}

/** The opening loader: the logo draws itself while the page and, where it runs, the 3D load behind it. The count is
 *  real progress (fonts, the 3D's code, its first frame, a smooth frame rate), never faster than the drawing. Its own
 *  component, so counting doesn't redraw the whole hero sixty times a second. */
function Loader({ ctl, state, place, onDone }: { ctl: RefObject<Ctl>; state: 'wait' | 'on' | 'out'; place: string; onDone: () => void }) {
  const [pct, setPct] = useState(0)
  const active = state !== 'wait'
  useEffect(() => {
    if (!active) return
    let raf = 0, shown = 0, last = performance.now(), done = false
    const finish = () => { if (done) return; done = true; setPct(100); onDone() }
    const tick = (now: number) => {
      const c = ctl.current
      if (c.fx === '3d' && !c.steady && now > LOADER_BUDGET) c.late = true
      const real = c.fx === '2d' || c.dropped || c.late
        ? (c.fonts ? 100 : 80)
        : (c.fonts ? 25 : 0) + (c.code ? 35 : 0) + (c.ready ? 20 : 0) + (c.steady ? 20 : 0)
      // Eases by time, not by frame, so a slow phone gets there too.
      const goal = Math.min(real, Math.floor((now / LOADER_MIN) * 100))
      // Once everything is ready, the last stretch goes quickly.
      shown += (Math.max(shown, goal) - shown) * (1 - Math.exp(-(now - last) / (real >= 100 && now > LOADER_MIN ? 70 : 160)))
      last = now
      const n = Math.min(100, Math.round(shown + 0.4))
      setPct(n)
      if (n >= 100) finish(); else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const cap = window.setTimeout(() => { if (!ctl.current.steady) ctl.current.late = true; finish() }, Math.max(800, LOADER_CAP - performance.now()))
    return () => { cancelAnimationFrame(raf); window.clearTimeout(cap) }
  }, [ctl, onDone, active])
  // One element from the built page to the end, so the logo's drawing carries on when the loader takes over.
  return (
    <div className={`sf-loader${active ? ' is-on' : ''}${state === 'out' ? ' is-out' : ''}`} role="progressbar" aria-label="Shaan Fitness" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <LoaderArt />
      <span className="sf-loader-count">{pct}%</span>
      <span className="sf-loader-tag">{place}</span>
      <i className="sf-loader-line" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  )
}

function LoaderArt() {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <path d={LOGO.white} fill={LOGO_COLORS.white} stroke={LOGO_COLORS.white} fillRule="evenodd" />
      <path d={LOGO.red} fill={LOGO_COLORS.red} stroke={LOGO_COLORS.red} fillRule="evenodd" />
      <path d={LOGO.blue} fill={LOGO_COLORS.blue} stroke={LOGO_COLORS.blue} fillRule="evenodd" />
    </svg>
  )
}

/** The flat logo of the hero: it floats, turns with the scroll and a band of light sweeps across the metal now and
 *  then. It is the hero on devices that don't get the 3D, and stands in until the 3D is there. */
function PosterMark() {
  return (
    <svg className="sf-stage-poster" viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <clipPath id="sf-poster-clip">
          <path d={LOGO.white} clipRule="evenodd" /><path d={LOGO.red} clipRule="evenodd" /><path d={LOGO.blue} clipRule="evenodd" />
        </clipPath>
        <linearGradient id="sf-poster-shine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={LOGO.white} fill={LOGO_COLORS.white} fillRule="evenodd" />
      <path d={LOGO.red} fill={LOGO_COLORS.red} fillRule="evenodd" />
      <path d={LOGO.blue} fill={LOGO_COLORS.blue} fillRule="evenodd" />
      <g clipPath="url(#sf-poster-clip)" aria-hidden="true">
        <g transform="rotate(20 256 256)"><rect className="sf-shine" x="-260" y="-200" width="150" height="912" fill="url(#sf-poster-shine)" /></g>
      </g>
    </svg>
  )
}

export function HomeHero({ site }: { site: SiteInfo | null }) {
  const { c } = useCopy()
  const k = c.cine
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // live: the 3D is what you see. warm: it is running behind the loader, which hides it (no fades there).
  const [live, setLive] = useState(false)
  const [warm, setWarm] = useState(false)
  // The opening loader. It is in the built page, shown by CSS from the first paint when the page's head script asked
  // for it (first visit this session), so the logo starts drawing before any JavaScript has loaded; then this takes
  // over ('on'), and wipes it away ('out') once the page and the hero are ready, or removes it straight away when it
  // wasn't asked for.
  const [intro, setIntro] = useState<'wait' | 'off' | 'on' | 'out'>('wait')
  const ctl = useRef<Ctl>({ fx: '2d', loader: false, fonts: false, code: false, ready: false, steady: false, dropped: false, late: false })
  const emblemRef = useRef<Emblem | null>(null)
  const claimed = useRef(false)
  const timers = useRef<number[]>([])
  const wa = whatsappLink(site?.website.whatsapp || site?.studio.mobile, c.lead.waText)
  const tel = telLink(site?.studio.mobile)
  // The loader has finished: the page opens, on the 3D when it is ready behind the loader, arriving as the loader lifts.
  const onLoaderDone = useCallback(() => {
    const cur = ctl.current
    if (cur.fx === '3d' && cur.steady && !cur.dropped) { setLive(true); emblemRef.current?.replay() }
    cur.loader = false
    setIntro('out')
    // The loader has its own class by now, so lifting the page's black cover can't flash the page early.
    delete document.documentElement.dataset.intro
    timers.current.push(
      window.setTimeout(() => setIntro('off'), 1100),
      // No fades while the loader covered the page; back to normal once it has gone.
      window.setTimeout(() => setWarm(false), 1300),
    )
  }, [])

  useEffect(() => {
    const sec = section.current, cv = canvas.current
    if (!sec || !cv) return
    const html = document.documentElement
    const cur = ctl.current
    // Claimed once per page load (React runs effects twice in development; the second run carries on the loader).
    if (!claimed.current) {
      claimed.current = true
      const forced = new URLSearchParams(window.location.search).has('intro')
      if (html.dataset.intro === '1' || forced) {
        cur.loader = true
        setIntro('on')
        try { sessionStorage.setItem('sf.intro', '1') } catch { /* this visit only */ }
      } else setIntro('off')
    }
    document.fonts?.ready.then(() => { cur.fonts = true })
    if (!document.fonts) cur.fonts = true

    // Which hero this device gets (fx.ts), marked on the page for checking: <html data-fx="3d" data-fx-why="capable">.
    const choice = chooseFx()
    cur.fx = choice.fx
    html.dataset.fx = choice.fx
    html.dataset.fxWhy = choice.why

    let emblem: Emblem | null = null
    let cancelled = false, raf = 0, p = 0
    const read = () => {
      raf = 0
      // How far the hero has scrolled away: the 3D turns and the barbell lights over the first three quarters of it.
      const r = sec.getBoundingClientRect()
      p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.75)))
      emblem?.setProgress(p)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)

    // Back to the flat logo for this visit: no WebGL after all, or the device can't draw even the lightest scene.
    const drop = () => {
      if (cur.dropped) return
      cur.dropped = true
      html.dataset.fx = '2d'
      setWarm(false)
      setLive(false)
      const e = emblem
      emblem = null
      emblemRef.current = null
      timers.current.push(window.setTimeout(() => e?.stop(), 900))
    }

    if (cur.fx === '3d' && !cur.dropped) {
      if (cur.loader) setWarm(true)
      const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches
      const run = (startEmblem: typeof import('./emblem').startEmblem) => {
        if (cancelled || cur.dropped) return
        emblem = startEmblem(cv, {
          mobile, still: prefersReducedMotion(), framed: true,
          onReady: () => { cur.ready = true },
          onSteady: () => {
            if (cancelled || cur.dropped) return
            cur.steady = true
            // Behind the loader, the loader opens the page on it. Otherwise (a later visit, or the loader stopped
            // waiting) it fades in over the flat logo, arriving out of the dark.
            if (cur.loader && !cur.late) return
            setLive(true)
            emblem?.replay()
          },
          onFail: () => { if (!cancelled) drop() },
        })
        emblemRef.current = emblem
        if (!emblem) drop()
        else emblem.setProgress(p)
      }
      import('./emblem').then(({ startEmblem }) => {
        if (cancelled || cur.dropped) return
        cur.code = true
        // Behind the loader it starts straight away; otherwise when the page is idle, so it never holds up a tap.
        const ric = (window as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
        if (cur.loader || !ric) run(startEmblem)
        else ric(() => run(startEmblem), { timeout: 300 })
      }).catch(() => drop())
    }

    return () => {
      cancelled = true
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
      emblem?.stop()
      emblemRef.current = null
      // React runs this twice in development: start the next run clean.
      Object.assign(cur, { code: false, ready: false, steady: false, dropped: false, late: false })
    }
  }, [])

  const custom = site?.website.hero_title
  const photo = site?.website.hero_image_url
  return (
    <>
    {intro !== 'off' && <Loader ctl={ctl} state={intro} place={k.place} onDone={onLoaderDone} />}
    <section ref={section} className={`sf-hero sf-intro sf-home${live ? ' is-live' : ''}${warm ? ' is-warm' : ''}`} aria-labelledby="sf-h1">
      <div className="sf-hero-bg" />
      {photo && /^https:\/\//.test(photo) && <img className="sf-hero-photo" src={photo} alt="" />}
      <div className="sf-crest sf-stage" aria-hidden="true">
        <PosterMark />
        <canvas ref={canvas} className="sf-stage-canvas" />
        <Crest className="sf-stage-ring" bar={false} />
      </div>
      <div className="sf-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="sf-hero-body">
          {site ? <div style={{ '--d': 0 } as CSSProperties}><LiveChip site={site} /></div> : null}
          <h1 id="sf-h1" className="sf-h1" style={{ '--d': 1 } as CSSProperties}>{custom || `${k.h1a} ${k.h1b}`}</h1>
          <p className="sf-lede" style={{ '--d': 2 } as CSSProperties}>{site?.website.hero_text || k.lede}</p>
          <div className="sf-ctas" style={{ '--d': 3 } as CSSProperties}>
            <a href="#assessment" className="sf-btn sf-btn-red sf-magnet">{c.nav.trial}</a>
            {wa ? <a href={wa} target="_blank" rel="noreferrer" className="sf-btn sf-magnet">{Ic.whatsapp(18)}{c.nav.whatsapp}</a>
              : tel ? <a href={tel} className="sf-btn sf-magnet">{Ic.phone(18)}{c.nav.call}</a> : null}
          </div>
        </div>
        <KineticWord hostRef={section} />
        {site && <Facts site={site} />}
      </div>
    </section>
    </>
  )
}
