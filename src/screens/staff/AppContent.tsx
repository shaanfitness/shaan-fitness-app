import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useServices, useStudio } from '../../db/studio'
import { uploadStudioMedia } from '../../db/classes'
import { saveWebsite, type SiteSettings } from '../../db/site'
import {
  BANNER_CATEGORIES, BANNER_FILTER, ICONS, LINKS, LIVE_LINKS, QUICK_ICONS, SHOW_TO, iconFor, linkLabel,
} from '../../db/center'
import { fmtDay } from '../../lib/dates'
import type { Service, Studio } from '../../db/types'
import { ActiveChip, CrudFormPage, CrudList, studioLine, type CrudDef } from '../../components/crud'
import { Checkbox, Field, Notice, Select, TextInput } from '../../components/controls'
import { DataTable } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL App Settings: Services List, Gallery Image, Action Item, Quick Action Item, Banner Image,
// Add Social Links & QR. What members see in the app comes from here.
type Row = { id: string; created_at?: string; active?: boolean } & Record<string, unknown>
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function LiveChip({ link }: { link: unknown }) {
  return LIVE_LINKS.has(str(link))
    ? <span className="chip chip-green">In the app now</span>
    : <span className="chip chip-muted" title="Shows in the app when this screen arrives">With the member app</span>
}

// Gallery Image -------------------------------------------------------------------------------------------------
export const galleryDef = (center: string): CrudDef<Row> => ({
  table: 'gallery_images', title: 'Gallery Listing', noun: 'Gallery', nounPlural: 'Gallery images', addLabel: 'Add Gallery',
  basePath: '/app-settings/gallery', pageForm: true, imageFolder: 'gallery', bulk: ['delete'],
  order: { column: 'created_at', ascending: false },
  columns: [
    { key: 'img', header: 'Image', cell: (r) => <img src={str(r.image_url)} alt="" className="h-16 w-28 rounded-lg border border-line object-cover" /> },
    { key: 'center', header: 'Fitness Center Name', cell: () => center },
    { key: 'type', header: 'Image Type', cell: (r) => [r.is_gallery ? 'Gallery' : null, r.is_offer ? 'Offer' : null].filter(Boolean).join(', ') },
  ],
  card: (r) => <div className="flex items-center gap-3"><img src={str(r.image_url)} alt="" className="h-14 w-24 rounded-lg border border-line object-cover" /><span className="text-[13px] text-muted">{center}</span></div>,
  fields: [
    { key: 'image_url', label: 'Upload Image', type: 'image', required: true },
    { key: 'is_gallery', label: 'Gallery Image', type: 'checkbox', default: true },
    { key: 'is_offer', label: 'Offer Image', type: 'checkbox' },
    { key: 'login_screen', label: 'Gallery Login Screen', type: 'select', placeholder: 'Select Login Type',
      options: [{ value: 'NUMBER_LOGIN', label: 'NUMBER LOGIN' }, { value: 'SLIDER_LOGIN', label: 'SLIDER LOGIN' }] },
  ],
  validate: (v) => (v.is_gallery || v.is_offer ? null : 'Choose the image type: Gallery Image, Offer Image or both.'),
  emptyText: 'No pictures yet. Gallery pictures show in the member app.',
})

function useCenterName() { const { data } = useStudio(); return data ? `${data.name}${data.branch_name ? ` (${data.branch_name})` : ''}` : '' }
export function GalleryList() { const c = useCenterName(); return <CrudList def={galleryDef(c)} /> }
export function GalleryForm() { const c = useCenterName(); return <CrudFormPage def={galleryDef(c)} title="Gallery Basic Information" /> }

