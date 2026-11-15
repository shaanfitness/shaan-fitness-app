import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { telLink, whatsappLink, type SiteInfo, type SiteOffer } from '../../db/site'
import { Ic, Squad } from '../art'
import { fill } from '../content'
import { offerTier, offers } from '../data'
import { useCopy } from '../layout'
import { prefersReducedMotion } from '../motion'
import { LiveChip, OfferPrice, offerNote, sizeLine } from '../sections'
import { LOGO, LOGO_COLORS } from './logoPaths'

// The home page hero: the logo as a machine, rendered ahead of time in Blender, on a black stage. On the first visit
// it assembles by itself after the loader: the blue core spins up, the barbell slides in, the ring, the S and the F
// lock on, out of white smoke. From the finished emblem on, scrolling drives one continuous shot with five chapters:
// the studio, then one chapter for each subscription (a glide over the red plate, the letters opening on the blue
// core, the emblem as blue wireframe at dusk), then sunrise and the free trial. The subscriptions' names, group
// sizes and prices come from the dashboard; each group size is drawn as that many figures.
// It is drawn on a plain 2D canvas (no WebGL), so it plays the same on every phone. The finished emblem is an
// ordinary image in the page, so something good shows before any script runs, and every chapter's words are in the
// page for search and screen readers.

export const FILM_FRAMES = 192
/** The logo is complete here; scrolling starts from this frame and the assembly before it plays by itself. */
const HOME = 40
/** Frames where each chapter starts (from tools/film/emblem.py: close-up from 80, core from 108, dusk from 138, sunrise from 158). */
const CHAPTER_AT = [36, 80, 111, 141, 166]
const INTRO_MS = 2600
const frameSrc = (fmt: 'land' | 'port', i: number) => `/film/${fmt}/${String(i).padStart(3, '0')}.webp`

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

/** Loading order: the emblem, then (first visit) the assembly, then a spread of keyframes so scrubbing works early,
 *  then the gaps fill in. */
function loadOrder(n: number, intro: boolean, light: boolean) {
  const seen = new Set<number>(); const out: number[] = []
  const add = (i: number) => { if (i >= 0 && i < n && !seen.has(i)) { seen.add(i); out.push(i) } }
  add(HOME)
  if (intro) for (let i = 0; i < HOME; i++) add(i)
  for (const step of light ? [32, 16, 8] : [32, 16, 8, 4, 2, 1]) for (let i = HOME; i < n; i += step) add(i)
  add(n - 1)
  for (let i = HOME; i < n; i++) if (!light) add(i)
  return out
}

