import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import { messageStats, saveMessageSettings, sendTestMessage } from '../../../db/messages'
import { studioLine } from '../../../components/crud'
import { Checkbox, Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../../components/controls'
import { useToast } from '../../../components/toast'
import { Loading, PageHeader } from '../../../components/ui'
import { SecretField } from '../Center'
import { MessageHistory, useMessageSettings } from './common'

// YDL Notification & WhatsApp › WhatsApp (Third Party): QR Manager, WhatsApp Settings, Messages History.

export const WA_DEFAULTS = {
  provider: 'none', instance_id: '' as string | null, number: '' as string | null,
  birthday: true, balance_due: true, on_expiry: true, before_expiry: true, after_expiry: true, irregular: true,
  on_enquiry: true, on_bill: true, on_paid_balance: false, auto_resend: true, internationalization: true, customized_bill: true,
  salutation: 'Dear', before_expiry_days: 3, after_expiry_days: 7, irregular_days: 10,
  birthday_template: '', irregular_template: '', enquiry_template: '', customized_bill_template: '',
  suffix_bill: 'Feel free to contact us in case of any queries.', suffix_before_expiry: 'Renew Immediately to continue using the services.',
  suffix_after_expiry: 'Renew Immediately to continue using the services.', suffix_on_expiry: 'Renew Immediately to continue using the services.',
  suffix_balance_due: 'Renew Immediately to continue using the services.', suffix_paid_balance: 'Thank you for your payment.',
}
export type WaSettings = typeof WA_DEFAULTS
const PROVIDERS = [
  { value: 'none', label: 'Not connected' },
  { value: 'ultramsg', label: 'UltraMsg (scan a QR, like YDL’s service)' },
  { value: 'greenapi', label: 'Green API (scan a QR)' },
  { value: 'cloud_api', label: 'WhatsApp Business Cloud API (official, by Meta)' },
]
export const useWhatsApp = () => useMessageSettings('whatsapp', WA_DEFAULTS)

// QR Manager ------------------------------------------------------------------------------------------
export function QrManager() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const wa = useWhatsApp()
  const owner = me.role === 'owner'
  const stats = useQuery({ queryKey: ['message-stats', me.studioId, 'whatsapp'], queryFn: () => messageStats(me.studioId, 'whatsapp') })
  const [conn, setConn] = useState<{ provider: string; instance_id: string; number: string } | null>(null)
  const c = conn ?? { provider: wa.provider, instance_id: wa.instance_id ?? '', number: wa.number ?? '' }
  const [test, setTest] = useState({ cc: '91', mobile: '', body: 'Test message from Shaan Fitness.' })
  const save = useMutation({
    mutationFn: () => saveMessageSettings(me.studioId, 'whatsapp', { provider: c.provider, instance_id: c.instance_id.trim() || null, number: c.number.trim() || null }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['studio'] }); setConn(null); toast('WhatsApp connection saved') },
    onError: (e: Error) => toast(e.message),
  })
  const send = useMutation({
    mutationFn: () => sendTestMessage(me.studioId, 'whatsapp', `${test.cc}${test.mobile}`, test.body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); qc.invalidateQueries({ queryKey: ['message-stats'] }); toast('Test message queued. See it in Messages History.') },
    onError: (e: Error) => toast(e.message),
  })
  if (!studio) return <Loading />
  const connected = wa.provider !== 'none'
  return (
    <>
      <PageHeader title="Unofficial WhatsApp Services" sub={studioLine(studio)} />
      <div className="flex max-w-[960px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <Notice tone="warn">DISCLAIMER: A QR-linked WhatsApp is an unofficial service run by a third-party vendor. Use it for transactional alerts only (bills, reminders, birthdays), not for promotions, or WhatsApp may block the number.</Notice>
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="m-0 text-[17px] font-bold">{connected ? 'WhatsApp Connected' : 'WhatsApp Not Connected'}</h2>
          <p className="m-0 text-[14px] text-muted">{connected
            ? `Service: ${PROVIDERS.find((p) => p.value === wa.provider)?.label}${wa.number ? ` · Number: ${wa.number}` : ''}`
            : 'Automatic messages (birthdays, expiry reminders, bills, new enquiries) are being prepared and wait in the queue until a WhatsApp number is linked.'}</p>
          <p className="m-0 text-[13px] text-muted">{stats.data ? `${stats.data.queued} message${stats.data.queued === 1 ? '' : 's'} waiting to send.` : ''}</p>
        </section>
        <section className="card flex flex-col gap-4 p-5" aria-labelledby="wa-connect">
          <h2 id="wa-connect" className="m-0 text-[17px] font-bold">How to Connect</h2>
          <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[14px]">
            <li>Make an account with the WhatsApp service (UltraMsg or Green API both link by QR, like YDL's), and create an instance.</li>
            <li>In the service's dashboard, scan its QR code with the gym's WhatsApp: WhatsApp › Linked devices › Link a device.</li>
            <li>Copy the instance ID and the token here and save. The token is stored privately and never shown again.</li>
            <li>Send a test message below, and check Messages History.</li>
          </ol>
          {!owner ? <Notice>Only the owner can connect or change the WhatsApp service.</Notice> : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="WhatsApp service" id="wa-provider">
                  <Select id="wa-provider" value={c.provider} onChange={(v) => setConn({ ...c, provider: v })} options={PROVIDERS} />
                </Field>
                <Field label={c.provider === 'cloud_api' ? 'Phone number ID' : 'Instance ID'} id="wa-instance">
                  <TextInput id="wa-instance" value={c.instance_id} onChange={(v) => setConn({ ...c, instance_id: v })} placeholder="e.g. instance12345" />
                </Field>
                <Field label="Gym WhatsApp number" id="wa-number">
                  <TextInput id="wa-number" type="tel" value={c.number} onChange={(v) => setConn({ ...c, number: v })} placeholder="+91 …" />
                </Field>
              </div>
              <button type="button" className="btn-gold self-start px-6" disabled={save.isPending || !conn} onClick={() => save.mutate()}>Save connection</button>
              <SecretField label="Service token" secretKey="whatsapp_token" hint="From the service's dashboard (UltraMsg: Token; Green API: apiTokenInstance; Cloud API: a permanent access token)." />
              <p className="m-0 text-[12px] text-muted">Sending starts once the message sender is switched on for your account (switch-day setup). Until then the queue keeps everything.</p>
            </>
          )}
        </section>
        <section className="card flex flex-col gap-4 p-5" aria-labelledby="wa-test">
          <h2 id="wa-test" className="m-0 text-[17px] font-bold">Test Functionality</h2>
          <div className="grid grid-cols-[90px_1fr] gap-3">
            <Field label="Code" id="wa-cc"><TextInput id="wa-cc" inputMode="numeric" value={test.cc} onChange={(v) => setTest({ ...test, cc: v.replace(/\D/g, '') })} /></Field>
            <Field label="Mobile Number" id="wa-mobile"><TextInput id="wa-mobile" type="tel" inputMode="tel" value={test.mobile} onChange={(v) => setTest({ ...test, mobile: v })} placeholder="98480 12345" /></Field>
          </div>
          <Field label="Message Content" id="wa-body"><TextArea id="wa-body" value={test.body} onChange={(v) => setTest({ ...test, body: v })} /></Field>
          <button type="button" className="btn-gold self-start px-6" disabled={send.isPending || !test.mobile.trim()} onClick={() => send.mutate()}>Send Test Message</button>
        </section>
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="m-0 text-[17px] font-bold">Knowledge Base</h2>
          <ul className="m-0 flex flex-col gap-1 pl-5 text-[14px] text-muted">
            <li>Keep the linked phone charged and online; WhatsApp unlinks devices that stay offline for about 14 days.</li>
            <li>Failed messages are retried automatically a few hours later when “Auto Resend” is on (WhatsApp Settings).</li>
            <li>The official Cloud API needs Meta business verification and approved templates, but the number can’t be blocked for using it.</li>
          </ul>
        </section>
      </div>
    </>
  )
}

