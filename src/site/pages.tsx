import type { ReactNode } from 'react'
import { useSite, type SiteInfo } from '../db/site'
import { PATHS, type Copy, type PageId } from './content'
import { faqFor, openSpans, tierGroups } from './data'
import { SiteLayout, useCopy } from './layout'
import {
  AppShowcase, Athletic, BmiCheck, Cards, Checks, CoachGrid, CompareTable, ContactBlock, Cta, DayRail, Faq, HoursTable, JoinSteps,
  Manifesto, Marquee, Method, PageHero, PlanTable, ResultsGrid, Section, Studio, Tiers,
} from './sections'
import { useHead } from './seo'
import { CineHero } from './hero/CineHero'

// One component per page. Each page answers one search ("personal trainer in Kakinada", "gym timings", …), ends with
// its own questions (also sent to Google as FAQ data) and the free trial form.

function Story({ title, text, aside }: { title: string; text: string; aside?: ReactNode }) {
  return (
    <div className="sf-two">
      <h2 className="sf-h2">{title}</h2>
      <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
        <p className="sf-quote">{text}</p>
        {aside}
      </div>
    </div>
  )
}

const hero = (c: Copy, id: Exclude<PageId, 'home'>) => {
  const k = id === 'coaches' ? c.coachesPage : id === 'results' ? c.resultsPage : c[id]
  return { title: k.h1, intro: k.intro }
}

function Body({ id, site }: { id: PageId; site: SiteInfo | null }) {
  const { c } = useCopy()
  if (id === 'home') {
    return (
      <>
        <CineHero site={site} />
        {site && <Marquee site={site} />}
        <Manifesto />
        <Method />
        {site && <Tiers site={site} />}
        {site && <Studio site={site} />}
        <Athletic />
        {site && <CoachGrid site={site} limit={3} />}
        {site && <ResultsGrid site={site} />}
        {site && <DayRail site={site} />}
      </>
    )
  }
  const h = hero(c, id)
  const top = <PageHero id={id} title={h.title} intro={h.intro} site={site} />
  switch (id) {
    case 'personal': {
      const semi = site ? tierGroups(site).some((g) => g.tier === 'semi') : false
      return (
        <>
          {top}
          <Section title={c.personal.includesTitle}><Checks items={c.personal.includes} /></Section>
          <Section title={c.personal.forTitle} tone="deep"><Cards items={c.personal.for} /></Section>
          {site && <Tiers site={site} only={['semi', 'elite']} title={c.nav.personal} max={6} />}
          {semi && <Section tone="ink"><Story title={c.personal.semiTitle} text={c.personal.semiText} /></Section>}
          <Athletic />
          {site && <CoachGrid site={site} limit={3} />}
          <AppShowcase />
        </>
      )
    }
    case 'group':
      return (
        <>
          {top}
          <Section title={c.group.whyTitle}><Cards items={c.group.why} cols={2} /></Section>
          <Method />
          {site && <DayRail site={site} only={['group']} title={c.group.batchesTitle} />}
          {site && <Tiers site={site} only={['group']} title={c.nav.group} max={6} />}
          <JoinSteps />
        </>
      )
    case 'weightLoss':
      return (
        <>
          {top}
          <Section title={c.weightLoss.howTitle}><Cards items={c.weightLoss.how} /></Section>
          <Section tone="deep">
            <div className="sf-two">
              <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
                <h2 className="sf-h2">{c.weightLoss.trackTitle}</h2>
                <Checks items={c.weightLoss.track} />
              </div>
              <div className="sf-card" style={{ alignSelf: 'start' }}>
                <h3 className="sf-h3">{c.weightLoss.paceTitle}</h3>
                <p>{c.weightLoss.paceText}</p>
              </div>
            </div>
          </Section>
          <BmiCheck />
          {site && <Tiers site={site} />}
          <AppShowcase />
        </>
      )
    case 'plans':
      return (
        <>
          {top}
          {site && tierGroups(site).length > 0 && site.website.show_prices !== false && <Section title={c.plans.allTitle}><PlanTable site={site} /></Section>}
          {site && tierGroups(site).length > 1 && <Section title={c.plans.compareTitle} tone="deep"><CompareTable site={site} /></Section>}
          {site && site.website.show_prices === false && <Tiers site={site} />}
          <Section tone="ink"><Story title={c.plans.freezeTitle} text={c.plans.freezeText} /></Section>
          <JoinSteps />
        </>
      )
    case 'timings': {
      const sundayClosed = site ? !openSpans(site)[7].length : false
      return (
        <>
          {top}
          {site && (
            <Section title={c.timings.hoursTitle}>
              <div className="sf-two">
                <HoursTable site={site} />
                {sundayClosed && <p className="sf-quote">{c.timings.sundayNote}</p>}
              </div>
            </Section>
          )}
          {site && <DayRail site={site} title={c.timings.batchesTitle} link={false} />}
          {site && <Tiers site={site} />}
        </>
      )
    }
    case 'coaches':
      return (
        <>
          {top}
          {site && <CoachGrid site={site} heading={false} />}
          <Method />
          <JoinSteps />
        </>
      )
    case 'results':
      return (
        <>
          {top}
          {site && <ResultsGrid site={site} empty />}
          <BmiCheck />
        </>
      )
    case 'about':
      return (
        <>
          {top}
          <Section><Story title={c.about.storyTitle} text={c.about.story} /></Section>
          <Manifesto />
          {site ? <Studio site={site} /> : <Section title={c.about.spaceTitle} sub={c.about.space}><span /></Section>}
          <Section title={c.about.valuesTitle} tone="deep"><Cards items={c.about.values} /></Section>
          {site && <CoachGrid site={site} limit={3} />}
        </>
      )
    case 'contact':
      return (
        <>
          {top}
          {site && <Section><ContactBlock site={site} /></Section>}
        </>
      )
  }
}

/** A whole page of the website: frame, page body, its questions and the free trial form. */
export function SitePage({ id }: { id: PageId }) {
  const { data } = useSite()
  const site = data ?? null
  const { c, lang } = useCopy()
  useHead(id, site)
  return (
    <SiteLayout>
      <Body id={id} site={site} />
      <Faq items={faqFor(id, site, c, lang)} />
      <Cta site={site} page={id} />
    </SiteLayout>
  )
}

/** Route elements for every page, for App.tsx and the build. */
export const SITE_ROUTES = (Object.keys(PATHS) as PageId[]).map((id) => ({ id, path: PATHS[id] }))
