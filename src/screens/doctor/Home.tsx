import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { doctorHome, recordDecision } from '../../data/api'
import type { DoctorDecision } from '../../data/types'
import { useSession } from '../../session'
import { Avatar, BrandMark, Loading, Section, Toast } from '../../components/ui'

const DECISIONS: Array<[DoctorDecision, string]> = [['approved', 'Approve'], ['approved_with_limits', 'With limits'], ['hold', 'Hold']]

function DecisionCard({ memberId, name, sub, note, initial, initialLimits }: { memberId: string; name: string; sub: string; note?: string; initial?: DoctorDecision; initialLimits?: string }) {
  const qc = useQueryClient()
  const [choice, setChoice] = useState<DoctorDecision | null>(initial && initial !== 'pending' ? initial : null)
  const [limits, setLimits] = useState(initialLimits ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="card flex flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between gap-2"><span className="text-[15px] font-bold">{name}</span><span className="text-[12px] text-muted">{sub}</span></div>
      {note && <div className="text-[13px] leading-normal text-ink-soft">{note}</div>}
      <div role="group" aria-label="Decision" className="flex gap-2">
        {DECISIONS.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={choice === k} onClick={() => setChoice(k)}
            className={`min-h-11 flex-1 rounded-xl border text-[12px] font-semibold ${choice === k ? 'border-gold bg-gold text-on-gold' : 'border-line-strong text-ink'}`}>{l}</button>
        ))}
      </div>
      {choice && choice !== 'approved' && (
        <div className="field">
          <label htmlFor={`lim-${memberId}`}>{choice === 'hold' ? 'Reason for the hold' : 'Limits for the coach'}</label>
          <input id={`lim-${memberId}`} className="input" value={limits} onChange={(e) => setLimits(e.target.value)} />
        </div>
      )}
      <button type="button" className="btn-gold" disabled={!choice} onClick={async () => {
        await recordDecision(memberId, choice!, limits || undefined)
        await qc.invalidateQueries()
        setMsg('Decision saved. The coach can see it now.')
        setTimeout(() => setMsg(null), 3000)
      }}>Save decision</button>
      <Toast message={msg} />
    </div>
  )
}

export default function DoctorHome() {
  const { user } = useSession()
  const { data: d } = useQuery({ queryKey: ['doctorHome', user?.staffId], queryFn: () => doctorHome(user!.staffId!) })
  if (!d) return <Loading />
  return (
    <>
      <header className="flex flex-col gap-2.5 px-5 pt-6 lg:px-8 lg:pt-8">
        <div className="flex items-center justify-between lg:hidden"><BrandMark suffix="Doctor" /><Avatar name={user?.name ?? ''} gold /></div>
        <h1 className="title text-[38px] leading-tight">This week's consults</h1>
        <div className="text-[13px] text-muted">{d.holds.length + d.pending.length} to review · health details only, no payments</div>
      </header>

      {d.holds.length > 0 && (
        <Section title={<span className="text-red">Red flags</span>} id="flag-h">
          {d.holds.map((r) => <DecisionCard key={r.member.id} memberId={r.member.id} name={r.member.full_name} sub={`${r.coach} · ${r.plan}`} note={r.health?.doctor_limits} initial="hold" initialLimits={r.health?.doctor_limits} />)}
        </Section>
      )}
      <Section title="To review" id="rev-h">
        {d.pending.length === 0 && <div className="card p-5 text-[14px] text-muted">Nothing waiting.</div>}
        {d.pending.map((r) => <DecisionCard key={r.member.id} memberId={r.member.id} name={r.member.full_name} sub={`${r.coach} · ${r.plan}`} note={r.health?.conditions ? `New report: ${r.health.conditions}` : 'No reports yet'} />)}
      </Section>
      <Section title="Reviewed" id="done-h">
        <div className="card overflow-hidden">
          {d.reviewed.map((r) => (
            <div key={r.member.id} className="row">
              <div className="min-w-0 flex-1"><div className="text-[14px] font-bold">{r.member.full_name}</div><div className="truncate text-[13px] text-muted">{r.health?.doctor_limits ?? 'Approved, no limits'}</div></div>
              <span className="chip chip-green">Done</span>
            </div>
          ))}
        </div>
      </Section>
      <p className="m-0 px-5 pt-5 text-[12px] text-muted lg:px-8">Report reading and AI summaries arrive in wave 2.</p>
    </>
  )
}
