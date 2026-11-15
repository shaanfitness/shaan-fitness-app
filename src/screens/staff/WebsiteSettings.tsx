import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import { DEFAULT_OFFERS, saveWebsite, useSite, type SiteOffer, type SiteSettings } from '../../db/site'
import { uploadStudioMedia } from '../../db/classes'
import { Checkbox, Field, Notice, TextArea, TextInput } from '../../components/controls'
import { Loading, PageHeader, Section } from '../../components/ui'
import { useToast } from '../../components/toast'
import type { Studio } from '../../db/types'

// Settings › Website (Shaan Fitness addition): the words, contact details and sections of the
// public website, and the subscriptions it sells: their names, people per coach (the website draws one
// figure per person), prices, and whether prices and group sizes show at all. Timings, coaches and
// results come straight from the CRM.
const TEXT_KEYS = ['hero_title', 'hero_text', 'about', 'hero_image_url', 'opening_hours', 'whatsapp', 'phone', 'instagram', 'facebook', 'youtube', 'map_url'] as const
const STUDIO_KEYS = ['tag_line', 'mobile', 'landline', 'email', 'street1', 'street2', 'city', 'state', 'pincode'] as const
const SHOW_KEYS = [
  ['show_prices', 'Prices', 'The price of each subscription. Off: visitors are asked to message you for the fee.'],
  ['show_sizes', 'Group sizes', 'People per coach, drawn as figures. Off: no numbers and no figures.'],
  ['show_timings', 'Timings', 'Opening hours and batch start times, worked out from your active batches.'],
  ['show_trainers', 'Coaches', 'Trainers with “Show in member app” on.'],
  ['show_results', 'Results', 'Client transformations the client agreed to share.'],
] as const

type OfferRow = { name: string; note: string; size: string; price: string; weeks: string; show: boolean }
type Form = Record<(typeof TEXT_KEYS)[number] | (typeof STUDIO_KEYS)[number], string> & Record<(typeof SHOW_KEYS)[number][0], boolean> & { offers: OfferRow[] }
const MAX_OFFERS = 6
const toRow = (o: SiteOffer): OfferRow => ({ name: o.name ?? '', note: o.note ?? '', size: o.size == null ? '' : String(o.size), price: o.price == null ? '' : String(o.price), weeks: String(o.weeks ?? 4), show: o.show !== false })
const whole = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN)

/** What the website will draw for this group size: one coach, then one figure per person. */
function People({ size }: { size: number }) {
  const n = Number.isFinite(size) ? Math.max(0, Math.min(30, size)) : 0
  const fig = (cls: string, key: number | string) => (
    <svg key={key} viewBox="0 0 24 32" width="13" height="17" className={cls} aria-hidden="true"><circle cx="12" cy="7" r="5.4" fill="currentColor" /><path d="M2.2 31c0-8.6 4.1-13.6 9.8-13.6S21.8 22.4 21.8 31z" fill="currentColor" /></svg>
  )
  return (
    <span className="flex flex-wrap items-end gap-[3px]" role="img" aria-label={`The website draws one coach and ${n} ${n === 1 ? 'person' : 'people'}`}>
      {fig('text-red', 'coach')}
      <span className="mx-1 h-px w-3 self-center bg-line" />
      {Array.from({ length: n }, (_, i) => fig('text-ink', i))}
    </span>
  )
}

function initial(st: Studio): Form {
  const w = ((st.settings as unknown as { website?: Partial<SiteSettings> }).website ?? {}) as Partial<SiteSettings>
  const f = {} as Form
  for (const k of TEXT_KEYS) f[k] = (w[k] as string | null | undefined) ?? ''
  for (const k of STUDIO_KEYS) f[k] = (st[k] as string | null) ?? ''
  for (const [k] of SHOW_KEYS) f[k] = w[k] ?? true
  f.offers = (Array.isArray(w.offers) && w.offers.length ? w.offers : DEFAULT_OFFERS).map(toRow)
  return f
}

export default function WebsiteSettings() {
  const { data: studio } = useStudio()
  if (!studio) return <Loading />
  return <WebsiteForm key={studio.id} studio={studio} />
}

