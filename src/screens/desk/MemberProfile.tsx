import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMember } from '../../data/api'
import { fmtDate, fmtTime, money, tierLabel, telLink, waLink } from '../../lib/format'
import { useSession } from '../../session'
import { PaymentForm, RenewForm } from '../../components/forms'
import { Avatar, Icon, Loading, RiskChip, Section, Sheet, Toast } from '../../components/ui'

const decisionLabel = {
  pending: ['Waiting for doctor', 'chip-muted'],
  approved: ['Doctor approved', 'chip-green'],
  approved_with_limits: ['Approved with limits', 'chip-gold'],
  hold: ['Doctor hold', 'chip-red'],
} as const

export default function MemberProfile() {
  const { id = '' } = useParams()
  const { user } = useSession()
  const { data: d } = useQuery({ queryKey: ['member', id], queryFn: () => getMember(id) })
  const [sheet, setSheet] = useState<'pay' | 'renew' | null>(null)
  const [tab, setTab] = useState<'attendance' | 'payments' | 'cycles'>('attendance')
  const [toast, setToast] = useState<string | null>(null)
  const role = user?.role
  const seesMoney = role === 'owner' || role === 'front_desk'
  const seesHealth = role === 'owner' || role === 'coach' || role === 'doctor'

  if (!d) return <Loading />
  const { member: m, cycle: c } = d
  const done = (msg: string) => { setSheet(null); setToast(msg); setTimeout(() => setToast(null), 3500) }
  const pct = c && c.sessions_total ? c.sessions_used / c.sessions_total : 0
  const circ = 2 * Math.PI * 46

  return (
    <>
      <div className="flex items-center gap-2 px-5 pt-5 lg:px-8">
        <Link to="/members" className="icon-btn" aria-label="Back to members"><Icon name="chevronLeft" size={18} stroke={1.8} /></Link>
        <div className="brand ml-1">Member profile</div>
      </div>

      <header className="flex items-center gap-4 px-5 pt-5 lg:px-8">
        <Avatar name={m.full_name} size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="title truncate text-[32px] leading-tight">{m.full_name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span>{m.member_code}</span>
            {m.status === 'expired' ? <span className="chip chip-muted">Expired</span> : <RiskChip level={d.risk.level} />}
            {m.preferred_language === 'te' && <span className="chip chip-info">తెలుగు</span>}
          </div>
        </div>
      </header>
      {d.risk.reason && d.risk.level !== 'green' && <p className="m-0 px-5 pt-2 text-[13px] text-red lg:px-8">{d.risk.reason}</p>}

      <div className="flex gap-2.5 px-5 pt-4 lg:px-8">
        <a className="btn flex-1" href={telLink(m.phone)}><Icon name="phone" size={18} />Call</a>
        <a className="btn flex-1" href={waLink(m.phone, `Hi ${m.full_name.split(' ')[0]}, `)} target="_blank" rel="noreferrer"><Icon name="chat" size={18} />WhatsApp</a>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Current plan" id="cur-h">
          {c ? (
            <div className="card flex flex-col gap-4 p-5">
              <div className="flex items-center gap-5">
                <div className="relative h-[108px] w-[108px] flex-none">
                  <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
                    <circle cx="54" cy="54" r="46" fill="none" stroke="var(--color-line)" strokeWidth="8" />
                    <circle cx="54" cy="54" r="46" fill="none" stroke="var(--color-gold)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${circ * pct} ${circ}`} transform="rotate(-90 54 54)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-[30px] leading-none">{c.sessions_used}</span>
                    <span className="text-[12px] text-muted">of {c.sessions_total}</span>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="text-[17px] font-bold">{c.plan_name}</div>
                  <div className="text-[13px] leading-snug text-muted">{fmtDate(c.start_date, 'd MMM')} – {fmtDate(c.end_date, 'd MMM')}{c.extension_days ? ` · +${c.extension_days} days extended` : ''}</div>
                  <div className={`text-[14px] font-semibold ${c.days_left < 0 ? 'text-red' : c.days_left <= 5 ? 'text-amber' : 'text-ink'}`}>
                    {c.days_left < 0 ? `Ended ${-c.days_left} days ago` : c.days_left === 0 ? 'Ends today' : `${c.days_left} days left · ${c.sessions_left} sessions left`}
                  </div>
                </div>
              </div>
              {seesMoney && (
                <div className="flex items-center justify-between rounded-xl bg-surface-3 px-4 py-3 text-[14px]">
                  <span className="text-muted">Paid {money(c.amount_paid)} of {money(c.price - c.discount_amount)}</span>
                  {c.amount_due > 0 ? <span className="font-bold text-amber">{money(c.amount_due)} due</span> : <span className="font-bold text-green">Fully paid</span>}
                </div>
              )}
              {seesMoney && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" className={c.amount_due > 0 ? 'btn-gold' : 'btn'} onClick={() => setSheet('pay')}><Icon name="receipt" size={18} />Payment</button>
                  <button type="button" className={c.amount_due > 0 ? 'btn' : 'btn-gold'} onClick={() => setSheet('renew')}>Renew</button>
                </div>
              )}
            </div>
          ) : (
            <div className="card flex flex-col gap-3 p-5">
              <p className="m-0 text-[14px] text-muted">No plan yet.</p>
              {seesMoney && <button type="button" className="btn-gold" onClick={() => setSheet('renew')}>Start a plan</button>}
            </div>
          )}
        </Section>

        <Section title="Care team" id="care-h">
          <div className="card overflow-hidden">
            {d.coaches.map((s) => (
              <div key={s.id} className="row"><Avatar name={s.full_name} size={36} /><div className="flex-1"><div className="text-[14px] font-bold">{s.full_name}</div><div className="text-[12px] text-muted">Coach{s.level ? ` · ${s.level}` : ''}</div></div></div>
            ))}
            {d.doctor && <div className="row"><Avatar name={d.doctor.full_name} size={36} /><div className="flex-1"><div className="text-[14px] font-bold">{d.doctor.full_name}</div><div className="text-[12px] text-muted">Doctor</div></div></div>}
            {d.standing.length > 0 && (
              <div className="row text-[13px] text-muted"><Icon name="calendar" size={18} />Usual slot: {fmtTime(d.standing[0].start_time).full}, {d.standing.length === 6 ? 'Mon–Sat' : `${d.standing.length} days a week`}</div>
            )}
            {seesHealth && d.health && (
              <div className="row flex-col items-start gap-2">
                <span className={`chip ${decisionLabel[d.health.doctor_decision][1]}`}>{decisionLabel[d.health.doctor_decision][0]}</span>
                {d.health.doctor_limits && <span className="text-[13px] text-ink-soft">{d.health.doctor_limits}</span>}
              </div>
            )}
          </div>
        </Section>
      </div>

      <Section>
        <div role="tablist" aria-label="History" className="flex gap-2">
          {([['attendance', 'Attendance'], ...(seesMoney ? [['payments', 'Payments'], ['cycles', 'Plans']] : [])] as Array<[typeof tab, string]>).map(([k, l]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`min-h-10 rounded-full border px-4 text-[13px] font-semibold ${tab === k ? 'border-gold bg-gold text-on-gold' : 'border-line text-muted'}`}>{l}</button>
          ))}
        </div>
        <div className="card overflow-hidden" role="tabpanel">
          {tab === 'attendance' && (d.attendance.length === 0 ? <div className="p-5 text-[14px] text-muted">No sessions yet.</div> :
            d.attendance.slice(0, 14).map((a) => (
              <div key={a.id} className="row text-[14px]">
                <span className="flex-1">{fmtDate(a.date, 'EEE d MMM')}{a.time ? ` · ${fmtTime(a.time).full}` : ''}</span>
                <span className={`chip ${a.status === 'present' ? 'chip-green' : 'chip-red'}`}>{a.status === 'present' ? 'Present' : 'Absent'}</span>
              </div>
            )))}
          {tab === 'payments' && (d.payments.length === 0 ? <div className="p-5 text-[14px] text-muted">No payments yet.</div> :
            d.payments.map((p) => (
              <div key={p.id} className="row text-[14px]">
                <div className="flex-1"><div className="font-semibold">{money(p.amount)}</div><div className="text-[12px] text-muted">{fmtDate(p.paid_on, 'd MMM yyyy')} · {p.method.toUpperCase().replace('_', ' ')}</div></div>
                <span className="text-[12px] text-muted">{p.receipt_number}</span>
              </div>
            )))}
          {tab === 'cycles' && d.history.map((h) => (
            <div key={h.id} className="row text-[14px]">
              <div className="flex-1"><div className="font-semibold">{tierLabel[h.plan_tier]} · {money(h.price - h.discount_amount)}</div><div className="text-[12px] text-muted">{fmtDate(h.start_date, 'd MMM')} – {fmtDate(h.end_date, 'd MMM yyyy')} · {h.sessions_used} of {h.sessions_total} used</div></div>
              <span className={`chip ${h.status === 'active' ? 'chip-green' : h.status === 'upcoming' ? 'chip-info' : 'chip-muted'}`}>{h.status}</span>
            </div>
          ))}
        </div>
      </Section>

      <Sheet open={sheet === 'pay'} onClose={() => setSheet(null)} title="Record payment">
        <PaymentForm memberId={m.id} cycle={c} onDone={done} />
      </Sheet>
      <Sheet open={sheet === 'renew'} onClose={() => setSheet(null)} title={c ? 'Renew' : 'Start a plan'}>
        <RenewForm memberId={m.id} current={c} onDone={done} />
      </Sheet>
      <Toast message={toast} />
    </>
  )
}