// WhatsApp Settings --------------------------------------------------------------------------------------
type Bool = 'birthday' | 'balance_due' | 'on_expiry' | 'before_expiry' | 'after_expiry' | 'irregular' | 'on_enquiry' | 'on_bill' | 'on_paid_balance' | 'auto_resend' | 'internationalization' | 'customized_bill'
type Text = 'birthday_template' | 'irregular_template' | 'enquiry_template' | 'customized_bill_template' | 'suffix_bill' | 'suffix_before_expiry' | 'suffix_after_expiry' | 'suffix_on_expiry' | 'suffix_balance_due' | 'suffix_paid_balance'

export function WhatsAppSettings() {
  const { data: studio } = useStudio()
  const wa = useWhatsApp()
  if (!studio) return <Loading />
  return <WaSettingsForm key={studio.id} initial={wa} sub={studioLine(studio)} />
}

function WaSettingsForm({ initial, sub }: { initial: WaSettings; sub: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [f, setF] = useState(initial)
  const save = useMutation({
    mutationFn: () => {
      const { provider: _p, instance_id: _i, number: _n, ...rest } = f
      return saveMessageSettings(me.studioId, 'whatsapp', { ...rest, before_expiry_days: Number(f.before_expiry_days), after_expiry_days: Number(f.after_expiry_days), irregular_days: Number(f.irregular_days) })
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['studio'] }); toast('WhatsApp settings saved') },
    onError: (e: Error) => toast(e.message),
  })
  const check = (k: Bool, label: string) => <Checkbox key={k} id={`wa-${k}`} checked={!!f[k]} onChange={(v) => setF({ ...f, [k]: v })} label={label} />
  const text = (k: Text, label: string, hint: string, placeholder?: string) => (
    <Field key={k} label={label} id={`wa-${k}`} hint={hint}><TextArea id={`wa-${k}`} rows={k.endsWith('template') ? 4 : 2} value={String(f[k] ?? '')} onChange={(v) => setF({ ...f, [k]: v })} placeholder={placeholder} /></Field>
  )
  const days = (k: 'before_expiry_days' | 'after_expiry_days' | 'irregular_days', label: string) => (
    <Field label={label} id={`wa-${k}`}><TextInput id={`wa-${k}`} type="number" inputMode="numeric" value={String(f[k])} onChange={(v) => setF({ ...f, [k]: v as unknown as number })} className="w-24" /></Field>
  )
  const suffixTip = 'The Suffix message will be appended immediately after the system prefix in the final WhatsApp message.'
  return (
    <>
      <PageHeader title="WhatsApp Settings" sub={sub} actions={<button type="button" className="btn-gold min-h-10 px-6" disabled={save.isPending} onClick={() => save.mutate()}>Save WhatsApp Settings</button>} />
      <div className="flex max-w-[960px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        <p className="m-0 text-[14px] text-muted">Manage automated WhatsApp triggers, templates, and delivery preferences.</p>
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="eyebrow">Scheduled Automatic Messages</h2>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {check('birthday', 'Birthday 04:00 AM')}{check('balance_due', 'Balance Due 05:00 AM')}{check('on_expiry', 'On Expiry 08:00 AM')}
            {check('before_expiry', 'Before Expiry 06:00 AM')}{check('after_expiry', 'After Expiry 07:00 AM')}{check('irregular', 'Irregular Members 08:00 AM')}
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            {days('before_expiry_days', 'Days before expiry')}{days('after_expiry_days', 'Days after expiry')}{days('irregular_days', 'Irregular after (days absent)')}
          </div>
          <p className="m-0 text-[12px] text-muted">Balance Due goes on the payment date set on the bill (or a week after the bill), then every 7 days while a balance remains.</p>
        </section>
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="eyebrow">Event Triggered Messages</h2>
          <div className="grid gap-x-6 sm:grid-cols-3">{check('on_enquiry', 'Enquiry')}{check('on_bill', 'Subscription Bill')}{check('on_paid_balance', 'Paid Balance')}</div>
        </section>
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="eyebrow">Important WhatsApp Settings</h2>
          <div className="grid gap-x-6 sm:grid-cols-3">{check('auto_resend', 'Auto Resend')}{check('internationalization', 'Internationalization')}{check('customized_bill', 'Customized Bill Message')}</div>
        </section>
        <section className="card flex flex-col gap-3 p-5">
          <RadioGroup name="wa-salutation" legend="Customer Salutation" value={f.salutation} onChange={(v) => setF({ ...f, salutation: v })}
            options={['Dear', 'Hello', 'Respected', 'Hi', 'Hey', 'Greetings'].map((v) => ({ value: v, label: v }))} />
          <p className="m-0 text-[12px] text-muted">Tip: This will be added to all templates.</p>
        </section>
        <section className="card flex flex-col gap-4 p-5">
          {text('birthday_template', 'Birthday Template', 'Leave empty to send the standard birthday wish.', 'Happy Birthday {cust_first_name} {cust_last_name} from {fitness_center_name} Family.')}
          {text('irregular_template', 'Irregular Members Template', 'Leave empty to send the standard message.', 'Hi {cust_first_name} {cust_last_name}, \n\nIt has been long time you have visited our center. \n\nPlease visit us and let us restart this wonderful journey together - {fitness_center_name}')}
          {text('enquiry_template', 'New Enquiry Welcome Message Template', 'Leave empty to send the standard welcome.', 'Hi {cust_first_name} {cust_last_name},\n\nWelcome to {fitness_center_name}!\n\nCall: {fitness_center_phone}\nWeb: {website_url}')}
          {text('customized_bill_template', 'Fully Customized Bill Creation Template', 'Used when “Customized Bill Message” is on. Also: {membership}, {total_amount}, {start_date}, {end_date}, {balance_amount}, {receipt_link}.',
            'Dear {cust_first_name} {cust_last_name}, Thanking you for subscribing {membership} for Rs. {total_amount}. Your subscription duration is between {start_date} - {end_date}.')}
          {text('suffix_bill', 'Subscription Bill Creation Message', suffixTip)}
          {text('suffix_before_expiry', 'Before Expiry Message', suffixTip)}
          {text('suffix_after_expiry', 'After Expiry Message', suffixTip)}
          {text('suffix_on_expiry', 'On Day Of Expiry Message', suffixTip)}
          {text('suffix_balance_due', 'Renewal Balance Due Message', suffixTip)}
          {text('suffix_paid_balance', 'Balance Paid Message', suffixTip)}
        </section>
        <button type="button" className="btn-gold self-start px-8" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save WhatsApp Settings'}</button>
      </div>
    </>
  )
}

// Messages History -----------------------------------------------------------------------------------------
export function WhatsAppHistory() {
  const wa = useWhatsApp()
  return <MessageHistory channel="whatsapp" title="Unofficial WhatsApp Message History" connected={wa.provider !== 'none'} />
}

