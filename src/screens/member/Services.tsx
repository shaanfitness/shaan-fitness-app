import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, useList, useStudio } from '../../db/studio'
import { APPOINTMENT_CHIP, timeRange, type Appointment, type AppointmentStatus } from '../../db/classes'
import { walletActivities, walletBalance, walletCategories, walletEntries } from '../../db/wallet'
import { helpVideos } from '../../db/help'
import { fmtDay, plusDays, studioToday } from '../../lib/dates'
import { money, moneyExact } from '../../lib/format'
import { Field, Notice, Select, TextArea, TextInput } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, Loading, Sheet } from '../../components/ui'
import { VideoCard } from '../staff/Help'

// Member app: my wallet, my appointments (and asking for one), and the gym's help videos.

function Back() {
  const { t } = useTranslation()
  return <Link to="/app/profile" className="flex items-center gap-1 self-start text-[13px] font-semibold no-underline lg:hidden"><Icon name="chevronLeft" size={16} />{t('app.back')}</Link>
}

// Wallet ------------------------------------------------------------------------------------------------------------
export function MemberWallet() {
  const { t } = useTranslation()
  const me = useMe()
  const balance = useQuery({ queryKey: ['wallet', 'balance', me.memberId], queryFn: () => walletBalance(me.memberId!), enabled: !!me.memberId })
  const history = useQuery({ queryKey: ['wallet', 'entries', me.memberId], queryFn: () => walletEntries({ studioId: me.studioId, memberId: me.memberId! }), enabled: !!me.memberId })
  const acts = useQuery({ queryKey: ['wallet_activities', me.studioId, 'member'], queryFn: () => walletActivities(me.studioId) })
  const cats = useQuery({ queryKey: ['wallet_categories', me.studioId, 'member'], queryFn: () => walletCategories(me.studioId) })
  const label = (s: string) => t(`wallet.source.${s}`)
  // Activities in a reward category (YDL's "Refer & Earn") are ways to earn; the rest are what the wallet pays for.
  const rewardCats = new Set((cats.data ?? []).filter((c) => /refer|earn|reward/i.test(c.name)).map((c) => c.id))
  const live = (acts.data ?? []).filter((a) => a.active)
  const spend = live.filter((a) => !rewardCats.has(a.category_id))
  const earn = live.filter((a) => rewardCats.has(a.category_id))
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <h1 className="title text-[36px]">{t('wallet.title')}</h1>
      <section className="card flex flex-col gap-1 p-5">
        <span className="text-[13px] font-semibold text-muted">{t('wallet.balance')}</span>
        <span className="text-[36px] leading-none font-bold">{balance.data ? moneyExact(balance.data.balance) : '…'}</span>
        <span className="text-[13px] text-muted">{t('wallet.topUp')}</span>
      </section>
      {spend.length > 0 && (
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="m-0 text-[15px] font-bold">{t('wallet.useFor')}</h2>
          {spend.map((a) => (
            <div key={a.id} className="flex justify-between gap-3 text-[14px]"><span>{a.name}<span className="block text-[12px] text-muted">{a.one_time ? t('wallet.once') : t('wallet.perHours', { n: Number(a.duration_hours) })}</span></span><b>{money(Number(a.price))}</b></div>
          ))}
        </section>
      )}
      {earn.length > 0 && (
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="m-0 text-[15px] font-bold">{t('wallet.earn')}</h2>
          {earn.map((a) => (
            <div key={a.id} className="flex justify-between gap-3 text-[14px]"><span>{a.name}{a.description ? <span className="block text-[12px] text-muted">{a.description}</span> : null}</span><b className="text-green">+{money(Number(a.price))}</b></div>
          ))}
        </section>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-[15px] font-bold">{t('wallet.history')}</h2>
        {history.isLoading ? <Loading /> : !history.data?.length ? <div className="card px-5 py-6 text-center text-[14px] text-muted">{t('wallet.empty')}</div> : (
          <ul className="card m-0 list-none p-0">
            {history.data.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                <span className="text-[14px]"><span className="font-semibold">{e.activity_name ?? label(e.source)}</span>
                  <span className="block text-[12px] text-muted">{fmtDay(e.txn_date, 'd MMM yyyy')}{e.activity_name ? ` · ${label(e.source)}` : ''}{e.note ? ` · ${e.note}` : ''}</span></span>
                <span className={`text-[15px] font-bold ${e.kind === 'credit' ? 'text-green' : ''}`}>{e.kind === 'credit' ? '+' : '−'}{moneyExact(e.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// Appointments --------------------------------------------------------------------------------------------------------
export function MemberAppointments() {
  const { t } = useTranslation()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const today = studioToday()
  const q = useQuery({
    queryKey: ['my-appointments', me.memberId], enabled: !!me.memberId,
    queryFn: async () => throwIf(await supabase.from('appointment_overview').select('*').eq('member_id', me.memberId!).order('appointment_date', { ascending: false }).order('start_time').limit(100)) as Appointment[],
  })
  const [asking, setAsking] = useState(false)
  const cancel = useMutation({
    mutationFn: async (id: string) => { const r = await supabase.rpc('cancel_my_appointment', { p_id: id }); if (r.error) throw new Error(r.error.message) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-appointments'] }); toast(t('appt.cancelled')) },
    onError: (e: Error) => toast(e.message),
  })
  const canAsk = (studio?.settings.center as Record<string, unknown> | undefined)?.can_book_appointment !== false
  const all = q.data ?? []
  const upcoming = all.filter((a) => a.appointment_date >= today && !['cancelled', 'attended', 'no_show'].includes(a.status)).reverse()
  const past = all.filter((a) => !upcoming.includes(a))
  const row = (a: Appointment, live: boolean) => (
    <li key={a.id} className="card flex flex-col gap-1 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{a.purpose ?? a.title}</span>
        <span className={`chip ${APPOINTMENT_CHIP[a.status]}`}>{t(`appt.status.${a.status as AppointmentStatus}`)}</span>
      </div>
      <span className="text-[13px] text-muted">{fmtDay(a.appointment_date, 'EEE d MMM yyyy')} · {timeRange(a.start_time, a.end_time)}{a.handled_by_name ? ` · ${a.handled_by_name}` : ''}{a.room_no ? ` · ${t('appt.room', { n: a.room_no })}` : ''}</span>
      {a.status === 'wait_list' && <span className="text-[12px] text-muted">{t('appt.waiting')}</span>}
      {live && <button type="button" className="link-btn self-start text-[13px]" disabled={cancel.isPending} onClick={() => { if (window.confirm(t('appt.confirmCancel'))) cancel.mutate(a.id) }}>{t('appt.cancel')}</button>}
    </li>
  )
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="title text-[36px]">{t('appt.title')}</h1>
        {canAsk && <button type="button" className="btn-gold px-4 whitespace-nowrap" onClick={() => setAsking(true)}><Icon name="plus" size={18} />{t('appt.ask')}</button>}
      </div>
      {q.isLoading ? <Loading /> : (
        <>
          <section className="flex flex-col gap-2"><h2 className="m-0 text-[15px] font-bold">{t('appt.upcoming')}</h2>
            {upcoming.length ? <ul className="m-0 flex list-none flex-col gap-2 p-0">{upcoming.map((a) => row(a, true))}</ul> : <div className="card px-5 py-6 text-center text-[14px] text-muted">{t('appt.none')}</div>}
          </section>
          {past.length > 0 && <section className="flex flex-col gap-2"><h2 className="m-0 text-[15px] font-bold">{t('appt.past')}</h2><ul className="m-0 flex list-none flex-col gap-2 p-0">{past.slice(0, 20).map((a) => row(a, false))}</ul></section>}
        </>
      )}
      <Sheet open={asking} onClose={() => setAsking(false)} title={t('appt.ask')}>{asking && <AskForm onDone={() => setAsking(false)} />}</Sheet>
    </div>
  )
}

function AskForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const purposes = useList('appointment_purpose')
  const today = studioToday()
  const [f, setF] = useState({ purpose: '', date: plusDays(today, 1), time: '18:00', comments: '' })
  const [error, setError] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: async () => {
      const r = await supabase.rpc('request_appointment', { p: { purpose: f.purpose, appointment_date: f.date, start_time: f.time, comments: f.comments } })
      if (r.error) throw new Error(r.error.message)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-appointments'] }); toast(t('appt.sent')); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); setError(null); if (!f.purpose) setError(t('appt.needPurpose')); else if (!f.date || !f.time) setError(t('appt.needTime')); else m.mutate() }}>
      <Field label={t('appt.purpose')} required id="ask-purpose"><Select id="ask-purpose" value={f.purpose} onChange={(v) => setF({ ...f, purpose: v })} placeholder={t('appt.choose')} options={purposes.map((p) => ({ value: p.label, label: p.label }))} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('appt.day')} required id="ask-date"><TextInput id="ask-date" type="date" value={f.date} onChange={(v) => setF({ ...f, date: v })} /></Field>
        <Field label={t('appt.time')} required id="ask-time"><TextInput id="ask-time" type="time" value={f.time} onChange={(v) => setF({ ...f, time: v })} /></Field>
      </div>
      <Field label={t('appt.comments')} id="ask-comments"><TextArea id="ask-comments" rows={3} value={f.comments} onChange={(v) => setF({ ...f, comments: v })} /></Field>
      <p className="m-0 text-[12px] text-muted">{t('appt.howItWorks')}</p>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-gold" disabled={m.isPending}>{t('appt.send')}</button>
    </form>
  )
}

// Help videos ---------------------------------------------------------------------------------------------------------
export function MemberVideos() {
  const { t } = useTranslation()
  const me = useMe()
  const q = useQuery({ queryKey: ['help_videos', me.studioId, 'members'], queryFn: () => helpVideos(me.studioId, 'members') })
  const list = (q.data ?? []).filter((v) => v.active)
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back />
      <h1 className="title text-[36px]">{t('help.videos')}</h1>
      {q.isLoading ? <Loading /> : !list.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('help.none')}</div> : list.map((v) => <VideoCard key={v.id} v={v} />)}
    </div>
  )
}
