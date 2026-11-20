import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { telLink, whatsappLink, type SiteInfo } from '../../db/site'
import { Ic, Squad } from '../art'
import { offers } from '../data'
import { useCopy } from '../layout'
import { prefersReducedMotion } from '../motion'
import { LiveChip, sizeLine } from '../sections'
import type { Emblem } from './emblem'
import { chooseFx, rememberSlow, type Fx } from './fx'
import { LOGO, LOGO_COLORS } from './logoPaths'

// The home page hero: the Shaan logo as a cinematic scroll sequence in five chapters. The section is tall and the
// stage sticks to the screen while you scroll; the 3D emblem (emblem.ts) follows the scroll. Before the 3D loads,
// and wherever it can't run, the flat logo stands in with the same glow, and every chapter's words are in the page.

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

const CHAPTERS = 5

/** A heads-up display around the emblem: rings that turn with the scroll, a sweep, brackets and the chapter readout. */
function Hud({ ch, names }: { ch: number; names: string[] }) {
  const ticks = Array.from({ length: 72 }, (_, i) => i)
  return (
    <div className="sf-hud" aria-hidden="true" data-ch={ch}>
      <svg viewBox="-300 -300 600 600">
        <g className="sf-hud-outer">
          <circle r="286" className="sf-hud-faint" />
          {ticks.map((i) => <line key={i} x1="0" y1={-286} x2="0" y2={i % 6 === 0 ? -270 : -279} className={i % 6 === 0 ? 'sf-hud-tick is-long' : 'sf-hud-tick'} transform={`rotate(${i * 5})`} />)}
        </g>
        <g className="sf-hud-mid">
          <circle r="252" className="sf-hud-dash" />
          <path d="M -252 0 A 252 252 0 0 1 -178 -178" className="sf-hud-arc is-red" />
          <path d="M 252 0 A 252 252 0 0 1 178 178" className="sf-hud-arc is-blue" />
        </g>
        <g className="sf-hud-sweep"><path d="M0 0 L0 -262 A262 262 0 0 1 92 -245 Z" /></g>
        {[0, 90, 180, 270].map((r) => <path key={r} d="M -26 -298 L -40 -298 L -40 -284 M 26 -298 L 40 -298 L 40 -284" className="sf-hud-bracket" transform={`rotate(${r + 45})`} />)}
      </svg>
      <span className="sf-hud-read sf-hud-read-a"><b>{ch + 1} / {names.length}</b>{names[ch]}</span>
      <span className="sf-hud-read sf-hud-read-b">SF / KKD</span>
    </div>
  )
}

// How long things may take. Times count from the page's first request, as the loader's drawing does.
const LOADER_MIN = 2200     // the logo draws and fills
const LOADER_BUDGET = 5500  // the longest the loader waits for the 3D; after that the page opens on the flat logo
const LOADER_CAP = 7000     // the longest the loader shows at all, whatever the network does
const LATE = 4000           // no loader (a later visit): the 3D may still take over this long after the hero appears

