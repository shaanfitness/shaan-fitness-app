import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useServices, useStudio } from '../../../db/studio'
import { listClients, type ClientFilters } from '../../../db/clients'
import { MEMBER_STATUS, NOTIFY_GROUPS, notifyGroup, queueMessages } from '../../../db/messages'
import { studioLine } from '../../../components/crud'
import { ClientCell } from '../../../components/client'
import { Field, Notice, Select, TextArea, TextInput } from '../../../components/controls'
import { BulkBar, DataTable, Pager } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { Icon, PageHeader, Sheet } from '../../../components/ui'
import type { MemberOverview } from '../../../db/types'
import { MessageHistory, PlaceholderHint } from './common'

// YDL Notification & WhatsApp › Email ("Bulk EmailListing") and › Notification ("Send Notification").

const PAGE = 50
const statusFilter = (s: string): ClientFilters => {
  switch (s) {
    case 'active': return { kind: 'member', liveStatus: ['active', 'pending'] }
    case 'expired_membership': return { kind: 'member', liveStatus: ['inactive'] }
    case 'enquiry_open': return { kind: 'enquiry', leadStatus: ['open'] }
    case 'enquiry_not_interested': return { kind: 'enquiry', leadStatus: ['not_interested'] }
    default: return { kind: 'all' }
  }
}

export function EmailListing() {
  const me = useMe()
  const { data: studio } = useStudio()
  const center = !!(studio?.settings as unknown as { email?: { host?: string } } | undefined)?.email?.host
  const [tab, setTab] = useState<'list' | 'sent'>('list')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [compose, setCompose] = useState<null | { ids?: string[]; group?: string; n: number }>(null)
  const f: ClientFilters = { ...statusFilter(status), search }
  const q = useQuery({ queryKey: ['email-list', me.studioId, status, search, page], queryFn: () => listClients(me.studioId, f, page, PAGE, 'created_at.desc'), placeholderData: (p) => p })
  if (tab === 'sent') {
    return (
      <MessageHistory channel="email" title="Emails Sent" connected={center}>
        <button type="button" className="link-btn self-start text-[14px]" onClick={() => setTab('list')}>Back to Bulk Email Listing</button>
      </MessageHistory>
    )
  }
  return (
    <>
      <PageHeader title="Bulk EmailListing" sub={studio ? studioLine(studio) : ''} actions={<>
        <button type="button" className="btn btn-sm" onClick={() => setTab('sent')}>Emails Sent</button>
        <button type="button" className="btn-gold min-h-10 px-4" disabled={!q.data?.total} onClick={() => setCompose({ group: status || 'all', n: q.data?.total ?? 0 })}>Send Bulk Email</button>
      </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        {!center && <Notice tone="warn">Email isn’t set up yet, so emails wait in the queue until the sender is connected (Fitness Center › Email Manager).</Notice>}
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative w-full max-w-[420px]">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search by Name or Mobile Number or Email" className="pl-9" ariaLabel="Search" />
          </div>
          <div className="flex flex-col gap-1"><span className="text-[12px] font-semibold text-muted">Members Status</span>
            <Select small ariaLabel="Members Status" value={status} onChange={(v) => { setStatus(v); setPage(0); setSelected(new Set()) }} options={MEMBER_STATUS.filter((m) => m.value !== 'all')} placeholder="All" className="w-56" /></div>
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn-gold min-h-9 px-3 text-[13px]" onClick={() => setCompose({ ids: [...selected], n: selected.size })}>Send Email to Selected</button>
        </BulkBar>
        <DataTable<MemberOverview> loading={q.isLoading} rows={q.data?.rows ?? []} rowKey={(r) => r.id} caption="Clients" selectable selected={selected} onSelect={setSelected}
          empty="No clients match."
          columns={[
            { key: 'name', header: 'Member Name & Number', cell: (r) => <ClientCell id={r.id} name={r.full_name} countryCode={r.country_code} phone={r.phone} /> },
            { key: 'email', header: 'Email', cell: (r) => r.email ?? <span className="text-faint">No email</span> },
            { key: 'code', header: 'Member Code', cell: (r) => r.client_code ?? '-' },
            { key: 'gender', header: 'Gender', cell: (r) => (r.gender ? r.gender[0].toUpperCase() + r.gender.slice(1) : '-') },
            { key: 'by', header: 'Added By', cell: (r) => r.added_by_name ?? '-' },
          ]}
          card={(r) => <div><ClientCell id={r.id} name={r.full_name} code={r.client_code} countryCode={r.country_code} phone={r.phone} /><div className="text-[12px] text-muted">{r.email ?? 'No email'}</div></div>} />
        <Pager page={page} pageSize={PAGE} total={q.data?.total ?? 0} onPage={setPage} />
      </div>
      <Sheet wide open={!!compose} onClose={() => setCompose(null)} title="Send Email">
        {compose && <ComposeEmail target={compose} onDone={() => { setCompose(null); setSelected(new Set()) }} />}
      </Sheet>
    </>
  )
}

function ComposeEmail({ target, onDone }: { target: { ids?: string[]; group?: string; n: number }; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const reach = useQuery({ queryKey: ['email-reach', target], queryFn: () => queueMessages(me.studioId, { channel: 'email', memberIds: target.ids, group: target.group, body: 'x', dry: true }) })
  const send = useMutation({
    mutationFn: () => queueMessages(me.studioId, { channel: 'email', memberIds: target.ids, group: target.group, subject, body }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['messages'] }); toast(`${r.queued ?? 0} emails queued${r.skipped ? `; ${r.skipped} without an email address` : ''}`); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); setError(null); if (!subject.trim() || !body.trim()) setError('Enter the subject and the message.'); else send.mutate() }}>
      <p className="m-0 text-[13px] text-muted">{reach.data ? `${reach.data.reachable} of ${reach.data.total} clients have an email address.` : 'Counting…'}</p>
      <Field label="Subject" required id="em-subject" hint="Make sure your title is short and explanatory."><TextInput id="em-subject" value={subject} onChange={setSubject} /></Field>
      <Field label="Message" required id="em-body" hint="Description you provide should explain the notification clearly in short."><TextArea id="em-body" rows={6} value={body} onChange={setBody} /></Field>
      <PlaceholderHint onPick={(p) => setBody((b) => `${b}${p}`)} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button>
        <button type="submit" className="btn-gold flex-1" disabled={send.isPending || !reach.data?.reachable}>{send.isPending ? 'Sending…' : 'Send Email'}</button></div>
    </form>
  )
}