export function FilmHero({ site }: { site: SiteInfo | null }) {
  const { c } = useCopy()
  const k = c.film
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ch, setCh] = useState(0)
  const [live, setLive] = useState(false)
  // The opening loader. It is in the built page, shown by CSS from the first paint when the page's head script asked
  // for it (first visit this session), so the logo starts drawing before any JavaScript has loaded; then this takes
  // over ('on'), counts to 100 and wipes away ('out'), or removes it straight away when it wasn't asked for.
  const [intro, setIntro] = useState<'wait' | 'off' | 'on' | 'out'>('wait')
  const [pct, setPct] = useState(0)
  const progress = useRef({ fonts: false, home: false, intro: 0 })
  const claimed = useRef(false)
  // The assembly: 'no' (repeat visit), 'wait' (loader up), 'play' (running), 'done'
  const assembly = useRef<'no' | 'wait' | 'play' | 'snap' | 'done'>('no')
  const kickRef = useRef<() => void>(() => {})
  const wa = whatsappLink(site?.website.whatsapp || site?.studio.mobile, c.lead.waText)
  const tel = telLink(site?.studio.mobile)
  // Chapters two to four: the first three subscriptions; a line about the method fills a slot the owner left empty.
  const list = offers(site)
  const slots: (SiteOffer | null)[] = [0, 1, 2].map((i) => list[i] ?? null)
  const names = [k.home, ...slots.map((o, i) => o?.name ?? `${k.spare[i].a} ${k.spare[i].b}`), k.trial]

  useEffect(() => {
    if (!claimed.current) {
      const html = document.documentElement
      const forced = new URLSearchParams(window.location.search).has('intro')
      if (html.dataset.intro !== '1' && !forced) { setIntro('off'); return }
      claimed.current = true
      assembly.current = 'wait'
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
      delete document.documentElement.dataset.intro
      // the assembly plays as the loader wipes away, if its frames are in; otherwise the finished emblem shows
      if (assembly.current === 'wait') { assembly.current = progress.current.intro >= HOME ? 'play' : 'snap'; kickRef.current() }
      outT = window.setTimeout(() => setIntro('off'), 1100)
    }
    const tick = (now: number) => {
      const pr = progress.current
      const real = (pr.fonts ? 20 : 0) + (pr.home ? 20 : 0) + Math.round((60 * pr.intro) / HOME)
      // Timed from the page's first request, like the drawing: at least 2.2 seconds. Eased by time, not by frame.
      const goal = Math.min(real, Math.floor((now / 2200) * 100))
      shown += (Math.max(shown, goal) - shown) * (1 - Math.exp(-(now - last) / 160))
      last = now
      const n = Math.min(100, Math.round(shown + 0.4))
      setPct(n)
      if (n >= 100) finish(); else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const cap = window.setTimeout(finish, Math.max(800, 7000 - performance.now()))
    return () => { cancelAnimationFrame(raf); window.clearTimeout(cap); window.clearTimeout(outT) }
  }, [])

  useEffect(() => {
    const sec = section.current, cv = canvas.current
    if (!sec || !cv) return
    const still = prefersReducedMotion()
    const portrait = window.innerWidth / window.innerHeight < 0.8
    const fmt = portrait ? 'port' : 'land'
    const conn = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    const light = !!conn && (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType ?? ''))
    const n = FILM_FRAMES
    const imgs: (HTMLImageElement | null)[] = new Array(n).fill(null)
    const ctx = cv.getContext('2d')
    let target = HOME, shown = HOME, drawn = -1, raf = 0, last = performance.now(), cancelled = false, sized = false
    let playStart = 0, startY = 0

    const near = (i: number) => {
      for (let d = 0; d < n; d++) {
        if (i - d >= 0 && imgs[i - d]) return i - d
        if (i + d < n && imgs[i + d]) return i + d
      }
      return -1
    }
    const draw = (f: number) => {
      if (!ctx) return
      const a = Math.floor(f), t = f - a
      const ia = near(a)
      if (ia < 0) return
      const img = imgs[ia]!
      if (!sized) { cv.width = img.naturalWidth; cv.height = img.naturalHeight; sized = true }
      ctx.globalAlpha = 1
      ctx.drawImage(img, 0, 0, cv.width, cv.height)
      // Between two loaded neighbours, blend: motion stays smooth between frames.
      if (ia === a && a + 1 < n && imgs[a + 1] && t > 0.02) { ctx.globalAlpha = t; ctx.drawImage(imgs[a + 1]!, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1 }
      drawn = f
    }
    const readScroll = () => {
      const r = sec.getBoundingClientRect()
      const span = Math.max(1, r.height - window.innerHeight)
      const p = still ? 0 : Math.min(1, Math.max(0, -r.top / span))
      sec.style.setProperty('--p', p.toFixed(4))
      target = HOME + p * (n - 1 - HOME)
    }
    const report = (f: number) => {
      const fi = Math.round(f)
      let chapter = -1
      for (let i = 0; i < CHAPTER_AT.length; i++) if (fi >= CHAPTER_AT[i]) chapter = i
      setCh(Math.max(0, chapter))
      sec.classList.toggle('is-assembling', fi < CHAPTER_AT[0])
    }
    const loop = (now: number) => {
      raf = 0
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      if (assembly.current === 'wait') {
        shown = 0                                   // held on the first frame behind the loader
      } else if (assembly.current === 'snap') {
        shown = target; assembly.current = 'done'   // its frames didn't arrive in time: straight to the emblem
      } else if (assembly.current === 'play') {
        if (!playStart) { playStart = now; startY = window.scrollY }
        const u = Math.min(1, (now - playStart) / INTRO_MS)
        shown = HOME * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2)
        // scrolling during the assembly ends it
        if (u >= 1 || Math.abs(window.scrollY - startY) > 40) { assembly.current = 'done'; readScroll() }
      } else {
        shown += (target - shown) * (1 - Math.exp(-dt * 10))
        if (Math.abs(target - shown) < 0.01) shown = target
      }
      if (Math.abs(shown - drawn) > 0.004) draw(shown)
      report(shown)
      if (assembly.current === 'play' || (assembly.current !== 'wait' && shown !== target)) raf = requestAnimationFrame(loop)
    }
    const kick = () => {
      if (assembly.current !== 'play') readScroll()
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop) }
    }
    kickRef.current = kick
    readScroll()
    if (assembly.current === 'wait') shown = 0       // first visit: the assembly starts from its first frame
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)

    const withIntro = assembly.current === 'wait' && !still
    const order = still ? [HOME] : loadOrder(n, withIntro, light)
    let next = 0
    const pump = () => {
      if (cancelled || next >= order.length) return
      const i = order[next++]
      const img = new Image()
      img.decoding = 'async'
      img.src = frameSrc(fmt, i)
      const done = () => {
        if (cancelled) return
        imgs[i] = img
        if (i === HOME) { progress.current.home = true; setLive(true) }
        if (i < HOME) progress.current.intro++
        if (Math.abs(i - Math.round(shown)) < 3 || i === HOME) { drawn = -1; kick() }
        pump()
      }
      img.decode().then(done, () => { if (img.complete && img.naturalWidth) done(); else pump() })
    }
    for (let w = 0; w < 4; w++) pump()
    if (!withIntro) { assembly.current = 'done' }
    kick()
    return () => {
      cancelled = true
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      cancelAnimationFrame(raf)
    }
  }, [])

  const custom = site?.website.hero_title
  const off = (i: number) => (ch === i ? undefined : -1)
  const count = (i: number) => <p className="sf-film-count" aria-hidden="true"><b>{i + 1}</b> / {names.length}<span>{names[i]}</span></p>
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
    <section ref={section} className={`sf-film ${live ? 'is-live' : ''}`} data-ch={ch} style={{ '--n': 5.5 } as CSSProperties} aria-labelledby="sf-h1">
      <div className="sf-film-stage">
        <picture className="sf-film-poster">
          <source media="(max-aspect-ratio: 4/5)" srcSet={frameSrc('port', HOME)} width={720} height={1280} />
          <img src={frameSrc('land', HOME)} width={1280} height={720} alt="" fetchPriority="high" decoding="async" />
        </picture>
        <canvas ref={canvas} className="sf-film-canvas" aria-hidden="true" />
        <div className="sf-film-shade" aria-hidden="true" />

        <div className="sf-wrap sf-film-hud">
          <span className="sf-film-place">{k.place}</span>
          {site && <LiveChip site={site} />}
        </div>

        <div className="sf-wrap sf-film-copy">
          <div className={`sf-film-ch ${ch === 0 ? 'is-on' : ''}`}>
            {count(0)}
            <h1 id="sf-h1" className="sf-film-title">{custom || <>{k.h1a} <em>{k.h1b}</em></>}</h1>
            <p>{site?.website.hero_text || k.lede}</p>
            <div className="sf-ctas">
              <a href="#free-trial" className="sf-btn sf-btn-red sf-magnet" tabIndex={off(0)}>{c.nav.trial}</a>
              <a href="#subscriptions" className="sf-btn sf-btn-glass sf-magnet" tabIndex={off(0)}>{c.common.seePlans}</a>
            </div>
          </div>
          {slots.map((o, i) => {
            const n = i + 1
            if (!o) {
              const sp = k.spare[i]
              return (
                <div key={n} className={`sf-film-ch ${ch === n ? 'is-on' : ''}`}>
                  {count(n)}
                  <h2 className="sf-film-title">{sp.a} <em>{sp.b}</em></h2>
                  <p>{sp.t}</p>
                </div>
              )
            }
            const cut = o.name.indexOf(' ')
            const note = offerNote(o, c)
            const size = sizeLine(o, c)
            return (
              <div key={n} className={`sf-film-ch ${ch === n ? 'is-on' : ''}`}>
                {count(n)}
                <h2 className="sf-film-title">{cut < 0 ? o.name : <>{o.name.slice(0, cut)} <em>{o.name.slice(cut + 1)}</em></>}</h2>
                <div className="sf-film-card">
                  {note && <p className="sf-film-note">{note}</p>}
                  {o.size != null && <div className="sf-sub-people"><Squad size={o.size} label={size!} coach={c.subs.coach} /><span>{size}</span></div>}
                  <OfferPrice o={o} />
                </div>
                <div className="sf-ctas">
                  <a href="#free-trial" className="sf-btn sf-btn-light sf-btn-sm sf-magnet" data-plan={o.name} data-tier={offerTier(o)} tabIndex={off(n)}>{fill(c.subs.choose, { name: o.name })}</a>
                </div>
              </div>
            )
          })}
          <div className={`sf-film-ch ${ch === 4 ? 'is-on' : ''}`}>
            {count(4)}
            <h2 className="sf-film-title">{k.lastA} <em>{k.lastB}</em></h2>
            <p>{k.lastText}</p>
            <div className="sf-ctas">
              <a href="#free-trial" className="sf-btn sf-btn-red sf-magnet" tabIndex={off(4)}>{c.nav.trial}</a>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="sf-btn sf-btn-glass sf-magnet" tabIndex={off(4)}>{Ic.whatsapp(18)}{c.nav.whatsapp}</a>}
              {tel && <a href={tel} className="sf-btn sf-btn-glass sf-magnet" tabIndex={off(4)}>{Ic.phone(18)}{c.nav.call}</a>}
            </div>
          </div>
        </div>

        <div className="sf-wrap sf-film-foot">
          <ol className="sf-film-steps" aria-hidden="true">
            {names.map((name, i) => <li key={i} className={ch === i ? 'is-on' : ch > i ? 'is-past' : ''}><b>{i + 1}</b><span>{name}</span></li>)}
          </ol>
          <div className="sf-film-bar" aria-hidden="true"><i /></div>
          <span className={`sf-film-cue ${ch === 0 ? 'is-on' : ''}`} aria-hidden="true">{k.scroll}<i /></span>
        </div>
      </div>
    </section>
    </>
  )
}
