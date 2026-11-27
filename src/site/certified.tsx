import { Link } from 'react-router-dom'
import { Ic } from './art'
import { PATHS } from './content'
import { useCopy } from './layout'
import { Cards, Section } from './sections'

// Shaan Fitness's IREFs membership (Indian Register for Exercise Facilities, under the Swastha Bharat Abhiyan): its
// own page with the certificate, what it means, IREFs' CPR technique, and the announcement post; and the small badge
// that links to it from the home page, the About page and the footer. Facts are from the certificate itself.
// The IREFs and Swastha Bharat Abhiyan logos are IREFs' official files, used as its branding guidelines (21 Mar 2025)
// allow: colours and aspect ratio untouched (IREFs 1:1, Swastha Bharat Abhiyan about 2.05:1), always on white, as
// they are drawn to be seen; no filters on the logos themselves.

const POST = 'https://www.instagram.com/p/DMFKrynBHGd/'
// Our listing on the IREFs register (the same page the certificate's QR code verifies against).
const LISTING = 'https://irefs.in/center-detail?id=IREFsSBASH0720251042'
const CPR_PDF = '/certified/cpr-technique-irefs.pdf'

/** The IREFs seal with one line, linking to the page. */
export function CertBadge() {
  const { c } = useCopy()
  return (
    <Link to={PATHS.certified} viewTransition className="sf-cert-badge">
      <span className="sf-cert-logo"><img src="/certified/irefs-logo.webp" alt="IREFs" width={400} height={400} loading="lazy" decoding="async" /></span>
      <span><b>{c.certified.badge}</b><small>{c.certified.badgeSub}</small></span>
    </Link>
  )
}

export function CertifiedPage() {
  const { c } = useCopy()
  const k = c.certified
  return (
    <>
      <section className="sf-page-hero sf-ev-hero" aria-labelledby="sf-h1">
        <div className="sf-hero-bg" />
        <div className="sf-wrap sf-enter sf-cert-hero">
          <div>
            <nav aria-label={c.common.breadcrumb}>
              <ol className="sf-crumbs"><li><Link to="/" viewTransition>Shaan Fitness</Link></li><li aria-current="page">{c.nav.certified}</li></ol>
            </nav>
            <p className="sf-ev-role">{k.role}</p>
            <h1 id="sf-h1" className="sf-h1">{k.h1}</h1>
            <p className="sf-lede">{k.intro}</p>
            <dl className="sf-ev-facts">
              {k.facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
            </dl>
            <div className="sf-ctas" style={{ marginTop: 28 }}>
              <a href={LISTING} target="_blank" rel="noopener" className="sf-btn sf-btn-red sf-magnet">{k.verify}{Ic.external(16)}</a>
              <a href={POST} target="_blank" rel="noopener" className="sf-btn sf-btn-glass sf-magnet">{Ic.instagram(18)}{k.post}</a>
            </div>
          </div>
          <div className="sf-cert-logos">
            <img src="/certified/irefs-logo.webp" alt="IREFs, Indian Register for Exercise Facilities" width={400} height={400} decoding="async" />
            <img src="/certified/swastha-bharat-abhiyan.webp" alt="Swastha Bharat Abhiyan" width={600} height={288} decoding="async" />
          </div>
        </div>
      </section>

      <Section title={k.certTitle} sub={k.certSub}>
        <figure className="sf-cert-doc">
          <img src="/certified/irefs-certificate.webp" alt={k.certAlt} width={1600} height={1135} loading="lazy" decoding="async" />
        </figure>
      </Section>

      <Section title={k.meansTitle} tone="deep"><Cards items={k.means} cols={2} /></Section>

      <Section title={k.cprTitle} sub={k.cprSub} id="cpr">
        <div className="sf-cpr">
          <ol className="sf-cpr-steps">
            {k.cprSteps.map((s, i) => (
              <li key={s.t}><span className="sf-cpr-n">{i + 1}</span><div><h3>{s.t}</h3><p>{s.d}</p></div></li>
            ))}
          </ol>
          <figure className="sf-cpr-poster">
            <a href={CPR_PDF} target="_blank" rel="noopener"><img src="/certified/cpr-technique.webp" alt={k.cprAlt} width={1000} height={1413} loading="lazy" decoding="async" /></a>
            <figcaption><a className="sf-btn sf-btn-sm sf-btn-glass" href={CPR_PDF} download>{k.cprPdf}</a></figcaption>
          </figure>
        </div>
      </Section>

      <Section title={k.postTitle} sub={k.postSub} tone="deep">
        <div className="sf-ig-grid">
          <figure className="sf-ig">
            <iframe src={`${POST}embed/`} title={`${k.postTitle}: Instagram`} loading="lazy" scrolling="no" allowFullScreen />
            <figcaption><a href={POST} target="_blank" rel="noreferrer">{Ic.instagram(14)}Instagram</a></figcaption>
          </figure>
        </div>
      </Section>
    </>
  )
}
