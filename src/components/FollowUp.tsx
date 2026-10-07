import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../auth'
import { addFollowUp, followUpHistory } from '../db/followUps'
import { useLists, useTeam } from '../db/studio'
import type { FollowUpOverview } from '../db/types'
import { fmtDateTime, fmtDay, localInput, localInputToIso } from '../lib/dates'
import { money } from '../lib/format'
import { Field, Notice, Select, TextArea, TextInput, opts } from './controls'
import { useToast } from './toast'
import { Sheet } from './ui'

// YDL's "Schedule Follow Up" dialog. Used to add a follow-up for a client, or to
// answer an open one ("Follow up Response"), which closes it and schedules the next.
export interface FollowUpTarget { memberId: string; memberName: string; followUp?: FollowUpOverview; defaultType?: string }

export function FollowUpDialog({ target, onClose }: { target: FollowUpTarget | null; onClose: () => void }) {
  return (
    <Sheet wide open={!!target} onClose={onClose} title={target?.followUp ? 'Follow up response' : 'Schedule follow up'}>
      {target && <FollowUpForm target={target} onDone={onClose} />}
    </Sheet>
  )
}

function FollowUpForm({ target, onDone }: { target: FollowUpTarget; onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: lists } = useLists()
  const team = useTeam()
  const prev = target.followUp
  const responses = (lists?.followup_response ?? []).filter((i) => i.active)
  const [f, setF] = useState({
    type: prev?.type ?? target.defaultType ?? 'Enquiry',
    assigned_to: prev?.assigned_to ?? me.staffId ?? '',
    response: responses.find((r) => r.kind === 'open')?.label ?? 'Open Follow up',
    convertibility: prev?.convertibility ?? '',
    expected_date: prev?.expected_date ?? '',
    expected_amount: prev?.expected_amount != null ? String(prev.expected_amount) : '',
    next_at: localInput(1, 11),
    contact_type: prev?.contact_type ?? 'Phone',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!responses.length) return
    setF((x) => (responses.some((r) => r.label === x.response) ? x : { ...x, response: responses[0].label }))
  }, [responses.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const kind = responses.find((r) => r.label === f.response)?.kind ?? 'open'
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))

  const save = useMutation({
    mutationFn: () => addFollowUp({
      member_id: target.memberId,
      follow_up_id: prev?.id,
      type: f.type,
      assigned_to: f.assigned_to,
      response: f.response,
      convertibility: f.convertibility || undefined,
      expected_date: f.expected_date || undefined,
      expected_amount: f.expected_amount ? Number(f.expected_amount) : null,
      next_at: kind === 'open' ? localInputToIso(f.next_at) : undefined,
      contact_type: f.contact_type || undefined,
      notes: f.notes.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['followups'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast(kind === 'open' ? 'Follow-up scheduled' : 'Follow-up closed')
      onDone()
    },
    onError: (e: Error) => setError(e.message),
  })

  const submit = () => {
    setError(null)
    if (!f.type || !f.assigned_to || !f.response) return setError('Choose the type, who it is assigned to and the response.')
    if (kind === 'open' && !f.next_at) return setError('Choose the next follow-up date.')
    if (!f.notes.trim()) return setError('Write what to do, or pick a quick message.')
    save.mutate()
  }

  return (
    <form className="flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <div className="text-[14px] font-semibold">{target.memberName}</div>
      {prev && <Notice>Answering: {prev.type} due {fmtDateTime(prev.due_at)}{prev.notes ? ` — ${prev.notes}` : ''}</Notice>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Type of follow up" required id="fu-type">
          <Select id="fu-type" value={f.type} onChange={set('type')} options={opts((lists?.followup_type ?? []).filter((i) => i.active).map((i) => i.label))} />
        </Field>
        <Field label="Assign to" required id="fu-assign">
          <Select id="fu-assign" value={f.assigned_to} onChange={set('assigned_to')} placeholder="Select employee"
            options={team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: `${s.full_name}${s.role === 'coach' ? ' (trainer)' : ''}` }))} />
        </Field>
        <Field label="Response" required id="fu-response">
          <Select id="fu-response" value={f.response} onChange={set('response')} options={opts(responses.map((r) => r.label))} />
        </Field>
        <Field label="Convertibility" id="fu-conv">
          <Select id="fu-conv" value={f.convertibility} onChange={set('convertibility')} placeholder="Select the convertibility"
            options={opts((lists?.convertibility ?? []).filter((i) => i.active).map((i) => i.label))} />
        </Field>
        <Field label="Expected date" id="fu-exp-date">
          <TextInput id="fu-exp-date" type="date" value={f.expected_date} onChange={set('expected_date')} />
        </Field>
        <Field label="Expected amount (₹)" id="fu-exp-amt">
          <TextInput id="fu-exp-amt" type="number" inputMode="decimal" value={f.expected_amount} onChange={set('expected_amount')} />
        </Field>
        {kind === 'open' && (
          <Field label="Next follow up date" required id="fu-next">
            <TextInput id="fu-next" type="datetime-local" value={f.next_at} onChange={set('next_at')} />
          </Field>
        )}
        <Field label="Contact type" id="fu-contact">
          <Select id="fu-contact" value={f.contact_type} onChange={set('contact_type')} options={opts((lists?.contact_type ?? []).filter((i) => i.active).map((i) => i.label))} />
        </Field>
      </div>
      <Field label="To do / comment" required id="fu-notes">
        <Select ariaLabel="Quick message" value="" placeholder="Quick message"
          options={opts((lists?.quick_message ?? []).filter((i) => i.active).map((i) => i.label))}
          onChange={(v) => v && setF((x) => ({ ...x, notes: x.notes ? `${x.notes} ${v}` : v }))} />
        <TextArea id="fu-notes" value={f.notes} onChange={set('notes')} placeholder="What was said, and what to do next" />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Submit'}</button>
      </div>
    </form>
  )
}

