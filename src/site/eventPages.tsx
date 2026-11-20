import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SiteInfo } from '../db/site'
import { Ic } from './art'
import { PATHS, type Lang } from './content'
import { EVENTS, eventById, type EventId, type ShaanEvent } from './events'
import { useCopy } from './layout'
import { Section } from './sections'

// The events pages: the list (/events) and one page per event (/events/…), plus the cards on the home page.

const year = (e: ShaanEvent) => e.start.slice(0, 4)

/** Opens the event's own page (its original website or announcement post) in a new tab, exactly as it is. */
function SiteLink({ e, label, className }: { e: ShaanEvent; label: string; className: string }) {
  return <a href={e.site} target="_blank" rel="noopener" className={className}>{label}{Ic.external(16)}</a>
}

// Two ways in from each card: "See the event" opens the event's own page as it always was (people registered and
// donated there), and "Event gallery" opens our page with the details and the photos.
function EventCard({ e, lang }: { e: ShaanEvent; lang: Lang }) {
  const { c } = useCopy()
  const k = e.copy[lang]
  return (
    <article className="sf-ev-card sf-spot">
      <Link to={PATHS[e.id]} viewTransition className="sf-ev-media" tabIndex={-1} aria-hidden="true">
        {e.image ? <img src={e.image} alt={k.name} loading="lazy" decoding="async" /> : <span className="sf-ev-year">{year(e)}</span>}
      </Link>
      <div className="sf-ev-body">
        <p className="sf-ev-meta"><span>{k.when}</span><span>{k.role}</span></p>
        <h3>{k.name}</h3>
        <p>{k.summary}</p>
        <p className="sf-ev-stat"><b>{k.stat.v}</b><span>{k.stat.k}</span></p>
        <div className="sf-ev-actions">
          <SiteLink e={e} label={c.eventsPage.see} className="sf-btn sf-btn-sm sf-btn-red" />
          <Link to={PATHS[e.id]} viewTransition className="sf-btn sf-btn-sm sf-btn-glass" aria-label={`${c.eventsPage.eventGallery}: ${k.name}`}>{Ic.gallery(16)}{c.eventsPage.eventGallery}</Link>
        </div>
      </div>
    </article>
  )
}

/** The latest events, for the home page. */
export function EventCards({ limit = 3 }: { limit?: number }) {
  const { c, lang } = useCopy()
  return (
    <Section title={c.community.title} sub={c.community.sub} tone="deep">
      <div className="sf-ev-grid">{EVENTS.slice(0, limit).map((e) => <EventCard key={e.id} e={e} lang={lang} />)}</div>
      <p style={{ marginTop: 28 }}><Link to={PATHS.events} viewTransition className="sf-btn sf-btn-glass">{c.eventsPage.all}</Link></p>
    </Section>
  )
}

/** /events: every event, newest first. */
export function EventsList({ site }: { site: SiteInfo | null }) {
  const { c, lang } = useCopy()
  const ig = site?.website.instagram || 'https://www.instagram.com/shaanfitness.in/'
  return (
    <>
      <section className="sf-page-hero" aria-labelledby="sf-h1">
        <div className="sf-hero-bg" />
        <div className="sf-wrap sf-enter">
          <nav aria-label={c.common.breadcrumb}>
            <ol className="sf-crumbs"><li><Link to="/" viewTransition>Shaan Fitness</Link></li><li aria-current="page">{c.nav.events}</li></ol>
          </nav>
          <h1 id="sf-h1" className="sf-h1">{c.eventsPage.h1}</h1>
          <p className="sf-lede">{c.eventsPage.intro}</p>
        </div>
      </section>
      <Section>
        <h2 className="sf-sr">{c.eventsPage.all}</h2>
        <div className="sf-ev-grid">{EVENTS.map((e) => <EventCard key={e.id} e={e} lang={lang} />)}</div>
        <p className="sf-lede" style={{ marginTop: 36 }}>{c.eventsPage.soon}</p>
        <p style={{ marginTop: 18 }}><a className="sf-btn sf-btn-glass" href={ig} target="_blank" rel="noreferrer">{Ic.instagram(18)}{c.community.follow}</a></p>
      </Section>
    </>
  )
}