// Send Notification ------------------------------------------------------------------------------------------------
export function SendNotification() {
  const me = useMe()
  const toast = useToast()
  const { data: studio } = useStudio()
  const { data: services = [] } = useServices()
  const [f, setF] = useState({ group: 'members', service: '', title: '', body: '' })
  const [error, setError] = useState<string | null>(null)
  const reach = useQuery({ queryKey: ['notify-reach', me.studioId, f.group, f.service], queryFn: () => notifyGroup(me.studioId, f.group, f.service || null, 'x', 'x', true) })
  const send = useMutation({
    mutationFn: () => notifyGroup(me.studioId, f.group, f.service || null, f.title, f.body),
    onSuccess: (n) => { toast(`Notification sent to ${n} client${n === 1 ? '' : 's'}`); setF({ ...f, title: '', body: '' }) },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <>
      <PageHeader title="Send Notification" sub={studio ? studioLine(studio) : ''} />
      <form className="flex max-w-[760px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8" noValidate
        onSubmit={(e) => { e.preventDefault(); setError(null); if (!f.title.trim() || !f.body.trim()) setError('Enter the Message Title and Message Body.'); else send.mutate() }}>
        <div className="card flex flex-col gap-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Select Group Of User" id="nt-group"><Select id="nt-group" value={f.group} onChange={(v) => setF({ ...f, group: v })} options={NOTIFY_GROUPS} /></Field>
            <Field label="Select Fitness Category" id="nt-service"><Select id="nt-service" value={f.service} onChange={(v) => setF({ ...f, service: v })} placeholder="All Categories" options={services.map((s) => ({ value: s.id, label: s.name }))} /></Field>
          </div>
          <Field label="Message Title" required id="nt-title"><TextInput id="nt-title" value={f.title} onChange={(v) => setF({ ...f, title: v })} maxLength={80} /></Field>
          <Field label="Message Body" required id="nt-body"><TextArea id="nt-body" rows={5} value={f.body} onChange={(v) => setF({ ...f, body: v })} /></Field>
          <p className="m-0 text-[13px] text-muted">{reach.data === undefined ? 'Counting…' : `${reach.data} client${reach.data === 1 ? '' : 's'} will get this in the Shaan Fitness app.`}</p>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" className="btn-gold self-start px-6" disabled={send.isPending || !reach.data}>{send.isPending ? 'Sending…' : 'Send Notification'}</button>
        </div>
      </form>
    </>
  )
}