/** What the opening loader and the 3D know about each other. */
interface Ctl {
  fx: Fx
  loader: boolean
  fonts: boolean
  code: boolean
  ready: boolean
  steady: boolean
  dropped: boolean
  /** Give up on the 3D for this visit (too slow to be ready in time). */
  giveUp: () => void
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
      if (c.fx === '3d' && !c.steady && !c.dropped && now > LOADER_BUDGET) c.giveUp()
      const real = c.fx === '2d' || c.dropped
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
    const cap = window.setTimeout(() => { if (!ctl.current.steady) ctl.current.giveUp(); finish() }, Math.max(800, LOADER_CAP - performance.now()))
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
    <svg className="sf-cine-poster" viewBox="0 0 512 512" role="img" aria-label="Shaan Fitness logo">
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

export function CineHero({ site }: { site: SiteInfo | null }) {
  const { c } = useCopy()
  const k = c.cine
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ch, setCh] = useState(0)
  // live: the 3D is what you see. warm: it is running behind the loader, which hides it (no fades there).
  const [live, setLive] = useState(false)
  const [warm, setWarm] = useState(false)
  // The opening loader. It is in the built page, shown by CSS from the first paint when the page's head script asked
  // for it (first visit this session), so the logo starts drawing before any JavaScript has loaded; then this takes
  // over ('on'), and wipes it away ('out') once the page and the hero are ready, or removes it straight away when it
  // wasn't asked for.
  const [intro, setIntro] = useState<'wait' | 'off' | 'on' | 'out'>('wait')
  const ctl = useRef<Ctl>({ fx: '2d', loader: false, fonts: false, code: false, ready: false, steady: false, dropped: false, giveUp: () => undefined })
  const emblemRef = useRef<Emblem | null>(null)
  const claimed = useRef(false)
  const timers = useRef<number[]>([])
  const wa = whatsappLink(site?.website.whatsapp || site?.studio.mobile, c.lead.waText)
  const tel = telLink(site?.studio.mobile)
  // The hero tells the story before anything is sold: the studio, small numbers, coaching, the plan, then the
  // assessment. No prices or plan names here; those come further down the page, once the visitor knows the studio.
  // Chapter two draws the ways to train as figures (one coach and how many people), from Settings › Website.
  const names = k.chapters
  const ways = offers(site).filter((o) => o.size != null).slice(0, 3)
  const beats = [
    { a: k.c2a, b: k.c2b, t: k.c2 },
    { a: k.c3a, b: k.c3b, t: k.c3 },
  ]

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
    let cancelled = false, raf = 0, p = 0, codeAt = 0
    const shownAt = performance.now()
    const read = () => {
      raf = 0
      const r = sec.getBoundingClientRect()
      const span = Math.max(1, r.height - window.innerHeight)
      p = Math.min(1, Math.max(0, -r.top / span))
      sec.style.setProperty('--p', p.toFixed(4))
      setCh(Math.min(CHAPTERS - 1, Math.floor(p * CHAPTERS * 0.999)))
      emblem?.setProgress(p)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)

    // Back to the flat logo for this visit; remembered when the device itself was the reason.
    const drop = (slow: boolean) => {
      if (cur.dropped) return
      cur.dropped = true
      if (slow) rememberSlow()
      html.dataset.fx = '2d'
      setWarm(false)
      setLive(false)
      const e = emblem
      emblem = null
      emblemRef.current = null
      timers.current.push(window.setTimeout(() => e?.stop(), 900))
    }
    // Out of time: slow if its code had arrived a while ago and it still wasn't running smoothly.
    cur.giveUp = () => drop(codeAt > 0 && performance.now() - codeAt > 3000)
    const heroOnScreen = () => { const r = sec.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight }

    if (cur.fx === '3d' && !cur.dropped) {
      if (cur.loader) setWarm(true)
      const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches
      const run = (startEmblem: typeof import('./emblem').startEmblem) => {
        if (cancelled || cur.dropped) return
        emblem = startEmblem(cv, {
          mobile, still: prefersReducedMotion(),
          onReady: () => { cur.ready = true },
          onSteady: (level) => {
            if (cancelled || cur.dropped) return
            cur.steady = true
            // Running, but only after stepping down twice or taking long to settle: the flat logo next time.
            if (level >= 2 || performance.now() - codeAt > 4500) rememberSlow()
            if (cur.loader) return
            // A later visit, no loader: take over from the flat logo while that still reads as the page opening
            // (or out of sight); otherwise this visit stays on the flat logo.
            if (performance.now() - shownAt <= LATE || !heroOnScreen()) { setLive(true); emblem?.replay() }
            else drop(false)
          },
          onFail: () => { if (!cancelled) drop(true) },
        })
        emblemRef.current = emblem
        if (!emblem) drop(false)
        else emblem.setProgress(p)
      }
      import('./emblem').then(({ startEmblem }) => {
        if (cancelled || cur.dropped) return
        // Arrived too late to be ready before the loader's time is up (a slow network): open on the flat logo.
        if (cur.loader && performance.now() > LOADER_BUDGET - 800) { cur.giveUp(); return }
        cur.code = true
        codeAt = performance.now()
        // Behind the loader it starts straight away; otherwise when the page is idle, so it never holds up a tap.
        const ric = (window as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
        if (cur.loader || !ric) run(startEmblem)
        else ric(() => run(startEmblem), { timeout: 300 })
      }).catch(() => drop(false))
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
      Object.assign(cur, { code: false, ready: false, steady: false, dropped: false })
    }
  }, [])

  const custom = site?.website.hero_title
  return (
    <>
    {intro !== 'off' && <Loader ctl={ctl} state={intro} place={k.place} onDone={onLoaderDone} />}
    <section ref={section} className={`sf-cine${live ? ' is-live' : ''}${warm ? ' is-warm' : ''}`} style={{ '--n': CHAPTERS } as CSSProperties} aria-labelledby="sf-h1">
      <div className="sf-cine-stage">
        <div className="sf-cine-glow" aria-hidden="true" />
        <PosterMark />
        <canvas ref={canvas} className="sf-cine-canvas" aria-hidden="true" />
        <div className="sf-cine-vignette" aria-hidden="true" />

        <div className="sf-wrap sf-cine-hud">
          <span className="sf-cine-tag">{k.place}</span>
          {site && <LiveChip site={site} />}
        </div>

        <div className="sf-wrap sf-cine-copy">
          <div className={`sf-cine-ch ${ch === 0 ? 'is-on' : ''}`}>
            <h1 id="sf-h1" className="sf-cine-title">{custom ? custom : <><span>{k.h1a}</span> <em>{k.h1b}</em></>}</h1>
            <p>{site?.website.hero_text || k.lede}</p>
          </div>
          <div className={`sf-cine-ch ${ch === 1 ? 'is-on' : ''}`}>
            <h2 className="sf-cine-title"><span>{k.s3a}</span> <em className="is-blue">{k.s3b}</em></h2>
            <p>{k.s3}</p>
            {ways.length > 0 && (
              <ul className="sf-cine-ways">
                {ways.map((o) => {
                  const size = sizeLine(o, c)!
                  return <li key={o.name}><Squad size={o.size!} label={size} coach={c.subs.coach} /><span>{size}</span></li>
                })}
              </ul>
            )}
          </div>
          {beats.map((b, i) => (
            <div key={b.a} className={`sf-cine-ch ${ch === i + 2 ? 'is-on' : ''}`}>
              <h2 className="sf-cine-title"><span>{b.a}</span> <em className={i === 1 ? 'is-blue' : undefined}>{b.b}</em></h2>
              <p>{b.t}</p>
            </div>
          ))}
          <div className={`sf-cine-ch ${ch === 4 ? 'is-on' : ''}`}>
            <h2 className="sf-cine-title"><span>{k.c4a}</span> <em>{k.c4b}</em></h2>
            <p>{k.c4}</p>
            {/* Only reachable by keyboard once the chapter is on screen; until then Tab skips these invisible buttons. */}
            <div className="sf-ctas">
              <a href="#assessment" tabIndex={ch === 4 ? undefined : -1} className="sf-btn sf-btn-red sf-magnet">{c.nav.trial}</a>
              {wa && <a href={wa} tabIndex={ch === 4 ? undefined : -1} target="_blank" rel="noreferrer" className="sf-btn sf-btn-glass sf-magnet">{Ic.whatsapp(18)}{c.nav.whatsapp}</a>}
              {tel && <a href={tel} tabIndex={ch === 4 ? undefined : -1} className="sf-btn sf-btn-glass sf-magnet">{Ic.phone(18)}{c.nav.call}</a>}
            </div>
          </div>
        </div>

        <Hud ch={ch} names={names} />

        <div className="sf-wrap sf-cine-foot">
          <ol className="sf-cine-steps" aria-hidden="true">
            {names.map((name, i) => <li key={i} className={ch === i ? 'is-on' : ch > i ? 'is-past' : ''}><b>{i + 1}</b>{name}</li>)}
          </ol>
          <div className="sf-cine-bar" aria-hidden="true"><i /></div>
          <span className={`sf-cine-cue ${ch === 0 ? 'is-on' : ''}`} aria-hidden="true">{k.scroll}<i /></span>
        </div>
      </div>
    </section>
    </>
  )
}
