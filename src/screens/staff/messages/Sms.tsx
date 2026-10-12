import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import {
  addSmsRecharge, campaigns, deleteSmsRecharge, MEMBER_STATUS, messageStats, queueMessages, saveMessageSettings, smsRecharges,
  type Campaign, type SmsRecharge, type SmsTemplate,
} from '../../../db/messages'
import { fmtDateTime, fmtDay, studioToday } from '../../../lib/dates'
import { money } from '../../../lib/format'
import { studioLine } from '../../../components/crud'
import { Field, Notice, Select, TextInput } from '../../../components/controls'
import { DataTable } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../../components/ui'
import { SecretField } from '../Center'
import { Tiles, count } from '../analysis/kit'
import { ConnectNotice, MessageHistory, useMessageSettings } from './common'

// YDL Notification & WhatsApp › SMS. Indian SMS go through DLT: a 6-letter header (sender ID) and
// pre-approved templates registered with an operator; the gym buys credits from an SMS service.

const SMS_DEFAULTS = { provider: 'none', sender_id: '' as string | null, entity_id: '' as string | null, templates: [] as SmsTemplate[] }
const useSms = () => useMessageSettings('sms', SMS_DEFAULTS)
const PROVIDERS = [{ value: 'none', label: 'Not connected' }, { value: 'msg91', label: 'MSG91' }, { value: 'fast2sms', label: 'Fast2SMS' }, { value: 'textlocal', label: 'Textlocal' }]

function useSmsStats() {
  const me = useMe()
  return useQuery({ queryKey: ['message-stats', me.studioId, 'sms'], queryFn: () => messageStats(me.studioId, 'sms') })
}

// Balance & Recharge ----------------------------------------------------------------------------------------
export function SmsBalance() {
  const me = useMe()
  const { data: studio } = useStudio()
  const sms = useSms()
  const stats = useSmsStats()
  const [adding, setAdding] = useState(false)
  const credits = stats.data?.sms_credits ?? 0
  const used = stats.data?.sms_used ?? 0
  return (
    <>
      <PageHeader title="SMS Balance & Recharge" sub={studioLine(studio)}
        actions={me.role === 'owner' && <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setAdding(true)}><Icon name="plus" size={18} />Add Recharge</button>} />
      <div className="flex max-w-[960px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <ConnectNotice channel="sms" connected={sms.provider !== 'none'} />
        <Tiles cols={3} items={[
          { label: 'Credits bought', value: count(credits) }, { label: 'SMS sent', value: count(used) },
          { label: 'Balance', value: count(Math.max(0, credits - used)), hint: credits ? undefined : 'Add your recharges to track the balance' },
        ]} />
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="m-0 text-[17px] font-bold">DLT SMS Service</h2>
          <ul className="m-0 flex flex-col gap-1 pl-5 text-[14px] text-muted">
            <li>Instant setup with an SMS service (MSG91, Fast2SMS or Textlocal): buy credits there, and they bill you directly.</li>
            <li>Every SMS needs your DLT header and an approved template (register them once on the operator's DLT portal).</li>
            <li>SMS reach phones without internet; WhatsApp is cheaper and richer for members who use it.</li>
          </ul>
          <Link to="/sms/settings" className="link-btn self-start text-[14px]">SMS Settings</Link>
        </section>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add Recharge">{adding && <RechargeForm onDone={() => setAdding(false)} />}</Sheet>
    </>
  )
}

