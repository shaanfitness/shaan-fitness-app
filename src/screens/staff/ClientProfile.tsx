import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import {
  amt, checkInClient, freezeHistory, isOpen, memberSubscriptions, PAR_Q, DOCUMENT_TYPES, saveMedical, sendNotification, stateChip, STATE_LABEL, type Sub,
} from '../../db/billing'
import { followUpHistory } from '../../db/followUps'
import {
  deleteDocument, getProfile, listDevices, memberAttendance, memberDocuments, openDocument, photoUrl, queueDeviceCommand, referralsBy, uploadDocument, uploadPhoto,
} from '../../db/profile'
import { useLists, useServices, useStudio } from '../../db/studio'
import { supabase } from '../../lib/supabase'
import { fmtDateTime, fmtDay } from '../../lib/dates'
import { waLink } from '../../lib/format'
import { MembershipActionDialog, type ActionKind, type ActionTarget } from '../../components/billing'
import { Field, Notice, RadioGroup, Select, TextArea, TextInput, opts } from '../../components/controls'
import { FollowUpDialog, statusChip, type FollowUpTarget } from '../../components/FollowUp'
import { useToast } from '../../components/toast'
import { Avatar, Icon, Loading, Sheet } from '../../components/ui'

// YDL member page: profile card, membership actions, biometric operations and the tabs
// Information · Subscriptions · Attendance · Workout · Follow Up History · Client Document · Client Referrals,
// plus Tracking (what the client logs in the member app) and Wallet & Orders.

const TABS: [string, string][] = [
  ['', 'Information'], ['subscriptions', 'Subscriptions'], ['attendance', 'Attendance'], ['workout', 'Workout'], ['tracking', 'Tracking'],
  ['follow-ups', 'Follow Up History'], ['documents', 'Client Document'], ['referrals', 'Client Referrals'], ['wallet', 'Wallet & Orders'],
]
const DESK_TABS = new Set(['wallet'])

const ClientTrainingTab = lazy(() => import('./training/ClientTraining').then((m) => ({ default: m.ClientTrainingTab })))
const ClientTrackingTab = lazy(() => import('./training/ClientTracking').then((m) => ({ default: m.ClientTrackingTab })))
const ClientMoneyTab = lazy(() => import('./more/ClientMoney').then((m) => ({ default: m.ClientMoneyTab })))

