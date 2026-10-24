import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { siteHours, telLink, whatsappLink, prettyPhone, mapsLink, type SiteInfo } from '../db/site'
import { supabase } from '../lib/supabase'
import { Crest, GLYPHS, Ic, PAGE_ART, RatioArt, cosd, sind } from './art'
import { PATHS, fill, type PageId } from './content'
import { MEMBERS, addressText, batchTier, clock, cycle, liveStatus, openSpans, rupees, salePlans, services, term, tierGroups, tierOf, type Tier } from './data'
import { canUseDom, prefersReducedMotion, useCountUp, useInView, useNow } from './motion'
import { useCopy } from './layout'

// The website's sections. Data comes from the CRM's public summary (site); copy from content.ts.

const useIsoLayoutEffect = canUseDom ? useLayoutEffect : useEffect

// Hero ---------------------------------------------------------------------------------------------------------------
/** SHAAN, edge to edge. Letters widen near the pointer (desktop) and condense as you scroll away (phones). */
function KineticWord({ hostRef }: { hostRef: React.RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDivElement>(null)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Measure "SHAAN" at rest (no animation, normal width) with a hidden copy, so a letter that is mid-animation
    // or a font still loading never throws the size off. The stylesheet has a close first guess for the static page.
    const fit = () => {
      const cs = getComputedStyle(el)
      const probe = document.createElement('span')
      probe.textContent = 'SHAAN'
      probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font-size:100px;font-stretch:100%;line-height:1'
      probe.style.fontFamily = cs.fontFamily
      probe.style.fontWeight = cs.fontWeight
      probe.style.letterSpacing = '-2px'
      document.body.appendChild(probe)
      const used = probe.getBoundingClientRect().width
      probe.remove()
      if (used > 0 && el.clientWidth > 0) el.style.setProperty('--word-size', `${Math.floor((el.clientWidth / used) * 100 * 0.97)}px`)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    const fonts = document.fonts
    fonts?.load(`${getComputedStyle(el).fontWeight} 100px "Archivo Variable"`).then(fit).catch(() => {})
    fonts?.addEventListener?.('loadingdone', fit)
    return () => { ro.disconnect(); fonts?.removeEventListener?.('loadingdone', fit) }
  }, [])
  useEffect(() => {
    const host = hostRef.current
    const el = ref.current
    if (!host || !el || prefersReducedMotion()) return
    const letters = [...el.children] as HTMLElement[]
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reset = () => letters.forEach((l) => { l.style.setProperty('--w', '100%'); l.classList.remove('is-hot') })
    if (fine) {
      const onMove = (e: PointerEvent) => {
        let best = -1, bestD = Infinity
        letters.forEach((l, i) => {
          const r = l.getBoundingClientRect()
          const d = (e.clientX - (r.left + r.width / 2)) / r.width
          const w = 74 + 51 * Math.exp(-(d * d) / 0.9)
          l.style.setProperty('--w', `${w.toFixed(1)}%`)
          if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i }
        })
        letters.forEach((l, i) => l.classList.toggle('is-hot', i === best && bestD < .6))
      }
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerleave', reset)
      return () => { host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', reset) }
    }
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, host.clientHeight * .8)))
        letters.forEach((l, i) => l.style.setProperty('--w', `${(100 - p * (26 + i * 4)).toFixed(1)}%`))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [hostRef])
  return (
    <div ref={ref} className="sf-word" aria-hidden="true">
      {'SHAAN'.split('').map((ch, i) => <span key={i} style={{ '--i': i } as CSSProperties}>{ch}</span>)}
    </div>
  )
}

export function LiveChip({ site }: { site: SiteInfo }) {
  const { c } = useCopy()
  const now = useNow()
  if (!now) return <span className="sf-live" aria-hidden="true" style={{ visibility: 'hidden' }}><span className="sf-dot" />&nbsp;</span>
  const st = liveStatus(site, now, c)
  return <span className="sf-live" role="status"><span className={`sf-dot ${st.open ? 'is-open' : ''}`} />{st.text}</span>
}

export function HomeHero({ site }: { site: SiteInfo | null }) {
  const { c } = useCopy()
  const host = useRef<HTMLElement>(null)
  const wa = whatsappLink(site?.website.whatsapp || site?.studio.mobile, c.lead.waText)
  return (
    <section ref={host} className="sf-hero sf-intro" aria-labelledby="sf-h1">
      <div className="sf-hero-bg" />
      {site?.website.hero_image_url && /^https:\/\//.test(site.website.hero_image_url) && <img className="sf-hero-photo" src={site.website.hero_image_url} alt="" />}
      <Crest className="sf-crest" />
      <div className="sf-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="sf-hero-body">
          {site ? <div style={{ '--d': 0 } as CSSProperties}><LiveChip site={site} /></div> : null}
          <h1 id="sf-h1" className="sf-h1" style={{ '--d': 1 } as CSSProperties}>{site?.website.hero_title || c.hero.h1}</h1>
          <p className="sf-lede" style={{ '--d': 2 } as CSSProperties}>{site?.website.hero_text || c.hero.sub}</p>
          <div className="sf-ctas" style={{ '--d': 3 } as CSSProperties}>
            <a href="#free-trial" className="sf-btn sf-btn-red sf-magnet">{c.nav.trial}</a>
            {wa ? <a href={wa} target="_blank" rel="noreferrer" className="sf-btn sf-magnet">{Ic.whatsapp(18)}{c.nav.whatsapp}</a>
              : <Link to={PATHS.plans} viewTransition className="sf-btn sf-magnet">{c.common.seePlans}</Link>}
          </div>
        </div>
        <KineticWord hostRef={host} />
        {site && <Facts site={site} />}
      </div>
    </section>
  )
}

function Fact({ value, label, run, box }: { value: number; label: string; run: boolean; box: React.RefObject<HTMLDivElement | null> }) {
  const n = useCountUp(value, run, 1200, box)
  return <div><b>{n}</b><span>{label}</span></div>
}
export function Facts({ site }: { site: SiteInfo }) {
  const { c } = useCopy()
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref)
  const spans = openSpans(site)
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => spans[d].length).length
  const cy = cycle(site)
  const tiers = new Set(salePlans(site).map(tierOf)).size
  const items: [number, string][] = []
  if (days) items.push([days, c.facts.days])
  if (site.batches.length) items.push([site.batches.length, c.facts.batches])
  if (cy?.sessions) items.push([cy.sessions, c.facts.sessions])
  if (tiers) items.push([tiers, c.facts.ways])
  if (!items.length) return null
  return <div ref={ref} className="sf-facts">{items.map(([v, l]) => <Fact key={l} value={v} label={l} run={seen} box={ref} />)}</div>
}