function RechargeForm({ onDone }: { onDone: () => void }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [f, setF] = useState({ credits: '', amount: '', paid_on: studioToday(), reference: '', note: '' })
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => addSmsRecharge(me.studioId, { credits: Math.round(Number(f.credits)), amount: Number(f.amount) || 0, paid_on: f.paid_on, reference: f.reference.trim() || undefined, note: f.note.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sms-recharges'] }); qc.invalidateQueries({ queryKey: ['message-stats'] }); toast('Recharge added'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); if (!(Number(f.credits) > 0)) setError('Enter the SMS credits bought.'); else save.mutate() }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SMS credits" required id="rc-credits"><TextInput id="rc-credits" type="number" inputMode="numeric" value={f.credits} onChange={(v) => setF({ ...f, credits: v })} /></Field>
        <Field label="Amount paid" id="rc-amount"><TextInput id="rc-amount" type="number" inputMode="decimal" value={f.amount} onChange={(v) => setF({ ...f, amount: v })} /></Field>
        <Field label="Paid on" id="rc-date"><TextInput id="rc-date" type="date" value={f.paid_on} onChange={(v) => setF({ ...f, paid_on: v })} /></Field>
        <Field label="Reference" id="rc-ref"><TextInput id="rc-ref" value={f.reference} onChange={(v) => setF({ ...f, reference: v })} placeholder="Invoice or UTR" /></Field>
      </div>
      <Field label="Note" id="rc-note"><TextInput id="rc-note" value={f.note} onChange={(v) => setF({ ...f, note: v })} /></Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Close</button><button type="submit" className="btn-gold flex-1" disabled={save.isPending}>Save</button></div>
    </form>
  )
}

// SMS Settings --------------------------------------------------------------------------------------------------
export function SmsSettings() {
  const { data: studio } = useStudio()
  const sms = useSms()
  if (!studio) return <Loading />
  return <SmsSettingsForm key={studio.id} initial={sms} sub={studioLine(studio)} />
}

function SmsSettingsForm({ initial, sub }: { initial: typeof SMS_DEFAULTS; sub: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const owner = me.role === 'owner'
  const [f, setF] = useState({ provider: initial.provider, sender_id: initial.sender_id ?? '', entity_id: initial.entity_id ?? '' })
  const [templates, setTemplates] = useState<SmsTemplate[]>(initial.templates ?? [])
  const [error, setError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => {
      const clean = templates.map((t) => ({ name: t.name.trim(), template_id: t.template_id.trim(), text: t.text.trim() })).filter((t) => t.name || t.template_id || t.text)
      if (clean.some((t) => !t.name || !/^\d{10,25}$/.test(t.template_id) || !t.text)) throw new Error('Each template needs a name, its DLT template ID (digits) and the approved text.')
      return saveMessageSettings(me.studioId, 'sms', {
        ...(owner ? { provider: f.provider } : {}), sender_id: f.sender_id.trim().toUpperCase() || null, entity_id: f.entity_id.trim() || null, templates: clean,
      })
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['studio'] }); setError(null); toast('SMS settings saved') },
    onError: (e: Error) => setError(e.message),
  })
  const setT = (i: number, k: keyof SmsTemplate, v: string) => setTemplates((ts) => ts.map((t, j) => (j === i ? { ...t, [k]: v } : t)))
  return (
    <>
      <PageHeader title="SMS Settings" sub={sub} actions={<button type="button" className="btn-gold min-h-10 px-6" disabled={save.isPending} onClick={() => save.mutate()}>Save</button>} />
      <div className="flex max-w-[960px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">DLT SMS Service</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="SMS service" id="sms-provider" hint={owner ? undefined : 'Only the owner changes the service'}>
              <Select id="sms-provider" value={f.provider} disabled={!owner} onChange={(v) => setF({ ...f, provider: v })} options={PROVIDERS} />
            </Field>
            <Field label="DLT header (sender ID)" id="sms-sender" hint="6 letters, e.g. SHAANF"><TextInput id="sms-sender" value={f.sender_id} maxLength={6} onChange={(v) => setF({ ...f, sender_id: v.toUpperCase() })} /></Field>
            <Field label="DLT principal entity ID" id="sms-entity"><TextInput id="sms-entity" inputMode="numeric" value={f.entity_id} onChange={(v) => setF({ ...f, entity_id: v })} /></Field>
          </div>
          {owner && <SecretField label="SMS service API key" secretKey="sms_api_key" hint="From your SMS service's dashboard. Stored privately and never shown again." />}
        </section>
        <section className="card flex flex-col gap-4 p-5" aria-labelledby="sms-templates">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sms-templates" className="m-0 text-[17px] font-bold">Approved DLT Templates</h2>
            <button type="button" className="btn btn-sm" onClick={() => setTemplates((ts) => [...ts, { name: '', template_id: '', text: '' }])}><Icon name="plus" size={16} />Add template</button>
          </div>
          <p className="m-0 text-[13px] text-muted">Copy each template exactly as approved on the DLT portal. Write {'{cust_first_name}'} where the template has a variable for the name.</p>
          {templates.length === 0 && <p className="m-0 text-[14px] text-muted">No templates yet.</p>}
          {templates.map((t, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Name" id={`smt-name-${i}`}><TextInput id={`smt-name-${i}`} value={t.name} onChange={(v) => setT(i, 'name', v)} placeholder="e.g. Holiday notice" /></Field>
              <Field label="DLT template ID" id={`smt-id-${i}`}><TextInput id={`smt-id-${i}`} inputMode="numeric" value={t.template_id} onChange={(v) => setT(i, 'template_id', v.replace(/\D/g, ''))} /></Field>
              <button type="button" className="btn btn-sm btn-danger self-end" onClick={() => setTemplates((ts) => ts.filter((_, j) => j !== i))}>Remove</button>
              <Field label="Approved text" id={`smt-text-${i}`} className="sm:col-span-3">
                <textarea id={`smt-text-${i}`} className="input" rows={2} value={t.text} onChange={(e) => setT(i, 'text', e.target.value)} />
              </Field>
            </div>
          ))}
        </section>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className="btn-gold self-start px-8" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</button>
      </div>
    </>
  )
}