// Action Item and Quick Action Item ---------------------------------------------------------------------------------
export const actionDef = (kind: 'action' | 'quick'): CrudDef<Row> => {
  const q = kind === 'quick'
  const word = q ? 'Quick Action Item' : 'Action Item'
  return {
    table: 'app_actions', fixed: { kind }, title: `${word}s Listing`, noun: q ? 'Quick action item' : 'Action', addLabel: `Add ${word}`,
    basePath: q ? '/app-settings/quick-actions' : '/app-settings/actions', pageForm: true,
    order: { column: 'ordering', ascending: true },
    searchText: (r) => str(r.name),
    columns: [
      ...(q ? [] : [{ key: 'icon', header: 'Icon', cell: (r: Row) => <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line" style={{ color: str(r.color) === '#000000' ? undefined : str(r.color) }}><Icon name={iconFor(r.icon)} size={20} /></span> }]),
      { key: 'name', header: 'Item Name', cell: (r) => <div className="flex flex-col gap-1"><strong>{str(r.name)}</strong><span className="text-[12px] text-muted">{linkLabel(r.link)}</span></div> },
      { key: 'order', header: 'No. of Order', cell: (r) => str(r.ordering) },
      { key: 'color', header: 'Colour', cell: (r) => <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-line-strong" style={{ background: str(r.color) }} />{str(r.color)}</span> },
      { key: 'status', header: 'Status', cell: (r) => <ActiveChip on={r.active} /> },
      { key: 'app', header: 'Member app', cell: (r) => <LiveChip link={r.link} /> },
      { key: 'date', header: 'Date', cell: (r) => fmtDay(str(r.created_at), 'MMM dd, yyyy') },
    ],
    card: (r) => <div className="flex flex-col gap-1"><strong>{str(r.name)}</strong><span className="text-[12px] text-muted">{linkLabel(r.link)} · order {str(r.ordering)}</span><div className="flex gap-1.5"><ActiveChip on={r.active} /><LiveChip link={r.link} /></div></div>,
    fields: [
      { key: 'name', label: `${word} Name`, type: 'text', required: true },
      { key: 'icon', label: 'Add Icon', type: 'select', required: !q, placeholder: 'Select Icon', options: (q ? QUICK_ICONS : ICONS).map(({ value, label }) => ({ value, label })) },
      { key: 'color', label: 'Add Colour', type: 'color', required: true, default: '#000000' },
      { key: 'active', label: 'Is active', type: 'checkbox', default: true },
      { key: 'link', label: 'Add Link Name', type: 'select', required: true, placeholder: 'Select Link Name', options: LINKS, full: true },
      { key: 'show_to', label: `Show the ${word} to`, type: 'radio', required: true, default: 'both', options: SHOW_TO },
      { key: 'link_id', label: 'Add Link Id', type: 'text', optional: true, hint: 'For a web page or external link, the full address (https://…).' },
      { key: 'action_id', label: q ? 'Add Quick Action Item Id' : 'Add Action Id', type: 'text', optional: true },
      { key: 'ordering', label: 'Ordering', type: 'number', optional: true, default: '0' },
    ],
  }
}
export function ActionList({ kind }: { kind: 'action' | 'quick' }) { return <CrudList key={kind} def={actionDef(kind)} /> }
export function ActionForm({ kind }: { kind: 'action' | 'quick' }) {
  return <CrudFormPage key={kind} def={actionDef(kind)} title={kind === 'quick' ? 'Quick Action Item Basic Information' : 'Action Item Basic Information'} />
}

// Banner Image ------------------------------------------------------------------------------------------------------
export const bannerDef = (filter?: string): CrudDef<Row> => ({
  table: 'app_banners', title: 'Banners Listing', noun: 'Banner', addLabel: 'Add Banner', basePath: '/app-settings/banners', pageForm: true, imageFolder: 'banners',
  order: { column: 'ordering', ascending: true },
  searchText: (r) => str(r.name),
  columns: [
    { key: 'name', header: 'Banner Name', cell: (r) => <div className="flex items-center gap-3"><img src={str(r.image_url)} alt="" className="h-12 w-20 rounded-lg border border-line object-cover" /><strong>{str(r.name)}</strong></div> },
    { key: 'order', header: 'No. of Order', cell: (r) => str(r.ordering) },
    { key: 'status', header: 'Status', cell: (r) => <ActiveChip on={r.active} /> },
    { key: 'cat', header: 'Category', cell: (r) => ((r.categories as string[]) ?? []).join(', ') || 'None' },
    { key: 'date', header: 'Date', cell: (r) => fmtDay(str(r.created_at), 'MMM dd, yyyy') },
  ],
  card: (r) => <div className="flex items-center gap-3"><img src={str(r.image_url)} alt="" className="h-12 w-20 rounded-lg border border-line object-cover" /><div className="flex flex-col gap-1"><strong>{str(r.name)}</strong><ActiveChip on={r.active} /></div></div>,
  filters: (_rows, set) => <BannerFilter initial={filter} apply={set} />,
  fields: [
    { key: 'name', label: 'Banner Name', type: 'text', required: true },
    { key: 'image_url', label: 'Upload Banner image', type: 'image', required: true, hint: 'A wide picture (about 3:1) looks best in the app.' },
    { key: 'web_url', label: 'Website URL', type: 'text', placeholder: 'https://' },
    { key: 'active', label: 'Is active', type: 'checkbox', default: true },
    { key: 'external_link', label: 'Is external link', type: 'checkbox' },
    { key: 'link', label: 'Link', type: 'select', placeholder: 'Select Link Name', options: LINKS, full: true },
    { key: 'categories', label: 'Category', type: 'multiselect', options: BANNER_CATEGORIES.map((x) => ({ value: x, label: x })), placeholder: 'Select Category',
      hint: '“Top Sponsored” banners show at the top of the member app.' },
    { key: 'show_to', label: 'Show the banner to', type: 'radio', required: true, default: 'both', options: SHOW_TO },
    { key: 'meta_description', label: 'Meta Link', type: 'text', optional: true },
    { key: 'meta_keywords', label: 'Meta Link Id', type: 'text', optional: true },
    { key: 'ordering', label: 'Ordering', type: 'number', optional: true, default: '0' },
  ],
  emptyText: 'No banners yet. Add your offers and announcements here; active ones show in the member app.',
})

function BannerFilter({ initial, apply }: { initial?: string; apply: (f: (r: Row) => boolean) => void }) {
  const [cat, setCat] = useState(initial ?? '')
  return <Select small ariaLabel="Category" value={cat} placeholder="Select Category" options={BANNER_FILTER.map((x) => ({ value: x, label: x }))}
    onChange={(v) => { setCat(v); apply((r) => !v || ((r.categories as string[]) ?? []).includes(v)) }} className="w-auto" />
}
export function BannerList() { return <CrudList def={bannerDef()} /> }
export function BannerForm() { return <CrudFormPage def={bannerDef()} title="Banner Basic Information" /> }

// Services List -----------------------------------------------------------------------------------------------------
export function ServicesList() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const { data: all = [], isLoading } = useServices()
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<Service | null>(null)
  const [remove, setRemove] = useState<Service | null>(null)
  const rows = useMemo(() => all.filter((v) => v.active).sort((a, b) => a.sort - b.sort)
    .filter((v) => !search || `${v.name} ${v.custom_name ?? ''}`.toLowerCase().includes(search.toLowerCase())), [all, search])
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['services'] }), qc.invalidateQueries({ queryKey: ['site'] })])
  const move = useMutation({
    mutationFn: async ({ i, dir }: { i: number; dir: -1 | 1 }) => {
      const a = rows[i], b = rows[i + dir]
      if (!a || !b) return
      throwIf(await supabase.from('services').update({ sort: b.sort }).eq('id', a.id).select('id'))
      throwIf(await supabase.from('services').update({ sort: a.sort }).eq('id', b.id).select('id'))
    },
    onSuccess: refresh, onError: (e: Error) => toast(e.message),
  })
  const del = useMutation({
    mutationFn: async (v: Service) => { throwIf(await supabase.from('services').update({ active: false }).eq('id', v.id).select('id')) },
    onSuccess: async () => { await refresh(); setRemove(null); toast('Service removed from your fitness center') },
    onError: (e: Error) => toast(e.message),
  })
  if (!studio) return <Loading />
  return (
    <>
      <PageHeader title="Service Listing" sub={studioLine(studio)} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="relative max-w-[420px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={setSearch} placeholder="Search by name or custom name…" className="pl-9" />
        </div>
        <DataTable<Service> loading={isLoading} rows={rows} rowKey={(v) => v.id} caption="Services"
          columns={[
            { key: 'order', header: '#', cell: (v) => {
              const i = rows.indexOf(v)
              return (
                <div className="flex items-center gap-1">
                  <button type="button" className="icon-btn icon-sm" aria-label={`Move ${v.name} up`} disabled={i === 0 || move.isPending || !!search} onClick={() => move.mutate({ i, dir: -1 })}><Icon name="chevronLeft" size={14} className="rotate-90" /></button>
                  <button type="button" className="icon-btn icon-sm" aria-label={`Move ${v.name} down`} disabled={i === rows.length - 1 || move.isPending || !!search} onClick={() => move.mutate({ i, dir: 1 })}><Icon name="chevronRight" size={14} className="rotate-90" /></button>
                  <span className="w-6 text-center text-muted">{i}</span>
                </div>
              )
            } },
            { key: 'name', header: 'Name / Custom Name', cell: (v) => <div className="flex flex-col"><strong>{v.name}</strong>{v.custom_name && <span className="text-[12px] text-muted">Shown as “{v.custom_name}”</span>}</div> },
            { key: 'nav', header: 'Navigate To', cell: (v) => (v.navigate_to === 'class_listing' ? 'Class Listing' : v.navigate_to === 'membership_plans' ? 'Membership Plans' : '—') },
            { key: 'show', header: 'Show in App', cell: (v) => (v.show_in_app ? <span className="chip chip-green">Yes</span> : <span className="chip chip-muted">No</span>) },
            { key: 'banner', header: 'Banner', cell: (v) => (v.banner_url ? <img src={v.banner_url} alt="" className="h-10 w-16 rounded border border-line object-cover" /> : <span className="text-muted">No img</span>) },
            { key: 'action', header: 'Action', cell: (v) => <div className="flex gap-1.5"><button type="button" className="btn btn-sm" onClick={() => setEdit(v)}>Edit</button><button type="button" className="btn btn-sm btn-danger" onClick={() => setRemove(v)}>Remove</button></div> },
          ]}
          card={(v) => (
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col"><strong>{v.custom_name || v.name}</strong><span className="text-[12px] text-muted">{v.show_in_app ? 'Shown in the app' : 'Hidden in the app'}</span></div>
              <button type="button" className="btn btn-sm" onClick={() => setEdit(v)}>Edit</button>
            </div>
          )} />
        <p className="m-0 text-[12px] text-faint">Services your center offers are ticked in My Fitness Centers › Edit › Fitness center category. The order here is the order in the app and on the website.</p>
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit ? `Edit — ${edit.name}` : ''}>
        {edit && <ServiceForm key={edit.id} service={edit} onDone={() => { setEdit(null); refresh() }} />}
      </Sheet>
      <Sheet open={!!remove} onClose={() => setRemove(null)} title="Remove Category">
        {remove && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px]">Remove <strong>{remove.name}</strong> from your fitness center? Plans and batches keep it; tick it again in My Fitness Centers to bring it back.</p>
            <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setRemove(null)}>Cancel</button>
              <button type="button" className="btn btn-danger flex-1" disabled={del.isPending} onClick={() => del.mutate(remove)}>Yes, Remove</button></div>
          </div>
        )}
      </Sheet>
    </>
  )
}