export function Marquee({ site }: { site: SiteInfo }) {
  const list = [...services(site), ...site.studio.facilities.filter((f) => /steam|sauna|rehab|nutrition|transformation|calisthenics/i.test(f))]
  const uniq = [...new Set(list)].slice(0, 14)
  if (uniq.length < 4) return null
  const ul = (hidden: boolean) => <ul aria-hidden={hidden || undefined}>{uniq.map((x) => <li key={x}>{x}</li>)}</ul>
  return (
    <div className="sf-marquee" aria-label="Training at Shaan Fitness">
      <div className="sf-marquee-track">{ul(false)}{ul(true)}</div>
    </div>
  )
}

// Manifesto ------------------------------------------------------------------------------------------------------------
export function Manifesto() {
  const { c } = useCopy()
  const ref = useRef<HTMLDivElement>(null)
  const words = c.manifesto.text.split(' ')
  const [lit, setLit] = useState(words.length)
  const [still, setStill] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    setStill(false)
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        const p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .35)))
        setLit(Math.round(p * words.length))
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [words.length])
  const key = /^(pride|గర్వం)/i
  return (
    <section className="sf-section is-deep" aria-label="Shaan">
      <div ref={ref} className={`sf-wrap sf-manifesto ${still ? 'is-still' : ''}`}>
        <p>{words.map((w, i) => <span key={i} className={`${i < lit ? 'is-lit' : ''} ${key.test(w) ? 'is-key' : ''}`}>{w}{i < words.length - 1 ? ' ' : ''}</span>)}</p>
        <footer>{c.manifesto.sign}</footer>
      </div>
    </section>
  )
}

// Tiers ----------------------------------------------------------------------------------------------------------------
type Group = ReturnType<typeof tierGroups>[number]
function TierRow({ g, site, max }: { g: Group; site: SiteInfo; max: number }) {
  const { c } = useCopy()
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref)
  const showPrice = site.website.show_prices !== false
  const one = g.plans.length === 1 ? g.plans[0] : null
  const name = one ? one.name : c.tiers.names[g.tier]
  const short = name.replace(/\s*[([][^)\]]*[)\]]/g, '').trim() || name
  const shown = g.plans.slice(0, max)
  return (
    <article ref={ref} className={`sf-tier ${seen ? 'is-in' : ''}`}>
      <RatioArt members={MEMBERS[g.tier]} />
      <div className="sf-tier-name"><h3>{name}</h3><span>{c.tiers[g.tier].ratio}</span></div>
      <div className="sf-tier-text">
        <p>{one?.description || c.tiers[g.tier].text}</p>
        {!one && showPrice && (
          <ul className="sf-options">
            {shown.map((p) => <li key={p.id}><span>{p.name}</span><b>{rupees(p.total_price)}</b></li>)}
            {g.plans.length > shown.length && <li className="is-more"><Link to={PATHS.plans} viewTransition className="sf-link">{fill(c.tiers.options, { count: g.plans.length })}</Link></li>}
          </ul>
        )}
      </div>
      <div className="sf-tier-buy">
        {showPrice && (
          <>
            <div className="sf-price">
              {!one && <small>{fill(c.tiers.from, { price: '' }).trim()}</small>}
              <b>{rupees(g.from)}</b>
              {one && one.discount_price != null && one.discount_price < one.price && <s>{rupees(one.price)}</s>}
            </div>
            <span className="sf-price-note">{planNote(one ?? g.plans[0], c)}</span>
          </>
        )}
        <a href="#free-trial" className="sf-btn sf-btn-sm sf-magnet" data-plan={name} data-tier={g.tier}>{fill(c.tiers.choose, { name: short })}</a>
      </div>
    </article>
  )
}

/** "for 4 weeks, 24 coached sessions" */
export function planNote(p: SiteInfo['plans'][number], c: ReturnType<typeof useCopy>['c']) {
  const t = fill(c.tiers.forTerm, { term: term(p, c) })
  return p.session_count && !p.unlimited_sessions ? `${t}, ${fill(c.tiers.sessionsN, { count: p.session_count })}` : t
}

