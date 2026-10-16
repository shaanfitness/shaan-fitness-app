import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import { ALERT_LABEL, markAlertsDone, openAlertCount, staffAlerts, type AlertKind, type StaffAlert } from '../../db/memberApp'
import { fmtDateTime } from '../../lib/dates'
import { studioLine } from '../../components/crud'
import { Select } from '../../components/controls'
import { BulkBar, DataTable } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, PageHeader } from '../../components/ui'

// YDL Notifications Listing: what members started in the app or on the website and the gym needs to act on
// (sign-ups, trials, call backs, referrals, feedback, appointment requests, app orders, posts, freezes).

const KIND_CHIP: Partial<Record<AlertKind, string>> = { signup: 'chip-green', trial: 'chip-green', plan: 'chip-green', referral: 'chip-green', freeze: 'chip-amber', extension: 'chip-amber', order: 'chip-info', appointment: 'chip-info' }

/** The bell: how many are waiting, linking to the list. */
export function AlertsBell({ className = '' }: { className?: string }) {
  const me = useMe()
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const q = useQuery({ queryKey: ['staff-alerts', 'count', me.studioId], queryFn: () => openAlertCount(me.studioId), enabled: desk, refetchInterval: 120_000 })
  if (!desk) return null
  const n = q.data ?? 0
  return (
    <Link to="/notifications" className={`icon-btn relative no-underline ${className}`} aria-label={n ? `${n} notification${n === 1 ? '' : 's'} to handle` : 'Notifications'}>
      <Icon name="bell" size={20} />
      {n > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-on-gold" aria-hidden="true">{n > 99 ? '99+' : n}</span>}
    </Link>
  )
}

export function StaffNotifications() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const [open, setOpen] = useState(true)
  const [kind, setKind] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const q = useQuery({ queryKey: ['staff-alerts', me.studioId, open], queryFn: () => staffAlerts(me.studioId, open) })
  const done = useMutation({
    mutationFn: (ids?: string[]) => markAlertsDone(me.studioId, ids),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['staff-alerts'] }); setSelected(new Set()); toast(`${n} marked done`) },
    onError: (e: Error) => toast(e.message),
  })
  const rows = (q.data ?? []).filter((a) => !kind || a.kind === kind)
  const action = (a: StaffAlert) => (
    <div className="flex flex-wrap gap-1.5">
      {a.link && <Link to={a.link} className="btn btn-sm no-underline">Open</Link>}
      {!a.done_at && <button type="button" className="btn btn-sm" disabled={done.isPending} onClick={() => done.mutate([a.id])}>Done</button>}
    </div>
  )
  return (
    <>
      <PageHeader title="Notifications Listing" sub={studio ? studioLine(studio) : ''}
        actions={open && rows.length > 0 && <button type="button" className="btn btn-sm" disabled={done.isPending} onClick={() => { if (window.confirm('Mark every open notification as done?')) done.mutate(undefined) }}><Icon name="check" size={16} />Mark all done</button>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Notifications" className="flex gap-1.5">
            {[{ v: true, l: 'To handle' }, { v: false, l: 'All' }].map((x) => (
              <button key={x.l} type="button" role="tab" aria-selected={open === x.v} onClick={() => { setOpen(x.v); setSelected(new Set()) }}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${open === x.v ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>{x.l}</button>
            ))}
          </div>
          <Select small ariaLabel="Notification Type" value={kind} onChange={setKind} placeholder="All types" className="w-auto" options={(Object.keys(ALERT_LABEL) as AlertKind[]).map((k) => ({ value: k, label: ALERT_LABEL[k] }))} />
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm btn-gold" disabled={done.isPending} onClick={() => done.mutate([...selected])}>Mark done</button>
        </BulkBar>
        <DataTable<StaffAlert> loading={q.isLoading} rows={rows} rowKey={(a) => a.id} caption="Notifications" selectable={open} selected={selected} onSelect={setSelected}
          empty={open ? 'Nothing to handle. Requests from the app and the website show up here.' : 'No notifications yet.'}
          columns={[
            { key: 'type', header: 'Notification Type', cell: (a) => <span className={`chip ${KIND_CHIP[a.kind] ?? 'chip-muted'}`}>{ALERT_LABEL[a.kind]}</span> },
            { key: 'time', header: 'Time', cell: (a) => <span className="whitespace-nowrap">{fmtDateTime(a.created_at)}</span> },
            { key: 'text', header: 'Notification', cell: (a) => <div className="max-w-[560px]"><div className="font-semibold">{a.member_id ? <Link to={`/clients/${a.member_id}`}>{a.title}</Link> : a.title}</div>{a.body && <div className="line-clamp-2 text-[12px] text-muted">{a.body}</div>}{a.done_at && <div className="text-[12px] text-green">Done {fmtDateTime(a.done_at)}</div>}</div> },
            { key: 'act', header: 'Action', cell: action },
          ]}
          card={(a) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2"><span className={`chip ${KIND_CHIP[a.kind] ?? 'chip-muted'}`}>{ALERT_LABEL[a.kind]}</span><span className="text-[12px] text-muted">{fmtDateTime(a.created_at)}</span></div>
              <strong className="text-[14px]">{a.title}</strong>
              {a.body && <span className="line-clamp-2 text-[13px] text-muted">{a.body}</span>}
              {action(a)}
            </div>
          )} />
      </div>
    </>
  )
}
