import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { careMemberIds, memberRows, type MemberFilter } from '../../data/api'
import { fmtDate, money, tierLabel } from '../../lib/format'
import { useSession } from '../../session'
import { EnquiryForm, NewMemberForm } from '../../components/forms'
import { Avatar, Empty, Icon, Loading, RiskChip, ScreenHeader, Sheet, Toast } from '../../components/ui'

const FILTERS: Array<[MemberFilter, string]> = [
  ['active', 'Active'], ['ending', 'Ending in 7 days'], ['dues', 'Dues'], ['at_risk', 'At risk'], ['expired', 'Expired'], ['all', 'All'],
]

export default function Members() {
  const { user } = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const filter = (params.get('filter') as MemberFilter) ?? 'active'
  const sheet = params.get('new') // 'member' | 'enquiry'
  const [toast, setToast] = useState<string | null>(null)
  const isDesk = user?.role === 'owner' || user?.role === 'front_desk'
  const onlyFor = isDesk ? undefined : careMemberIds(user?.staffId ?? '')
  const showMoney = isDesk
  const { data: rows } = useQuery({ queryKey: ['members', filter, q, onlyFor?.length], queryFn: () => memberRows(filter, q, onlyFor) })

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v === null) next.delete(k); else next.set(k, v)
    setParams(next, { replace: true })
  }
  const done = (msg: string, memberId?: string) => {
    setParam('new', null)
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
    if (memberId) navigate(`/members/${memberId}`)
  }

  return (
    <>
      <ScreenHeader title={isDesk ? 'Members' : 'My members'} sub={rows ? `${rows.length} shown` : undefined}
        right={isDesk ? <button type="button" className="btn-gold min-h-11" onClick={() => setParam('new', 'member')}><Icon name="plus" size={18} stroke={2} />Add</button> : undefined} />

      <div className="flex flex-col gap-3 px-5 pt-2 lg:px-8">
        <div className="flex h-[50px] items-center gap-2.5 rounded-[14px] border border-line bg-surface px-4 text-muted focus-within:border-gold">
          <Icon name="search" size={18} />
          <label htmlFor="msearch" className="sr-only">Search members</label>
          <input id="msearch" type="search" value={q} onChange={(e) => { setQ(e.target.value); setParam('q', e.target.value || null) }}
            placeholder="Search name, phone or code" className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium text-ink outline-none" />
        </div>
        <div role="group" aria-label="Filter" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
          {FILTERS.filter(([f]) => showMoney || f !== 'dues').map(([f, label]) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setParam('filter', f)}
              className={`min-h-10 flex-none rounded-full border px-4 text-[13px] font-semibold ${filter === f ? 'border-gold bg-gold text-on-gold' : 'border-line text-muted hover:text-ink'}`}>{label}</button>
          ))}
        </div>
        {isDesk && (
          <button type="button" className="self-start text-[13px] font-semibold text-gold" onClick={() => setParam('new', 'enquiry')}>+ New enquiry</button>
        )}
      </div>

      <div className="px-5 pt-3 lg:px-8">
        {!rows ? <Loading /> : rows.length === 0 ? <Empty>No members match.</Empty> : (
          <ul className="card m-0 list-none overflow-hidden p-0">
            {rows.map(({ member, cycle, coach, risk }) => (
              <li key={member.id} className="border-b border-line-soft last:border-b-0">
                <Link to={`/members/${member.id}`} className="flex items-center gap-3 px-4 py-3.5 text-ink no-underline hover:bg-surface-2 hover:text-ink">
                  <Avatar name={member.full_name} size={42} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[15px] font-bold">{member.full_name}</span>
                      {member.status === 'expired' ? <span className="chip chip-muted">Expired</span> : risk.level !== 'green' ? <RiskChip level={risk.level} /> : null}
                    </div>
                    <div className="truncate text-[13px] text-muted">
                      {cycle ? <>
                        {tierLabel[cycle.plan_tier]} · {cycle.sessions_used}/{cycle.sessions_total} · {cycle.days_left >= 0 ? `ends ${fmtDate(cycle.end_date, 'd MMM')}` : `ended ${fmtDate(cycle.end_date, 'd MMM')}`}<span className="hidden lg:inline"> · {coach}</span>
                      </> : 'No plan yet'}
                    </div>
                  </div>
                  {showMoney && cycle && cycle.amount_due > 0 && <span className="chip chip-amber">{money(cycle.amount_due)} due</span>}
                  <Icon name="chevronRight" size={18} color="var(--color-muted)" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={sheet === 'member'} onClose={() => setParam('new', null)} title="New member">
        <NewMemberForm onDone={done} />
      </Sheet>
      <Sheet open={sheet === 'enquiry'} onClose={() => setParam('new', null)} title="New enquiry">
        <EnquiryForm onDone={(m) => done(m)} />
      </Sheet>
      <Toast message={toast} />
    </>
  )
}
