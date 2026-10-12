import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import {
  messageHistory, messageStats, resendMessages, SOURCE_LABEL, STATUS_LABEL, type Channel, type Message, type MessageSource, type MessageStatus,
} from '../../../db/messages'
import { fmtDateTime } from '../../../lib/dates'
import { studioLine } from '../../../components/crud'
import { ActionMenu, Notice, Select } from '../../../components/controls'
import { BulkBar, DataTable } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { PageHeader, Sheet } from '../../../components/ui'
import { RangeControl, Tiles, count, rangeFor, type RangeValue } from '../analysis/kit'

// Shared by the WhatsApp, SMS and email pages.

export function useMessageSettings<T extends Record<string, unknown>>(channel: 'whatsapp' | 'sms', defaults: T): T {
  const { data: studio } = useStudio()
  return { ...defaults, ...((studio?.settings as unknown as Record<string, Partial<T>>)?.[channel] ?? {}) }
}

/** "Waiting to send" while no service is connected. */
export function ConnectNotice({ channel, connected }: { channel: Channel; connected: boolean }) {
  if (connected) return null
  const where = channel === 'whatsapp' ? <><Link to="/whatsapp/qr">QR Manager</Link></> : channel === 'sms' ? <Link to="/sms/settings">SMS Settings</Link> : <Link to="/centers/email">Fitness Center Email Manager</Link>
  return (
    <Notice tone="warn">
      {channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS' : 'Email'} isn’t connected yet, so messages wait here (shown as WAITING) and go out once it is: {where}.
      Nothing is lost while they wait.
    </Notice>
  )
}

export const formatAddress = (m: Pick<Message, 'channel' | 'to_address'>) =>
  m.channel === 'email' ? m.to_address : m.to_address.length > 10 ? `+${m.to_address.slice(0, m.to_address.length - 10)} ${m.to_address.slice(-10)}` : m.to_address

export const statusChip = (s: MessageStatus) =>
  <span className={`chip ${s === 'sent' ? 'chip-green' : s === 'failed' ? 'chip-red' : 'chip-muted'}`}>{STATUS_LABEL[s]}</span>

/** YDL "Messages History": today's and the week's counts, filters, resend. */
export function MessageHistory({ channel, title, bulk = true, connected, children }: { channel: Channel; title: string; bulk?: boolean; connected: boolean; children?: ReactNode }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const [range, setRange] = useState<RangeValue>(() => rangeFor('last_7'))
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [view, setView] = useState<Message | null>(null)
  const stats = useQuery({ queryKey: ['message-stats', me.studioId, channel], queryFn: () => messageStats(me.studioId, channel) })
  const q = useQuery({
    queryKey: ['messages', me.studioId, channel, range.from, range.to, source, status, bulk],
    queryFn: () => messageHistory(me.studioId, channel, { from: range.from, to: range.to, source, status, bulk: bulk ? undefined : false }),
  })
  const resend = useMutation({
    mutationFn: (a: { scope: 'selected' | 'today' | 'yesterday' | 'failed'; ids?: string[] }) => resendMessages(me.studioId, channel, a.scope, a.ids),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['messages'] }); qc.invalidateQueries({ queryKey: ['message-stats'] }); setSelected(new Set()); setView(null)
      toast(n ? `${n} message${n === 1 ? '' : 's'} will be sent again` : 'Nothing to resend')
    },
    onError: (e: Error) => toast(e.message),
  })
  const s = stats.data
  const sources = (Object.keys(SOURCE_LABEL) as MessageSource[]).filter((k) => bulk || k !== 'bulk')
  const rows = q.data ?? []
  return (
    <>
      <PageHeader title={title} sub={studioLine(studio)} actions={<>
        <button type="button" className="btn btn-sm" disabled={resend.isPending} onClick={() => resend.mutate({ scope: 'today' })}>Resend Today</button>
        <button type="button" className="btn btn-sm" disabled={resend.isPending} onClick={() => resend.mutate({ scope: 'yesterday' })}>Resend Yesterday</button>
        <button type="button" className="btn btn-sm" disabled={resend.isPending} onClick={() => resend.mutate({ scope: 'failed' })}>Resend All Failed</button>
      </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <ConnectNotice channel={channel} connected={connected} />
        {children}
        <Tiles cols={3} items={[
          { label: 'Total Today', value: count(s?.today_total ?? 0) }, { label: 'Success Today', value: count(s?.today_sent ?? 0) }, { label: 'Failed Today', value: count(s?.today_failed ?? 0) },
        ]} />
        <Tiles cols={3} items={[
          { label: 'Total (7 Days)', value: count(s?.week_total ?? 0) }, { label: 'Success (7 Days)', value: count(s?.week_sent ?? 0) },
          { label: 'Failed (7 Days)', value: count(s?.week_failed ?? 0), hint: s?.queued ? `${count(s.queued)} waiting to send` : undefined },
        ]} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1"><span className="text-[12px] font-semibold text-muted">SOURCE</span>
            <Select small ariaLabel="Source" value={source} onChange={setSource} placeholder="All Sources" options={sources.map((k) => ({ value: k, label: SOURCE_LABEL[k] }))} className="w-60" /></div>
          <RangeControl value={range} onChange={setRange} label="SENT DATE RANGE" keys={['today', 'last_7', 'last_30', 'this_month', 'last_month']} />
          <div className="flex flex-col gap-1"><span className="text-[12px] font-semibold text-muted">DELIVERY STATUS</span>
            <Select small ariaLabel="Delivery status" value={status} onChange={setStatus} placeholder="All Statuses"
              options={[{ value: 'sent', label: 'SUCCESS' }, { value: 'failed', label: 'FAILURE' }, { value: 'queued', label: 'WAITING' }]} className="w-48" /></div>
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" disabled={resend.isPending} onClick={() => resend.mutate({ scope: 'selected', ids: [...selected] })}>Resend Selected</button>
        </BulkBar>
        <DataTable<Message> loading={q.isLoading} rows={rows} rowKey={(r) => r.id} caption={title} selectable selected={selected} onSelect={setSelected}
          empty="No messages in these dates."
          columns={[
            { key: 'to', header: channel === 'email' ? 'Email' : 'Mobile', cell: (m) => <div><div className="nowrap font-semibold">{formatAddress(m)}</div>{m.to_name && <div className="text-[12px] text-muted">{m.member_id ? <Link to={`/clients/${m.member_id}`}>{m.to_name}</Link> : m.to_name}</div>}</div> },
            { key: 'source', header: 'SOURCE', cell: (m) => SOURCE_LABEL[m.source] },
            { key: 'status', header: 'Status', cell: (m) => statusChip(m.status) },
            { key: 'time', header: 'Sent Time', cell: (m) => <span className="nowrap">{fmtDateTime(m.sent_at ?? m.created_at)}</span> },
            { key: 'action', header: 'Action', width: 90, cell: (m) => <ActionMenu actions={[
              { label: m.status === 'failed' ? 'View Reason' : 'View Message', onClick: () => setView(m) },
              { label: 'Resend Message', onClick: () => resend.mutate({ scope: 'selected', ids: [m.id] }), hidden: m.status === 'queued' },
            ]} /> },
          ]}
          card={(m) => (
            <div className="flex items-start justify-between gap-3">
              <button type="button" className="min-w-0 border-0 bg-transparent p-0 text-left text-ink" onClick={() => setView(m)}>
                <div className="font-semibold">{m.to_name ?? formatAddress(m)}</div>
                <div className="text-[12px] text-muted">{SOURCE_LABEL[m.source]} · {fmtDateTime(m.sent_at ?? m.created_at)}</div>
                <div className="mt-1">{statusChip(m.status)}</div>
              </button>
            </div>
          )} />
      </div>
      <Sheet open={!!view} onClose={() => setView(null)} title={view?.status === 'failed' ? 'Failure Reason' : 'View Message'}>
        {view && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[13px] text-muted">{formatAddress(view)}{view.to_name ? ` · ${view.to_name}` : ''} · {SOURCE_LABEL[view.source]} · {fmtDateTime(view.created_at)}</p>
            {view.error && <Notice tone="error">{view.error}</Notice>}
            {view.subject && <p className="m-0 font-semibold">{view.subject}</p>}
            <p className="m-0 rounded-xl bg-surface-2 p-3 text-[14px] whitespace-pre-wrap">{view.body}</p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setView(null)}>Close</button>
              {view.status !== 'queued' && <button type="button" className="btn-gold flex-1" disabled={resend.isPending} onClick={() => resend.mutate({ scope: 'selected', ids: [view.id] })}>Resend Message</button>}
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}

/** A small "{cust_first_name}" helper under message boxes. */
export function PlaceholderHint({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
      Add:
      {['{cust_first_name}', '{cust_last_name}', '{fitness_center_name}', '{fitness_center_phone}'].map((p) => (
        <button key={p} type="button" className="chip chip-muted cursor-pointer border-0" onClick={() => onPick(p)}>{p}</button>
      ))}
    </div>
  )
}
