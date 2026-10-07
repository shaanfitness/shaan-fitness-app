import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { completeFollowUp, followUps, type FollowUpRow } from '../../data/api'
import { fmtDate, telLink, waLink } from '../../lib/format'
import { useSession } from '../../session'
import { Empty, Icon, Loading, ScreenHeader, Section, Sheet, Toast } from '../../components/ui'

const typeChip: Record<string, [string, string]> = {
  renewal: ['Renewal', 'chip-gold'], balance_due: ['Balance', 'chip-amber'], trial: ['Trial', 'chip-info'],
  enquiry: ['Enquiry', 'chip-info'], at_risk: ['At risk', 'chip-red'], birthday: ['Birthday', 'chip-green'], feedback: ['Feedback', 'chip-muted'],
}

const OUTCOMES: Record<string, string[]> = {
  renewal: ['Will renew', 'Renewed', 'Thinking', 'Not renewing', 'No answer'],
  balance_due: ['Will pay', 'Paid', 'No answer'],
  trial: ['Joining', 'Thinking', 'Not interested', 'No answer'],
  enquiry: ['Trial booked', 'Call back later', 'Not interested', 'No answer'],
  at_risk: ['Spoke, back on track', 'Rescheduled', 'Health issue, told doctor', 'No answer'],
  birthday: ['Wished'],
  feedback: ['Done'],
}

function Line({ row, onDone }: { row: FollowUpRow; onDone: (r: FollowUpRow) => void }) {
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
        <div className="text-[13px] text-muted">{row.context}{row.bucket === 'upcoming' ? ` · ${fmtDate(row.followUp.due_at.slice(0, 10))}` : ''}</div>
      </div>
      <a className="icon-btn" href={waLink(row.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${row.name}`}><Icon name="chat" size={19} /></a>
      <a className="icon-btn" href={telLink(row.phone)} aria-label={`Call ${row.name}`}><Icon name="phone" size={19} /></a>
      <button type="button" className="icon-btn" aria-label={`Log outcome for ${row.name}`} onClick={() => onDone(row)}><Icon name="check" size={19} stroke={2} /></button>
    </div>
  )
}

export default function FollowUps() {
  const { user } = useSession()
  const qc = useQueryClient()
  const assignedTo = user?.role === 'coach' ? user.staffId : undefined
  const { data } = useQuery({ queryKey: ['followups', assignedTo], queryFn: () => followUps({ assignedTo }) })
  const [active, setActive] = useState<FollowUpRow | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const groups: Array<[FollowUpRow['bucket'], string]> = [['overdue', 'Overdue'], ['today', 'Today'], ['upcoming', 'Coming up']]
  const finish = async (outcome: string) => {
    if (!active) return
    await completeFollowUp(active.followUp.id, outcome)
    await qc.invalidateQueries()
    setToast(`${active.name}: ${outcome}`)
    setActive(null)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      <ScreenHeader title="Follow-ups" sub={data ? `${data.length} open` : undefined} />
      <p className="m-0 px-5 pt-1 text-[13px] text-muted lg:px-8">One task per member and reason. Logging an outcome closes it.</p>
      {!data ? <Loading /> : data.length === 0 ? <div className="px-5 pt-5 lg:px-8"><Empty>All caught up.</Empty></div> : groups.map(([b, title]) => {
        const rows = data.filter((r) => r.bucket === b)
        if (!rows.length) return null
        return (
          <Section key={b} title={<>{title} <span className={b === 'overdue' ? 'text-red' : 'text-muted'}>{rows.length}</span></>} id={`fu-${b}`}>
            <div className="card py-1">{rows.map((r) => <Line key={r.followUp.id} row={r} onDone={setActive} />)}</div>
          </Section>
        )
      })}

      <Sheet open={!!active} onClose={() => setActive(null)} title="Log outcome">
        {active && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[14px] text-muted">{active.name} · {typeChip[active.followUp.type]?.[0]}</p>
            {(OUTCOMES[active.followUp.type] ?? ['Done']).map((o) => (
              <button key={o} type="button" className="btn justify-start" onClick={() => finish(o)}>{o}</button>
            ))}
          </div>
        )}
      </Sheet>
      <Toast message={toast} />
    </>
  )
}
