import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coachHome } from '../../data/api'
import { fmtTime, tierLabel } from '../../lib/format'
import { useSession } from '../../session'
import { Avatar, BrandMark, Icon, Loading, Section } from '../../components/ui'

export default function CoachHome() {
  const { user } = useSession()
  const { data: d } = useQuery({ queryKey: ['coachHome', user?.staffId], queryFn: () => coachHome(user!.staffId!) })
  if (!d) return <Loading />
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <header className="flex flex-col gap-2.5 px-5 pt-6 lg:px-8 lg:pt-8">
        <div className="flex items-center justify-between lg:hidden">
          <BrandMark suffix="Coach" />
          <Avatar name={user?.name ?? ''} gold />
        </div>
        <h1 className="title text-[38px] leading-tight">{greet}, Coach</h1>
        <div className="text-[13px] text-muted">{user?.name} · {d.sessions.length} sessions today · {d.members} members · {d.weekBooked} places booked this week</div>
      </header>

      <div className="lg:grid lg:grid-cols-2">
        <Section title="My sessions today" id="sess-h">
          <div className="card overflow-hidden">
            {d.sessions.length === 0 && <div className="p-5 text-[14px] text-muted">No sessions today.</div>}
            {d.sessions.map((s) => {
              const t = fmtTime(s.slot.start_time)
              return (
                <Link key={s.slot.id} to="/slots" className="flex items-center gap-3.5 border-b border-line-soft px-4 py-3.5 text-ink no-underline last:border-b-0 hover:bg-surface-2 hover:text-ink">
                  <div className={`w-[62px] flex-none font-display text-[19px] leading-tight ${s.state === 'live' ? 'text-gold' : s.state === 'done' ? 'text-muted' : ''}`}>{t.time}<small className="block font-sans text-[11px] font-semibold tracking-wider text-muted">{t.suffix}</small></div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[15px] font-bold">{tierLabel[s.slot.tier]}</span>
                    <span className="text-[13px] text-muted">{s.state === 'done' ? `Done · ${s.present} present` : s.state === 'live' ? `${s.present} of ${s.people.length} checked in` : `${s.people.length} booked of ${s.slot.capacity}`}</span>
                  </div>
                  {s.state === 'live' && <span className="chip chip-green">Live</span>}
                  <Icon name="chevronRight" size={18} color="var(--color-muted)" />
                </Link>
              )
            })}
          </div>
        </Section>

        <Section title="Members needing attention" id="att-h">
          {d.attention.length === 0 && <div className="card p-5 text-[14px] text-muted">Everyone is on track.</div>}
          {d.attention.map((a) => (
            <div key={a.member.id} className={`card flex flex-col gap-2.5 p-4 ${a.risk.level === 'red' ? 'border-red/45' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <Link to={`/members/${a.member.id}`} className="text-[15px] font-bold text-ink no-underline hover:text-gold-light">{a.member.full_name}</Link>
                <span className={`chip ${a.risk.level === 'red' ? 'chip-red' : 'chip-amber'}`}>{a.risk.reason === 'Doctor hold' ? 'Doctor hold' : a.risk.level === 'red' ? 'At risk' : 'Watch'}</span>
              </div>
              <div className="text-[13px] leading-normal text-muted">{a.risk.reason === 'Doctor hold' ? (a.health?.doctor_limits ?? 'No training until the doctor clears them.') : a.risk.reason}</div>
              <div className="flex gap-2">
                <a className="btn min-h-11 flex-1" href={`https://wa.me/${a.member.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
                <Link className="btn min-h-11 flex-1" to="/follow-ups">Log outcome</Link>
              </div>
            </div>
          ))}
        </Section>
      </div>

      <Section title="Plans to write" id="plans-h">
        {d.plansToWrite.length === 0 && <div className="card p-5 text-[14px] text-muted">No plans waiting.</div>}
        {d.plansToWrite.map((p) => (
          <div key={p.member.id} className="card flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between"><span className="text-[15px] font-bold">{p.member.full_name}</span></div>
            <div className="rounded-xl bg-surface-3 px-3.5 py-3 text-[13px] leading-normal">
              <span className="font-bold text-green">{p.health?.doctor_decision === 'approved' ? 'Doctor approved.' : 'Doctor approved with limits.'}</span>{' '}
              <span className="text-ink-soft">{p.health?.doctor_limits ?? 'No limits.'}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-gold flex-1"><Icon name="sparkle" size={16} stroke={1.8} />Draft with AI</button>
              <button type="button" className="btn flex-1">Write myself</button>
            </div>
            <div className="text-[12px] text-muted">AI drafts arrive in wave 2. The draft stays with you until you edit and send it.</div>
          </div>
        ))}
      </Section>
    </>
  )
}
