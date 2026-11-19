import { Link } from 'react-router-dom'
import type { SiteInfo } from '../db/site'
import { Ic, Squad } from './art'
import { PATHS, fill } from './content'
import { cycle, offers } from './data'
import { guideById, type GuideBlock, type GuideId } from './guides'
import { useCopy } from './layout'
import {
  AppShowcase, Athletic, BmiCheck, Cards, Checks, CoachGrid, JoinSteps, Method, PageHero, Section, Subscriptions, offerNote, sizeLine,
} from './sections'

// The explain-first pages (semi-private training, the assessment, the goal pages): a hero, then the page's blocks in
// order. The page's questions and the assessment form are added by SitePage, as on every page.

/** The ways to train, drawn as one coach and the people with them. Names and group sizes come from the CRM; no prices. */
function Ways({ site, title, sub, tone }: { site: SiteInfo; title: string; sub?: string; tone?: 'deep' | 'ink' }) {
  const { c } = useCopy()
  const list = offers(site).filter((o) => o.size != null)
  if (!list.length) return null
  return (
    <Section title={title} sub={sub} tone={tone}>
      <ul className="sf-ways">
        {list.map((o) => {
          const size = sizeLine(o, c)!
          const note = offerNote(o, c)
          return (
            <li key={o.name} className="sf-card">
              <Squad size={o.size!} label={size} coach={c.subs.coach} />
              <h3 className="sf-h3">{o.name}</h3>
              <p>{size}</p>
              {note && note !== size && <p className="sf-small">{note}</p>}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

const TO = { assessment: PATHS.assessment, semi: PATHS.semi, deadlift: PATHS.deadlift, events: PATHS.events, personal: PATHS.personal, weightLoss: PATHS.weightLoss }

function Block({ b, site }: { b: GuideBlock; site: SiteInfo | null }) {
  switch (b.kind) {
    case 'cards': return <Section title={b.title} sub={b.sub} tone={b.tone}><Cards items={b.items} cols={b.cols} /></Section>
    case 'checks': return <Section title={b.title} sub={b.sub} tone={b.tone}><Checks items={b.items} /></Section>
    case 'steps':
      return (
        <Section title={b.title} sub={b.sub} tone={b.tone}>
          <ol className="sf-steps">{b.items.map((s) => <li key={s.t} className="sf-step"><h3>{s.t}</h3><p>{s.d}</p></li>)}</ol>
        </Section>
      )
    case 'compare':
      return (
        <Section title={b.title} sub={b.sub} tone={b.tone}>
          <div className="sf-compare" role="region" aria-label={b.title} tabIndex={0}>
            <table>
              <thead><tr><td />{b.cols.map((col, i) => <th key={col} scope="col" className={i === b.cols.length - 1 ? 'is-us' : undefined}>{col}</th>)}</tr></thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r.t}>
                    <th scope="row">{r.t}</th>
                    {r.v.map((v, i) => (
                      <td key={i} className={i === r.v.length - 1 ? 'is-us' : undefined}>
                        {v === 'yes' ? <span className="sf-yes" role="img" aria-label="Yes">{Ic.check(20)}</span> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )
    case 'story': {
      const cy = site ? cycle(site) : null
      const text = b.text.includes('{{sessions}}') ? (cy?.sessions ? fill(b.text, { sessions: cy.sessions }) : b.alt ?? b.text) : b.text
      return (
        <Section tone={b.tone}>
          <div className="sf-two">
            <h2 className="sf-h2">{b.title}</h2>
            <p className="sf-quote">{text}</p>
          </div>
        </Section>
      )
    }
    case 'link':
      return (
        <Section tone={b.tone}>
          <div className="sf-two">
            <h2 className="sf-h2">{b.title}</h2>
            <div style={{ display: 'grid', gap: 22, alignContent: 'start' }}>
              <p className="sf-lede">{b.text}</p>
              <div><Link to={TO[b.to]} viewTransition className="sf-btn sf-magnet">{b.label}</Link></div>
            </div>
          </div>
        </Section>
      )
    case 'ways': return site ? <Ways site={site} title={b.title} sub={b.sub} tone={b.tone} /> : null
    case 'subs': return site ? <Subscriptions site={site} title={b.title} /> : null
    case 'method': return <Method />
    case 'athletic': return <Athletic />
    case 'bmi': return <BmiCheck />
    case 'join': return <JoinSteps />
    case 'coaches': return site ? <CoachGrid site={site} limit={3} /> : null
    case 'app': return <AppShowcase />
    default: return null
  }
}

export function GuidePage({ id, site }: { id: GuideId; site: SiteInfo | null }) {
  const { lang } = useCopy()
  const k = guideById(id).copy[lang]
  return (
    <>
      <PageHero id={id} title={k.h1} intro={k.intro} site={site} />
      {k.blocks.map((b, i) => <Block key={i} b={b} site={site} />)}
    </>
  )
}