// Send Bulk Messages ---------------------------------------------------------------------------------------------------
export function SmsBulk() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const sms = useSms()
  const [group, setGroup] = useState('active')
  const [tpl, setTpl] = useState('')
  const [confirm, setConfirm] = useState(false)
  const template = sms.templates.find((t) => t.template_id === tpl)
  const reach = useQuery({ queryKey: ['sms-reach', me.studioId, group], queryFn: () => queueMessages(me.studioId, { channel: 'sms', group, body: 'x', dry: true }) })
  const send = useMutation({
    mutationFn: () => queueMessages(me.studioId, { channel: 'sms', group, body: template!.text, templateId: template!.template_id, subject: template!.name }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setConfirm(false); toast(`${r.queued ?? 0} SMS queued${r.skipped ? `, ${r.skipped} without a number` : ''}`) },
    onError: (e: Error) => { setConfirm(false); toast(e.message) },
  })
  return (
    <>
      <PageHeader title="Send Bulk Messages" sub={studio ? studioLine(studio) : ''} />
      <div className="flex max-w-[760px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <ConnectNotice channel="sms" connected={sms.provider !== 'none'} />
        <div className="card flex flex-col gap-4 p-5">
          <Field label="Send to" id="sb-group"><Select id="sb-group" value={group} onChange={setGroup} options={MEMBER_STATUS} /></Field>
          <Field label="DLT template" required id="sb-tpl" hint={sms.templates.length ? undefined : 'Add your approved templates in SMS Settings first.'}>
            <Select id="sb-tpl" value={tpl} onChange={setTpl} placeholder="Select template" options={sms.templates.map((t) => ({ value: t.template_id, label: t.name }))} />
          </Field>
          {template && <p className="m-0 rounded-xl bg-surface-2 p-3 text-[14px] whitespace-pre-wrap">{template.text}</p>}
          <p className="m-0 text-[13px] text-muted">{reach.data ? `${count(reach.data.reachable ?? 0)} of ${count(reach.data.total ?? 0)} clients have a mobile number.` : 'Counting…'}</p>
          <button type="button" className="btn-gold self-start px-6" disabled={!template || !reach.data?.reachable} onClick={() => setConfirm(true)}>Send SMS</button>
        </div>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Send SMS?">
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px]">Send “{template?.name}” to {count(reach.data?.reachable ?? 0)} clients? Each one uses an SMS credit.</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(false)}>No</button>
            <button type="button" className="btn-gold flex-1" disabled={send.isPending} onClick={() => send.mutate()}>Yes, send</button></div>
        </div>
      </Sheet>
    </>
  )
}

// Histories ----------------------------------------------------------------------------------------------------------
export function SmsHistory() {
  const sms = useSms()
  return <MessageHistory channel="sms" title="Transactional SMS History" bulk={false} connected={sms.provider !== 'none'} />
}

