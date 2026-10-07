import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ownerKpis } from '../../data/api'
import { fmtDate, money, todayISO } from '../../lib/format'
import { Avatar, Loading, ScreenHeader, Section } from '../../components/ui'

function Tile({ label, value, note, tone, to }: { label: string; value: string; note?: string; tone?: 'red' | 'gold' | 'amber'; to?: string }) {
  const color = tone === 'red' ? 'text-red' : tone === 'amber' ? 'text-amber' : tone === 'gold' ? 'text-gold' : 'text-ink'
  const body = (
    <>
      <span className="text-[12px] font-semibold text-muted">{label}</span>
      <span className={`font-display text-[30px] leading-none ${color}`}>{value}</span>
      {note && <span className="text-[12px] text-muted">{note}</span>}
    </>
  )
  return to
    ? <Link to={to} className="card flex flex-col gap-2 p-4 text-ink no-underline hover:border-gold hover:text-ink">{body}</Link>
    : <div className="card flex flex-col gap-2 p-4">{body}</div>
}

// Daily collections, last 30 days: one series, gold columns, hover for the day's total.
function CollectionsChart({ daily }: { daily: Array<{ date: string; amount: number }> }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720, H = 220, padL = 52, padR = 12, padT = 16, padB = 28
  const max = Math.max(...daily.map((d) => d.amount), 1)
  const step = max > 40000 ? 20000 : max > 20000 ? 10000 : 5000
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)
  const band = (W - padL - padR) / daily.length
  const bw = Math.min(14, band - 2)
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top)
  const peak = daily.reduce((b, d, i) => (d.amount > daily[b].amount ? i : b), 0)
  const total = daily.reduce((s, d) => s + d.amount, 0)
  const bar = (x: number, v: number) => {
    const h = Math.max(y(0) - y(v), v > 0 ? 2 : 0)
    const r = Math.min(4, h / 2, bw / 2)
    const yt = y(0) - h
    return `M${x} ${y(0)}V${yt + r}Q${x} ${yt} ${x + r} ${yt}H${x + bw - r}Q${x + bw} ${yt} ${x + bw} ${yt + r}V${y(0)}Z`
  }
  return (
    <figure className="card relative m-0 p-4">
      <figcaption className="flex items-baseline justify-between gap-3 pb-2">
        <span className="eyebrow">Collections · last 30 days</span>
        <span className="text-[13px] text-muted">{money(total)} total</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Daily collections for the last 30 days, ${money(total)} in total`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#222227" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{t === 0 ? '0' : `₹${t / 1000}k`}</text>
          </g>
        ))}
        {daily.map((d, i) => {
          const x = padL + i * band + (band - bw) / 2
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${fmtDate(d.date, 'd MMM')}: ${money(d.amount)}`}>
              <rect x={padL + i * band} y={padT} width={band} height={H - padT - padB} fill="transparent" />
              {d.amount > 0 && <path d={bar(x, d.amount)} fill="var(--color-gold)" opacity={hover === null || hover === i ? 1 : 0.45} />}
            </g>
          )
        })}
        {daily[peak].amount > 0 && (
          <text x={padL + peak * band + band / 2} y={y(daily[peak].amount) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-ink-soft)">{money(daily[peak].amount)}</text>
        )}
        {[0, 10, 20, 29].map((i) => (
          <text key={i} x={padL + i * band + band / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{daily[i].date === todayISO() ? 'Today' : fmtDate(daily[i].date, 'd MMM')}</text>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-12 rounded-lg border border-line bg-surface-3 px-3 py-2 text-[12px] shadow-lg"
          style={{ left: `clamp(8px, calc(${((padL + hover * band + band / 2) / W) * 100}% - 60px), calc(100% - 140px))` }}>
          <div className="text-muted">{fmtDate(daily[hover].date, 'EEE d MMM')}</div>
          <div className="font-bold">{money(daily[hover].amount)}</div>
        </div>
      )}
      <table className="sr-only">
        <caption>Daily collections</caption>
        <thead><tr><th>Date</th><th>Collected</th></tr></thead>
        <tbody>{daily.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.amount}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

export default function Dashboard() {
  const { data: k } = useQuery({ queryKey: ['owner'], queryFn: ownerKpis })
  if (!k) return <Loading />
  return (
    <>
      <ScreenHeader title="Dashboard" sub={fmtDate(todayISO(), 'EEEE, d MMMM')} />
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 px-5 pt-4 lg:grid-cols-3 lg:px-8 xl:grid-cols-6">
        <Tile label="Collected today" value={money(k.collectedToday)} tone="gold" />
        <Tile label="This month" value={money(k.collectedMonth)} />
        <Tile label="Dues outstanding" value={money(k.dues)} tone="amber" to="/members?filter=dues" />
        <Tile label="Active members" value={String(k.active)} note={`${k.byTier.group} Group · ${k.byTier.semi_private} Semi-Private · ${k.byTier.elite} Elite`} to="/members" />
        <Tile label="Renewals in 7 days" value={String(k.renewals)} note={`${money(k.renewalValue)} to collect`} to="/members?filter=ending" />
        <Tile label="Revenue at risk" value={money(k.atRiskValue)} note={`${k.atRiskCount} members at risk`} tone="red" to="/members?filter=at_risk" />
      </section>

      <div className="px-5 pt-4 lg:px-8"><CollectionsChart daily={k.daily} /></div>

      <div className="lg:grid lg:grid-cols-2">
        <Section title="At risk now" id="risk-h" action={<Link to="/members?filter=at_risk" className="text-[13px] font-semibold no-underline">All</Link>}>
          <div className="card overflow-hidden">
            {k.risky.length === 0 ? <div className="p-5 text-[14px] text-muted">Nobody at risk.</div> : k.risky.map((r) => (
              <Link key={r.member.id} to={`/members/${r.member.id}`} className="row text-ink no-underline hover:bg-surface-2 hover:text-ink">
                <Avatar name={r.member.full_name} size={36} />
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold">{r.member.full_name}</div><div className="text-[12px] text-red">{r.risk.reason}</div></div>
                <span className="text-[12px] text-muted">{r.coach}</span>
              </Link>
            ))}
          </div>
        </Section>
        <Section title="Latest payments" id="pay-h">
          <div className="card overflow-hidden">
            {k.recent.map((p) => (
              <div key={p.id} className="row text-[14px]">
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{p.name}</div><div className="text-[12px] text-muted">{fmtDate(p.paid_on, 'd MMM')} · {p.method.toUpperCase().replace('_', ' ')} · {p.receipt_number}</div></div>
                <span className="font-bold">{money(p.amount)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <p className="m-0 px-5 pt-5 text-[12px] text-muted lg:px-8">{k.leadsOpen} open enquiries. Sample data until the database is connected.</p>
    </>
  )
}