const STATUS_LABEL: Record<string, string> = { open: 'Open', done: 'Follow up done', successful: 'Successful', not_interested: 'Not interested' }
export const statusChip = (s: string) =>
  <span className={`chip ${s === 'open' ? 'chip-amber' : s === 'successful' ? 'chip-green' : s === 'not_interested' ? 'chip-red' : 'chip-muted'}`}>{STATUS_LABEL[s] ?? s}</span>

// YDL's "Follow Up History" for one client.
export function FollowUpHistory({ member, onClose }: { member: { id: string; name: string } | null; onClose: () => void }) {
  return (
    <Sheet wide open={!!member} onClose={onClose} title="Follow up history">
      {member && <HistoryBody memberId={member.id} name={member.name} />}
    </Sheet>
  )
}

function HistoryBody({ memberId, name }: { memberId: string; name: string }) {
  const me = useMe()
  const { data: lists } = useLists()
  const [type, setType] = useState('')
  const { data, isLoading, error } = useQuery({ queryKey: ['followups', 'history', memberId], queryFn: () => followUpHistory(me.studioId, memberId) })
  const rows = useMemo(() => (data ?? []).filter((r) => !type || r.type === type), [data, type])
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[14px] font-semibold">{name}</div>
      <Select ariaLabel="Follow-up type" small value={type} onChange={setType} placeholder="All follow-ups"
        options={opts((lists?.followup_type ?? []).map((i) => i.label))} />
      {isLoading && <div className="py-6 text-center text-[14px] text-muted" role="status">Loading…</div>}
      {error && <Notice tone="error">{(error as Error).message}</Notice>}
      {!isLoading && rows.length === 0 && <div className="py-6 text-center text-[14px] text-muted">No follow-ups yet.</div>}
      <ol className="m-0 flex max-h-[60vh] list-none flex-col gap-2 overflow-y-auto p-0">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-line p-3 text-[13px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{r.type}</span>{statusChip(r.status)}
            </div>
            <dl className="m-0 mt-2 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted">Follow-up date</dt><dd className="m-0">{fmtDateTime(r.created_at)}</dd>
              <dt className="text-muted">Reminder date</dt><dd className="m-0">{fmtDateTime(r.due_at)}</dd>
              {r.notes && <><dt className="text-muted">To do</dt><dd className="m-0">{r.notes}</dd></>}
              {r.response_note && <><dt className="text-muted">Comment</dt><dd className="m-0">{r.response_note}</dd></>}
              {r.response && <><dt className="text-muted">Response</dt><dd className="m-0">{r.response}</dd></>}
              <dt className="text-muted">Added by</dt><dd className="m-0">{r.source === 'system' ? 'System generated' : r.created_by_name ?? '—'}</dd>
              <dt className="text-muted">Follow up by</dt><dd className="m-0">{r.responded_by_name ?? r.assigned_name ?? '—'}</dd>
              {r.expected_date && <><dt className="text-muted">Expected</dt><dd className="m-0">{fmtDay(r.expected_date)}{r.expected_amount ? ` · ${money(r.expected_amount)}` : ''}</dd></>}
            </dl>
          </li>
        ))}
      </ol>
    </div>
  )
}
