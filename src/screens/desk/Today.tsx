import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { todaySummary, type FollowUpRow } from '../../data/api'
import { fmtDate, fmtTime, tierLabel, todayISO, telLink, waLink } from '../../lib/format'
import { useSession } from '../../session'
import { Avatar, Bar, Icon, Loading, ScreenHeader, Section } from '../../components/ui'

const typeChip: Record<string, [string, string]> = {
  renewal: ['Renewal', 'chip-gold'],
  balance_due: ['Balance', 'chip-amber'],
  trial: ['Trial', 'chip-info'],
  enquiry: ['Enquiry', 'chip-info'],
  at_risk: ['At risk', 'chip-red'],
  birthday: ['Birthday', 'chip-green'],
  feedback: ['Feedback', 'chip-muted'],
}

export function FollowUpLine({ row }: { row: FollowUpRow }) {
  const [label, cls] = typeChip[row.followUp.type] ?? [row.followUp.type, 'chip-muted']
  return (
    <div className="row">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`chip ${cls}`}>{label}</span>
          {row.memberId
            ? <Link to={`/members/${row.memberId}`} className="truncate text-[15px] font-bold text-ink no-underline hover:text-gold-light">{row.name}</Link>
            : <span className="truncate text-[15px] font-bold">{row.name}</span>}
        </div>
        <div className="text-[13px] text-muted">{row.bucket === 'overdue' ? `Overdue · ` : ''}{row.context}</div>
      </div>
      <a className="icon-btn" href={waLink(row.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${row.name}`}><Icon name="chat" size={19} /></a>
      <a className="icon-btn" href={telLink(row.phone)} aria-label={`Call ${row.name}`}><Icon name="phone" size={19} /></a>
    </div>
  )
}

export default function Today() {
  const { user } = useSession()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { data } = useQuery({ queryKey: ['today'], queryFn: todaySummary })

  return (
    <>
      <ScreenHeader title="Today" sub={fmtDate(todayISO(), 'EEE, d MMM')}
        right={<div className="flex items-center gap-2.5"><button className="icon-btn" type="button" aria-label="Notifications"><Icon name="bell" size={20} /></button><Avatar name={user?.name ?? ''} gold /></div>} />

      <form className="px-5 pt-2 lg:px-8" role="search" onSubmit={(e) => { e.preventDefault(); navigate(`/members?q=${encodeURIComponent(q)}`) }}>
        <label htmlFor="search" className="sr-only">Search members</label>
        <div className="flex h-[50px] items-center gap-2.5 rounded-[14px] border border-line bg-surface px-4 text-muted focus-within:border-gold">
          <Icon name="search" size={18} />
          <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium text-ink outline-none" />
        </div>
      </form>

      <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2.5 px-5 pt-4 lg:max-w-[640px] lg:px-8">
        <Link className="qa" to="/members?new=enquiry"><Icon name="userPlus" color="var(--color-gold)" />Enquiry</Link>
        <Link className="qa" to="/members?filter=ending"><Icon name="receipt" color="var(--color-gold)" />Renew</Link>
        <Link className="qa" to="/slots"><Icon name="qr" color="var(--color-gold)" />Check in</Link>
        <Link className="qa" to="/follow-ups"><Icon name="list" color="var(--color-gold)" />Follow-up</Link>
      </nav>

      {!data ? <Loading /> : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-2">
          <div>
            <Section>
              {data.live || data.next ? (() => {
                const s = (data.live ?? data.next)!
                const live = !!data.live
                const t = fmtTime(s.slot.start_time)
                const shown = s.people.slice(0, 3)
                return (
                  <div className="card flex flex-col gap-3.5 p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="eyebrow">{live ? 'On the floor now' : 'Next slot'}</h2>
                      <span className={`chip ${live ? 'chip-green' : 'chip-muted'}`}>{live ? 'In progress' : 'Upcoming'}</span>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-[17px] font-bold">{t.full} · {tierLabel[s.slot.tier]}</div>
                        <div className="text-[13px] text-muted">{s.coach}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-[34px] leading-none">{live ? s.present : s.people.length}<span className="text-[22px] text-[#6F6A62]"> / {s.slot.capacity}</span></div>
                        <div className="text-[12px] text-muted">{live ? 'checked in' : 'booked'}</div>
                      </div>
                    </div>
                    <Bar value={(live ? s.present : s.people.length) / s.slot.capacity} />
                    <div className="flex items-center justify-between">
                      <div className="flex">
                        {shown.map((p, i) => <span key={p.member.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={p.member.full_name} size={32} /></span>)}
                        {s.people.length > 3 && <span className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-[#1E1E23] text-[11px] font-bold text-muted">+{s.people.length - 3}</span>}
                      </div>
                      {live && s.people.length - s.present > 0 && <div className="text-[13px] font-semibold text-red">{s.people.length - s.present} not in yet</div>}
                    </div>
                    <Link className="btn-gold" to="/slots">{live ? 'Mark attendance' : 'Open slots'}</Link>
                  </div>
                )
              })() : <div className="card p-5 text-[14px] text-muted">No more slots today.</div>}
            </Section>

            <section aria-label="Needs attention" className="grid grid-cols-3 gap-2.5 px-5 pt-4 lg:px-8">
              <Link to="/members?filter=at_risk" className="flex flex-col gap-1.5 rounded-2xl border border-red/35 bg-red/10 p-3.5 text-ink no-underline hover:text-ink">
                <span className="font-display text-[30px] leading-none text-red">{data.atRisk}</span>
                <span className="text-[12px] leading-tight font-semibold">At risk</span>
              </Link>
              <Link to="/members?filter=ending" className="flex flex-col gap-1.5 rounded-2xl border border-gold/35 bg-gold/10 p-3.5 text-ink no-underline hover:text-ink">
                <span className="font-display text-[30px] leading-none text-gold">{data.renewals}</span>
                <span className="text-[12px] leading-tight font-semibold">Renewals in 7 days</span>
              </Link>
              <Link to="/members?filter=dues" className="flex flex-col gap-1.5 rounded-2xl border border-amber/35 bg-amber/10 p-3.5 text-ink no-underline hover:text-ink">
                <span className="font-display text-[30px] leading-none text-amber">{data.balances}</span>
                <span className="text-[12px] leading-tight font-semibold">Balances due</span>
              </Link>
            </section>
          </div>

          <section aria-labelledby="due-h" className="flex flex-col gap-3 px-5 pt-6 lg:pt-5 lg:px-8">
            <div className="flex items-baseline justify-between">
              <h2 id="due-h" className="title text-[24px]">Due today <span className="font-sans text-[14px] font-semibold text-muted">{data.due.length}</span></h2>
              <Link to="/follow-ups" className="text-[13px] font-semibold no-underline">See all</Link>
            </div>
            <div className="card py-1">
              {data.due.length === 0 ? <div className="p-5 text-[14px] text-muted">Nothing due. Nice work.</div> : data.due.slice(0, 8).map((r) => <FollowUpLine key={r.followUp.id} row={r} />)}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
