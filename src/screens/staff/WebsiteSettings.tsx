import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import { saveWebsite, type SiteSettings } from '../../db/site'
import { uploadStudioMedia } from '../../db/classes'
import { Checkbox, Field, Notice, TextArea, TextInput } from '../../components/controls'
import { Loading, PageHeader, Section } from '../../components/ui'
import { useToast } from '../../components/toast'
import type { Studio } from '../../db/types'

// Settings › Website (Shaan Fitness addition): the words, contact details and sections of the
// public website. Plans, timings, coaches and results come straight from the CRM.
const TEXT_KEYS = ['hero_title', 'hero_text', 'about', 'hero_image_url', 'opening_hours', 'whatsapp', 'instagram', 'facebook', 'youtube', 'map_url'] as const
const STUDIO_KEYS = ['tag_line', 'mobile', 'landline', 'email', 'street1', 'street2', 'city', 'state', 'pincode'] as const
const SHOW_KEYS = [
  ['show_prices', 'Plans and prices', 'Plans with “Show in app” on, in their app order.'],
  ['show_timings', 'Timings', 'Opening hours and batch start times, worked out from your active batches.'],
  ['show_trainers', 'Coaches', 'Trainers with “Show in member app” on.'],
  ['show_results', 'Results', 'Client transformations the client agreed to share.'],
] as const

type Form = Record<(typeof TEXT_KEYS)[number] | (typeof STUDIO_KEYS)[number], string> & Record<(typeof SHOW_KEYS)[number][0], boolean>

function initial(st: Studio): Form {
  const w = ((st.settings as unknown as { website?: Partial<SiteSettings> }).website ?? {}) as Partial<SiteSettings>
  const f = {} as Form
  for (const k of TEXT_KEYS) f[k] = (w[k] as string | null | undefined) ?? ''
  for (const k of STUDIO_KEYS) f[k] = (st[k] as string | null) ?? ''
  for (const [k] of SHOW_KEYS) f[k] = w[k] ?? true
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

  const save = async () => {
    setError(null)
    for (const k of ['instagram', 'facebook', 'youtube', 'map_url'] as const) {
      if (f[k].trim() && !/^https:\/\//.test(f[k].trim())) return setError('Links must start with https:// (copy them from the browser’s address bar).')
    }
    if (f.whatsapp.trim() && f.whatsapp.replace(/\D/g, '').length < 10) return setError('Enter the WhatsApp number with all 10 digits.')
    setBusy(true)
    try {
      const picture = file ? await uploadStudioMedia(me.studioId, 'website', file) : f.hero_image_url
      const website: Record<string, unknown> = {}
      for (const k of TEXT_KEYS) website[k] = k === 'hero_image_url' ? picture : f[k]
      for (const [k] of SHOW_KEYS) website[k] = f[k]
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
      <PageHeader title="Website" sub="What visitors see on the front page of your app address. Changes show as soon as you save."
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

        <Section title="Contact and address" id="ws-contact">
          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Mobile" id="ws-mob"><TextInput id="ws-mob" type="tel" value={f.mobile} onChange={set('mobile')} /></Field>
            <Field label="WhatsApp number" id="ws-wa" hint="Leave empty to use the mobile number."><TextInput id="ws-wa" type="tel" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
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
