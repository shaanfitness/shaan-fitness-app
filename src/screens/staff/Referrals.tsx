import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { listReferrals } from '../../db/profile'
import { useStudio } from '../../db/studio'
import { fmtDay } from '../../lib/dates'
import { downloadCsv } from '../../lib/csv'
import { CheckboxGroup, Notice, TextInput } from '../../components/controls'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL "Client Referrals List" and "Other Branch Member".

export function ClientReferrals() {
  const me = useMe()
  const { data: studio } = useStudio()
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data = [], isLoading, error } = useQuery({ queryKey: ['referrals', me.studioId, search, from, to], queryFn: () => listReferrals(me.studioId, search, from, to) })
  const exportCsv = () => downloadCsv('client-referrals.csv', data, [
    ['Client Code', (r) => r.client_code], ['Date of Referral', (r) => r.referral_date], ['Referral from', (r) => r.referral_from], ['Referral from type', (r) => r.referral_from_type],
    ['Referred to', (r) => r.referred_to], ['Referral No', (r) => (r.phone ? `${r.country_code} ${r.phone}` : '')], ['Referral Address', (r) => r.address], ['Has downloaded', (r) => (r.has_app ? 'Yes' : 'No')],
  ])
  return (
    <>
      <PageHeader title="Client Referrals List" sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={<button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={setSearch} placeholder="Search by Mobile Number or Email Address" className="pl-9" />
          </div>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">Created Date<TextInput small type="date" value={from} onChange={setFrom} className="w-auto" /></label>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">To<TextInput small type="date" value={to} onChange={setTo} className="w-auto" /></label>
        </div>
        {error && <Notice tone="error">{(error as Error).message}</Notice>}
        {isLoading ? <Loading /> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Client Code</th><th>Date of Referral</th><th>Referral from</th><th>Referral from type</th><th>Referred to</th><th>Referral_no</th><th>Referral Address</th><th>Referral Has downloaded</th></tr></thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap font-semibold">{r.client_code}</td>
                    <td className="nowrap">{fmtDay(r.referral_date)}</td>
                    <td>{r.referred_by_member_id ? <Link to={`/clients/${r.referred_by_member_id}`}>{r.referral_from}</Link> : r.referral_from}{r.referral_from_code ? <div className="text-[12px] text-muted">{r.referral_from_code}</div> : null}</td>
                    <td>{r.referral_from_type}</td>
                    <td><Link to={`/clients/${r.id}`}>{r.referred_to}</Link></td>
                    <td className="nowrap">{r.phone ? `${r.country_code} ${r.phone}` : '—'}</td>
                    <td className="max-w-[220px]">{r.address || '—'}</td>
                    <td>{r.has_app ? <span className="chip chip-green">Yes</span> : <span className="chip chip-muted">No</span>}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={8} className="text-center text-muted">No referrals yet. Referrals come from the "Referral by" fields on enquiries and members, and from the member app.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export function OtherBranchMembers() {
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState(false)
  const [g, setG] = useState<string[]>([])
  const [st, setSt] = useState<string[]>([])
  const [pay, setPay] = useState<string[]>([])
  return (
    <>
      <PageHeader title="Other Branch Member" sub="Members of your other branches who train at this branch" />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={setSearch} placeholder="Search By Member Phone No." className="pl-9" />
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setPanel(true)}><Icon name="filter" size={16} />Filters</button>
        </div>
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Customer Name</th><th>Phone Number</th><th>Customer ID</th><th>Home Fitness Center</th><th className="num">Total Sessions</th><th className="num">Pending Session Count</th><th className="num">Consumed Session Count</th></tr></thead>
            <tbody><tr><td colSpan={7} className="text-center text-muted">Shaan Fitness has one branch (Godari Gunta), so there are no members from other branches. When a second branch is added in My Fitness Centers, its members who check in here are listed with their session counts.</td></tr></tbody>
          </table>
        </div>
      </div>
      <Sheet open={panel} onClose={() => setPanel(false)} title="Filters" wide>
        <div className="flex flex-col gap-5">
          <CheckboxGroup legend="Gender" values={g} onChange={setG} options={[{ value: 'male', label: 'Total Males' }, { value: 'female', label: 'Total Females' }]} />
          <CheckboxGroup legend="Subscription Status" values={st} onChange={setSt} columns={2} options={[{ value: 'active', label: 'Active Subscriptions' }, { value: 'pending', label: 'Pending Subscriptions' }, { value: 'expired', label: 'Expired Subscriptions' }, { value: 'soon', label: 'About to expire' }, { value: 'retained', label: 'Retained Subscriptions' }, { value: 'used', label: 'Used Subscriptions' }]} />
          <CheckboxGroup legend="Payment Status" values={pay} onChange={setPay} columns={3} options={[{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }]} />
          <button type="button" className="btn-gold" onClick={() => setPanel(false)}>Apply</button>
        </div>
      </Sheet>
    </>
  )
}
