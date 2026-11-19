import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { telLink, whatsappLink, type SiteInfo } from '../../db/site'
import { Ic } from '../art'
import { PATHS } from '../content'
import { useCopy } from '../layout'
import { prefersReducedMotion } from '../motion'
import { LiveChip } from '../sections'
import { LOGO, LOGO_COLORS } from './logoPaths'

// The home page hero: the Shaan logo as a cinematic scroll sequence in four chapters. The section is tall and the
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

const CHAPTERS = 4

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
      <span className="sf-hud-read sf-hud-read-a"><b>{String(ch + 1).padStart(2, '0')}</b>{names[ch]}</span>
      <span className="sf-hud-read sf-hud-read-b">SF / KKD</span>
    </div>
  )
}

export function CineHero({ site }: { site: SiteInfo | null }) {
  const { c } = useCopy()
  const k = c.cine
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ch, setCh] = useState(0)
  const [live, setLive] = useState(false)
  // The opening loader. It is in the built page, shown by CSS from the first paint when the page's head script asked
  // for it (first visit this session), so the logo starts drawing before any JavaScript has loaded; then this takes
  // over ('on'), counts to 100 and wipes away ('out'), or removes it straight away when it wasn't asked for.
  const [intro, setIntro] = useState<'wait' | 'off' | 'on' | 'out'>('wait')
  const [pct, setPct] = useState(0)
  const progress = useRef({ fonts: false, code: false, ready: false })
  const claimed = useRef(false)
  const loaderDone = useRef(false)
  const wa = whatsappLink(site?.website.whatsapp || site?.studio.mobile, c.lead.waText)
  const tel = telLink(site?.studio.mobile)

  useEffect(() => {
    // Claimed once per page load (React runs effects twice in development; the second run carries on the loader).
    if (!claimed.current) {
      const html = document.documentElement
      const forced = new URLSearchParams(window.location.search).has('intro')
      if (html.dataset.intro !== '1' && !forced) { loaderDone.current = true; setIntro('off'); return }
      claimed.current = true
      setIntro('on')
      try { sessionStorage.setItem('sf.intro', '1') } catch { /* this visit only */ }
    }
    document.fonts?.ready.then(() => { progress.current.fonts = true })
    let raf = 0, shown = 0, last = performance.now(), done = false, outT = 0
    const finish = () => {
      if (done) return
      done = true
      setPct(100)
      setIntro('out')
      // The loader has its own class by now, so lifting the page's black cover can't flash the page early.
      delete document.documentElement.dataset.intro
      outT = window.setTimeout(() => { loaderDone.current = true; setIntro('off') }, 1100)
    }
    const tick = (now: number) => {
      const pr = progress.current
      // The loader waits for the fonts only; the 3D starts once it has gone (a slow graphics chip can't hold it up).
      const real = pr.fonts ? 100 : 80
      // Timed from the page's first request, like the drawing: at least 2.2 seconds, the time the logo takes to
      // draw and fill. The counter eases by time, not by frame, so a slow phone gets there too.
      const goal = Math.min(real, Math.floor((now / 2200) * 100))
      shown += (Math.max(shown, goal) - shown) * (1 - Math.exp(-(now - last) / 160))
      last = now
      const n = Math.min(100, Math.round(shown + 0.4))
      setPct(n)
      if (n >= 100) finish(); else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Never more than 7 seconds, whatever the network or the device does.
    const cap = window.setTimeout(finish, Math.max(800, 7000 - performance.now()))
    return () => { cancelAnimationFrame(raf); window.clearTimeout(cap); window.clearTimeout(outT) }
  }, [])

  useEffect(() => {
    const sec = section.current, cv = canvas.current
    if (!sec || !cv) return
    const still = prefersReducedMotion()
    let emblem: { setProgress: (p: number) => void; stop: () => void } | null = null
    let cancelled = false, raf = 0, p = 0
    const read = () => {
      raf = 0
      const r = sec.getBoundingClientRect()
      const span = Math.max(1, r.height - window.innerHeight)
      p = still ? 0 : Math.min(1, Math.max(0, -r.top / span))
      sec.style.setProperty('--p', p.toFixed(4))
      setCh(Math.min(CHAPTERS - 1, Math.floor(p * CHAPTERS * 0.999)))
      emblem?.setProgress(p)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches
    const begin = () => import('./emblem').then(({ startEmblem }) => {
      progress.current.code = true
      if (cancelled) return
      emblem = startEmblem(cv, {
        mobile, still,
        onReady: () => { progress.current.ready = true; if (!cancelled) setLive(true) },
        // Too slow even at the lowest quality: back to the flat logo, and the 3D stops using the battery.
        onFail: () => { if (cancelled) return; setLive(false); const e = emblem; emblem = null; window.setTimeout(() => e?.stop(), 900) },
      })
      if (!emblem) progress.current.ready = true
      emblem?.setProgress(p)
    }).catch(() => { progress.current.code = progress.current.ready = true })
    const ric = (window as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    // Wait for the opening loader to finish, then load the 3D when the page is idle.
    let waitT = 0
    const whenFree = () => { if (cancelled) return; if (!loaderDone.current) { waitT = window.setTimeout(whenFree, 200); return } begin() }
    const id = ric ? ric(whenFree, { timeout: 500 }) : window.setTimeout(whenFree, 120)
    return () => {
      cancelled = true
      const cic = (window as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback
      if (ric && cic) cic(id); else window.clearTimeout(id)
      window.clearTimeout(waitT)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
      emblem?.stop()
    }
  }, [])

  const custom = site?.website.hero_title
  return (
    <>
    {intro !== 'off' && (
      <div className={`sf-loader${intro === 'on' || intro === 'out' ? ' is-on' : ''}${intro === 'out' ? ' is-out' : ''}`} role="progressbar" aria-label="Shaan Fitness" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <path d={LOGO.white} fill={LOGO_COLORS.white} stroke={LOGO_COLORS.white} fillRule="evenodd" />
          <path d={LOGO.red} fill={LOGO_COLORS.red} stroke={LOGO_COLORS.red} fillRule="evenodd" />
          <path d={LOGO.blue} fill={LOGO_COLORS.blue} stroke={LOGO_COLORS.blue} fillRule="evenodd" />
        </svg>
        <span className="sf-loader-count">{pct}%</span>
        <span className="sf-loader-tag">{k.place}</span>
        <i className="sf-loader-line" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    )}
    <section ref={section} className={`sf-cine ${live ? 'is-live' : ''}`} style={{ '--n': CHAPTERS } as CSSProperties} aria-labelledby="sf-h1">
      <div className="sf-cine-stage">
        <div className="sf-cine-glow" aria-hidden="true" />
        <LogoMark className="sf-cine-poster" />
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
            <div className="sf-ctas">
              <Link to={PATHS.plans} viewTransition className="sf-btn sf-btn-red sf-magnet">{c.common.seePlans}</Link>
              <a href="#enquire" className="sf-btn sf-btn-glass sf-magnet">{c.nav.trial}</a>
            </div>
          </div>
          <div className={`sf-cine-ch ${ch === 1 ? 'is-on' : ''}`}>
            <h2 className="sf-cine-title"><span>{k.c2a}</span> <em>{k.c2b}</em></h2>
            <p>{k.c2}</p>
          </div>
          <div className={`sf-cine-ch is-right ${ch === 2 ? 'is-on' : ''}`}>
            <h2 className="sf-cine-title"><span>{k.c3a}</span> <em className="is-blue">{k.c3b}</em></h2>
            <p>{k.c3}</p>
          </div>
          <div className={`sf-cine-ch ${ch === 3 ? 'is-on' : ''}`}>
            <h2 className="sf-cine-title"><span>{k.c4a}</span> <em>{k.c4b}</em></h2>
            <p>{k.c4}</p>
            <div className="sf-ctas">
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="sf-btn sf-btn-red sf-magnet">{Ic.whatsapp(18)}{c.nav.whatsapp}</a>}
              {tel && <a href={tel} className="sf-btn sf-btn-glass sf-magnet">{Ic.phone(18)}{c.nav.call}</a>}
              <a href="#enquire" className="sf-btn sf-btn-glass sf-magnet">{c.nav.trial}</a>
            </div>
          </div>
        </div>

        <Hud ch={ch} names={k.chapters} />

        <div className="sf-wrap sf-cine-foot">
          <ol className="sf-cine-steps" aria-hidden="true">
            {k.chapters.map((name, i) => <li key={name} className={ch === i ? 'is-on' : ch > i ? 'is-past' : ''}><b>{String(i + 1).padStart(2, '0')}</b>{name}</li>)}
          </ol>
          <div className="sf-cine-bar" aria-hidden="true"><i /></div>
          <span className={`sf-cine-cue ${ch === 0 ? 'is-on' : ''}`} aria-hidden="true">{k.scroll}<i /></span>
        </div>
      </div>
    </section>
    </>
  )
}