export function CampaignHistory({ channel = 'sms' as const }: { channel?: 'sms' }) {
  const me = useMe()
  const { data: studio } = useStudio()
  const sms = useSms()
  const q = useQuery({ queryKey: ['campaigns', me.studioId, channel], queryFn: () => campaigns(me.studioId, channel) })
  const groupLabel = (a: string | null) => MEMBER_STATUS.find((m) => m.value === a)?.label ?? (a === 'selected' ? 'Selected clients' : a ?? '-')
  return (
    <>
      <PageHeader title="Bulk Campaigns History" sub={studio ? studioLine(studio) : ''} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <ConnectNotice channel="sms" connected={sms.provider !== 'none'} />
        <DataTable<Campaign> loading={q.isLoading} rows={q.data ?? []} rowKey={(r) => r.id} caption="Bulk SMS campaigns" empty="No bulk SMS sent yet."
          columns={[
            { key: 'date', header: 'Date', cell: (c) => <span className="nowrap">{fmtDateTime(c.created_at)}</span> },
            { key: 'msg', header: 'Template', cell: (c) => <div><div className="font-semibold">{c.title ?? '-'}</div><div className="max-w-[420px] truncate text-[12px] text-muted">{c.body}</div></div> },
            { key: 'to', header: 'Sent To', cell: (c) => groupLabel(c.audience) },
            { key: 'total', header: 'Total', className: 'num', cell: (c) => count(c.total) },
            { key: 'sent', header: 'Delivered', className: 'num', cell: (c) => count(c.sent) },
            { key: 'failed', header: 'Failed', className: 'num', cell: (c) => count(c.failed) },
            { key: 'wait', header: 'Waiting', className: 'num', cell: (c) => count(c.waiting) },
            { key: 'by', header: 'Sent By', cell: (c) => c.created_by_name ?? '-' },
          ]}
          card={(c) => (
            <div><div className="font-semibold">{c.title ?? 'Bulk SMS'}</div><div className="text-[12px] text-muted">{fmtDateTime(c.created_at)} · {groupLabel(c.audience)}</div>
              <div className="text-[13px]">{count(c.total)} total · {count(c.sent)} delivered · {count(c.failed)} failed · {count(c.waiting)} waiting</div></div>
          )} />
      </div>
    </>
  )
}

export function RechargeHistory() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const q = useQuery({ queryKey: ['sms-recharges', me.studioId], queryFn: () => smsRecharges(me.studioId) })
  const [adding, setAdding] = useState(false)
  const del = useMutation({
    mutationFn: deleteSmsRecharge,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sms-recharges'] }); qc.invalidateQueries({ queryKey: ['message-stats'] }); toast('Recharge removed') },
    onError: (e: Error) => toast(e.message),
  })
  const owner = me.role === 'owner'
  return (
    <>
      <PageHeader title="Recharge History" sub={studio ? studioLine(studio) : ''}
        actions={owner && <button type="button" className="btn-gold min-h-10 px-4" onClick={() => setAdding(true)}><Icon name="plus" size={18} />Add Recharge</button>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <DataTable<SmsRecharge> loading={q.isLoading} rows={q.data ?? []} rowKey={(r) => r.id} caption="SMS recharges" empty="No recharges recorded."
          columns={[
            { key: 'date', header: 'Date', cell: (r) => fmtDay(r.paid_on) },
            { key: 'credits', header: 'SMS Credits', className: 'num', cell: (r) => count(r.credits) },
            { key: 'amount', header: 'Amount', className: 'num', cell: (r) => money(Number(r.amount)) },
            { key: 'ref', header: 'Reference', cell: (r) => r.reference ?? '-' },
            { key: 'note', header: 'Note', cell: (r) => r.note ?? '' },
            ...(owner ? [{ key: 'x', header: '', width: 90, cell: (r: SmsRecharge) => <button type="button" className="btn btn-sm btn-danger" onClick={() => { if (window.confirm('Remove this recharge?')) del.mutate(r.id) }}>Remove</button> }] : []),
          ]}
          card={(r) => <div><div className="font-semibold">{count(r.credits)} SMS · {money(Number(r.amount))}</div><div className="text-[12px] text-muted">{fmtDay(r.paid_on)}{r.reference ? ` · ${r.reference}` : ''}</div></div>} />
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add Recharge">{adding && <RechargeForm onDone={() => setAdding(false)} />}</Sheet>
    </>
  )
}
