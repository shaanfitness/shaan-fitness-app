import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { doctorPatients, recordDecision, type DoctorRow } from '../../db/care'
import type { DoctorDecisionValue } from '../../db/types'
import { Notice } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Loading, PageHeader, Section } from '../../components/ui'

const DECISIONS: Array<[DoctorDecisionValue, string]> = [['approved', 'Approve'], ['approved_with_limits', 'With limits'], ['hold', 'Hold']]

function DecisionCard({ row }: { row: DoctorRow }) {
  const me = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  const [choice, setChoice] = useState<DoctorDecisionValue | null>(row.decision !== 'pending' ? row.decision : null)
  const [limits, setLimits] = useState(row.limits ?? '')
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    if (!choice) return
    if (choice !== 'approved' && !limits.trim()) return setError(choice === 'hold' ? 'Write the reason for the hold.' : 'Write the limits for the coach.')
    try {
      await recordDecision(me.studioId, row.memberId, choice, choice === 'approved' ? null : limits.trim(), row.hasHealthRow)
      await qc.invalidateQueries({ queryKey: ['doctor'] })
      toast('Decision saved. The coach can see it now.')
    } catch (e) { setError((e as Error).message) }
  }
  return (
    <div className={`card flex flex-col gap-3.5 p-4 ${row.decision === 'hold' ? 'border-red/45' : ''}`}>
      <div className="flex items-center justify-between gap-2"><span className="text-[15px] font-bold">{row.name}</span><span className="text-[12px] text-muted">{row.plan ?? 'No current plan'}</span></div>
      {row.conditions && <div className="text-[13px] leading-normal text-ink-soft">{row.conditions}</div>}
      <div role="group" aria-label="Decision" className="flex gap-2">
        {DECISIONS.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={choice === k} onClick={() => setChoice(k)}
            className={`min-h-11 flex-1 rounded-xl border text-[12px] font-semibold ${choice === k ? 'border-gold bg-gold text-on-gold' : 'border-line-strong text-ink'}`}>{l}</button>
        ))}
      </div>
      {choice && choice !== 'approved' && (
        <div className="field">
          <label htmlFor={`lim-${row.memberId}`}>{choice === 'hold' ? 'Reason for the hold' : 'Limits for the coach'}</label>
          <input id={`lim-${row.memberId}`} className="input" value={limits} onChange={(e) => setLimits(e.target.value)} />
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <button type="button" className="btn-gold" disabled={!choice} onClick={save}>Save decision</button>
    </div>
  )
}

// Doctor home: the members assigned to this doctor and the decision for each. No payments.
export default function DoctorHome() {
  const me = useMe()
  const { data, error } = useQuery({ queryKey: ['doctor', me.staffId], queryFn: () => doctorPatients(me.studioId, me.staffId!) })
  if (error) return <div className="p-8 text-red">{(error as Error).message}</div>
  if (!data) return <Loading />
  const holds = data.filter((r) => r.decision === 'hold')
  const pending = data.filter((r) => r.decision === 'pending')
  const reviewed = data.filter((r) => r.decision === 'approved' || r.decision === 'approved_with_limits')
  return (
    <>
      <PageHeader title="Consults" sub={`${holds.length + pending.length} to review · health details only, no payments`} />
      {holds.length > 0 && <Section title={<span className="text-red">Red flags</span>} id="flag-h">{holds.map((r) => <DecisionCard key={r.memberId} row={r} />)}</Section>}
      <Section title="To review" id="rev-h">
        {pending.length === 0 && <div className="card p-5 text-[14px] text-muted">Nothing waiting.</div>}
        {pending.map((r) => <DecisionCard key={r.memberId} row={r} />)}
      </Section>
      <Section title="Reviewed" id="done-h">
        <div className="card overflow-hidden">
          {reviewed.length === 0 && <div className="p-5 text-[14px] text-muted">None yet.</div>}
          {reviewed.map((r) => (
            <div key={r.memberId} className="row">
              <div className="min-w-0 flex-1"><div className="text-[14px] font-bold">{r.name}</div><div className="truncate text-[13px] text-muted">{r.limits ?? 'Approved, no limits'}</div></div>
              <span className="chip chip-green">Done</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