/** Instagram posts and reels, embedded. Each frame loads only when it scrolls near the screen. */
function Gallery({ posts, name }: { posts: string[]; name: string }) {
  const { c } = useCopy()
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setNear(true); io.disconnect() } }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return (
    <Section title={c.eventsPage.gallery} sub={c.eventsPage.gallerySub} tone="deep" id="gallery">
      <div ref={ref} className="sf-ig-grid">
        {posts.map((p, i) => (
          <figure key={p} className={`sf-ig ${p.startsWith('reel/') ? 'is-reel' : ''}`}>
            {near
              ? <iframe src={`https://www.instagram.com/${p}/embed/`} title={`${name}: Instagram ${i + 1}`} loading="lazy" scrolling="no" allowFullScreen />
              : <span className="sf-ig-wait">{Ic.instagram(28)}</span>}
            <figcaption><a href={`https://www.instagram.com/${p}/`} target="_blank" rel="noreferrer">{Ic.instagram(14)}Instagram</a></figcaption>
          </figure>
        ))}
      </div>
    </Section>
  )
}

/** One event's page. */
export function EventPage({ id }: { id: EventId }) {
  const { c, lang } = useCopy()
  const e = eventById(id)
  const k = e.copy[lang]
  const others = EVENTS.filter((x) => x.id !== id).slice(0, 3)
  return (
    <>
      <section className="sf-page-hero sf-ev-hero" aria-labelledby="sf-h1">
        <div className="sf-hero-bg" />
        {e.image && <img className="sf-ev-hero-img" src={e.image} alt={k.name} decoding="async" fetchPriority="high" />}
        <div className="sf-wrap sf-enter">
          <nav aria-label={c.common.breadcrumb}>
            <ol className="sf-crumbs">
              <li><Link to="/" viewTransition>Shaan Fitness</Link></li>
              <li><Link to={PATHS.events} viewTransition>{c.nav.events}</Link></li>
              <li aria-current="page">{k.name.length > 34 ? year(e) : k.name}</li>
            </ol>
          </nav>
          <p className="sf-ev-role">{k.role}</p>
          <h1 id="sf-h1" className="sf-h1">{k.name}</h1>
          <p className="sf-lede">{k.intro}</p>
          <dl className="sf-ev-facts">
            {k.facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
          </dl>
          <div className="sf-ctas" style={{ marginTop: 28 }}>
            <SiteLink e={e} label={k.open} className="sf-btn sf-btn-red sf-magnet" />
            <a href="#gallery" className="sf-btn sf-btn-glass sf-magnet">{Ic.instagram(18)}{c.eventsPage.gallery}</a>
            {k.links?.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="sf-btn sf-magnet">{l.t}</a>)}
          </div>
        </div>
      </section>

      <Section title={c.eventsPage.story}>
        <div className="sf-ev-story">
          <p className="sf-ev-bigstat"><b>{k.stat.v}</b><span>{k.stat.k}</span></p>
          <div>{k.story.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}</div>
        </div>
      </Section>

      {k.blocks.map((b, i) => (
        <Section key={b.title} title={b.title} sub={b.sub} tone={i % 2 ? undefined : 'ink'}>
          <div className={`sf-ev-items ${b.items.some((x) => x.img) ? 'has-img' : ''} is-${Math.min(b.items.length, 4)}`}>
            {b.items.map((x, j) => (
              <article key={x.t} className="sf-card sf-spot">
                {x.img && <img src={x.img} alt={x.t} loading="lazy" decoding="async" />}
                {b.numbered && <span className="sf-ev-n">{j + 1}</span>}
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </article>
            ))}
          </div>
        </Section>
      ))}

      <Gallery posts={e.gallery} name={k.name} />

      <Section title={c.eventsPage.more}>
        <div className="sf-ev-grid">{others.map((x) => <EventCard key={x.id} e={x} lang={lang} />)}</div>
        <p style={{ marginTop: 28 }}><Link to={PATHS.events} viewTransition className="sf-btn sf-btn-glass">{c.eventsPage.all}</Link></p>
      </Section>
    </>
  )
}
