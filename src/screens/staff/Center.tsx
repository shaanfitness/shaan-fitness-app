import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useServices, useStudio } from '../../db/studio'
import {
  CURRENCIES, DAY_LABELS, FACILITIES, saveCenterInfo, saveCenterPrivate, saveCurrency, secretStatus, setSecret, studioPrivate,
  type SecretKey, type Session, type StudioPrivate, type Timings,
} from '../../db/center'
import { setCurrency } from '../../lib/format'
import { fmtClock, fmtDateTime } from '../../lib/dates'
import type { Studio } from '../../db/types'
import { SettingsRows, saveSection, type SRow } from '../../components/settingsForm'
import { studioLine } from '../../components/crud'
import { Checkbox, CheckboxGroup, Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../components/controls'
import { DataTable } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Section, Sheet } from '../../components/ui'

// YDL Fitness Center menu: My Fitness Centers (and its four-step profile), Invoice Settings,
// Currency, Biometric Managers, DLT OTP Manager and Email Manager.
type Settings = Record<string, Record<string, unknown> | unknown>
const sect = (s: Studio, k: string) => (((s.settings as unknown as Settings)[k] ?? {}) as Record<string, unknown>)
const addressOf = (s: Studio) => [s.street1, s.street2, s.landmark, s.locality ?? s.branch_name, s.city, s.state, s.pincode].filter(Boolean).join(', ')

function useRefresh() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['studio'] }), qc.invalidateQueries({ queryKey: ['services'] }), qc.invalidateQueries({ queryKey: ['site'] })])
}

