import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { coachToday } from '../../db/care'
import { fmtClock, fmtDateTime, fmtDay, studioToday } from '../../lib/dates'
import { ContactButtons } from '../../components/client'
import { FollowUpDialog, type FollowUpTarget } from '../../components/FollowUp'
import { Loading, PageHeader, Section } from '../../components/ui'

// Coach home: today's batches, follow-ups due, and the members they train.
export default function CoachHome() {
  const me = useMe()
  const today = studioToday()
  const [respond, setRespond] = useState<FollowUpTarget | null>(null)
  const { data: d, error } = useQuery({ queryKey: ['coach', 'today', me.staffId, today], queryFn: () => coachToday(me.studioId, me.staffId!, today) })
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()))
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  if (error) return <div className="p-8 text-red">{(error as Error).message}</div>
  if (!d) return <Loading />
  return (
    <>
      <PageHeader title={`${greet}, Coach`} sub={`${me.name} · ${d.batches.length} batches today · ${d.members.length} members · ${d.followUpCount} follow-ups due`} />
      <div className="lg:grid lg:grid-cols-2">
        <Section title="My batches today" id="batches-h">
          <div className="card overflow-hidden">
            {d.batches.length === 0 && <div className="p-5 text-[14px] text-muted">No batches today.</div>}
            {d.batches.map((b) => (
              <div key={b.id} className="row">
                <div className="w-[86px] flex-none font-display text-[18px]">{fmtClock(b.start_time)}</div>
                <div className="min-w-0 flex-1"><div className="text-[15px] font-bold">{b.name}</div><div className="text-[13px] text-muted">{b.present} checked in{b.capacity ? ` · capacity ${b.capacity}` : ''}</div></div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Follow-ups due" id="fu-h" action={<Link to="/follow-ups" className="text-[13px] font-semibold">See all</Link>}>
          <div className="card overflow-hidden">
            {d.followUps.length === 0 && <div className="p-5 text-[14px] text-muted">Nothing due. Well done.</div>}
            {d.followUps.map((f) => (
              <div key={f.id} className="row flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">{f.member_name}</div>
                  <div className={`text-[12px] ${f.due_date < today ? 'text-red' : 'text-muted'}`}>{f.type} · {fmtDateTime(f.due_at)}</div>
                  {f.notes && <div className="text-[13px] text-ink-soft">{f.notes}</div>}
                </div>
                <div className="flex gap-1.5">
                  <ContactButtons countryCode={f.member_country_code} phone={f.member_phone} />
                  <button type="button" className="btn btn-sm" onClick={() => setRespond({ memberId: f.member_id, memberName: f.member_name, followUp: f })}>Response</button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <Section title="Members I train" id="members-h">
        <div className="card overflow-hidden">
          {d.members.length === 0 && <div className="p-5 text-[14px] text-muted">No members are assigned to you yet.</div>}
          {d.members.map((m) => (
            <div key={m.id} className="row">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold">{m.full_name} <span className="font-normal text-muted">{m.client_code}</span></div>
                <div className="text-[12px] text-muted">{m.current_plan_name ? `${m.current_plan_name}${m.sessions ? ` · ${m.sessions} sessions` : ''} · ends ${fmtDay(m.current_end_date)}` : 'No current plan'}{m.last_check_in ? ` · last in ${fmtDateTime(m.last_check_in)}` : ''}</div>
              </div>
              <ContactButtons countryCode={m.country_code} phone={m.phone} />
            </div>
          ))}
        </div>
      </Section>
      <FollowUpDialog target={respond} onClose={() => setRespond(null)} />
    </>
  )
}