function ServiceForm({ service, onDone }: { service: Service; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const [f, setF] = useState({ custom_name: service.custom_name ?? '', navigate_to: service.navigate_to ?? '', show_in_app: service.show_in_app, banner_url: service.banner_url })
  const [file, setFile] = useState<File | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      const banner = file ? await uploadStudioMedia(me.studioId, 'services', file) : f.banner_url
      throwIf(await supabase.from('services').update({ custom_name: f.custom_name.trim() || null, navigate_to: f.navigate_to || null, show_in_app: f.show_in_app, banner_url: banner })
        .eq('id', service.id).select('id'))
    },
    onSuccess: () => { toast('Service saved'); onDone() },
    onError: (e: Error) => toast(e.message),
  })
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <Field label="Custom Name" id="sv-custom" hint="Optional. Shown instead of the name in the app and on the website."><TextInput id="sv-custom" value={f.custom_name} onChange={(v) => setF((x) => ({ ...x, custom_name: v }))} /></Field>
      <Field label="Navigate To" id="sv-nav"><Select id="sv-nav" value={f.navigate_to} placeholder="— Select destination —" onChange={(v) => setF((x) => ({ ...x, navigate_to: v }))}
        options={[{ value: 'class_listing', label: 'Class Listing' }, { value: 'membership_plans', label: 'Membership Plans' }]} /></Field>
      <Checkbox checked={f.show_in_app} onChange={(v) => setF((x) => ({ ...x, show_in_app: v }))} label="Show in App" />
      <Field label="Banner" id="sv-banner"><input id="sv-banner" type="file" accept="image/*" className="input pt-2.5" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      {f.banner_url && !file && <div className="flex items-center gap-3"><img src={f.banner_url} alt="" className="h-14 w-24 rounded-lg border border-line object-cover" /><button type="button" className="link-btn text-[13px]" onClick={() => setF((x) => ({ ...x, banner_url: null }))}>Remove banner</button></div>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Cancel</button><button type="submit" className="btn-gold flex-1" disabled={save.isPending}>Save Changes</button></div>
    </form>
  )
}