export function Tiers({ site, only, title, sub, max = 4 }: { site: SiteInfo; only?: Tier[]; title?: string; sub?: string; max?: number }) {
  const { c } = useCopy()
  const groups = tierGroups(site).filter((g) => !only || only.includes(g.tier))
  if (!groups.length) return null
  return (
    <section className="sf-section" aria-labelledby="sf-tiers">
      <div className="sf-wrap">
        <div className="sf-head-split">
          <h2 id="sf-tiers" className="sf-h2">{title ?? c.tiers.title}</h2>
          <p className="sf-lede">{sub ?? c.tiers.sub}</p>
        </div>
        <div className="sf-tiers">{groups.map((g) => <TierRow key={g.tier} g={g} site={site} max={max} />)}</div>
        <p className="sf-small" style={{ marginTop: 18 }}><Link to={PATHS.plans} viewTransition className="sf-link">{c.common.allPlans}</Link></p>
      </div>
    </section>
  )
}

/** Every plan with its length, sessions and fee, by tier (the plans page). */
export function PlanTable({ site }: { site: SiteInfo }) {
  const { c } = useCopy()
  const groups = tierGroups(site)
  const join = site.studio.can_sign_up !== false
  if (!groups.length || site.website.show_prices === false) return null
  return (
    <div className="sf-plan-groups">
      {groups.map((g) => (
        <div key={g.tier} className="sf-table-wrap">
          <table className="sf-table sf-plan-table">
            <caption>{c.tiers.names[g.tier]}<span>{c.tiers[g.tier].ratio}</span></caption>
            <thead><tr><th scope="col">{c.plans.cols.plan}</th><th scope="col">{c.plans.cols.term}</th><th scope="col">{c.plans.cols.sessions}</th><th scope="col" className="is-num">{c.plans.cols.fee}</th><th scope="col"><span className="sf-sr">{c.nav.trial}</span></th></tr></thead>
            <tbody>
              {g.plans.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.name}</th>
                  <td className="is-term" data-label={c.plans.cols.term}>{term(p, c)}</td>
                  <td className="is-sess" data-label={c.plans.cols.sessions}>{p.unlimited_sessions ? c.plans.unlimited : p.session_count ?? c.plans.anyDay}</td>
                  <td className="is-num"><b>{rupees(p.total_price)}</b>{p.discount_price != null && p.discount_price < p.price && <s>{rupees(p.price)}</s>}</td>
                  <td className="is-act">{join
                    ? <Link to={`/join?plan=${p.id}`} className="sf-btn sf-btn-sm" aria-label={`${c.nav.join}: ${p.name}`}>{c.nav.join}</Link>
                    : <a href="#free-trial" className="sf-btn sf-btn-sm" data-plan={p.name} data-tier={g.tier}>{c.nav.trial}</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="sf-small">{c.plans.note}</p>
    </div>
  )
}

// Method -----------------------------------------------------------------------------------------------------------------
export function Method() {
  const { c } = useCopy()
  const [open, setOpen] = useState(0)
  return (
    <section className="sf-section is-ink" aria-labelledby="sf-method">
      <div className="sf-wrap">
        <div className="sf-head-split">
          <h2 id="sf-method" className="sf-h2">{c.method.title}</h2>
          <p className="sf-lede">{c.method.sub}</p>
        </div>
        <div className="sf-pillars">
          {c.method.pillars.map((p, i) => (
            <div key={p.name} className={`sf-pillar ${open === i ? 'is-open' : ''}`}>
              <h3 style={{ margin: 0 }}>
                <button type="button" aria-expanded={open === i} aria-controls={`sf-pillar-${i}`} onClick={() => setOpen(i)}>
                  <span className="sf-pillar-word">{p.name}</span><span className="sf-pillar-label">{p.label}</span>
                </button>
              </h3>
              <div className="sf-pillar-body" id={`sf-pillar-${i}`} role="region" aria-label={p.name}>
                <div><div className="sf-pillar-inner">{GLYPHS[p.name]}<p>{p.text}</p></div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// A day at Shaan --------------------------------------------------------------------------------------------------------------
export function DayRail({ site, only, title, sub, link = true }: { site: SiteInfo; only?: Tier[]; title?: string; sub?: string; link?: boolean }) {
  const { c } = useCopy()
  const now = useNow()
  const spans = openSpans(site)
  const open = [1, 2, 3, 4, 5, 6, 7].filter((d) => spans[d].length)
  const day = now && spans[now.day]?.length ? now.day : open[0] ?? 1
  const shifts = spans[day] ?? []
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
  const batches = site.batches.filter((b) => (!only || only.includes(batchTier(b))) && (!b.days.length || b.days.includes(day)))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  if (!batches.length && !shifts.length) return null
  // Overlapping batches stack into lanes, so every slot stays readable.
  const laneEnds: number[] = []
  const placed = batches.map((b) => {
    const a = toMin(b.start_time), e = toMin(b.end_time)
    let lane = laneEnds.findIndex((end) => end <= a)
    if (lane < 0) { lane = laneEnds.length; laneEnds.push(e) } else laneEnds[lane] = e
    return { b, a, e, lane }
  })
  const lanes = Math.max(1, laneEnds.length)
  const all = [...shifts.flat(), ...placed.flatMap((x) => [x.a, x.e])]
  const lo = Math.floor((Math.min(...all) - 30) / 60) * 60
  const hi = Math.ceil((Math.max(...all) + 30) / 60) * 60
  const pct = (m: number) => `${((m - lo) / (hi - lo)) * 100}%`
  const hours = Array.from({ length: (hi - lo) / 60 + 1 }, (_, i) => lo + i * 60)
  const showNow = now && now.day === day && now.min >= lo && now.min <= hi
  const label = (t: Tier) => (t === 'elite' ? c.day.elite : t === 'semi' ? c.day.semi : c.day.group)
  const slotH = lanes > 3 ? 48 : 66, gap = 8, top = 40
  const height = top + lanes * (slotH + gap) + 44
  return (
    <section className="sf-section is-deep" aria-labelledby="sf-day">
      <div className="sf-wrap">
        <div className="sf-head-split">
          <h2 id="sf-day" className="sf-h2">{title ?? c.day.title}</h2>
          <p className="sf-lede">{sub ?? c.day.sub}</p>
        </div>
        <div className="sf-rail-scroll" tabIndex={0} role="group" aria-label={title ?? c.day.title}>
          <div className={`sf-rail ${placed.length > 12 ? 'is-dense' : ''}`} style={{ height, minWidth: Math.max(860, hours.length * 70, placed.length * 64) }}>
            {shifts.map(([a, b]) => <div key={a} className="sf-rail-shift" style={{ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})`, top: top - 12, bottom: 34 }} />)}
            {placed.map(({ b, a, e, lane }) => {
              const t = batchTier(b)
              const live = now && now.day === day && now.min >= a && now.min < e
              return (
                <div key={b.id} className={`sf-slot is-${t} ${live ? 'is-live' : ''}`} style={{ left: `calc(${pct(a)} + 3px)`, width: `calc(${pct(e)} - ${pct(a)} - 6px)`, top: top + lane * (slotH + gap), height: slotH }}
                  title={`${clock(a)} – ${clock(e)}, ${label(t)}`}>
                  <b>{clock(a)}</b>{slotH > 50 && <span>{label(t)}</span>}
                </div>
              )
            })}
            {showNow && <div className="sf-now" style={{ left: pct(now.min) }} data-label={`${c.day.now} ${clock(now.min)}`} />}
            {hours.filter((_, i) => i % 2 === 0).map((m) => <span key={m} className="sf-rail-tick" style={{ left: pct(m) }}>{clock(m)}</span>)}
          </div>
        </div>
        <div className="sf-legend">
          {(['group', 'semi', 'elite'] as Tier[]).filter((t) => placed.some((x) => batchTier(x.b) === t)).map((t) => <span key={t}><i className={t === 'group' ? '' : `is-${t}`} />{label(t)}</span>)}
          {link && <Link to={PATHS.timings} viewTransition className="sf-link">{c.day.fullTimings}</Link>}
        </div>
      </div>
    </section>
  )
}

// How joining works ---------------------------------------------------------------------------------------------------------
export function JoinSteps() {
  const { c } = useCopy()
  return (
    <section className="sf-section" aria-labelledby="sf-join">
      <div className="sf-wrap">
        <div className="sf-head-block"><h2 id="sf-join" className="sf-h2">{c.join.title}</h2></div>
        <ol className="sf-steps">{c.join.steps.map((s) => <li key={s.t} className="sf-step"><h3>{s.t}</h3><p>{s.d}</p></li>)}</ol>
      </div>
    </section>
  )
}

// The member app ----------------------------------------------------------------------------------------------------------------
export function AppShowcase() {
  const { c } = useCopy()
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (!seen || paused || prefersReducedMotion()) return
    const id = window.setInterval(() => setI((x) => (x + 1) % 4), 3400)
    return () => window.clearInterval(id)
  }, [seen, paused])
  const a = c.app
  const screens: ReactNode[] = [
    <><h4>{a.screens[0]}</h4><span className="muted">{a.done}</span><div className="bar"><i style={{ width: '75%' }} /></div>
      {[a.w1, a.w2, a.w3, a.w4].map((w, k) => <div key={w} className="row"><span className={`tick ${k < 3 ? 'is-done' : ''}`}>{k < 3 && Ic.check(14)}</span>{w}</div>)}</>,
    <><h4>{a.screens[1]}</h4><span className="muted">1,240 / 1,800 kcal</span><div className="bar"><i style={{ width: '69%' }} /></div>
      {['Moong dal chilla', 'Curd', 'Phulka, dal', 'Roasted chana'].map((w, k) => <div key={w} className="row"><span className={`tick ${k < 3 ? 'is-done' : ''}`}>{k < 3 && Ic.check(14)}</span>{w}</div>)}</>,
    <><h4>{a.screens[2]}</h4><span className="muted">{a.glasses}</span><div className="sf-glasses">{Array.from({ length: 12 }, (_, k) => <i key={k} className={k < 6 ? 'is-full' : ''} />)}</div></>,
    <><h4>{a.screens[3]}</h4><span className="muted">{a.lost}</span>
      <svg viewBox="0 0 240 140" style={{ width: '100%' }} aria-hidden="true"><polyline points="0,30 40,40 80,52 120,66 160,80 200,96 240,104" fill="none" stroke="#E8283B" strokeWidth="3" /><polyline points="0,30 40,40 80,52 120,66 160,80 200,96 240,104 240,140 0,140" fill="rgba(232,40,59,.15)" stroke="none" /></svg>
      <div className="row">82.0 kg <span className="muted" style={{ marginLeft: 'auto' }}>78.4 kg</span></div></>,
  ]
  return (
    <section className="sf-section" aria-labelledby="sf-app">
      <div ref={ref} className="sf-wrap sf-app">
        <div>
          <h2 id="sf-app" className="sf-h2">{a.title}</h2>
          <p className="sf-lede" style={{ marginTop: 18 }}>{a.sub}</p>
          <div className="sf-app-tabs" role="group" aria-label={a.title}>
            {a.screens.map((s, k) => <button key={s} type="button" aria-pressed={i === k} onClick={() => { setI(k); setPaused(true) }}>{s}</button>)}
            <button type="button" aria-label={paused ? 'Play' : 'Pause'} onClick={() => setPaused((p) => !p)}>{paused ? Ic.play(16) : Ic.pause(16)}</button>
          </div>
        </div>
        <div className="sf-phone-stage" aria-hidden="true">
          <div className="sf-phone"><div className="sf-phone-screen"><span className="sf-phone-notch" />
            {screens.map((s, k) => <div key={k} className={`sf-screen ${i === k ? 'is-on' : ''}`}>{s}</div>)}
          </div></div>
        </div>
      </div>
    </section>
  )
}

// Coaches -------------------------------------------------------------------------------------------------------------------------
export function CoachGrid({ site, limit, heading = true }: { site: SiteInfo; limit?: number; heading?: boolean }) {
  const { c } = useCopy()
  if (site.website.show_trainers === false || !site.trainers.length) return null
  const list = [...site.trainers].sort((a, b) => Number(b.star) - Number(a.star)).slice(0, limit ?? 99)
  const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
  return (
    <section className="sf-section" aria-labelledby={heading ? 'sf-coaches' : undefined} aria-label={heading ? undefined : c.nav.coaches}>
      <div className="sf-wrap">
        {heading && (
          <div className="sf-head-split">
            <h2 id="sf-coaches" className="sf-h2">{c.coaches.title}</h2>
            <p className="sf-lede">{c.coaches.sub}</p>
          </div>
        )}
        <div className="sf-coaches">
          {list.map((t, i) => (
            <article key={t.id} className="sf-coach sf-spot">
              <div className="sf-coach-pic">
                {t.photo_url ? <img src={t.photo_url} alt={t.name} loading="lazy" /> : <span className="sf-coach-mono" aria-hidden="true">{initials(t.name)}</span>}
              </div>
              <div className="sf-coach-body">
                <h3>{t.name}</h3>
                <span className="sf-coach-role">{t.title || t.designation || (i === 0 && t.star ? c.common.headCoach : c.common.coach)}</span>
                {t.years_experience ? <p>{fill(t.years_experience === 1 ? c.common.yearsExp_one : c.common.yearsExp_other, { count: t.years_experience })}</p> : null}
                {t.services.length > 0 && <ul className="sf-tags">{t.services.slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul>}
              </div>
            </article>
          ))}
        </div>
        {limit && site.trainers.length > 0 && <p className="sf-small" style={{ marginTop: 22 }}><Link to={PATHS.coaches} viewTransition className="sf-link">{c.coaches.all}</Link></p>}
      </div>
    </section>
  )
}

export function ResultsGrid({ site, empty }: { site: SiteInfo; empty?: boolean }) {
  const { c } = useCopy()
  const list = site.website.show_results === false ? [] : site.results
  if (!list.length && !empty) return null
  return (
    <section className="sf-section is-deep" aria-label={c.results.title}>
      <div className="sf-wrap">
        {!empty && <div className="sf-head-split"><h2 className="sf-h2">{c.results.title}</h2><p className="sf-lede">{c.results.sub}</p></div>}
        {!list.length ? <p className="sf-lede">{c.results.empty}</p> : (
          <div className="sf-results">
            {list.map((r) => (
              <article key={r.id} className="sf-result">
                {r.image_url && <img src={r.image_url} alt={`${r.client_name}: ${r.title}`} loading="lazy" />}
                <div>
                  <h3>{r.title}</h3>
                  <span className="sf-small">{r.client_name}, {fill(c.common.inPeriod, { value: r.period_value, unit: r.period_unit })}{r.trainer ? `, ${r.trainer}` : ''}</span>
                  {r.description && <blockquote>{r.description}</blockquote>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// BMI check ---------------------------------------------------------------------------------------------------------------------------
export function BmiCheck() {
  const { c } = useCopy()
  const [h, setH] = useState(168)
  const [w, setW] = useState(72)
  const bmi = w / (h / 100) ** 2
  const band = bmi < 18.5 ? 'under' : bmi < 25 ? 'healthy' : bmi < 30 ? 'over' : 'obese'
  const low = Math.round(18.5 * (h / 100) ** 2), high = Math.round(24.9 * (h / 100) ** 2)
  const angle = ((Math.min(40, Math.max(12, bmi)) - 12) / 28) * 180 - 90
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [200 + cosd(a - 180) * 160, 200 + sind(a - 180) * 160]
    const [x0, y0] = p(a0), [x1, y1] = p(a1)
    return `M${x0} ${y0} A160 160 0 0 1 ${x1} ${y1}`
  }
  const deg = (b: number) => ((b - 12) / 28) * 180
  return (
    <section className="sf-section" aria-labelledby="sf-check">
      <div className="sf-wrap sf-check">
        <div>
          <h2 id="sf-check" className="sf-h2">{c.check.title}</h2>
          <p className="sf-lede" style={{ marginTop: 18 }}>{c.check.sub}</p>
          <div className="sf-check-panel sf-spot" style={{ marginTop: 28 }}>
            <div className="sf-slider">
              <label htmlFor="sf-h">{c.check.height}<output htmlFor="sf-h">{h}</output></label>
              <input id="sf-h" type="range" min={130} max={210} value={h} onChange={(e) => setH(Number(e.target.value))} style={{ '--p': `${((h - 130) / 80) * 100}%` } as CSSProperties} />
            </div>
            <div className="sf-slider">
              <label htmlFor="sf-w">{c.check.weight}<output htmlFor="sf-w">{w}</output></label>
              <input id="sf-w" type="range" min={35} max={160} value={w} onChange={(e) => setW(Number(e.target.value))} style={{ '--p': `${((w - 35) / 125) * 100}%` } as CSSProperties} />
            </div>
          </div>
        </div>
        <div>
          <svg className="sf-gauge" viewBox="0 0 400 230" role="img" aria-label={`${c.check.your} ${bmi.toFixed(1)}, ${c.check.band[band]}`}>
            <path d={arc(0, deg(18.5))} stroke="#3B5BFF" strokeWidth="22" fill="none" />
            <path d={arc(deg(18.5) + 1, deg(25))} stroke="#D9B97A" strokeWidth="22" fill="none" />
            <path d={arc(deg(25) + 1, deg(30))} stroke="#FF8A5B" strokeWidth="22" fill="none" />
            <path d={arc(deg(30) + 1, 180)} stroke="#E8283B" strokeWidth="22" fill="none" />
            <g className="sf-gauge-needle" style={{ transform: `rotate(${angle}deg)` }}>
              <line x1="200" y1="200" x2="200" y2="62" stroke="#EEF0F7" strokeWidth="4" strokeLinecap="round" />
            </g>
            <circle cx="200" cy="200" r="12" fill="#EEF0F7" />
          </svg>
          <div className="sf-bmi" aria-live="polite">
            <span className="sf-small">{c.check.your}</span>
            <b>{bmi.toFixed(1)}</b>
            <strong>{c.check.band[band]}</strong>
            <p className="sf-small">{fill(c.check.healthy, { low, high })}</p>
            <p style={{ marginTop: 8 }}>{c.check.advice[band]}</p>
            <div style={{ marginTop: 18 }}><a href="#free-trial" className="sf-btn sf-btn-red sf-magnet">{c.check.cta}</a></div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Free trial form, inside the closing call to action -------------------------------------------------------------------------------------
type Interest = 'trial' | 'personal' | 'group' | 'weight_loss' | 'strength'
const PAGE_INTEREST: Partial<Record<PageId, Interest>> = { personal: 'personal', group: 'group', weightLoss: 'weight_loss' }

function LeadForm({ site, page }: { site: SiteInfo | null; page: PageId }) {
  const { c } = useCopy()
  const [f, setF] = useState({ name: '', phone: '', interest: PAGE_INTEREST[page] ?? 'trial' as Interest, time: 'any', message: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'already'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sentName, setSentName] = useState('')
  const wa = whatsappLink(site?.website.whatsapp || site?.studio.mobile, c.lead.waText)
  // A plan chosen higher up the page ("Choose 1:1 Elite") fills the interest.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[data-plan]')
      if (!a) return
      const name = a.getAttribute('data-plan') ?? ''
      const t = (a.getAttribute('data-tier') as Tier | null) ?? tierOf({ name, kind: 'gym' })
      setF((x) => ({ ...x, interest: t === 'group' ? 'group' : 'personal', message: x.message || name }))
    }
    document.addEventListener('click', on)
    return () => document.removeEventListener('click', on)
  }, [])
  const submit = async () => {
    setError(null)
    if (f.name.trim().length < 2) return setError(c.lead.errName)
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').slice(-10)) || f.phone.replace(/\D/g, '').length < 10) return setError(c.lead.errPhone)
    setState('sending')
    const res = await supabase.rpc('site_enquiry', { p: { ...f, studio: site?.studio.slug ?? null, page: PATHS[page] } })
    if (res.error) {
      // Our own checks explain themselves; anything else (no connection, the server not ready) offers a call or WhatsApp.
      const m = res.error.message
      setState('idle')
      setError(/10-digit/.test(m) ? c.lead.errPhone : /Enter your name/.test(m) ? c.lead.errName : /Too many/.test(m) ? c.lead.busy : c.lead.failed)
      return
    }
    setSentName(f.name.trim().split(/\s+/)[0])
    setState(res.data === 'already' ? 'already' : 'sent')
  }
  if (state === 'sent' || state === 'already') {
    return (
      <div className="sf-form" role="status">
        <div className="sf-form-ok">
          <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#E8283B" /><path className="sf-draw" d="m19 33 9 9 17-19" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <p>{state === 'sent' ? fill(c.lead.sent, { name: sentName }) : c.lead.already}</p>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="sf-btn" style={{ color: 'var(--sf-ink)', borderColor: '#C9CDE0' }}>{Ic.whatsapp(18)}{c.lead.whatsappIt}</a>}
        </div>
      </div>
    )
  }
  return (
    <form className="sf-form" noValidate aria-labelledby="sf-lead-h" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <h3 id="sf-lead-h" className="sf-h3" style={{ color: 'var(--sf-ink)' }}>{c.lead.title}</h3>
      <div className="sf-field"><label htmlFor="sf-l-name">{c.lead.name}</label><input id="sf-l-name" type="text" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} /></div>
      <div className="sf-field"><label htmlFor="sf-l-phone">{c.lead.phone}</label><input id="sf-l-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={16} placeholder="98480 12345" /></div>
      <fieldset>
        <legend>{c.lead.interest}</legend>
        <div className="sf-chips">
          {(Object.keys(c.lead.interests) as Interest[]).map((k) => (
            <label key={k}><input type="radio" name="sf-interest" value={k} checked={f.interest === k} onChange={() => setF({ ...f, interest: k })} />{c.lead.interests[k]}</label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{c.lead.time}</legend>
        <div className="sf-chips">
          {(Object.keys(c.lead.times) as (keyof typeof c.lead.times)[]).map((k) => (
            <label key={k}><input type="radio" name="sf-time" value={k} checked={f.time === k} onChange={() => setF({ ...f, time: k })} />{c.lead.times[k]}</label>
          ))}
        </div>
      </fieldset>
      <div className="sf-field"><label htmlFor="sf-l-msg">{c.lead.message}</label><textarea id="sf-l-msg" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={500} /></div>
      <div className="sf-hp" aria-hidden="true"><label htmlFor="sf-l-web">Website</label><input id="sf-l-web" type="text" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></div>
      {error && <p className="sf-form-err" role="alert">{error}</p>}
      <button type="submit" className="sf-btn sf-btn-red" disabled={state === 'sending'}>{state === 'sending' ? c.lead.sending : c.lead.send}</button>
      <p className="sf-small">{c.lead.privacy}{wa && <> {c.lead.orWhatsapp} <a href={wa} target="_blank" rel="noreferrer" className="sf-link" style={{ color: 'var(--sf-ink)' }}>{c.lead.whatsappIt}</a></>}</p>
    </form>
  )
}

export function Cta({ site, page }: { site: SiteInfo | null; page: PageId }) {
  const { c } = useCopy()
  const phone = site?.studio.mobile
  return (
    <section id="free-trial" className="sf-cta" aria-labelledby="sf-cta-h">
      <div className="sf-wrap sf-cta-row">
        <div style={{ display: 'grid', gap: 24, alignSelf: 'center' }}>
          <h2 id="sf-cta-h">{c.cta.title}</h2>
          <p>{c.cta.text}</p>
          <p style={{ fontSize: 16 }}>{c.lead.sub}</p>
          {phone && <div><a href={telLink(phone) ?? undefined} className="sf-btn sf-magnet">{Ic.phone(18)}{prettyPhone(phone)}</a></div>}
        </div>
        <LeadForm site={site} page={page} />
      </div>
    </section>
  )
}

// FAQ ------------------------------------------------------------------------------------------------------------------------------------
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const { c } = useCopy()
  if (!items.length) return null
  return (
    <section className="sf-section" aria-labelledby="sf-faq">
      <div className="sf-wrap">
        <div className="sf-head-block"><h2 id="sf-faq" className="sf-h2">{c.faq.title}</h2></div>
        <div className="sf-faq">
          {items.map((x, i) => (
            <details key={x.q} open={i === 0}>
              <summary>{x.q}<i aria-hidden="true" /></summary>
              <div><p>{x.a}</p></div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// Inner page hero ---------------------------------------------------------------------------------------------------------------------------
export function PageHero({ id, title, intro, site }: { id: PageId; title: string; intro: string; site?: SiteInfo | null }) {
  const { c } = useCopy()
  return (
    <section className="sf-page-hero" aria-labelledby="sf-h1">
      <div className="sf-hero-bg" />
      <div className="sf-wrap sf-page-hero-grid sf-enter">
        <div>
          <nav aria-label={c.common.breadcrumb}>
            <ol className="sf-crumbs"><li><Link to="/" viewTransition>Shaan Fitness</Link></li><li aria-current="page">{title.length > 40 ? c.nav[navKey(id)] : title}</li></ol>
          </nav>
          {site && <div style={{ marginBottom: 18 }}><LiveChip site={site} /></div>}
          <h1 id="sf-h1" className="sf-h1">{title}</h1>
          <p className="sf-lede">{intro}</p>
          <div className="sf-ctas" style={{ marginTop: 28 }}>
            <a href="#free-trial" className="sf-btn sf-btn-red sf-magnet">{c.nav.trial}</a>
            {id !== 'plans' && <Link to={PATHS.plans} viewTransition className="sf-btn sf-magnet">{c.common.seePlans}</Link>}
          </div>
        </div>
        {PAGE_ART[id] ?? null}
      </div>
    </section>
  )
}
const navKey = (id: PageId) => (id === 'results' ? 'results' : id === 'weightLoss' ? 'weightLoss' : id) as keyof ReturnType<typeof useCopy>['c']['nav']

// Small building blocks for inner pages ----------------------------------------------------------------------------------------------------
export function Section({ title, sub, children, tone, id }: { title?: string; sub?: string; children: ReactNode; tone?: 'deep' | 'ink'; id?: string }) {
  const hid = useMemo(() => `sf-s-${Math.abs([...(title ?? id ?? 'x')].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7))}`, [title, id])
  return (
    <section id={id} className={`sf-section ${tone === 'deep' ? 'is-deep' : tone === 'ink' ? 'is-ink' : ''}`} aria-labelledby={title ? hid : undefined}>
      <div className="sf-wrap">
        {title && <div className={sub ? 'sf-head-split' : 'sf-head-block'}><h2 id={hid} className="sf-h2">{title}</h2>{sub && <p className="sf-lede">{sub}</p>}</div>}
        {children}
      </div>
    </section>
  )
}
export const Checks = ({ items }: { items: string[] }) => <ul className="sf-checks">{items.map((x) => <li key={x}>{Ic.check(20)}<span>{x}</span></li>)}</ul>
export const Cards = ({ items, cols = 3 }: { items: { t: string; d: string }[]; cols?: 2 | 3 }) => (
  <div className={cols === 2 ? 'sf-grid-2' : 'sf-grid-3'}>{items.map((x) => <article key={x.t} className="sf-card sf-spot"><h3>{x.t}</h3><p>{x.d}</p></article>)}</div>
)

export function HoursTable({ site }: { site: SiteInfo }) {
  const { c } = useCopy()
  const now = useNow()
  const rows = siteHours(site)
  return (
    <dl className="sf-hours">
      {rows.map((r) => {
        const label = r.days.length === 1 ? c.common.daysLong[r.days[0] - 1] : `${c.common.daysLong[r.days[0] - 1]} – ${c.common.daysLong[r.days[r.days.length - 1] - 1]}`
        return (
          <div key={r.days.join()} className={now && r.days.includes(now.day) ? 'is-today' : ''}>
            <dt>{label}</dt><dd>{r.spans.length ? r.spans.map((x) => <span key={x}>{x}</span>) : c.common.closed}</dd>
          </div>
        )
      })}
    </dl>
  )
}

export function CompareTable({ site }: { site: SiteInfo }) {
  const { c } = useCopy()
  const groups = tierGroups(site)
  if (groups.length < 2) return null
  const yes = <span aria-label="Yes" style={{ color: 'var(--sf-crimson-hi)' }}>{Ic.check(20)}</span>
  const no = <span className="sf-small" aria-label="No">—</span>
  const diet = (t: Tier) => groups.find((g) => g.tier === t)?.plans.some((p) => p.services.some((x) => /nutrition|diet/i.test(x)))
  // Rows: coach-led sessions, your own written plan, diet plan, weekly progress check, Shaan app, coach attention.
  const cell = (row: number, t: Tier) => {
    if (row === 5) return c.plans.attention[t]
    if (row === 1 || row === 3) return t === 'group' ? no : yes
    if (row === 2) return t !== 'group' || diet(t) ? yes : no
    return yes
  }
  return (
    <div className="sf-table-wrap">
      <table className="sf-table">
        <caption className="sf-sr">{c.plans.compareTitle}</caption>
        <thead><tr><th scope="col">{c.plans.feature}</th>{groups.map((g) => <th key={g.tier} scope="col" className={g.tier === 'elite' ? 'is-elite' : ''}>{g.plans.length === 1 ? g.plans[0].name : c.tiers.names[g.tier]}{site.website.show_prices !== false && <div className="sf-small" style={{ fontFamily: 'var(--sf-body)', fontStretch: '100%' }}>{g.plans.length === 1 ? rupees(g.from) : fill(c.tiers.from, { price: rupees(g.from) })}</div>}</th>)}</tr></thead>
        <tbody>
          {c.plans.rows.map((r, i) => (
            <tr key={r}><th scope="row">{r}</th>{groups.map((g) => <td key={g.tier} className={g.tier === 'elite' ? 'is-elite' : ''}>{cell(i, g.tier)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ContactBlock({ site }: { site: SiteInfo }) {
  const { c } = useCopy()
  const [map, setMap] = useState(false)
  const s = site.studio
  const wa = whatsappLink(site.website.whatsapp || s.mobile, c.lead.waText)
  const q = encodeURIComponent(addressText(site))
  return (
    <div className="sf-two">
      <div style={{ display: 'grid', gap: 28 }}>
        <div>
          <h2 className="sf-h3" style={{ marginBottom: 12, color: 'var(--sf-champagne)' }}>{c.common.address}</h2>
          <address className="sf-address">{[s.street1, s.street2].filter(Boolean).join(', ')}<br />{[s.landmark, s.locality ?? s.branch].filter(Boolean).join(', ')}<br />{[s.city, s.state, s.pincode].filter(Boolean).join(', ')}</address>
        </div>
        <div className="sf-ctas">
          <a href={mapsLink(s, site.website)} target="_blank" rel="noreferrer" className="sf-btn sf-btn-light">{Ic.pin(18)}{c.common.directions}</a>
          {s.mobile && <a href={telLink(s.mobile) ?? undefined} className="sf-btn">{Ic.phone(18)}{prettyPhone(s.mobile)}</a>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="sf-btn">{Ic.whatsapp(18)}{c.nav.whatsapp}</a>}
        </div>
        {s.email && <p>{c.common.email}: <a className="sf-link" href={`mailto:${s.email}`}>{s.email}</a></p>}
        <div>
          <h2 className="sf-h3" style={{ marginBottom: 12, color: 'var(--sf-champagne)' }}>{c.common.hours}</h2>
          <HoursTable site={site} />
        </div>
      </div>
      <div className="sf-map">
        {map ? <iframe title={`Map: ${s.name}`} src={`https://www.google.com/maps?q=${q}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          : <div className="sf-map-cover">{PAGE_ART.contact}<button type="button" className="sf-btn" onClick={() => setMap(true)}>{c.common.showMap}</button></div>}
      </div>
    </div>
  )
}