// Fitness Center › My Fitness Centers ---------------------------------------------------------------------------
export function CenterList() {
  const { data: studio } = useStudio()
  const { data: services = [] } = useServices()
  const [search, setSearch] = useState('')
  if (!studio) return <Loading />
  const rows = [studio].filter((s) => !search || `${s.name} ${s.tag_line ?? ''} ${addressOf(s)}`.toLowerCase().includes(search.toLowerCase()))
  const offered = services.filter((v) => v.active).map((v) => v.custom_name || v.name).join(', ')
  return (
    <>
      <PageHeader title="My Fitness Centers Listing" />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="relative max-w-[420px]">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <TextInput small value={search} onChange={setSearch} placeholder="Search" className="pl-9" />
        </div>
        <DataTable<Studio> rows={rows} rowKey={(s) => s.id} caption="My Fitness Centers"
          columns={[
            { key: 'name', header: 'Fitness Center Name', cell: (s) => <div className="flex flex-col"><strong>{s.name}</strong><span className="text-[12px] text-muted">{s.tag_line}</span></div> },
            { key: 'services', header: 'Services', cell: () => <span className="line-clamp-2 max-w-[360px] text-[13px]">{offered}</span> },
            { key: 'status', header: 'Status', cell: (s) => <span className={`chip ${s.active ? 'chip-green' : 'chip-muted'}`}>{s.active ? 'Active' : 'Inactive'}</span> },
            { key: 'address', header: 'Address', cell: (s) => <span className="text-[13px]">{[s.locality ?? s.branch_name, s.city].filter(Boolean).join(', ')}</span> },
            { key: 'link', header: 'Attendance Link', cell: () => 'N.A.' },
            { key: 'action', header: 'Action', cell: (s) => <div className="flex gap-2"><Link to={`/centers/${s.id}`} className="btn btn-sm">View</Link><Link to={`/centers/${s.id}/edit`} className="btn btn-sm">Edit</Link></div> },
          ]}
          card={(s) => (
            <div className="flex flex-col gap-2">
              <strong>{s.name}</strong><span className="text-[13px] text-muted">{addressOf(s)}</span>
              <div className="flex gap-2"><Link to={`/centers/${s.id}`} className="btn btn-sm">View</Link><Link to={`/centers/${s.id}/edit`} className="btn btn-sm">Edit</Link></div>
            </div>
          )} />
        <p className="m-0 text-[12px] text-faint">One branch for now. A second branch is added here when you open one.</p>
      </div>
    </>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-0.5"><dt className="text-[12px] font-semibold text-muted">{label}</dt><dd className="m-0 text-[14px]">{children || '—'}</dd></div>
}

export function CenterView() {
  const me = useMe()
  const { data: studio } = useStudio()
  const { data: services = [] } = useServices()
  const owner = me.role === 'owner'
  const priv = useQuery({ queryKey: ['studio_private', me.studioId], enabled: owner, queryFn: () => studioPrivate(me.studioId) })
  if (!studio) return <Loading />
  const t = sect(studio, 'timings') as unknown as Timings
  const p = priv.data
  return (
    <>
      <PageHeader title={studio.name} sub={studio.tag_line} actions={<Link to={`/centers/${studio.id}/edit`} className="btn-gold min-h-10 px-5">Edit</Link>} />
      <Section title="Basic Information" id="cv-basic">
        <dl className="card m-0 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Fitness Center Name">{studio.name}</Info><Info label="Tag line">{studio.tag_line}</Info><Info label="Capacity">{studio.capacity}</Info>
          <Info label="Email">{studio.email}</Info><Info label="Mobile">{studio.mobile}</Info><Info label="Landline">{studio.landline}</Info>
          <div className="sm:col-span-2 lg:col-span-3"><Info label="Description">{studio.description}</Info></div>
          <div className="sm:col-span-2 lg:col-span-3"><Info label="Fitness center category">{services.filter((v) => v.active).map((v) => v.name).join(', ')}</Info></div>
          <div className="sm:col-span-2 lg:col-span-3"><Info label="Fitness center facilities">{studio.facilities.join(', ')}</Info></div>
        </dl>
      </Section>
      <Section title="Address & Location" id="cv-addr"><div className="card p-5 text-[14px]">{addressOf(studio)}{studio.country ? `, ${studio.country}` : ''}</div></Section>
      <Section title="Timings & Holiday" id="cv-time">
        <div className="card flex flex-col gap-2 p-5 text-[14px]">
          <div><span className="text-muted">Open: </span>{(t?.days ?? []).map((d) => DAY_LABELS[d - 1]).join(', ') || '—'}</div>
          {(t?.sessions ?? []).map((x, i) => <div key={i}><span className="text-muted">Session {i + 1}: </span>{fmtClock(x.from)} to {fmtClock(x.to)} · {x.gender === 'unisex' ? 'Unisex' : x.gender === 'men' ? 'Men' : 'Women'}</div>)}
          <Link to="/centers/holidays" className="self-start text-[13px]">Fitness Center Holiday</Link>
        </div>
      </Section>
      {owner && (
        <Section title="Billing Information" id="cv-bill">
          <dl className="card m-0 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Company Name">{p?.company_name}</Info>
            <Info label="GST">{studio.settings.gst?.enabled ? studio.settings.gst.number : 'Not registered'}</Info>
            <Info label="Bank">{p?.bank?.bank_name ? `${p.bank.bank_name}${p.bank.account_no ? ` · ••••${String(p.bank.account_no).slice(-4)}` : ''}` : ''}</Info>
            <Info label="Support">{[p?.support?.email, p?.support?.mobile].filter(Boolean).join(' · ')}</Info>
          </dl>
        </Section>
      )}
      <div className="h-10" />
    </>
  )
}

// The four-step fitness center profile ---------------------------------------------------------------------------
const STEPS = ['Basic Information', 'Address & Location', 'Timings & Holiday', 'Billing Information']

export function CenterEdit() {
  const { data: studio } = useStudio()
  const { data: services } = useServices()
  const [params, setParams] = useSearchParams()
  const step = Math.min(Math.max(Number(params.get('step')) || 1, 1), 4)
  if (!studio || !services) return <Loading />
  const go = (n: number) => setParams({ step: String(n) }, { replace: true })
  return (
    <>
      <PageHeader title="Fitness Center" sub={studioLine(studio)} />
      <nav aria-label="Steps" className="flex gap-2 overflow-x-auto px-5 pt-4 lg:px-8">
        {STEPS.map((s, i) => (
          <button key={s} type="button" aria-current={step === i + 1 ? 'step' : undefined} onClick={() => go(i + 1)}
            className={`flex min-h-11 flex-none items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold ${step === i + 1 ? 'border-gold bg-accent-tint text-ink' : 'border-line text-muted'}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[12px]">{i + 1}</span>Step {i + 1} {s}
          </button>
        ))}
      </nav>
      <div className="max-w-[960px] px-5 pt-4 pb-10 lg:px-8">
        {step === 1 && <StepBasic key="1" studio={studio} services={services} next={() => go(2)} />}
        {step === 2 && <StepAddress key="2" studio={studio} next={() => go(3)} />}
        {step === 3 && <StepTimings key="3" studio={studio} next={() => go(4)} />}
        {step === 4 && <StepBilling key="4" studio={studio} />}
      </div>
    </>
  )
}

function StepButtons({ busy, onSave, error, last }: { busy: boolean; onSave: (next: boolean) => void; error: string | null; last?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-3 pt-2">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => navigate('/centers')}>Cancel</button>
        {!last && <button type="button" className="btn" disabled={busy} onClick={() => onSave(true)}>Save & Next</button>}
        <button type="button" className="btn-gold px-8" disabled={busy} onClick={() => onSave(false)}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

function useStepSave(fn: () => Promise<void>, next?: () => void) {
  const toast = useToast()
  const refresh = useRefresh()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async (goNext: boolean) => {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); toast('Fitness center saved'); if (goNext) next?.() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return { busy, error, save }
}

function StepBasic({ studio, services, next }: { studio: Studio; services: { id: string; name: string; active: boolean }[]; next: () => void }) {
  const me = useMe()
  const extraFacilities = studio.facilities.filter((f) => !FACILITIES.includes(f))
  const [f, setF] = useState({
    name: studio.name, tag_line: studio.tag_line ?? '', description: studio.description ?? '', capacity: String(studio.capacity ?? ''),
    email: studio.email ?? '', mobile: studio.mobile ?? '', landline: studio.landline ?? '',
    service_ids: services.filter((v) => v.active).map((v) => v.id), facilities: studio.facilities,
  })
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const { busy, error, save } = useStepSave(async () => {
    if (!f.name.trim()) throw new Error('Enter the fitness center name')
    if (!(Number(f.capacity) > 0)) throw new Error('Enter the fitness center capacity')
    if (!f.mobile.trim()) throw new Error('Enter the mobile number')
    await saveCenterInfo(me.studioId, { ...f, capacity: Number(f.capacity) })
  }, next)
  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); save(false) }} noValidate>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="eyebrow sm:col-span-2">Basic Information</h2>
        <Field label="Fitness Center Name" required id="c-name"><TextInput id="c-name" value={f.name} onChange={set('name')} /></Field>
        <Field label="Tag line" id="c-tag"><TextInput id="c-tag" value={f.tag_line} onChange={set('tag_line')} /></Field>
        <Field label="Fitness Center Description" id="c-desc" className="sm:col-span-2"><TextArea id="c-desc" value={f.description} onChange={set('description')} rows={3} /></Field>
      </div>
      <div className="card p-5">
        <CheckboxGroup legend="Fitness center category" options={services.map((v) => ({ value: v.id, label: v.name }))} values={f.service_ids} onChange={set('service_ids')} columns={3} />
        <p className="m-0 mt-2 text-[12px] text-faint">These are the services your center offers (App Settings › Services List orders them for the app).</p>
      </div>
      <div className="card p-5">
        <CheckboxGroup legend="Fitness center facilities" options={[...FACILITIES, ...extraFacilities].map((x) => ({ value: x, label: x }))} values={f.facilities} onChange={set('facilities')} columns={3} />
      </div>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="eyebrow sm:col-span-2">Fitness center Capacity</h2>
        <Field label="Capacity" required id="c-cap" hint="How many people can train at once."><TextInput id="c-cap" type="number" value={f.capacity} onChange={set('capacity')} /></Field>
      </div>
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <h2 className="eyebrow sm:col-span-3">Contact information</h2>
        <Field label="Email" id="c-email"><TextInput id="c-email" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Mobile" required id="c-mob"><TextInput id="c-mob" type="tel" value={f.mobile} onChange={set('mobile')} /></Field>
        <Field label="Landline" id="c-land"><TextInput id="c-land" type="tel" value={f.landline} onChange={set('landline')} /></Field>
        <p className="m-0 text-[12px] text-faint sm:col-span-3">The website shows this mobile number and email.</p>
      </div>
      <StepButtons busy={busy} error={error} onSave={save} />
    </form>
  )
}

function StepAddress({ studio, next }: { studio: Studio; next: () => void }) {
  const me = useMe()
  const [f, setF] = useState({
    street1: studio.street1 ?? '', street2: studio.street2 ?? '', locality: studio.locality ?? studio.branch_name ?? '', landmark: studio.landmark ?? '',
    city: studio.city ?? '', state: studio.state ?? '', country: studio.country ?? 'India', pincode: studio.pincode ?? '',
  })
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const { busy, error, save } = useStepSave(() => saveCenterInfo(me.studioId, f), next)
  const field = (k: keyof typeof f, label: string, required = true) => (
    <Field label={label} required={required} id={`a-${k}`}><TextInput id={`a-${k}`} value={f[k]} onChange={set(k)} /></Field>
  )
  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); save(false) }} noValidate>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="eyebrow sm:col-span-2">Fitness Center Address</h2>
        {field('street1', 'Address Line 1')}{field('street2', 'Address Line 2')}{field('locality', 'Area / Locality')}{field('landmark', 'Landmark', false)}
        {field('city', 'City')}{field('state', 'State')}{field('country', 'Country')}{field('pincode', 'Pincode')}
        <p className="m-0 text-[12px] text-faint sm:col-span-2">The area is also the branch name. To pin the exact spot for directions, add your Google Maps link in Settings › Website.</p>
      </div>
      <StepButtons busy={busy} error={error} onSave={save} />
    </form>
  )
}

function StepTimings({ studio, next }: { studio: Studio; next: () => void }) {
  const me = useMe()
  const cur = sect(studio, 'timings') as unknown as Partial<Timings>
  const [days, setDays] = useState<string[]>((cur.days ?? [1, 2, 3, 4, 5, 6]).map(String))
  const [sessions, setSessions] = useState<Session[]>(() => {
    const s = [...(cur.sessions ?? [])]
    while (s.length < 3) s.push({ from: '', to: '', gender: 'unisex' })
    return s
  })
  const setS = (i: number, patch: Partial<Session>) => setSessions((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const { busy, error, save } = useStepSave(async () => {
    if (!days.length) throw new Error('Choose the working days')
    const filled = sessions.filter((s) => s.from || s.to)
    await saveSection(me.studioId, 'timings', { days: days.map(Number).sort(), sessions: filled })
  }, next)
  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); save(false) }} noValidate>
      <div className="card p-5">
        <CheckboxGroup legend="Working Days *" options={DAY_LABELS.map((d, i) => ({ value: String(i + 1), label: d }))} values={days} onChange={setDays} columns={4} />
        <p className="m-0 mt-2 text-[12px] text-faint">Also the studio’s working days for payroll and bookings. Single closed days go in Fitness Center Holiday.</p>
      </div>
      <div className="card flex flex-col gap-4 p-5">
        <h2 className="eyebrow">Timings</h2>
        {sessions.map((s, i) => (
          <div key={i} className="grid items-end gap-3 border-b border-line-soft pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_1fr_2fr]">
            <Field label={`Session ${i + 1}${i === 0 ? ' *' : ''}`} id={`s-from-${i}`}><TextInput id={`s-from-${i}`} type="time" value={s.from} onChange={(v) => setS(i, { from: v })} /></Field>
            <Field label="to" id={`s-to-${i}`}><TextInput id={`s-to-${i}`} type="time" value={s.to} onChange={(v) => setS(i, { to: v })} /></Field>
            <RadioGroup name={`s-g-${i}`} legend="For" value={s.gender} onChange={(v) => setS(i, { gender: v as Session['gender'] })}
              options={[{ value: 'unisex', label: 'Unisex' }, { value: 'men', label: 'Men' }, { value: 'women', label: 'Women' }]} />
          </div>
        ))}
        <p className="m-0 text-[12px] text-faint">The website shows these as your opening hours.</p>
      </div>
      <StepButtons busy={busy} error={error} onSave={save} />
    </form>
  )
}

const blank = (o: Record<string, string> | undefined, keys: string[]) => Object.fromEntries(keys.map((k) => [k, o?.[k] ?? '']))

function StepBilling({ studio }: { studio: Studio }) {
  const me = useMe()
  const owner = me.role === 'owner'
  const priv = useQuery({ queryKey: ['studio_private', me.studioId], enabled: owner, queryFn: () => studioPrivate(me.studioId) })
  if (!owner) return <Notice>Only the owner can see or change billing, bank and owner details.</Notice>
  if (priv.isLoading) return <Loading />
  return <BillingForm studio={studio} p={priv.data ?? null} />
}

function BillingForm({ studio, p }: { studio: Studio; p: StudioPrivate | null }) {
  const me = useMe()
  const qc = useQueryClient()
  const [f, setF] = useState({
    company_name: p?.company_name ?? '', company_pan: p?.company_pan ?? '',
    gst_registered: !!studio.settings.gst?.enabled, gst_number: studio.settings.gst?.number ?? '',
    billing: blank(p?.billing, ['address1', 'address2', 'city', 'state', 'pincode', 'country']),
    bank: blank(p?.bank, ['account_no', 'holder', 'ifsc', 'bank_name', 'branch']),
    owner: blank(p?.owner, ['name', 'email', 'mobile']), manager: blank(p?.manager, ['name', 'email', 'mobile']),
    support: blank(p?.support, ['email', 'mobile', 'toll_free']),
  })
  type Group = 'billing' | 'bank' | 'owner' | 'manager' | 'support'
  const setG = (g: Group, k: string) => (v: string) => setF((x) => ({ ...x, [g]: { ...x[g], [k]: v } }))
  const { busy, error, save } = useStepSave(async () => {
    await saveCenterPrivate(me.studioId, f)
    await qc.invalidateQueries({ queryKey: ['studio_private'] })
  })
  const g = (grp: Group, k: string, label: string, required = false) => (
    <Field label={label} required={required} id={`b-${grp}-${k}`}><TextInput id={`b-${grp}-${k}`} value={f[grp][k] ?? ''} onChange={setG(grp, k)} /></Field>
  )
  const sameAddress = () => setF((x) => ({ ...x, billing: { address1: studio.street1 ?? '', address2: studio.street2 ?? '', city: studio.city ?? '', state: studio.state ?? '', pincode: studio.pincode ?? '', country: studio.country ?? 'India' } }))
  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); save(false) }} noValidate>
      <Notice>Only you (the owner) can see this step. Bank details are kept private and never shown to staff or members.</Notice>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="eyebrow sm:col-span-2">Billing Information</h2>
        <Field label="Fitness Center Name" id="b-fc"><TextInput id="b-fc" value={studio.name} onChange={() => {}} /></Field>
        <Field label="Company Name" required id="b-co"><TextInput id="b-co" value={f.company_name} onChange={(v) => setF((x) => ({ ...x, company_name: v }))} /></Field>
        <div className="sm:col-span-2"><Checkbox checked={f.company_name === studio.name} onChange={(on) => setF((x) => ({ ...x, company_name: on ? studio.name : '' }))} label="Same as fitness center name" /></div>
        <div className="sm:col-span-2"><button type="button" className="link-btn text-[13px]" onClick={sameAddress}>Billing address same as the fitness center</button></div>
        {g('billing', 'address1', 'Billing Address Line 1')}{g('billing', 'address2', 'Billing Address Line 2')}{g('billing', 'city', 'City')}
        {g('billing', 'state', 'State')}{g('billing', 'pincode', 'Pincode')}{g('billing', 'country', 'Country')}
        <Field label="Company Pan Card" id="b-pan"><TextInput id="b-pan" value={f.company_pan} onChange={(v) => setF((x) => ({ ...x, company_pan: v.toUpperCase() }))} /></Field>
        <RadioGroup name="b-gst" legend="GST Registered" value={f.gst_registered ? 'yes' : 'no'} onChange={(v) => setF((x) => ({ ...x, gst_registered: v === 'yes' }))}
          options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
        {f.gst_registered && <Field label="GST Number" required id="b-gstn"><TextInput id="b-gstn" value={f.gst_number} onChange={(v) => setF((x) => ({ ...x, gst_number: v.toUpperCase() }))} /></Field>}
      </div>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="eyebrow sm:col-span-2">Bank Information</h2>
        {g('bank', 'account_no', 'Account Number')}{g('bank', 'holder', 'Account Holder Name')}{g('bank', 'ifsc', 'IFSC Code')}{g('bank', 'bank_name', 'Bank Name')}{g('bank', 'branch', 'Branch Name')}
      </div>
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <h2 className="eyebrow sm:col-span-3">Owner Information</h2>
        {g('owner', 'name', 'Decision Maker')}{g('owner', 'email', 'Email')}{g('owner', 'mobile', 'Mobile Number')}
      </div>
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <h2 className="eyebrow sm:col-span-3">Manager Details</h2>
        <div className="sm:col-span-3"><Checkbox checked={false} onChange={(on) => on && setF((x) => ({ ...x, manager: { ...x.owner } }))} label="Same as owner" /></div>
        {g('manager', 'name', 'Fitness Center Manager')}{g('manager', 'email', 'Email')}{g('manager', 'mobile', 'Mobile Number')}
      </div>
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <h2 className="eyebrow sm:col-span-3">Customer Support</h2>
        {g('support', 'email', 'Support Email', true)}{g('support', 'mobile', 'Support Mobile')}{g('support', 'toll_free', 'Toll Free Number')}
      </div>
      <StepButtons busy={busy} error={error} onSave={save} last />
    </form>
  )
}

// Fitness Center › Fitness Center Invoice Settings ---------------------------------------------------------------
interface Numbering { mode: string; start: number; width: number; zero_fill: boolean; applicable_from: string | null; restart: string; prefix: string; suffix: string }
const sample = (n: Numbering) => `${n.prefix ?? ''}${n.zero_fill ? String(n.start || 1).padStart(n.width || 1, '0') : String(n.start || 1)}${n.suffix ?? ''}`

function NumberingForm({ title, idp, n, set }: { title: string; idp: string; n: Numbering; set: (patch: Partial<Numbering>) => void }) {
  return (
    <div className="card grid gap-4 p-5 sm:grid-cols-2">
      <div className="flex items-baseline justify-between gap-3 sm:col-span-2"><h2 className="eyebrow">{title}</h2><span className="text-[13px] text-muted">Next looks like <strong className="text-ink">{sample(n)}</strong></span></div>
      <RadioGroup name={`${idp}-type`} legend={`${title.split(' ')[0]} Type`} value={n.mode} onChange={(v) => set({ mode: v })}
        options={[{ value: 'automatic', label: 'Automatic' }, { value: 'manual', label: 'Manual' }]} />
      <Field label="Starting Number" id={`${idp}-start`}><TextInput id={`${idp}-start`} type="number" value={String(n.start ?? 1)} onChange={(v) => set({ start: Number(v) })} /></Field>
      <Field label="Width of numeric part" id={`${idp}-width`}><TextInput id={`${idp}-width`} type="number" value={String(n.width ?? 5)} onChange={(v) => set({ width: Number(v) })} /></Field>
      <RadioGroup name={`${idp}-zero`} legend="Prefill with zero" value={n.zero_fill ? 'yes' : 'no'} onChange={(v) => set({ zero_fill: v === 'yes' })}
        options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
      <Field label="Applicable From" id={`${idp}-from`}><TextInput id={`${idp}-from`} type="date" value={n.applicable_from ?? ''} onChange={(v) => set({ applicable_from: v || null })} /></Field>
      <Field label="Restart Number Every" id={`${idp}-restart`}>
        <Select id={`${idp}-restart`} value={n.restart ?? 'year'} onChange={(v) => set({ restart: v })} options={[{ value: 'year', label: 'Year' }, { value: 'month', label: 'Month' }, { value: 'financial_year', label: 'Financial year (April)' }, { value: 'none', label: 'Never' }]} />
      </Field>
      <Field label={`${title.split(' ')[0]} Prefix`} id={`${idp}-prefix`}><TextInput id={`${idp}-prefix`} value={n.prefix ?? ''} onChange={(v) => set({ prefix: v })} placeholder="e.g. YDL/" /></Field>
      <Field label={`${title.split(' ')[0]} Suffix`} id={`${idp}-suffix`}><TextInput id={`${idp}-suffix`} value={n.suffix ?? ''} onChange={(v) => set({ suffix: v })} placeholder="e.g. /19-20" /></Field>
    </div>
  )
}

export function InvoiceSettings() {
  const { data: studio } = useStudio()
  if (!studio) return <Loading />
  return <InvoiceForm key={studio.id} studio={studio} />
}

function InvoiceForm({ studio }: { studio: Studio }) {
  const me = useMe()
  const toast = useToast()
  const refresh = useRefresh()
  const navigate = useNavigate()
  const [inv, setInv] = useState<Numbering>(sect(studio, 'invoice') as unknown as Numbering)
  const [rec, setRec] = useState<Numbering>(sect(studio, 'receipt') as unknown as Numbering)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async (close: boolean) => {
    setBusy(true); setError(null)
    try {
      await saveSection(me.studioId, 'invoice', inv as unknown as Record<string, unknown>)
      await saveSection(me.studioId, 'receipt', rec as unknown as Record<string, unknown>)
      await refresh(); toast('Invoice settings saved')
      if (close) navigate('/centers')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="Fitness Center Invoice Settings" sub={studioLine(studio)} />
      <div className="flex max-w-[960px] flex-col gap-5 px-5 pt-5 pb-10 lg:px-8">
        <NumberingForm title="Invoice Settings" idp="inv" n={inv} set={(p) => setInv((x) => ({ ...x, ...p }))} />
        <NumberingForm title="Receipt Settings" idp="rec" n={rec} set={(p) => setRec((x) => ({ ...x, ...p }))} />
        <p className="m-0 text-[12px] text-faint">New invoices and receipts use these from the next one. Numbers already given never change.</p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Back</button>
          <button type="button" className="btn" disabled={busy} onClick={() => save(true)}>Save & Close</button>
          <button type="button" className="btn-gold px-8" disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>
  )
}

// Fitness Center › Currency Setting -----------------------------------------------------------------------------
export function CurrencySetting() {
  const me = useMe()
  const toast = useToast()
  const refresh = useRefresh()
  const { data: studio } = useStudio()
  const [cur, setCur] = useState<string | null>(null)
  const [tax, setTax] = useState<string | null>(null)
  const apply = useMutation({
    mutationFn: async () => { await saveCurrency(me.studioId, cur ?? studio!.currency, tax ?? studio!.tax_label) },
    onSuccess: async () => { setCurrency(cur ?? studio!.currency); await refresh(); toast('Currency applied') },
    onError: (e: Error) => toast(e.message),
  })
  if (!studio) return <Loading />
  return (
    <>
      <PageHeader title="Currency Support Apply" sub={studioLine(studio)} />
      <form className="flex max-w-[560px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8" onSubmit={(e) => { e.preventDefault(); apply.mutate() }}>
        <div className="card flex flex-col gap-4 p-5">
          <Field label="Choose Currency" required id="cur"><Select id="cur" value={cur ?? studio.currency} onChange={setCur} options={CURRENCIES} placeholder="Select Currency" /></Field>
          <Field label="Tax Name" id="tax" hint="e.g. GST, Tax. Printed on invoices."><TextInput id="tax" value={tax ?? studio.tax_label} onChange={setTax} /></Field>
        </div>
        <button type="submit" className="btn-gold self-start px-8" disabled={apply.isPending}>Apply Currency</button>
      </form>
    </>
  )
}

// Biometric Manager and Extended Biometric Manager ----------------------------------------------------------------
interface Device { id: string; serial: string; name: string; device_type: string; storage_types: string[]; scan_type: string; expiry_rule: boolean; server: string; active: boolean; created_at: string }
interface Operation { id: string; device_id: string; operation: string; status: string; result: string | null; created_at: string }
const OPS = [['clear_logs', 'Clear Logs From Device'], ['restart', 'Restart Biometric Device'], ['reset_op_stamp', 'Reset OP Stamp'], ['unblock_active', 'Unblock Active Members']]
const SCAN = [['finger', 'Finger'], ['face', 'Face'], ['face_ex', 'Face Ex'], ['face_finger', 'Face & Finger']]
const BIO_ROWS: SRow[] = [
  { label: 'Block users on expiry', items: [{ key: 'block_users_expired', type: 'yesno', upper: true }] },
  { label: 'Check-out mode', items: [{ key: 'checkout_mode', type: 'select', options: [{ value: 'alternate', label: 'Alternate' }, { value: 'system', label: 'System Direction' }] }] },
  { label: 'Block users with balance', items: [{ key: 'block_users_balance', type: 'yesno', upper: true }] },
  { label: 'Block users on freeze', items: [{ key: 'block_users_freeze', type: 'yesno', upper: true }] },
  { label: 'Record customer check-out', items: [{ key: 'record_customer_checkout', type: 'yesno', upper: true }] },
  { label: 'Stop staff duplicate check-in', items: [{ key: 'single_staff_checkin', type: 'yesno', upper: true }] },
  { label: 'Stop trainer duplicate check-in', items: [{ key: 'single_trainer_checkin', type: 'yesno', upper: true }] },
  { label: 'Personal training filter', items: [{ key: 'allow_pt_access', type: 'yesno', upper: true }] },
  { label: 'Default Customer Checkout Time (Minutes) :', items: [{ key: 'checkout_minutes', type: 'number' }] },
  { label: 'Device Operations Email Alert :', items: [{ key: 'alert_email', type: 'text' }] },
]

export function BiometricManager({ extended }: { extended?: boolean }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const devices = useQuery({ queryKey: ['biometric_devices', me.studioId], queryFn: async () =>
    throwIf(await supabase.from('biometric_devices').select('*').eq('studio_id', me.studioId).order('created_at')) as Device[] })
  const ops = useQuery({ queryKey: ['device_operations', me.studioId], queryFn: async () =>
    throwIf(await supabase.from('device_operations').select('*').eq('studio_id', me.studioId).order('created_at', { ascending: false }).limit(50)) as Operation[] })
  const [sheet, setSheet] = useState<null | 'settings' | 'ops' | 'add' | { edit: Device } | { del: Device }>(null)
  const [bio, setBio] = useState<Record<string, unknown> | null>(null)
  const [op, setOp] = useState({ device: '', operation: '' })
  const close = () => setSheet(null)
  const names = useMemo(() => Object.fromEntries((devices.data ?? []).map((d) => [d.id, d.name])), [devices.data])
  const saveBio = useMutation({
    mutationFn: () => saveSection(me.studioId, 'biometric', bio ?? {}),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['studio'] }); close(); toast('Biometric settings saved') },
    onError: (e: Error) => toast(e.message),
  })
  const runOp = useMutation({
    mutationFn: async () => {
      if (!op.device || !op.operation) throw new Error('Select the device and the operation')
      throwIf(await supabase.from('device_operations').insert({ studio_id: me.studioId, device_id: op.device, operation: op.operation }).select('id'))
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['device_operations'] }); close(); toast('Operation queued for the device') },
    onError: (e: Error) => toast(e.message),
  })
  const del = useMutation({
    mutationFn: async (d: Device) => { throwIf(await supabase.from('biometric_devices').delete().eq('id', d.id).select('id')) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biometric_devices'] }); close(); toast('Device deleted') },
    onError: (e: Error) => toast(e.message),
  })
  if (!studio) return <Loading />
  const settings = bio ?? sect(studio, 'biometric')
  const title = extended ? 'Extended Biometric Manager' : 'Fitness Center Biometric Manager'
  return (
    <>
      <PageHeader title={title} sub="Manage Your Biometric Device Here"
        actions={<>
          <button type="button" className="btn btn-sm" onClick={() => { setBio(sect(studio, 'biometric')); setSheet('settings') }}>FC Biometric Settings</button>
          <button type="button" className="btn btn-sm" onClick={() => setSheet('ops')}>Biometric Device Operations</button>
          <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setSheet('add')}><Icon name="plus" size={18} />Add Biometric Device</button>
        </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <Notice>Your eSSL device keeps working with YDL until switch day. This page holds its details and rules; once the device is connected to this system, queued operations run on it and memberships block or unblock members automatically.</Notice>
        <h2 className="eyebrow">{studioLine(studio)}</h2>
        {devices.isLoading ? <Loading /> : (devices.data ?? []).length === 0 ? <div className="card p-5 text-[14px] text-muted">No device yet. Add your biometric device.</div> : (
          <div className="grid gap-3 md:grid-cols-2">
            {(devices.data ?? []).map((d) => (
              <article key={d.id} className="card flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="m-0 text-[16px] font-bold">{d.name}</h3><div className="text-[13px] text-muted">{d.serial}</div></div>
                  <span className="chip chip-muted">Not connected yet</span>
                </div>
                <dl className="m-0 grid grid-cols-2 gap-2 text-[13px]">
                  <Info label="Server">{d.server === 'EPUSH' ? 'EPUSH SERVER' : 'E-TIME TRACK LITE'}</Info>
                  <Info label="Type">{SCAN.find((s) => s[0] === d.scan_type)?.[1] ?? d.scan_type}</Info>
                  <Info label="Stores">{d.storage_types.map((x) => x === 'staff_members' ? 'Staff Members' : x[0].toUpperCase() + x.slice(1)).join(', ')}</Info>
                  <Info label="Expiry rule">{d.expiry_rule ? 'Applicable' : 'Not Applicable'}</Info>
                </dl>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-sm" onClick={() => setSheet({ edit: d })}>Edit Device</button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setSheet({ del: d })}>Delete Device</button>
                </div>
              </article>
            ))}
          </div>
        )}
        <h2 className="eyebrow pt-2">Cron Log Details</h2>
        <DataTable<Operation> loading={ops.isLoading} rows={ops.data ?? []} rowKey={(o) => o.id} caption="Device operations" empty="No device operations yet."
          columns={[
            { key: 'at', header: 'Date & Time', cell: (o) => fmtDateTime(o.created_at) },
            { key: 'device', header: 'Device', cell: (o) => names[o.device_id] ?? '' },
            { key: 'op', header: 'Operation', cell: (o) => OPS.find((x) => x[0] === o.operation)?.[1] ?? o.operation },
            { key: 'status', header: 'Status', cell: (o) => <span className={`chip ${o.status === 'done' ? 'chip-green' : o.status === 'failed' ? 'chip-red' : 'chip-muted'}`}>{o.status === 'queued' ? 'Waiting for device' : o.status}</span> },
          ]}
          card={(o) => <div className="flex flex-col gap-1"><strong>{OPS.find((x) => x[0] === o.operation)?.[1]}</strong><span className="text-[12px] text-muted">{names[o.device_id]} · {fmtDateTime(o.created_at)} · {o.status}</span></div>} />
      </div>

      <Sheet wide open={sheet === 'settings'} onClose={close} title="FITNESS CENTER EXTENDED BIOMETRIC SETTINGS (NEW)">
        <div className="flex flex-col gap-4">
          <SettingsRows rows={BIO_ROWS} values={settings} set={(k, v) => setBio((x) => ({ ...(x ?? {}), [k]: v }))} idPrefix="bio" />
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={close}>Close</button>
            <button type="button" className="btn-gold flex-1" disabled={saveBio.isPending} onClick={() => saveBio.mutate()}>Save Biometric Settings</button></div>
        </div>
      </Sheet>
      <Sheet open={sheet === 'ops'} onClose={close} title="PERFORM DEVICE OPERATIONS">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); runOp.mutate() }}>
          <Field label="Select Device :" required id="op-dev"><Select id="op-dev" value={op.device} onChange={(v) => setOp((x) => ({ ...x, device: v }))} placeholder="Select Devices"
            options={(devices.data ?? []).map((d) => ({ value: d.id, label: `${d.serial} - ${d.name}` }))} /></Field>
          <Field label="Select Device Operation :" required id="op-op"><Select id="op-op" value={op.operation} onChange={(v) => setOp((x) => ({ ...x, operation: v }))} placeholder="Select Device Operation"
            options={OPS.map(([value, label]) => ({ value, label }))} /></Field>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={close}>Close</button>
            <button type="submit" className="btn-gold flex-1" disabled={runOp.isPending}>Perform Operations On Device</button></div>
        </form>
      </Sheet>
      <Sheet open={sheet === 'add' || (!!sheet && typeof sheet === 'object' && 'edit' in sheet)} onClose={close}
        title={sheet === 'add' ? 'ADD BIOMETRIC DEVICE' : 'UPDATE BIOMETRIC DEVICE'}>
        {(sheet === 'add' || (sheet && typeof sheet === 'object' && 'edit' in sheet)) && (
          <DeviceForm device={sheet === 'add' ? null : (sheet as { edit: Device }).edit} onDone={close} />
        )}
      </Sheet>
      <Sheet open={!!sheet && typeof sheet === 'object' && 'del' in sheet} onClose={close} title="DELETE BIOMETRIC DEVICE">
        {sheet && typeof sheet === 'object' && 'del' in sheet && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px]">Delete <strong>{sheet.del.name}</strong> ({sheet.del.serial})? Its queued operations are removed too.</p>
            <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={close}>Close</button>
              <button type="button" className="btn btn-danger flex-1" disabled={del.isPending} onClick={() => del.mutate(sheet.del)}>Delete Biometric Device</button></div>
          </div>
        )}
      </Sheet>
    </>
  )
}

function DeviceForm({ device, onDone }: { device: Device | null; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [f, setF] = useState({
    name: device?.name ?? '', serial: device?.serial ?? '', storage_types: device?.storage_types ?? ['customers'],
    scan_type: device?.scan_type ?? 'face', expiry_rule: device ? (device.expiry_rule ? 'yes' : 'no') : 'yes', server: device?.server ?? 'ETIME',
  })
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: async () => {
      if (!f.name.trim() || !f.serial.trim()) throw new Error('Enter the device name and serial number')
      if (!f.storage_types.length) throw new Error('Choose who the device stores')
      const row = { name: f.name.trim(), serial: f.serial.trim(), storage_types: f.storage_types, scan_type: f.scan_type, expiry_rule: f.expiry_rule === 'yes',
        server: f.server, device_type: f.server === 'EPUSH' ? 'essl' : 'etime' }
      if (device) throwIf(await supabase.from('biometric_devices').update(row).eq('id', device.id).select('id'))
      else throwIf(await supabase.from('biometric_devices').insert({ ...row, studio_id: me.studioId }).select('id'))
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biometric_devices'] }); toast(device ? 'Device updated' : 'Device added'); onDone() },
    onError: (e: Error) => setError(/duplicate|unique/i.test(e.message) ? 'A device with this serial number is already added.' : e.message),
  })
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate() }} noValidate>
      <Field label="Device Name :" required id="d-name"><TextInput id="d-name" value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} /></Field>
      <Field label="Device Serial Number :" required id="d-serial"><TextInput id="d-serial" value={f.serial} onChange={(v) => setF((x) => ({ ...x, serial: v }))} /></Field>
      <CheckboxGroup legend="Stores" values={f.storage_types} onChange={(v) => setF((x) => ({ ...x, storage_types: v }))}
        options={[{ value: 'customers', label: 'Customers' }, { value: 'trainers', label: 'Trainers' }, { value: 'staff_members', label: 'Staff Members' }]} columns={3} />
      <RadioGroup name="d-type" legend="Device type" value={f.scan_type} onChange={(v) => setF((x) => ({ ...x, scan_type: v }))}
        options={SCAN.filter(([v]) => device || v !== 'face_ex').map(([value, label]) => ({ value, label }))} />
      <RadioGroup name="d-exp" legend="Expiry rule" value={f.expiry_rule} onChange={(v) => setF((x) => ({ ...x, expiry_rule: v }))}
        options={[{ value: 'yes', label: 'Applicable' }, { value: 'no', label: 'Not Applicable' }]} />
      <Field label="Device Server :" id="d-server"><Select id="d-server" value={f.server} onChange={(v) => setF((x) => ({ ...x, server: v }))}
        options={[{ value: 'ETIME', label: 'ESSL (E-TIME TRACK LITE SERVER)' }, { value: 'EPUSH', label: 'ESSL (EPUSH SERVER)' }]} /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{device ? 'Update Biometric Device' : 'Add Biometric Device'}</button></div>
    </form>
  )
}

// DLT OTP Manager and Email Manager (owner): settings plus one stored password or key each -------------------------
export function SecretField({ label, secretKey, hint }: { label: string; secretKey: SecretKey; hint?: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const status = useQuery({ queryKey: ['secret_status', me.studioId], queryFn: () => secretStatus(me.studioId) })
  const [value, setValue] = useState('')
  const save = useMutation({
    mutationFn: (v: string) => setSecret(me.studioId, secretKey, v),
    onSuccess: (_d, v) => { setValue(''); qc.invalidateQueries({ queryKey: ['secret_status'] }); toast(v ? `${label} saved` : `${label} removed`) },
    onError: (e: Error) => toast(e.message),
  })
  const setAt = status.data?.[secretKey]
  return (
    <div className="card flex flex-col gap-3 p-5">
      <Field label={label} id={`sec-${secretKey}`} hint={hint}>
        <TextInput id={`sec-${secretKey}`} type="password" autoComplete="new-password" value={value} onChange={setValue} placeholder={setAt ? '•••••••• (saved — type to replace)' : ''} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-sm" disabled={!value || save.isPending} onClick={() => save.mutate(value)}>Save {label.toLowerCase()}</button>
        {setAt && <button type="button" className="link-btn text-[13px]" onClick={() => save.mutate('')}>Remove</button>}
        <span className="text-[12px] text-muted">{setAt ? `Saved ${fmtDateTime(setAt)}. It is never shown again.` : 'Not saved yet.'}</span>
      </div>
    </div>
  )
}

function SectionForm({ title, section, rows, children, sub }: { title: string; section: string; rows: SRow[]; children?: ReactNode; sub?: ReactNode }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const [values, setValues] = useState<Record<string, unknown> | null>(null)
  const save = useMutation({
    mutationFn: () => saveSection(me.studioId, section, values ?? {}),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['studio'] }); toast(`${title} saved`) },
    onError: (e: Error) => toast(e.message),
  })
  if (!studio) return <Loading />
  return (
    <>
      <PageHeader title={title} sub={sub ?? studioLine(studio)} actions={<button type="button" className="btn-gold min-h-10 px-6" disabled={save.isPending} onClick={() => save.mutate()}>Save</button>} />
      <div className="flex max-w-[960px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <SettingsRows rows={rows} values={values ?? sect(studio, section)} set={(k, v) => setValues((x) => ({ ...(x ?? sect(studio, section)), [k]: v }))} idPrefix={section} />
        <button type="button" className="btn-gold self-start px-8" disabled={save.isPending} onClick={() => save.mutate()}>Save</button>
        {children}
      </div>
    </>
  )
}

const OTP_ROWS: SRow[] = [
  { label: 'DLT OPERATOR', items: [{ key: 'operator', type: 'select', options: [
    ['VIL', 'VIL POWER - VODAFONE IDEA DLT (recommended)'], ['AIRTEL', 'AIRTEL DLT'], ['BSNL', 'BSNL DLT'], ['MTNL', 'MTNL DLT'], ['JIO', 'TRUE CONNECT - JIO DLT'],
    ['TATA', 'TATA DLT'], ['SMARTPING', 'SMART PING - VIDEOCON DLT']].map(([value, label]) => ({ value, label })) }] },
  { label: 'DLT PRINCIPAL ENTITY ID', items: [{ key: 'principal_entity_id', type: 'text' }] },
  { label: 'DLT SMS HEADER ID', items: [{ key: 'sms_header_id', type: 'text' }] },
  { label: 'DLT SMS TEMPLATE ID', items: [{ key: 'sms_template_id', type: 'text' }] },
  { label: 'VENDOR OTP TEMPLATE ID', items: [{ key: 'vendor_otp_template_id', type: 'text' }] },
  { label: 'CUSTOMER APP NAME', items: [{ key: 'customer_app_name', type: 'text' }] },
  { label: 'CUSTOMER APP 11 DIGIT HASH', items: [{ key: 'customer_app_hash', type: 'text' }] },
  { label: 'TRAINER APP NAME', items: [{ key: 'trainer_app_name', type: 'text' }] },
  { label: 'TRAINER APP 11 DIGIT HASH', items: [{ key: 'trainer_app_hash', type: 'text' }] },
  { label: 'OTP LENGTH', items: [{ key: 'otp_length', type: 'number' }] },
  { label: 'OTP EXPIRY TIME (IN MINUTES)', items: [{ key: 'otp_expiry_minutes', type: 'number' }] },
  { label: 'DLT SENDER ID', items: [{ key: 'sender_id', type: 'text' }] },
  { label: 'DLT OTP MESSAGE', items: [{ key: 'otp_message', type: 'textarea', placeholder: 'Your OTP code for {#var#} is {#var#}…' }] },
  { label: 'ENABLE WHATSAPP OTP', items: [{ key: 'whatsapp_otp', type: 'yesno' }] },
  { label: 'FIREBASE', items: [{ key: 'firebase', type: 'yesno' }] },
  { label: 'TRUECALLER', items: [{ key: 'truecaller', type: 'yesno' }] },
  { label: 'INTERNATIONAL OTP', items: [{ key: 'international_otp', type: 'yesno' }] },
]

export function OtpManager() {
  return (
    <SectionForm title="Fitness Center DLT OTP Manager" section="otp" rows={OTP_ROWS} sub="DLT (Distributed Ledger Technology) OTP SMS / Voice Manager">
      <SecretField label="Vendor auth API key" secretKey="otp_vendor_api_key" hint="From your SMS vendor. Stored privately; only the system’s sender reads it." />
      <Notice>Members sign in with email today. Mobile-number OTP sign-in starts once your own DLT sender (registered with an operator above) is connected. YDL’s DLT IDs belong to YDL and aren’t copied.</Notice>
    </SectionForm>
  )
}

const EMAIL_ROWS: SRow[] = [
  { label: 'HOSTNAME', items: [{ key: 'host', type: 'text', placeholder: 'smtp.gmail.com' }] },
  { label: 'PORT', items: [{ key: 'port', type: 'number' }] },
  { label: 'EMAIL SECURITY', items: [{ key: 'security', type: 'select', options: [{ value: 'SSL', label: 'SSL (465)' }, { value: 'TLS', label: 'TLS (587)' }] }] },
  { label: 'SENDER MAIL', items: [{ key: 'username', type: 'text' }] },
  { label: 'SENDER NAME', items: [{ key: 'sender_name', type: 'text' }] },
]

export function EmailManager() {
  const [test, setTest] = useState('')
  const [note, setNote] = useState(false)
  return (
    <SectionForm title="Fitness Center Email Manager" section="email" rows={EMAIL_ROWS}>
      <SecretField label="Sender password" secretKey="smtp_password" hint="For Gmail use an App password (Google Account › Security › 2-Step Verification › App passwords), not your Gmail password." />
      <div className="card flex flex-col gap-3 p-5">
        <Field label="TEST MAIL" id="test-mail"><TextInput id="test-mail" type="email" value={test} onChange={setTest} placeholder="you@example.com" /></Field>
        <button type="button" className="btn btn-sm self-start" onClick={() => setNote(true)}>Send Test Mail</button>
        {note && <Notice>Your settings are saved. Emails from the system (receipts, reports) start with Notifications &amp; WhatsApp; the test mail goes out then. Sign-in and password emails come from Supabase’s own email settings.</Notice>}
      </div>
    </SectionForm>
  )
}