export default function ClientProfile() {
  const { id = '', tab = '' } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const { data: services = [] } = useServices()
  const profile = useQuery({ queryKey: ['clients', 'profile', id], queryFn: () => getProfile(id) })
  const subs = useQuery({ queryKey: ['subs', 'member', id], queryFn: () => memberSubscriptions(id) })
  const [action, setAction] = useState<ActionTarget | null>(null)
  const [notify, setNotify] = useState(false)
  const [whatsapp, setWhatsapp] = useState(false)
  const [medical, setMedical] = useState(false)
  const [device, setDevice] = useState<string | null>(null)
  const [photo, setPhoto] = useState(false)
  const isDesk = me.role === 'owner' || me.role === 'front_desk'

  const checkIn = useMutation({
    mutationFn: (out: boolean) => checkInClient(id, out),
    onSuccess: (_, out) => { qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['attendance'] }); toast(out ? 'Checked out' : 'Checked in') },
    onError: (e: Error) => toast(e.message),
  })

  if (profile.isLoading) return <Loading />
  if (profile.error) return <div className="px-5 py-10 lg:px-8"><Notice tone="error">{(profile.error as Error).message}</Notice></div>
  const { client: c, billing, medical: med } = profile.data!
  const all = subs.data ?? []
  const balance = all.filter((s) => !['cancelled', 'deleted', 'transferred', 'upgraded', 'downgraded'].includes(s.state)).reduce((t, s) => t + s.balance_amount, 0)
  const memberLine = [c.client_code, c.phone ? `${c.country_code} ${c.phone}` : null, c.email].filter(Boolean).join(' · ')
  const open = (kind: ActionKind, sub?: Sub) => setAction({ kind, memberId: c.id, memberName: c.full_name, memberLine, subs: all, sub })
  const interested = services.filter((s) => c.interested_service_ids?.includes(s.id)).map((s) => s.custom_name ?? s.name).join(', ')
  const hasLive = all.some((s) => s.status === 'live' && isOpen(s) && s.kind !== 'trial')

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:px-8 lg:pt-8">
      <div className="lg:hidden"><Link to="/members" className="text-[13px]">← My Members</Link></div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Profile card */}
        <aside className="flex flex-col gap-4">
          <div className="card flex flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              <ProfilePhoto path={c.photo_url} name={c.full_name} onEdit={isDesk ? () => setPhoto(true) : undefined} />
              <div className="min-w-0 flex-1">
                <span className={`chip ${c.kind === 'member' ? 'chip-gold' : 'chip-info'}`}>{c.kind === 'member' ? 'Member' : 'Enquiry'}</span>
                <h1 className="title mt-1.5 text-[28px] leading-tight break-words">{c.full_name}</h1>
                {isDesk && <div className={`mt-1 text-[13px] font-semibold ${balance > 0 ? 'text-red' : 'text-muted'}`}>Balance Amount: {amt(balance)}</div>}
              </div>
            </div>
            <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              {c.phone && <><dt className="text-muted">Mobile</dt><dd className="m-0">{c.country_code} {c.phone}</dd></>}
              {c.email && <><dt className="text-muted">Email</dt><dd className="m-0 break-all">{c.email}</dd></>}
              {c.date_of_birth && <><dt className="text-muted">Date of birth</dt><dd className="m-0">{fmtDay(c.date_of_birth, 'MMMM d, yyyy')}</dd></>}
              <dt className="text-muted">Date Of Enquiry</dt><dd className="m-0">{fmtDay(c.enquiry_date, 'MMM dd, yyyy')}</dd>
              <dt className="text-muted">{c.kind === 'member' ? 'Member Code' : 'Enquiry Code'}</dt><dd className="m-0 font-semibold">{c.client_code}</dd>
              <dt className="text-muted">Ref No.</dt><dd className="m-0">{c.ref_no ?? '—'}</dd>
              <dt className="text-muted">Client Rep</dt><dd className="m-0">{c.added_by_name ?? '—'}</dd>
              <dt className="text-muted">Emergency No</dt><dd className="m-0">{c.emergency_phone ?? '—'}</dd>
              <dt className="text-muted">App</dt><dd className="m-0">{c.has_app ? 'App Installed' : 'App Not Installed'}</dd>
              <dt className="text-muted">Interested In</dt><dd className="m-0">{interested || '—'}</dd>
              <dt className="text-muted">Assigned Trainer</dt><dd className="m-0">{c.trainer_name ?? '—'}</dd>
              <dt className="text-muted">Biometric Code</dt><dd className="m-0">{c.biometric_code ?? c.phone ?? '—'}</dd>
            </dl>
            {isDesk && (
              <div className="flex flex-wrap gap-2">
                <Link to={`/clients/${c.id}/edit`} className="btn btn-sm"><Icon name="edit" size={16} />Edit</Link>
                {c.checked_in_now
                  ? <button type="button" className="btn btn-sm" disabled={checkIn.isPending} onClick={() => checkIn.mutate(true)}>Check Out</button>
                  : <button type="button" className="btn btn-sm" disabled={checkIn.isPending} onClick={() => checkIn.mutate(false)}>Check in</button>}
                <button type="button" className="btn btn-sm" onClick={() => setNotify(true)}><Icon name="bell" size={16} />Send Notification</button>
                {c.phone && <button type="button" className="btn btn-sm" onClick={() => setWhatsapp(true)}><Icon name="whatsapp" size={16} />Send WhatsApp Message</button>}
                <Link to={`/store/orders/new?client=${c.id}`} className="btn btn-sm">Place Order</Link>
                <Link to={`/clients/${c.id}/follow-ups`} className="btn btn-sm">See Follow Up History</Link>
                <Link to={`/challenges?client=${c.id}`} className="btn btn-sm">View Participated Challenges</Link>
              </div>
            )}
          </div>

          {isDesk && (
            <div className="card flex flex-col gap-3 p-5">
              <h2 className="eyebrow">Membership Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn disabled={!hasLive} onClick={() => open('freeze')}>Freeze</ActionBtn>
                <ActionBtn disabled={!hasLive} onClick={() => open('extend')}>Extension</ActionBtn>
                <ActionBtn disabled={!hasLive} onClick={() => open('downgrade')}>DownGrade</ActionBtn>
                <ActionBtn disabled={!hasLive} onClick={() => open('transfer')}>Transfer</ActionBtn>
                <ActionBtn disabled={!hasLive} onClick={() => open('upgrade')}>Upgrade</ActionBtn>
                <ActionBtn onClick={() => navigate(`/combos?upgrade=${c.id}`)}>Upgrade To Combo Offer</ActionBtn>
                <ActionBtn onClick={() => open('pt')}>Assign Personal Training</ActionBtn>
                <ActionBtn onClick={() => open('renew_pt')}>Renew Personal Training</ActionBtn>
                <ActionBtn onClick={() => open('trial')}>Book a free Trial</ActionBtn>
                <ActionBtn gold onClick={() => open('add')}>Add Subscription</ActionBtn>
                <ActionBtn onClick={() => open('renew')}>Renew Subscription</ActionBtn>
                <ActionBtn onClick={() => navigate(`/combos?assign=${c.id}`)}>Assign Combo Offer</ActionBtn>
              </div>
              <h2 className="eyebrow pt-2">Perform Biometric Device Operations For Customer</h2>
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn onClick={() => setDevice('add')}>Add User</ActionBtn>
                <ActionBtn onClick={() => setDevice('re_add')}>Re-Add User</ActionBtn>
                <ActionBtn onClick={() => setDevice('unblock')}>Unblock User</ActionBtn>
                <ActionBtn onClick={() => setDevice('block')}>Block User</ActionBtn>
              </div>
            </div>
          )}
        </aside>

        {/* Tabs */}
        <section className="flex min-w-0 flex-col gap-4">
          <nav aria-label="Client sections" className="flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1">
            {TABS.filter(([k]) => isDesk || !DESK_TABS.has(k)).map(([k, label]) => (
              <NavLink key={k} to={`/clients/${c.id}${k ? `/${k}` : ''}`} end
                className={({ isActive }) => `whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-semibold no-underline ${isActive ? 'bg-surface-3 text-gold' : 'text-muted hover:text-ink'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          {tab === '' && <InfoTab client={c} subs={all} loading={subs.isLoading} medical={med} billing={billing} onMedical={() => setMedical(true)} isDesk={isDesk} onEdit={(s) => open('edit', s)} />}
          {tab === 'subscriptions' && <SubscriptionsTab subs={all} loading={subs.isLoading} isDesk={isDesk} onEdit={(s) => open('edit', s)} />}
          {tab === 'attendance' && <AttendanceTab memberId={c.id} />}
          {tab === 'workout' && <Suspense fallback={<p className="text-muted">Loading…</p>}><ClientTrainingTab memberId={c.id} name={c.first_name ?? c.full_name} /></Suspense>}
          {tab === 'tracking' && <Suspense fallback={<p className="text-muted">Loading…</p>}><ClientTrackingTab memberId={c.id} /></Suspense>}
          {tab === 'follow-ups' && <FollowUpsTab memberId={c.id} name={c.full_name} notes={c.notes} kind={c.kind} />}
          {tab === 'documents' && <DocumentsTab memberId={c.id} />}
          {tab === 'referrals' && <ReferralsTab memberId={c.id} />}
          {tab === 'wallet' && isDesk && <Suspense fallback={<p className="text-muted">Loading…</p>}><ClientMoneyTab memberId={c.id} name={c.full_name} /></Suspense>}
        </section>
      </div>

      <MembershipActionDialog target={action} onClose={() => setAction(null)} />
      <NotifyDialog open={notify} onClose={() => setNotify(false)} memberIds={[c.id]} name={c.full_name} />
      <WhatsAppDialog open={whatsapp} onClose={() => setWhatsapp(false)} phone={`${c.country_code}${c.phone ?? ''}`} name={c.full_name}
        text={`Hi ${c.first_name}, greetings from ${studio?.name ?? 'Shaan Fitness'}.`} />
      <MedicalDialog open={medical} onClose={() => setMedical(false)} memberId={c.id} name={c.full_name} medical={med} />
      <DeviceDialog command={device} onClose={() => setDevice(null)} memberId={c.id} name={c.full_name} code={c.biometric_code ? String(c.biometric_code) : c.phone ?? ''} rfid={c.rfid ?? ''} />
      <PhotoDialog open={photo} onClose={() => setPhoto(false)} memberId={c.id} hasPhoto={!!c.photo_url} />
    </div>
  )
}

function ActionBtn({ children, onClick, disabled, gold }: { children: ReactNode; onClick: () => void; disabled?: boolean; gold?: boolean }) {
  return <button type="button" className={`${gold ? 'btn-gold' : 'btn'} btn-sm min-h-[40px] text-[12.5px]`} disabled={disabled} onClick={onClick}>{children}</button>
}

function ProfilePhoto({ path, name, onEdit }: { path: string | null; name: string; onEdit?: () => void }) {
  const { data: url } = useQuery({ queryKey: ['photo', path], enabled: !!path, queryFn: () => photoUrl(path), staleTime: 50 * 60_000 })
  const img = url ? <img src={url} alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" /> : <Avatar name={name} size={72} />
  if (!onEdit) return img
  return <button type="button" className="relative flex-none rounded-full border-0 bg-transparent p-0" onClick={onEdit} aria-label="Add a photo">{img}
    <span className="absolute right-0 bottom-0 rounded-full bg-surface-3 p-1"><Icon name="edit" size={12} /></span></button>
}

// ---------------------------------------------------------------------------
// Information tab
// ---------------------------------------------------------------------------
function SubTable({ subs, isDesk, onEdit, full }: { subs: Sub[]; isDesk: boolean; onEdit: (s: Sub) => void; full?: boolean }) {
  const { data: services = [] } = useServices()
  const [history, setHistory] = useState<Sub | null>(null)
  const cats = (s: Sub) => services.filter((x) => s.plan_service_ids?.includes(x.id)).map((x) => x.custom_name ?? x.name).join(', ')
  if (!subs.length) return <div className="card px-5 py-8 text-center text-[14px] text-muted">No subscriptions{full ? '' : ' running now'}.</div>
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>#</th><th>Membership name</th><th>Category</th><th className="nowrap">Start Date</th><th className="nowrap">End Date</th>
            <th className="num">Price</th><th>Membership Status</th><th>Payment Status</th><th>Action</th></tr></thead>
          <tbody>
            {subs.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td className="min-w-[200px]">
                  <div className="font-semibold">{s.plan_name}{s.plan_code ? ` (${s.plan_code})` : ''}</div>
                  <div className="text-[12px] text-muted">
                    {s.kind === 'trial' ? 'Trial · ' : s.kind === 'pt' ? 'PT · ' : ''}{s.trainer_name ? `Trained by ${s.trainer_name} · ` : ''}Purchase Date: {fmtDay(s.invoice_date, 'dd-MM-yyyy')}
                    {s.invoice_no ? ` · ${s.invoice_no}` : ''}
                  </div>
                  {s.sessions_total != null && <div className="text-[12px] text-muted">Sessions: {s.sessions_used} used of {s.sessions_total}</div>}
                  {(s.frozen_days > 0 || s.extension_days > 0) && <div className="text-[12px] text-muted">{s.frozen_days ? `Frozen ${s.frozen_days} days ` : ''}{s.extension_days ? `Extended ${s.extension_days} days` : ''}</div>}
                </td>
                <td className="max-w-[220px] text-[12px] text-muted">{cats(s)}</td>
                <td className="nowrap">{fmtDay(s.start_date, 'dd-MM-yyyy')}</td>
                <td className="nowrap">{fmtDay(s.end_date, 'dd-MM-yyyy')}</td>
                <td className="num">{isDesk ? amt(s.total_amount) : '—'}</td>
                <td><span className={`chip ${stateChip(s.state)}`}>{STATE_LABEL[s.state]}</span></td>
                <td>{isDesk && (s.payment_status === 'paid'
                  ? <span className="chip chip-green">Paid</span>
                  : <span className="text-[12px] font-semibold text-red">Balance:: {amt(s.balance_amount)}</span>)}</td>
                <td>
                  {isDesk && (
                    <div className="flex flex-col items-start gap-1">
                      {full && s.frozen_days > 0 && <button type="button" className="link-btn text-[12px]" onClick={() => setHistory(s)}>Freeze History</button>}
                      <Link to={`/clients/${s.member_id}/payments/${s.id}`} className="text-[12px] font-semibold">Make Payment</Link>
                      <Link to={`/registers/sessions?subscription=${s.id}`} className="text-[12px] font-semibold">Go to Sessions Register</Link>
                      {full && s.status === 'live' && !s.deleted_at && !s.cancelled_at && <button type="button" className="link-btn text-[12px]" onClick={() => onEdit(s)}>Edit</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FreezeHistory sub={history} onClose={() => setHistory(null)} />
    </>
  )
}

function FreezeHistory({ sub, onClose }: { sub: Sub | null; onClose: () => void }) {
  const { data = [] } = useQuery({ queryKey: ['subs', 'freezes', sub?.id], enabled: !!sub, queryFn: () => freezeHistory(sub!.id) })
  return (
    <Sheet open={!!sub} onClose={onClose} title="Freeze History">
      <div className="flex flex-col gap-2">
        {data.map((f) => (
          <div key={f.id} className="rounded-xl border border-line p-3 text-[13px]">
            <div className="font-semibold">{fmtDay(f.start_date)} – {fmtDay(f.end_date)} · {f.days} days</div>
            <div className="text-muted">Fee {amt(f.fee)}{f.note ? ` · ${f.note}` : ''} · {fmtDateTime(f.created_at)}</div>
          </div>
        ))}
        {!data.length && <p className="m-0 text-[14px] text-muted">No freezes.</p>}
      </div>
    </Sheet>
  )
}

function InfoTab({ client: c, subs, loading, medical, billing, onMedical, isDesk, onEdit }: {
  client: import('../../db/types').MemberOverview; subs: Sub[]; loading: boolean; medical: import('../../db/profile').Medical | null
  billing: import('../../db/types').MemberBilling | null; onMedical: () => void; isDesk: boolean; onEdit: (s: Sub) => void
}) {
  const live = subs.filter((s) => ['active', 'pending', 'frozen'].includes(s.state))
  const gender = c.gender ? c.gender[0].toUpperCase() + c.gender.slice(1) : '—'
  const addr = [c.street1, c.street2, c.city, c.state, c.country, c.pincode].filter(Boolean).join(', ')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow">Member Subscriptions · Active &amp; Expired Subscriptions</h2>
        <Link to={`/clients/${c.id}/subscriptions`} className="text-[13px] font-semibold">View all</Link>
      </div>
      {loading ? <Loading /> : <SubTable subs={live} isDesk={isDesk} onEdit={onEdit} />}

      <div className="card flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="eyebrow">Medical History</h2>
          <button type="button" className="btn btn-sm" onClick={onMedical}><Icon name="edit" size={14} />Edit Medical Details</button>
        </div>
        <ol className="m-0 grid grid-cols-1 gap-x-6 gap-y-1.5 pl-5 text-[13px] lg:grid-cols-2">
          {PAR_Q.map(([k, q]) => (
            <li key={k}>{q} <strong className={medical?.answers?.[k] ? 'text-red' : ''}>{medical?.answers?.[k] == null ? '—' : medical.answers[k] ? 'Yes' : 'No'}</strong></li>
          ))}
        </ol>
        <div className="text-[13px]"><span className="text-muted">Notes : </span>{medical?.note ?? '—'}</div>
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="eyebrow">Basic Information</h2>
          {isDesk && <Link to={`/clients/${c.id}/edit`} className="btn btn-sm"><Icon name="edit" size={14} />Edit</Link>}
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Detail title="Member Details" rows={[['Date of Birth', c.date_of_birth ? fmtDay(c.date_of_birth, 'MMMM d, yyyy') : '—'], ['Age', c.age ?? '—'], ['Gender', gender]]} />
          <Detail title="Emergency Contact Details" rows={[
            ['Name', [c.emergency_first_name, c.emergency_last_name].filter(Boolean).join(' ') || '—'], ['Mobile Number', c.emergency_phone ?? '—'],
            ['Email Address', c.emergency_email ?? '—'], ['Relationship', c.emergency_relationship ?? '—']]} />
          <Detail title="Additional Details" rows={[
            ['Source of Promotion', c.source_promotion ?? 'Unknown'], ['Employment Status', c.employment_status ?? 'Unknown'],
            ['Organization', billing?.company_name ?? '—'], ['Notes', c.notes ?? '—']]} />
        </div>
        <Detail title="Member Address & Location" rows={[['Address', addr || 'Member Address has not been added.']]} />
      </div>
    </div>
  )
}

function Detail({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  return (
    <div>
      <h3 className="m-0 mb-2 text-[13px] font-bold">{title}</h3>
      <dl className="m-0 grid grid-cols-[130px_1fr] gap-x-3 gap-y-1 text-[13px]">
        {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k} :</dt><dd className="m-0 break-words">{v}</dd></div>)}
      </dl>
    </div>
  )
}

function SubscriptionsTab({ subs, loading, isDesk, onEdit }: { subs: Sub[]; loading: boolean; isDesk: boolean; onEdit: (s: Sub) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="eyebrow">Member Subscriptions · Active &amp; Expired Subscriptions</h2>
      {loading ? <Loading /> : <SubTable subs={subs} isDesk={isDesk} onEdit={onEdit} full />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Attendance tab
// ---------------------------------------------------------------------------
const SOURCES: [string, string][] = [['', 'Select Type'], ['live', 'Live Sessions'], ['pt', 'PT Session'], ['biometric', 'Bio-Metric'], ['class', 'Class Attendance'], ['manual', 'Front desk'], ['qr', 'QR'], ['app', 'App']]
function AttendanceTab({ memberId }: { memberId: string }) {
  const [source, setSource] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data = [], isLoading, error } = useQuery({ queryKey: ['attendance', memberId, source, from, to], queryFn: () => memberAttendance(memberId, from, to, source) })
  const unique = new Set(data.map((a) => a.date)).size
  return (
    <div className="flex flex-col gap-3">
      <h2 className="eyebrow">Member Attendance</h2>
      <div className="flex flex-wrap items-end gap-2">
        <Select small ariaLabel="Type" value={source} onChange={setSource} options={SOURCES.map(([v, l]) => ({ value: v, label: l }))} className="w-auto" />
        <label className="flex items-center gap-2 text-[12px] text-muted">From <TextInput small type="date" value={from} onChange={setFrom} className="w-auto" /></label>
        <label className="flex items-center gap-2 text-[12px] text-muted">To <TextInput small type="date" value={to} onChange={setTo} className="w-auto" /></label>
      </div>
      <div className="text-[13px] text-muted">Attendance Total Checkins: {data.length} | Total Unique Checkins : {unique}</div>
      {error && <Notice tone="error">{(error as Error).message}</Notice>}
      {isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>#</th><th>Check In</th><th>Check Out</th><th>Session name</th><th>Source</th><th>Body Temperature</th></tr></thead>
            <tbody>
              {data.map((a, i) => (
                <tr key={a.id}><td>{i + 1}</td><td className="nowrap">{fmtDateTime(a.check_in)}</td><td className="nowrap">{a.check_out ? fmtDateTime(a.check_out) : '—'}</td>
                  <td>{a.status === 'present' ? (a.batch_id ? 'Batch session' : 'Gym') : a.status}</td>
                  <td>{SOURCES.find(([v]) => v === a.source)?.[1] ?? a.source}</td><td>{a.body_temperature ?? 'None'}</td></tr>
              ))}
              {!data.length && <tr><td colSpan={6} className="text-center text-muted">No check-ins.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Follow Up History tab
// ---------------------------------------------------------------------------
function FollowUpsTab({ memberId, name, notes, kind }: { memberId: string; name: string; notes: string | null; kind: string }) {
  const me = useMe()
  const { data: lists } = useLists()
  const [type, setType] = useState('')
  const [dialog, setDialog] = useState<FollowUpTarget | null>(null)
  const { data = [], isLoading, error } = useQuery({ queryKey: ['followups', 'history', memberId], queryFn: () => followUpHistory(me.studioId, memberId) })
  const rows = useMemo(() => data.filter((r) => !type || r.type === type), [data, type])
  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4 text-[13px]"><span className="eyebrow">Remarks</span><p className="m-0 mt-1">{notes ?? '—'}</p></div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="eyebrow">Member Follow Up History</h2>
        <div className="flex gap-2">
          <Select small ariaLabel="Follow-up type" value={type} onChange={setType} placeholder="All Followup" options={opts((lists?.followup_type ?? []).map((i) => i.label))} className="w-auto" />
          <button type="button" className="btn-gold min-h-[38px] px-3 text-[13px]" onClick={() => setDialog({ memberId, memberName: name, defaultType: kind === 'member' ? 'Feedback' : 'Enquiry' })}>Add Follow up</button>
        </div>
      </div>
      {error && <Notice tone="error">{(error as Error).message}</Notice>}
      {isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Followup Type</th><th>Followup Date</th><th>Reminder Date</th><th>Comments</th><th>Follow up Status</th><th>Added By</th><th>Follow Up By</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.type}</td>
                  <td className="nowrap">{fmtDateTime(r.created_at)}</td>
                  <td className="nowrap">{fmtDateTime(r.due_at)}</td>
                  <td className="min-w-[220px]">
                    {r.notes}
                    {r.expected_date && <div className="text-[12px] text-muted">Expected date: {fmtDay(r.expected_date, 'MMM dd, yyyy')}</div>}
                    {r.expected_amount != null && <div className="text-[12px] text-muted">Expected amount: {amt(r.expected_amount)}</div>}
                    {r.response_note && <div className="mt-1 text-[12px]">Response: {r.response_note}</div>}
                  </td>
                  <td>{statusChip(r.status)}</td>
                  <td>{r.source === 'system' ? 'System Generated' : r.created_by_name ?? '—'}</td>
                  <td>{r.responded_by_name ?? r.assigned_name ?? '-'}</td>
                  <td>{r.status === 'open' && <button type="button" className="link-btn text-[12px]" onClick={() => setDialog({ memberId, memberName: name, followUp: r })}>Follow up Response</button>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="text-center text-muted">No follow-ups.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <FollowUpDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Client Document tab
// ---------------------------------------------------------------------------
function DocumentsTab({ memberId }: { memberId: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [type, setType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { data = [], isLoading } = useQuery({ queryKey: ['documents', memberId], queryFn: () => memberDocuments(memberId) })
  const up = useMutation({
    mutationFn: () => uploadDocument(me.studioId, memberId, type, file!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents', memberId] }); toast('Document uploaded'); setFile(null); setType(''); if (fileRef.current) fileRef.current.value = '' },
    onError: (e: Error) => setError(e.message),
  })
  const del = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents', memberId] }); toast('Document deleted') },
    onError: (e: Error) => toast(e.message),
  })
  const submit = () => {
    setError(null)
    if (!type) return setError('Select the document type.')
    if (!file) return setError('Choose a file.')
    if (!/\.(png|jpe?g|pdf)$/i.test(file.name)) return setError('Only PNG/JPG/JPEG and PDF files supported.')
    if (file.size > 10 * 1024 * 1024) return setError('Files must be under 10 MB.')
    up.mutate()
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-2 p-5">
        <h2 className="eyebrow">Enrollment Form</h2>
        <p className="m-0 text-[13px] text-muted">Edit, view and send the enrollment form (with the member's signature) come with the member app's sign-up flow. Until then, upload a signed form below as a document.</p>
      </div>
      <div className="card flex flex-col gap-3 p-5">
        <h2 className="eyebrow">Client Documents</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Select the document Type" id="dtype"><Select id="dtype" value={type} onChange={setType} placeholder="Select the document Type" options={opts(DOCUMENT_TYPES)} /></Field>
          <Field label="File" id="dfile" hint="Only PNG/JPG/JPEG and PDF files supported.">
            <input ref={fileRef} id="dfile" type="file" accept=".png,.jpg,.jpeg,.pdf" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <button type="button" className="btn-gold" disabled={up.isPending} onClick={submit}>{up.isPending ? 'Uploading…' : 'Upload'}</button>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <h3 className="m-0 pt-2 text-[13px] font-bold">Uploaded Documents Total: {data.length}</h3>
        {isLoading ? <Loading /> : !data.length ? <p className="m-0 text-[13px] text-muted">No documents have been uploaded yet.</p> : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 text-[13px]">
                <div><div className="font-semibold">{d.doc_type}</div><div className="text-muted">{d.file_name} · {fmtDateTime(d.created_at)}</div></div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-sm" onClick={() => openDocument(d.path).catch((e: Error) => toast(e.message))}><Icon name="eye" size={14} />View</button>
                  {me.role === 'owner' && <button type="button" className="btn btn-sm btn-danger" onClick={() => del.mutate(d)}><Icon name="trash" size={14} />Delete</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ReferralsTab({ memberId }: { memberId: string }) {
  const { data = [], isLoading } = useQuery({ queryKey: ['referrals', 'by', memberId], queryFn: () => referralsBy(memberId) })
  if (isLoading) return <Loading />
  if (!data.length) return <div className="card px-5 py-8 text-center text-[14px] text-muted">No Referral Found On This Page</div>
  return (
    <div className="card overflow-x-auto">
      <table className="tbl">
        <thead><tr><th>Client Code</th><th>Date of Referral</th><th>Referred to</th><th>Mobile</th><th>Type</th><th>App</th></tr></thead>
        <tbody>{data.map((r) => (
          <tr key={r.id}><td>{r.client_code}</td><td>{fmtDay(r.referral_date)}</td><td><Link to={`/clients/${r.id}`}>{r.referred_to}</Link></td>
            <td>{r.phone ? `${r.country_code} ${r.phone}` : '—'}</td><td>{r.kind === 'member' ? 'Member' : 'Enquiry'}</td><td>{r.has_app ? 'Yes' : 'No'}</td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dialogs: notification, WhatsApp, medical history, biometric device, photo
// ---------------------------------------------------------------------------
export function NotifyDialog({ open, onClose, memberIds, name }: { open: boolean; onClose: () => void; memberIds: string[]; name?: string }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: () => sendNotification(memberIds, title, body),
    onSuccess: (n) => { toast(`Notification sent to ${n} ${n === 1 ? 'client' : 'clients'}`); setTitle(''); setBody(''); onClose() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <Sheet open={open} onClose={onClose} title="Send Notification">
      <form className="flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); setError(null); if (!title.trim() || !body.trim()) setError('Enter the title and the message.'); else m.mutate() }}>
        {name && <div className="text-[14px] font-semibold">{name}</div>}
        <Field label="Notification" required id="ntitle" hint="Make sure your title is short and explanatory."><TextInput id="ntitle" value={title} onChange={setTitle} maxLength={80} /></Field>
        <Field label="Notification Body" required id="nbody" hint="Description you provide should explain the notification clearly in short."><TextArea id="nbody" value={body} onChange={setBody} /></Field>
        <Notice>Clients see this under Notifications in the Shaan Fitness app (the bell on the home screen).</Notice>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Close</button><button type="submit" className="btn-gold flex-1" disabled={m.isPending}>Send Notification</button></div>
      </form>
    </Sheet>
  )
}

function WhatsAppDialog({ open, onClose, phone, name, text }: { open: boolean; onClose: () => void; phone: string; name: string; text: string }) {
  const [body, setBody] = useState(text)
  useEffect(() => { if (open) setBody(text) }, [open, text])
  return (
    <Sheet open={open} onClose={onClose} title="Send Whatsapp Message">
      <div className="flex flex-col gap-3.5">
        <div className="text-[14px] font-semibold">{name}</div>
        <Field label="Message Body" id="wbody"><TextArea id="wbody" value={body} onChange={setBody} rows={5} /></Field>
        <div className="flex gap-2">
          <button type="button" className="btn flex-1" onClick={onClose}>Close</button>
          <a className="btn-gold flex-1" href={waLink(phone.replace(/\D/g, ''), body)} target="_blank" rel="noreferrer" onClick={onClose}>Send Message</a>
        </div>
      </div>
    </Sheet>
  )
}

function MedicalDialog({ open, onClose, memberId, name, medical }: { open: boolean; onClose: () => void; memberId: string; name: string; medical: import('../../db/profile').Medical | null }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [ans, setAns] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    setAns(Object.fromEntries(PAR_Q.map(([k]) => [k, medical?.answers?.[k] == null ? '' : medical.answers[k] ? '1' : '0'])))
    setNote(medical?.note ?? '')
  }, [open, medical])
  const m = useMutation({
    mutationFn: () => saveMedical(memberId, Object.fromEntries(Object.entries(ans).filter(([, v]) => v !== '').map(([k, v]) => [k, v === '1'])), note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients', 'profile', memberId] }); toast('Medical history saved'); onClose() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <Sheet wide open={open} onClose={onClose} title="Medical History">
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); setError(null); if (PAR_Q.some(([k]) => !ans[k])) setError('Answer every question.'); else m.mutate() }}>
        <div className="text-[14px] font-semibold">{name}</div>
        {PAR_Q.map(([k, q]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-2">
            <span className="text-[13px]">{q} <span className="text-red">*</span></span>
            <RadioGroup name={k} legend="" value={ans[k] ?? ''} onChange={(v) => setAns((a) => ({ ...a, [k]: v }))} options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]} />
          </div>
        ))}
        <Field label="Add Note" id="mnote"><TextArea id="mnote" value={note} onChange={setNote} /></Field>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Close</button><button type="submit" className="btn-gold flex-1" disabled={m.isPending}>Save</button></div>
      </form>
    </Sheet>
  )
}

const DEVICE_TITLE: Record<string, string> = {
  add: 'ADD CUSTOMER TO BIOMETRIC DEVICE', re_add: 'RE-ENROLL CUSTOMER TO BIOMETRIC DEVICE', block: 'BLOCK CUSTOMER FROM BIOMETRIC DEVICE', unblock: 'UN-BLOCK CUSTOMER FROM BIOMETRIC DEVICE',
}
function DeviceDialog({ command, onClose, memberId, name, code, rfid }: { command: string | null; onClose: () => void; memberId: string; name: string; code: string; rfid: string }) {
  const me = useMe()
  const toast = useToast()
  const { data: devices = [], isLoading } = useQuery({ queryKey: ['devices', me.studioId], enabled: !!command, queryFn: () => listDevices(me.studioId) })
  const [deviceId, setDeviceId] = useState('')
  const [method, setMethod] = useState('finger')
  const [card, setCard] = useState(rfid)
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: () => queueDeviceCommand({ studio_id: me.studioId, device_id: deviceId, member_id: memberId, command: command!, method, biometric_code: code, rfid: card || null }),
    onSuccess: () => { toast('Sent to the device'); onClose() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <Sheet open={!!command} onClose={onClose} title={command ? DEVICE_TITLE[command] : ''}>
      <form className="flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); setError(null); if (!deviceId) setError('Select the device.'); else m.mutate() }}>
        <div className="text-[14px] font-semibold">{name}</div>
        {!isLoading && !devices.length && <Notice tone="warn">No biometric device is set up yet. The owner adds it in Fitness Center › Fitness Center Biometric Manager.</Notice>}
        <Field label="Biometric Code" id="bcode"><TextInput id="bcode" value={code} onChange={() => {}} className="opacity-70" /></Field>
        {(command === 'add' || command === 're_add') && <>
          <Field label="RFID Card" id="brfid"><TextInput id="brfid" value={card} onChange={setCard} /></Field>
          <RadioGroup name="bmethod" legend="Biometric Type" value={method} onChange={setMethod} options={[{ value: 'finger', label: 'Finger' }, { value: 'face', label: 'Face' }, { value: 'rfid', label: 'RFID Card' }]} />
        </>}
        <Field label="Select Device" required id="bdev"><Select id="bdev" value={deviceId} onChange={setDeviceId} placeholder="Select Devices" options={devices.map((d) => ({ value: d.id, label: `${d.serial} : ${d.name}` }))} /></Field>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Close</button><button type="submit" className="btn-gold flex-1" disabled={m.isPending || !devices.length}>Send to Device</button></div>
      </form>
    </Sheet>
  )
}

function PhotoDialog({ open, onClose, memberId, hasPhoto }: { open: boolean; onClose: () => void; memberId: string; hasPhoto: boolean }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const video = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const done = () => { qc.invalidateQueries({ queryKey: ['clients', 'profile', memberId] }); toast('Photo saved'); stop(); onClose() }
  const stop = () => { stream?.getTracks().forEach((t) => t.stop()); setStream(null) }
  useEffect(() => { if (!open) stop() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const up = useMutation({ mutationFn: (b: Blob) => uploadPhoto(me.studioId, memberId, b), onSuccess: done, onError: (e: Error) => setError(e.message) })
  const remove = useMutation({
    mutationFn: async () => { const r = await supabase.from('members').update({ photo_url: null }).eq('id', memberId); if (r.error) throw new Error(r.error.message) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients', 'profile', memberId] }); toast('Photo removed'); onClose() },
  })
  const openCam = async () => {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setStream(s)
      setTimeout(() => { if (video.current) { video.current.srcObject = s; void video.current.play() } }, 0)
    } catch { setError('The camera could not be opened. Allow camera access, or choose a photo file.') }
  }
  const snap = () => {
    const v = video.current
    if (!v) return
    const cv = document.createElement('canvas')
    const size = Math.min(v.videoWidth, v.videoHeight)
    cv.width = 480; cv.height = 480
    cv.getContext('2d')!.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, 480, 480)
    cv.toBlob((b) => b && up.mutate(b), 'image/jpeg', 0.85)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Set Profile Picture">
      <div className="flex flex-col gap-3">
        {stream ? <video ref={video} className="aspect-square w-full rounded-xl bg-black object-cover" muted playsInline /> : null}
        <div className="flex flex-wrap gap-2">
          {stream ? <button type="button" className="btn-gold flex-1" onClick={snap} disabled={up.isPending}>Take Snapshot</button>
            : <button type="button" className="btn flex-1" onClick={openCam}>Open WebCam</button>}
          <label className="btn flex-1 cursor-pointer">Add a photo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) up.mutate(f) }} />
          </label>
        </div>
        {hasPhoto && <button type="button" className="btn btn-sm btn-danger" onClick={() => remove.mutate()}>Remove Photo</button>}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Sheet>
  )
}
