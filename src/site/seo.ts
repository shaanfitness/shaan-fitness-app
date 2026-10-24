import { useEffect } from 'react'
import type { SiteInfo } from '../db/site'
import { COPY, PATHS, SEO, fill, type Lang, type PageId } from './content'
import { faqFor, openSpans, rupees, salePlans, tierGroups, tierOf } from './data'

// What search engines and link previews read: title, description, canonical address, Open Graph and the
// structured data (gym, offers, breadcrumbs, FAQ). The build writes it into each page's HTML; the app keeps
// it current when people move between pages.

export const DEFAULT_ORIGIN = 'https://shaanfitness-app.netlify.app'

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function jsonLd(id: PageId, site: SiteInfo | null, origin: string, lang: Lang = 'en') {
  const c = COPY[lang]
  const url = origin + (PATHS[id] === '/' ? '/' : PATHS[id])
  const out: Record<string, unknown>[] = []
  const gymId = `${origin}/#gym`
  if (site) {
    const s = site.studio
    const w = site.website
    const spans = openSpans(site)
    const hours: Record<string, string[]> = {}
    for (let d = 1; d <= 7; d++) for (const [a, b] of spans[d]) (hours[`${hhmm(a)}-${hhmm(b)}`] ??= []).push(DAYS[d - 1])
    const plans = salePlans(site)
    out.push({
      '@context': 'https://schema.org', '@type': 'HealthClub', '@id': gymId, name: s.name, alternateName: 'SHAAN',
      slogan: s.tag_line ?? undefined, description: SEO.home.description, url: `${origin}/`, logo: `${origin}/icon-512.png`, image: `${origin}/og.png`,
      telephone: s.mobile ?? undefined, email: s.email ?? undefined,
      address: { '@type': 'PostalAddress', streetAddress: [s.street1, s.street2].filter(Boolean).join(', '), addressLocality: s.city ?? 'Kakinada',
        addressRegion: s.state ?? 'Andhra Pradesh', postalCode: s.pincode ?? undefined, addressCountry: 'IN' },
      areaServed: { '@type': 'City', name: s.city ?? 'Kakinada' },
      hasMap: w.map_url ?? undefined,
      openingHoursSpecification: Object.entries(hours).map(([k, days]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens: k.slice(0, 5), closes: k.slice(6) })),
      priceRange: plans.length && w.show_prices !== false ? `${rupees(plans[0].total_price)} - ${rupees(plans[plans.length - 1].total_price)}` : '₹₹',
      amenityFeature: s.facilities.slice(0, 12).map((f) => ({ '@type': 'LocationFeatureSpecification', name: f, value: true })),
      sameAs: [w.instagram, w.facebook, w.youtube, w.twitter, w.linkedin].filter((u): u is string => !!u && /^https:\/\//.test(u)),
      ...(plans.length && w.show_prices !== false ? {
        hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Membership plans', itemListElement: plans.map((p) => ({
          '@type': 'Offer', name: p.name, price: p.total_price, priceCurrency: 'INR', url: `${origin}${PATHS.plans}`,
          description: `${p.tenure_value} ${p.tenure_unit}${p.session_count ? `, ${p.session_count} coached sessions` : ''}`,
          category: tierOf(p) === 'group' ? 'Group training' : 'Personal training' })) },
      } : {}),
    })
  }
  if (id === 'home') out.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Shaan Fitness', url: `${origin}/`, inLanguage: ['en-IN', 'te-IN'] })
  else {
    out.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shaan Fitness', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: navName(id), item: url },
    ] })
  }
  if (site && (id === 'personal' || id === 'group' || id === 'weightLoss')) {
    out.push({ '@context': 'https://schema.org', '@type': 'Service', name: c[id].h1, serviceType: navName(id), provider: { '@id': gymId },
      areaServed: { '@type': 'City', name: site.studio.city ?? 'Kakinada' }, url, description: SEO[id].description })
  }
  if (site && id === 'coaches' && site.website.show_trainers !== false && site.trainers.length) {
    out.push({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: site.trainers.map((t, i) => ({
      '@type': 'ListItem', position: i + 1, item: { '@type': 'Person', name: t.name, jobTitle: t.title || t.designation || 'Coach', worksFor: { '@id': gymId } } })) })
  }
  const faq = faqFor(id, site, c, lang)
  if (faq.length) out.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) })
  return out
}

const NAV_NAME: Record<PageId, string> = {
  home: 'Home', personal: 'Personal training', group: 'Group training', weightLoss: 'Weight loss', plans: 'Membership plans',
  timings: 'Gym timings', coaches: 'Coaches', results: 'Transformations', about: 'About', contact: 'Contact',
}
const navName = (id: PageId) => NAV_NAME[id]

export interface Head { title: string; description: string; canonical: string; image: string; jsonld: Record<string, unknown>[] }
/** The plans page description carries live prices when the gym shows them ("Group training from ₹1,499, …"). */
function describe(id: PageId, site: SiteInfo | null) {
  const base = SEO[id].description
  if (id !== 'plans' || !site || site.website.show_prices === false) return base
  const c = COPY.en
  const groups = tierGroups(site)
  if (!groups.length) return base
  const list = groups.map((g) => `${c.tiers.names[g.tier].toLowerCase()} ${fill(c.tiers.from, { price: rupees(g.from) })}`).join(', ')
  const text = `Gym membership fees at Shaan Fitness, Kakinada: ${list}. Every plan is coached. Book a free trial.`
  return text.length <= 160 ? text : base
}

export function headFor(id: PageId, site: SiteInfo | null, origin: string): Head {
  return { title: SEO[id].title, description: describe(id, site), canonical: origin + (PATHS[id] === '/' ? '/' : PATHS[id]), image: `${origin}/og.png`, jsonld: jsonLd(id, site, origin) }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** The <head> tags as HTML, for the build. */
export function headHtml(h: Head) {
  return [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}" />`,
    `<link rel="canonical" href="${esc(h.canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Shaan Fitness" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.description)}" />`,
    `<meta property="og:url" content="${esc(h.canonical)}" />`,
    `<meta property="og:image" content="${esc(h.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="geo.region" content="IN-AP" />`,
    `<meta name="geo.placename" content="Kakinada" />`,
    ...h.jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ')
}

const setMeta = (sel: string, attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(sel)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

/** Keeps the title, description, canonical and structured data right as people move around the site. */
export function useHead(id: PageId, site: SiteInfo | null | undefined) {
  useEffect(() => {
    const h = headFor(id, site ?? null, window.location.origin)
    document.title = h.title
    setMeta('meta[name="description"]', 'name', 'description', h.description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', h.title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', h.description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', h.canonical)
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = h.canonical
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove())
    for (const j of h.jsonld) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.textContent = JSON.stringify(j)
      document.head.appendChild(s)
    }
  }, [id, site])
}
