import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { helpVideos, youtubeId, type HelpVideo } from '../../db/help'
import { CrudList, type CrudDef } from '../../components/crud'
import { Notice } from '../../components/controls'
import { Icon, PageHeader } from '../../components/ui'

// YDL Tutorial & Help Videos: Tutorial Videos (links the owner adds, for staff or for members) and the Admin
// Dashboard FAQ's (how this app does the everyday jobs).

type Row = { id: string; created_at?: string; active?: boolean } & Record<string, unknown>

/** A video that loads from YouTube only when played (nothing is fetched from YouTube before that). */
export function VideoCard({ v }: { v: Pick<HelpVideo, 'title' | 'description' | 'url'> }) {
  const [play, setPlay] = useState(false)
  const yt = youtubeId(v.url)
  return (
    <article className="card flex flex-col overflow-hidden">
      {yt ? (
        play
          ? <iframe className="aspect-video w-full" src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`} title={v.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          : <button type="button" className="flex aspect-video w-full items-center justify-center bg-surface-2 text-ink" onClick={() => setPlay(true)} aria-label={`Play ${v.title}`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-on-gold"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
            </button>
      ) : null}
      <div className="flex flex-col gap-1 p-4">
        <h3 className="m-0 text-[15px] font-bold">{v.title}</h3>
        {v.description && <p className="m-0 text-[13px] text-muted">{v.description}</p>}
        {!yt && <a href={v.url} target="_blank" rel="noreferrer" className="link-btn self-start text-[13px]">Open the video</a>}
      </div>
    </article>
  )
}

export function TutorialVideos() {
  const me = useMe()
  const videos = useQuery({ queryKey: ['help_videos', me.studioId], queryFn: () => helpVideos(me.studioId) })
  const list = (videos.data ?? []).filter((v) => v.active)
  const forStaff = list.filter((v) => v.audience === 'staff')
  const forMembers = list.filter((v) => v.audience === 'members')
  return (
    <>
      {me.role === 'owner' ? <ManageVideos /> : <PageHeader title="Tutorial Videos" />}
      <div className="flex flex-col gap-6 px-5 pt-2 pb-10 lg:px-8">
        {!list.length && !videos.isLoading && <Notice>No tutorial videos yet.{me.role === 'owner' ? ' Add YouTube links above: for the team, or for members (they see those in the app under Help videos).' : ''} The <Link to="/help/faq">FAQ</Link> covers the everyday jobs.</Notice>}
        {forStaff.length > 0 && <section className="flex flex-col gap-3"><h2 className="m-0 text-[17px] font-bold">For the team</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{forStaff.map((v) => <VideoCard key={v.id} v={v} />)}</div></section>}
        {forMembers.length > 0 && <section className="flex flex-col gap-3"><h2 className="m-0 text-[17px] font-bold">For members (Customer Application)</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{forMembers.map((v) => <VideoCard key={v.id} v={v} />)}</div></section>}
      </div>
    </>
  )
}

function ManageVideos() {
  const def: CrudDef<Row> = {
    table: 'help_videos', title: 'Tutorial Videos', noun: 'Video', addLabel: 'Add Video', order: { column: 'seq', ascending: true },
    searchText: (r) => String(r.title ?? ''),
    columns: [
      { key: 'title', header: 'Title', cell: (r) => <div><strong>{String(r.title)}</strong><div className="max-w-[360px] truncate text-[12px] text-muted">{String(r.url)}</div></div> },
      { key: 'for', header: 'For', cell: (r) => (r.audience === 'staff' ? 'The team' : 'Members') },
      { key: 'seq', header: 'Order', className: 'num', cell: (r) => String(r.seq) },
      { key: 'active', header: 'Status', cell: (r) => (r.active ? <span className="chip chip-green">Shown</span> : <span className="chip chip-muted">Hidden</span>) },
    ],
    card: (r) => <div><strong>{String(r.title)}</strong><div className="text-[13px] text-muted">{r.audience === 'staff' ? 'The team' : 'Members'}</div></div>,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g. How to book a class in the app' },
      { key: 'url', label: 'Video Link', type: 'text', required: true, placeholder: 'https://www.youtube.com/watch?v=…', hint: 'A YouTube link plays here; other links open in a new tab.' },
      { key: 'audience', label: 'Show To', type: 'radio', required: true, default: 'members', options: [{ value: 'members', label: 'Members (in the app)' }, { value: 'staff', label: 'The team' }] },
      { key: 'seq', label: 'Order', type: 'number', default: '0' },
      { key: 'active', label: 'Show it', type: 'yesno', required: true, default: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    validate: (v) => (!/^https:\/\//i.test(String(v.url ?? '').trim()) ? 'The video link should start with https://' : null),
    emptyText: 'No videos yet.',
  }
  return <CrudList def={def} />
}

// Admin Dashboard FAQ's -----------------------------------------------------------------------------------------------
const FAQ: { q: string; a: string; to?: [string, string] }[] = [
  { q: 'How do I add a new member and take the payment?', a: 'Use Quick Billing for a walk-in: pick or add the client, choose the membership, enter what they paid and save. The invoice and receipt are made for you. For an existing enquiry, open their profile and use Add Subscription.', to: ['/quick-billing', 'Quick Billing'] },
  { q: 'A member paid part of the fee. How do I collect the rest later?', a: 'Open the client’s profile and use Make Payment on that subscription. The Balance Due Register lists everyone who still owes money.', to: ['/registers/balance-due', 'Balance Due Register'] },
  { q: 'How do I freeze, extend, upgrade or transfer a membership?', a: 'Open the client’s profile. Membership Actions has Freeze, Extension, Upgrade, DownGrade and Transfer; each one is recorded in its own register.' },
  { q: 'How do I mark attendance?', a: 'Use Check in on the client’s profile. With a biometric device connected, check-ins arrive by themselves. Client Attendance shows who came and when.', to: ['/attendance/clients', 'Client Attendance'] },
  { q: 'How do follow-ups work?', a: 'The app makes follow-ups for enquiries, renewals, balances, birthdays and irregular members. Work through the Follow Ups page every day; each call’s response and the next date are saved on the client’s history.', to: ['/follow-ups', 'Follow Ups'] },
  { q: 'How do I give a client a workout or diet plan?', a: 'Open the client’s profile, Workout tab: Assign Workout Plan or Assign Diet Plan. Build plans under Trainers › Workout Plan and Diet Plan. Members see them in the app under Plan.' },
  { q: 'How do I send a message to many members?', a: 'Notification & WhatsApp › Send Notification for the app, Bulk SMS for text messages and Email Listing for email. WhatsApp reminders (renewals, birthdays, balances) go by themselves once WhatsApp is connected.', to: ['/notifications/send', 'Send Notification'] },
  { q: 'How do I run a challenge?', a: 'App Settings › Create Challenge: dates, terms and tasks with points. Members join in the app and log their tasks; the leaderboard adds up the points. Teams are optional.', to: ['/challenges', 'Challenge List'] },
  { q: 'How do I sell supplements or merchandise?', a: 'More Options › E-commerce: create the store, add categories and products with stock. Place Order on a client’s profile sells at the counter; members can order in the app and collect at the gym.', to: ['/store/orders', 'Client Orders'] },
  { q: 'What is the wallet?', a: 'Money a client keeps with the gym: add money at the desk or give a reward (Refer & Earn), and it pays for activities like a court by the hour. Open the client’s profile, Wallet & Orders tab.', to: ['/wallet/register', 'Wallet Register'] },
  { q: 'How do I book an appointment for a client?', a: 'Appointments › Schedule Appointment: the purpose, day, time, the client’s code and who it is with. Requests members make in the app wait at the top of that page.', to: ['/appointments', 'Appointments'] },
  { q: 'How do I give a staff member access, or take it away?', a: 'Staff › Staff Access Control sets what each type of staff can see and do. Deactivating a staff account stops their login at once.', to: ['/staff', 'Staff'] },
  { q: 'Where do I see how the gym is doing?', a: 'The Dashboard has today’s numbers. Analysis has collection, sales, renewals, conversions, traffic and profit & loss, each with date ranges.', to: ['/analysis/collection', 'Collection Analysis'] },
  { q: 'How do I export a list to Excel?', a: 'Lists and registers have Export to CSV (if your access allows it). Open the file in Excel or Google Sheets.' },
  { q: 'A member can’t sign in to the app. What do I check?', a: 'The email on their record must be the one they sign up with. They can reset their password from the sign-in page. If they joined with a different email, edit the client and correct it.' },
  { q: 'Is the members’ data safe?', a: 'Each person sees only what their role allows: members see their own records, coaches see their clients, and only the owner sees money reports. Other members appear by first name only in the community and leaderboards.' },
]

export function AdminFaq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <>
      <PageHeader title="Admin Dashboard FAQ's" sub="How the everyday jobs are done in this app" />
      <div className="flex max-w-[860px] flex-col gap-2 px-5 pt-5 pb-10 lg:px-8">
        {FAQ.map((f, i) => (
          <section key={f.q} className="card overflow-hidden">
            <h2 className="m-0">
              <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                {f.q}<Icon name="chevronRight" size={18} className={`flex-none transition-transform ${open === i ? 'rotate-90' : ''}`} />
              </button>
            </h2>
            {open === i && (
              <div id={`faq-${i}`} className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[14px] leading-relaxed">
                <p className="m-0">{f.a}</p>
                {f.to && <Link to={f.to[0]} className="link-btn self-start text-[13px]">Open {f.to[1]}</Link>}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  )
}