// Add Social Links & QR --------------------------------------------------------------------------------------------
const SOCIAL: [keyof SiteSettings, string, string][] = [
  ['facebook', 'Facebook Link', 'https://www.facebook.com/…'], ['instagram', 'Instagram Link', 'https://www.instagram.com/…'], ['twitter' as keyof SiteSettings, 'Twitter Link', 'https://x.com/…'],
  ['youtube', 'YouTube Link', 'https://www.youtube.com/@…'], ['video' as keyof SiteSettings, 'Video Link', 'https://'], ['linkedin' as keyof SiteSettings, 'LinkedIn Link', 'https://www.linkedin.com/…'],
  ['whatsapp', 'Whatsapp Number', '+91…'],
]

export function SocialLinks() {
  const { data: studio } = useStudio()
  if (!studio) return <Loading />
  return <SocialForm key={studio.id} studio={studio} />
}

function SocialForm({ studio }: { studio: Studio }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const web = ((studio.settings as unknown as { website?: Record<string, string | null> }).website ?? {})
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(SOCIAL.map(([k]) => [k, web[k as string] ?? ''])))
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      for (const [k, label] of SOCIAL) if (k !== 'whatsapp' && f[k as string].trim() && !/^https:\/\//.test(f[k as string].trim())) throw new Error(`${label} must start with https://`)
      await saveWebsite(me.studioId, { website: f as unknown as Partial<SiteSettings> })
    },
    onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['studio'] }), qc.invalidateQueries({ queryKey: ['site'] })]); toast('Social links saved') },
    onError: (e: Error) => setError(e.message),
  })
  const origin = window.location.origin
  return (
    <>
      <PageHeader title="Social Media And Video Link Basic Information" sub={studioLine(studio)} />
      <div className="grid max-w-[1100px] gap-5 px-5 pt-5 pb-10 lg:grid-cols-[1.2fr_1fr] lg:px-8">
        <form className="card flex flex-col gap-4 p-5" onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate() }} noValidate>
          {SOCIAL.map(([k, label, ph]) => (
            <Field key={k} label={label} id={`so-${k}`}><TextInput id={`so-${k}`} value={f[k as string]} onChange={(v) => setF((x) => ({ ...x, [k]: v }))} placeholder={ph} /></Field>
          ))}
          <p className="m-0 text-[12px] text-faint">These show on the website and in the member app. The same links are in Settings › Website.</p>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" className="btn-gold self-start px-8" disabled={save.isPending}>Save</button>
        </form>
        <div className="flex flex-col gap-4">
          <QrCard title="Join QR" text="Print it at the front desk: people scan it to join and become an enquiry in your CRM." url={`${origin}/join`} file="shaan-fitness-join" />
          <QrCard title="App QR" text="Members scan it to open their app and add it to their home screen." url={`${origin}/app`} file="shaan-fitness-app" />
        </div>
      </div>
    </>
  )
}

function QrCard({ title, text, url, file }: { title: string; text: string; url: string; file: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let live = true
    QRCode.toString(url, { type: 'svg', margin: 1, width: 220, color: { dark: '#000000', light: '#ffffff' } }).then((s) => { if (live) setSvg(s) }).catch(() => setSvg(''))
    return () => { live = false }
  }, [url])
  const download = async () => {
    const data = await QRCode.toDataURL(url, { margin: 2, width: 1024 })
    const a = document.createElement('a'); a.href = data; a.download = `${file}.png`; a.click()
  }
  return (
    <section className="card flex flex-col gap-3 p-5">
      <h2 className="eyebrow">{title}</h2>
      <div className="flex flex-wrap items-center gap-4">
        <div role="img" aria-label={`QR code for ${url}`} className="h-[180px] w-[180px] flex-none overflow-hidden rounded-xl bg-white p-2 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="m-0 text-[13px] leading-relaxed text-ink-soft">{text}</p>
          <code className="truncate text-[12px] text-muted">{url}</code>
          <button type="button" className="btn btn-sm self-start" onClick={download}><Icon name="download" size={16} />Download PNG</button>
        </div>
      </div>
    </section>
  )
}