function WebsiteForm({ studio }: { studio: Studio }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [f, setF] = useState<Form>(() => initial(studio))
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const setOffer = <K extends keyof OfferRow>(i: number, k: K) => (v: OfferRow[K]) => setF((x) => ({ ...x, offers: x.offers.map((o, j) => (j === i ? { ...o, [k]: v } : o)) }))
  // The website reads its subscriptions from the database once it has them; before that update, they can't be saved.
  const { data: site } = useSite()
  const ready = !site || Array.isArray(site.website.offers)

  const save = async () => {
    setError(null)
    for (const k of ['instagram', 'facebook', 'youtube', 'map_url'] as const) {
      if (f[k].trim() && !/^https:\/\//.test(f[k].trim())) return setError('Links must start with https:// (copy them from the browser’s address bar).')
    }
    if (f.whatsapp.trim() && f.whatsapp.replace(/\D/g, '').length < 10) return setError('Enter the WhatsApp number with all 10 digits.')
    if (f.phone.trim() && f.phone.replace(/\D/g, '').length < 10) return setError('Enter the call number with all 10 digits.')
    const offers: SiteOffer[] = []
    for (const o of f.offers) {
      const name = o.name.trim()
      if (!name) return setError('Give every subscription a name, or remove the empty one.')
      const size = whole(o.size), weeks = whole(o.weeks), price = o.price.trim() === '' ? null : whole(o.price.replace(/[,₹\s]/g, ''))
      if (!(size >= 1 && size <= 30)) return setError(`${name}: people per coach must be a number from 1 to 30.`)
      if (!(weeks >= 1 && weeks <= 52)) return setError(`${name}: weeks must be a number from 1 to 52.`)
      if (price !== null && !(price >= 0)) return setError(`${name}: enter the price in rupees, numbers only (or leave it empty).`)
      offers.push({ name, note: o.note.trim() || null, size, price, weeks, show: o.show })
    }
    setBusy(true)
    try {
      const picture = file ? await uploadStudioMedia(me.studioId, 'website', file) : f.hero_image_url
      const website: Record<string, unknown> = {}
      for (const k of TEXT_KEYS) website[k] = k === 'hero_image_url' ? picture : f[k]
      for (const [k] of SHOW_KEYS) website[k] = f[k]
      if (ready) website.offers = offers
      const st: Record<string, string> = {}
      for (const k of STUDIO_KEYS) st[k] = f[k]
      await saveWebsite(me.studioId, { website: website as Partial<SiteSettings>, studio: st })
      setF((x) => ({ ...x, hero_image_url: picture }))
      setFile(null)
      await Promise.all([qc.invalidateQueries({ queryKey: ['site'] }), qc.invalidateQueries({ queryKey: ['studio'] })])
      toast('Website saved')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Website" sub="What visitors see on your website: its subscriptions, prices, group sizes, words and contact numbers. Changes show as soon as you save."
        actions={<a href="/" target="_blank" rel="noreferrer" className="btn btn-sm">Open the website</a>} />
      <form onSubmit={(e) => { e.preventDefault(); save() }} className="flex max-w-[900px] flex-col pb-10">
        <Section title="Front page" id="ws-front">
          <div className="card grid gap-4 p-5">
            <Field label="Headline" id="ws-title" hint={`Leave empty to use your tag line${studio.tag_line ? ` (“${studio.tag_line}”)` : ''} or “Your trusted health partner”.`}>
              <TextInput id="ws-title" value={f.hero_title} onChange={set('hero_title')} maxLength={80} />
            </Field>
            <Field label="Text under the headline" id="ws-text" hint="One or two sentences. Leave empty for the standard text.">
              <TextArea id="ws-text" value={f.hero_text} onChange={set('hero_text')} rows={2} />
            </Field>
            <Field label="Tag line" id="ws-tag" hint="Also used on invoices and in the app.">
              <TextInput id="ws-tag" value={f.tag_line} onChange={set('tag_line')} maxLength={80} />
            </Field>
            <Field label="About us" id="ws-about" hint="Shown above your training and facilities. Optional.">
              <TextArea id="ws-about" value={f.about} onChange={set('about')} rows={4} />
            </Field>
            <Field label="Front picture" id="ws-pic" hint="A wide photo of your gym looks best. It sits faintly behind the headline.">
              <input id="ws-pic" type="file" accept="image/*" className="input pt-2.5" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            {f.hero_image_url && !file && (
              <div className="flex items-center gap-3">
                <img src={f.hero_image_url} alt="Current front picture" className="h-20 w-36 rounded-xl border border-line object-cover" />
                <button type="button" className="link-btn text-[13px]" onClick={() => set('hero_image_url')('')}>Remove picture</button>
              </div>
            )}
          </div>
        </Section>

        <Section title="Subscriptions" id="ws-subs">
          <div className="card grid gap-4 p-5">
            <p className="m-0 text-[13px] text-muted">
              The ways to train the website sells, in this order. “People per coach” is the group size: the website draws one figure for each person,
              so 8 draws eight and 6 draws six. Prices and group sizes show only while their switches under “Show on the website” are on.
            </p>
            {!ready && <Notice tone="warn">The website is showing your three standard subscriptions. To change them from here, the database needs its latest update first (the update file from Claude, pasted into Supabase). Everything else on this page saves as usual.</Notice>}
            {f.offers.map((o, i) => (
              <fieldset key={i} className="m-0 grid min-w-0 gap-3 rounded-xl border border-line p-4 sm:grid-cols-6" disabled={!ready}>
                <legend className="px-1 text-[12px] font-semibold text-muted">Subscription {i + 1}</legend>
                <Field label="Name" id={`ws-o-name-${i}`} className="sm:col-span-3"><TextInput id={`ws-o-name-${i}`} value={o.name} onChange={setOffer(i, 'name')} maxLength={60} placeholder="Advanced Training" /></Field>
                <Field label="One line about it" id={`ws-o-note-${i}`} className="sm:col-span-3"><TextInput id={`ws-o-note-${i}`} value={o.note} onChange={setOffer(i, 'note')} maxLength={120} placeholder="Group of 8 approx" /></Field>
                <Field label="People per coach" id={`ws-o-size-${i}`} className="sm:col-span-2"><TextInput id={`ws-o-size-${i}`} inputMode="numeric" value={o.size} onChange={setOffer(i, 'size')} maxLength={2} /></Field>
                <Field label="Price (₹)" id={`ws-o-price-${i}`} className="sm:col-span-2" hint="Empty: “Ask us for the fee”."><TextInput id={`ws-o-price-${i}`} inputMode="numeric" value={o.price} onChange={setOffer(i, 'price')} maxLength={9} /></Field>
                <Field label="Weeks" id={`ws-o-weeks-${i}`} className="sm:col-span-2"><TextInput id={`ws-o-weeks-${i}`} inputMode="numeric" value={o.weeks} onChange={setOffer(i, 'weeks')} maxLength={2} /></Field>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-6">
                  <People size={whole(o.size)} />
                  <div className="flex items-center gap-4">
                    <Checkbox checked={o.show} onChange={setOffer(i, 'show')} label="Show on the website" />
                    {f.offers.length > 1 && <button type="button" className="link-btn text-[13px]" onClick={() => setF((x) => ({ ...x, offers: x.offers.filter((_, j) => j !== i) }))}>Remove</button>}
                  </div>
                </div>
              </fieldset>
            ))}
            {ready && f.offers.length < MAX_OFFERS && (
              <button type="button" className="btn btn-sm self-start justify-self-start" onClick={() => setF((x) => ({ ...x, offers: [...x.offers, { name: '', note: '', size: '1', price: '', weeks: '4', show: true }] }))}>Add a subscription</button>
            )}
          </div>
        </Section>

        <Section title="Contact and address" id="ws-contact">
          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Call number on the website" id="ws-call" hint="The number behind every Call button."><TextInput id="ws-call" type="tel" value={f.phone} onChange={set('phone')} /></Field>
            <Field label="WhatsApp number" id="ws-wa" hint="The number behind every WhatsApp button."><TextInput id="ws-wa" type="tel" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
            <Field label="Studio mobile" id="ws-mob" hint="For invoices and the app. Not shown on the website."><TextInput id="ws-mob" type="tel" value={f.mobile} onChange={set('mobile')} /></Field>
            <Field label="Landline" id="ws-land"><TextInput id="ws-land" type="tel" value={f.landline} onChange={set('landline')} /></Field>
            <Field label="Email" id="ws-email"><TextInput id="ws-email" type="email" value={f.email} onChange={set('email')} /></Field>
            <Field label="Address line 1" id="ws-s1"><TextInput id="ws-s1" value={f.street1} onChange={set('street1')} /></Field>
            <Field label="Address line 2" id="ws-s2"><TextInput id="ws-s2" value={f.street2} onChange={set('street2')} /></Field>
            <Field label="City" id="ws-city"><TextInput id="ws-city" value={f.city} onChange={set('city')} /></Field>
            <Field label="State" id="ws-state"><TextInput id="ws-state" value={f.state} onChange={set('state')} /></Field>
            <Field label="Pincode" id="ws-pin"><TextInput id="ws-pin" inputMode="numeric" value={f.pincode} onChange={set('pincode')} maxLength={6} /></Field>
            <Field label="Google Maps link" id="ws-map" hint="In Google Maps open your gym › Share › Copy link. Empty searches by name and address.">
              <TextInput id="ws-map" value={f.map_url} onChange={set('map_url')} placeholder="https://maps.app.goo.gl/…" />
            </Field>
            <Field label="Hours note" id="ws-hours" className="sm:col-span-2" hint="Optional. Shown under the hours worked out from your batches, for example “Sunday: 6–9 AM, ladies only”.">
              <TextArea id="ws-hours" value={f.opening_hours} onChange={set('opening_hours')} rows={2} />
            </Field>
          </div>
        </Section>

        <Section title="Social links" id="ws-social">
          <div className="card grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Instagram" id="ws-ig"><TextInput id="ws-ig" value={f.instagram} onChange={set('instagram')} placeholder="https://instagram.com/…" /></Field>
            <Field label="Facebook" id="ws-fb"><TextInput id="ws-fb" value={f.facebook} onChange={set('facebook')} placeholder="https://facebook.com/…" /></Field>
            <Field label="YouTube" id="ws-yt"><TextInput id="ws-yt" value={f.youtube} onChange={set('youtube')} placeholder="https://youtube.com/…" /></Field>
          </div>
        </Section>

        <Section title="Show on the website" id="ws-show">
          <div className="card flex flex-col gap-1 p-5">
            {SHOW_KEYS.map(([k, label, hint]) => (
              <div key={k} className="flex flex-col border-b border-line-soft pb-2 last:border-b-0">
                <Checkbox checked={f[k]} onChange={set(k)} label={<strong>{label}</strong>} />
                <span className="pl-[28px] text-[12px] text-faint">{hint}</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="flex flex-col gap-3 px-5 pt-6 lg:px-8">
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" className="btn-gold self-start px-8" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </>
  )
}
