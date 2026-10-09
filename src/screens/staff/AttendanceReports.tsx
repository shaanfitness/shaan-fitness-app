import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, usePlans, useServices, useStudio, useTeam } from '../../db/studio'
import {
  checkinLeaderboard, staffAttendanceSummary, staffCheckIn, type CheckinRow, type LeaderRow, type StaffAttendanceRow,
} from '../../db/classes'
import type { MemberOverview } from '../../db/types'
import { stateChip, STATE_LABEL, type SubState } from '../../db/billing'
import { downloadCsv } from '../../lib/csv'
import { fmtDateTime, fmtDay, fmtTime, plusDays, presets, rangeLabel, studioToday } from '../../lib/dates'
import { ClientCell } from '../../components/client'
import { ActionMenu, CheckboxGroup, Notice, Select, TextInput } from '../../components/controls'
import { FollowUpDialog, type FollowUpTarget } from '../../components/FollowUp'
import { BulkBar, Pager } from '../../components/table'
import { useToast } from '../../components/toast'
import { Avatar, Icon, Loading, PageHeader, Sheet } from '../../components/ui'
import { CsvOnly } from '../../access-ui'

// YDL "Attendance Reports": Staff & Trainer attendance (Report Insights), Client Attendance
// (Traffic Customer Listing) and the Check-ins Leaderboard.

const subChip = (s: string | null | undefined) => (s ? <span className={`chip ${stateChip(s as SubState)}`}>{STATE_LABEL[s as SubState] ?? s}</span> : <span className="text-muted">—</span>)
const liveChip = (s: string) => (s === 'active' ? <span className="chip chip-green">Active</span> : s === 'pending' ? <span className="chip chip-amber">Pending</span>
  : s === 'inactive' ? <span className="chip chip-red">Expired</span> : <span className="chip chip-muted">No plan</span>)
const studioLine = (s?: { name: string; branch_name: string | null }) => `${s?.name ?? ''}${s?.branch_name ? ` (${s.branch_name})` : ''}`
const hours = (a: string, b: string | null) => (b ? `${((new Date(b).getTime() - new Date(a).getTime()) / 3_600_000).toFixed(1)} h` : '—')

function RangePicker({ value, onChange, kind = 'register' }: { value: { key: string; from: string; to: string }; onChange: (v: { key: string; from: string; to: string }) => void; kind?: 'register' | 'list' }) {
  const today = studioToday()
  const choices = presets(kind, today).filter((p) => p.range.from)
  return (
    <>
      <Select small ariaLabel="Date range" value={value.key} className="w-auto min-w-[200px]"
        options={[...choices.map((p) => ({ value: p.key, label: `${p.label} (${rangeLabel(p.range)})` })), { value: 'custom', label: 'Custom' }]}
        onChange={(k) => { const p = choices.find((x) => x.key === k); onChange(p ? { key: k, from: p.range.from!, to: p.range.to! } : { ...value, key: 'custom' }) }} />
      {value.key === 'custom' && <>
        <TextInput small type="date" value={value.from} onChange={(v) => onChange({ ...value, from: v || today })} className="w-auto" />
        <TextInput small type="date" value={value.to} onChange={(v) => onChange({ ...value, to: v || today })} className="w-auto" />
      </>}
    </>
  )
}

// ---------------------------------------------------------------------------
// Staff & Trainer attendance
// ---------------------------------------------------------------------------
export function StaffAttendance() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const team = useTeam()
  const { data: studio } = useStudio()
  const today = studioToday()
  const month = presets('register', today).find((p) => p.key === 'this_month')!
  const [report, setReport] = useState<'' | 'trainer' | 'staff' | 'branch'>('')
  const [person, setPerson] = useState('')
  const [range, setRange] = useState({ key: 'this_month', from: month.range.from!, to: today })
  const [mark, setMark] = useState(false)
  const group = report === 'trainer' ? 'trainer' : 'staff'
  const summary = useQuery({
    queryKey: ['staff-attendance-summary', me.studioId, group, range.from, range.to], enabled: report === 'trainer' || report === 'staff',
    queryFn: () => staffAttendanceSummary(me.studioId, group, range.from, range.to),
  })
  const details = useQuery({
    queryKey: ['staff-attendance', me.studioId, range.from, range.to], enabled: report === 'trainer' || report === 'staff',
    queryFn: async () => throwIf(await supabase.from('staff_attendance_overview').select('*').eq('studio_id', me.studioId)
      .gte('date', range.from).lte('date', range.to).order('date', { ascending: false }).order('check_in', { ascending: false }).limit(5000)) as StaffAttendanceRow[],
  })
  const people = (summary.data ?? []).filter((s) => !person || s.staff_id === person)
  const ids = new Set(people.map((p) => p.staff_id))
  const log = (details.data ?? []).filter((d) => ids.has(d.staff_id))
  const label = report === 'trainer' ? 'Trainer' : 'Staff'
  const options = report === 'trainer' ? team.trainers : team.staffAccounts
  const today_ = useQuery({
    queryKey: ['staff-attendance', 'today', me.studioId, today], enabled: mark,
    queryFn: async () => throwIf(await supabase.from('staff_attendance').select('staff_id,check_in,check_out').eq('studio_id', me.studioId).eq('date', today)) as
      { staff_id: string; check_in: string; check_out: string | null }[],
  })
  const punch = useMutation({
    mutationFn: ({ id, out }: { id: string; out: boolean }) => staffCheckIn(id, out),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['staff-attendance'] }); qc.invalidateQueries({ queryKey: ['staff-attendance-summary'] }); toast(v.out ? 'Checked out' : 'Checked in') },
    onError: (e: Error) => toast(e.message),
  })
  const exportCsv = () => downloadCsv(`${label.toLowerCase()}-attendance-${range.from}-${range.to}.csv`, log, [
    ['Name', (r) => r.staff_name], ['Code', (r) => r.staff_code], ['Date', (r) => r.date], ['Check-in', (r) => fmtTime(r.check_in)], ['Check-out', (r) => fmtTime(r.check_out)],
    ['Hours', (r) => hours(r.check_in, r.check_out)], ['Source', (r) => r.source], ['Marked by', (r) => r.marked_by_name],
  ])
  const total = people.reduce((t, p) => t + p.present_days, 0)
  const missed = people.reduce((t, p) => t + p.missed_days, 0)
  return (
    <>
      <PageHeader title="Report Insights" sub={studioLine(studio)}
        actions={<button type="button" className="btn-gold min-h-10 px-4" onClick={() => setMark(true)}><Icon name="clock" size={18} />Mark Staff Attendance</button>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold">Report :</span>
          <Select small ariaLabel="Report" value={report} onChange={(v) => { setReport(v as typeof report); setPerson('') }} placeholder="Select the Options" className="w-auto"
            options={[{ value: 'trainer', label: 'Trainer Attendance' }, { value: 'staff', label: 'Staff Attendance' }, { value: 'branch', label: 'Other Branch Members Attendance' }]} />
          {(report === 'trainer' || report === 'staff') && <>
            <Select small ariaLabel={label} value={person} onChange={setPerson} placeholder={`All ${label === 'Trainer' ? 'Trainers' : 'Staff'}`} className="w-auto" options={options.map((s) => ({ value: s.id, label: `${s.full_name} (${s.staff_code})` }))} />
            <RangePicker value={range} onChange={setRange} />
            <CsvOnly><button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>
            {person && <button type="button" className="link-btn text-[13px]" onClick={() => setPerson('')}>clear filter</button>}
          </>}
        </div>
        {!report && <Notice>Choose a report: Trainer Attendance, Staff Attendance or Other Branch Members Attendance.</Notice>}
        {report === 'branch' && <Notice>Shaan Fitness has one branch, so no client from another branch has checked in here. This report fills in when a second branch is added.</Notice>}
        {(report === 'trainer' || report === 'staff') && <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-4"><div className="text-[12px] text-muted">Total {label} Attendance :</div><div className="text-[26px] font-bold">{total}</div></div>
            <div className="card p-4"><div className="text-[12px] text-muted">Missed {label} Attendance :</div><div className="text-[26px] font-bold text-red">{missed}</div></div>
          </div>
          {summary.isLoading ? <Loading /> : (
            <div className="card overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>{label} Name</th><th className="num">Working Days</th><th className="num">Present</th><th className="num">Missed</th><th>First Check-in</th><th>Last Check-out</th></tr></thead>
                <tbody>{people.map((p) => (
                  <tr key={p.staff_id}><td><div className="font-semibold">{p.full_name}</div><div className="text-[12px] text-muted">{p.staff_code}</div></td>
                    <td className="num">{p.working_days}</td><td className="num">{p.present_days}</td><td className={`num ${p.missed_days ? 'text-red' : ''}`}>{p.missed_days}</td>
                    <td className="nowrap">{p.first_in ? fmtDateTime(p.first_in) : '—'}</td><td className="nowrap">{p.last_out ? fmtDateTime(p.last_out) : '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <h2 className="eyebrow mt-2">Check-ins</h2>
          {!log.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">No check-ins for these dates.</div> : (
            <div className="card overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Date</th><th>Check-in</th><th>Check-out</th><th>Hours</th><th>How</th><th>Marked by</th></tr></thead>
                <tbody>{log.slice(0, 500).map((r) => (
                  <tr key={r.id}><td className="font-semibold">{r.staff_name}</td><td className="nowrap">{fmtDay(r.date)}</td><td>{fmtTime(r.check_in)}</td>
                    <td>{r.check_out ? fmtTime(r.check_out) : '—'}</td><td>{hours(r.check_in, r.check_out)}</td><td className="capitalize">{r.source}</td><td>{r.marked_by_name ?? '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <p className="m-0 text-[12px] text-muted">Missed days count the staff member’s working days (Staff › working days) up to today with no check-in. Biometric punches will be added here once the device is connected.</p>
        </>}
      </div>
      <Sheet wide open={mark} onClose={() => setMark(false)} title="Mark Staff Attendance">
        <div className="flex flex-col divide-y divide-line">
          {team.everyone.filter((s) => s.role !== 'doctor').map((s) => {
            const rec = (today_.data ?? []).filter((r) => r.staff_id === s.id).sort((a, b) => b.check_in.localeCompare(a.check_in))[0]
            const inNow = rec && !rec.check_out
            const self = me.staffId === s.id
            const can = me.role === 'owner' || me.role === 'front_desk' || self
            return (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={s.full_name} size={36} />
                <div className="min-w-0 flex-1"><div className="font-semibold">{s.full_name}</div>
                  <div className="text-[12px] text-muted">{s.role === 'coach' ? 'Trainer' : 'Staff'} · {rec ? `In ${fmtTime(rec.check_in)}${rec.check_out ? ` · Out ${fmtTime(rec.check_out)}` : ''}` : 'Not checked in today'}</div></div>
                {can && <button type="button" className={inNow ? 'btn btn-sm' : 'btn-gold min-h-9 px-3 text-[13px]'} disabled={punch.isPending}
                  onClick={() => punch.mutate({ id: s.id, out: !!inNow })}>{inNow ? 'Check Out' : 'Check In'}</button>}
              </div>
            )
          })}
        </div>
      </Sheet>
    </>
  )
}

// ---------------------------------------------------------------------------
// Client Attendance (Traffic Customer Listing)
// ---------------------------------------------------------------------------
interface TrafficRow {
  key: string; member_id: string; name: string; code: string | null; cc: string; phone: string | null; photo: string | null
  check_in: string | null; check_out: string | null; count: number; state: string | null; plan: string | null
}
const AGES: [string, number, number][] = [['18-24', 18, 24], ['25-34', 25, 34], ['35-44', 35, 44], ['45-54', 45, 54], ['55-64', 55, 64]]
const MEMBER_MODE = ['not_2w', 'irregular_range', 'irregular_3d', 'regular_2w']

export function ClientTraffic() {
  const me = useMe()
  const { data: studio } = useStudio()
  const { data: services = [] } = useServices()
  const { data: plans = [] } = usePlans()
  const today = studioToday()
  const soon = Number(studio?.settings.about_to_expire_days ?? 7)
  const [range, setRange] = useState({ key: 'last_3', from: plusDays(today, -3), to: today })
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState(false)
  const [f, setF] = useState({ genders: [] as string[], present: [] as string[], time: [] as string[], ages: [] as string[], levels: [] as string[],
    who: [] as string[], balance: [] as string[], status: [] as string[], withSub: [] as string[], category: '', plan: '' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fu, setFu] = useState<FollowUpTarget | null>(null)
  const [page, setPage] = useState(0)
  const memberMode = f.who.some((w) => MEMBER_MODE.includes(w))
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const checkins = useQuery({
    queryKey: ['traffic', me.studioId, range.from, range.to],
    queryFn: async () => throwIf(await supabase.from('checkin_overview').select('*').eq('studio_id', me.studioId).eq('status', 'present')
      .gte('date', range.from).lte('date', range.to).order('check_in', { ascending: false }).limit(5000)) as CheckinRow[],
  })
  const members = useQuery({
    queryKey: ['traffic-members', me.studioId], enabled: memberMode,
    queryFn: async () => throwIf(await supabase.from('member_overview').select('id,full_name,client_code,country_code,phone,photo_url,gender,age,level,live_status,last_check_in,current_plan_name,current_plan_id,current_service_ids,current_end_date')
      .eq('studio_id', me.studioId).eq('kind', 'member').eq('active', true).limit(5000)) as MemberOverview[],
  })
  const balance = useQuery({
    queryKey: ['traffic-balance', me.studioId], enabled: desk && (f.balance.length > 0 || f.withSub.includes('balance')),
    queryFn: async () => new Set(((throwIf(await supabase.from('subscription_overview').select('member_id').eq('studio_id', me.studioId).is('deleted_at', null).is('cancelled_at', null)
      .gt('balance_amount', 0).limit(5000)) ?? []) as { member_id: string }[]).map((r) => r.member_id)),
  })

  const rows: TrafficRow[] = useMemo(() => {
    const data = checkins.data ?? []
    const counts = new Map<string, number>()
    data.forEach((c) => counts.set(c.member_id, (counts.get(c.member_id) ?? 0) + 1))
    const s = search.trim().toLowerCase()
    const ageOk = (a: number | null) => !f.ages.length || (a != null && f.ages.some((k) => { const g = AGES.find((x) => x[0] === k)!; return a >= g[1] && a <= g[2] }))
    if (memberMode) {
      const visited = new Set(data.map((c) => c.member_id))
      const ago = (n: number) => `${plusDays(today, -n)}T00:00:00+05:30`
      return (members.data ?? []).filter((m) => f.who.every((w) => {
        if (w === 'not_2w') return !m.last_check_in || m.last_check_in < ago(14)
        if (w === 'irregular_range') return m.live_status === 'active' && !visited.has(m.id)
        if (w === 'irregular_3d') return m.live_status === 'active' && (!m.last_check_in || m.last_check_in < ago(3))
        if (w === 'regular_2w') return !!m.last_check_in && m.last_check_in >= ago(14)
        return true
      })).filter((m) => (!f.genders.length || f.genders.includes(m.gender ?? '')) && ageOk(m.age) && (!f.levels.length || f.levels.includes(m.level ?? ''))
        && (!f.status.length || f.status.includes(m.live_status === 'active' ? 'active' : 'inactive'))
        && (!f.balance.length || balance.data?.has(m.id)) && (!f.plan || m.current_plan_id === f.plan) && (!f.category || (m.current_service_ids ?? []).includes(f.category))
        && (!s || `${m.full_name} ${m.client_code} ${m.phone}`.toLowerCase().includes(s)))
        .map((m) => ({ key: m.id, member_id: m.id, name: m.full_name, code: m.client_code, cc: m.country_code, phone: m.phone, photo: m.photo_url,
          check_in: m.last_check_in, check_out: null, count: counts.get(m.id) ?? 0, state: m.live_status === 'active' ? 'active' : m.live_status === 'inactive' ? 'expired' : m.live_status === 'pending' ? 'pending' : null, plan: m.current_plan_name }))
    }
    return data.filter((c) => {
      if (f.genders.length && !f.genders.includes(c.member_gender ?? '')) return false
      if (f.present.length && !(c.date === today && !c.check_out)) return false
      if (f.time.length && !f.time.some((t) => (t === 'morning' ? c.checkin_hour < 12 : t === 'afternoon' ? c.checkin_hour >= 12 && c.checkin_hour < 17 : c.checkin_hour >= 17))) return false
      if (!ageOk(c.member_age)) return false
      if (f.levels.length && !f.levels.includes(c.member_level ?? '')) return false
      if (f.balance.length && !balance.data?.has(c.member_id)) return false
      if (f.status.length && !f.status.includes(c.subscription_state === 'active' ? 'active' : 'inactive')) return false
      if (f.withSub.length && !f.withSub.some((w) => (w === 'expired' ? c.subscription_state !== 'active' && c.subscription_state !== 'frozen'
        : w === 'soon' ? c.subscription_state === 'active' && !!c.subscription_end_date && c.subscription_end_date <= plusDays(today, soon) : balance.data?.has(c.member_id)))) return false
      if (f.category && !(c.plan_service_ids ?? []).includes(f.category)) return false
      if (f.plan && c.plan_id !== f.plan) return false
      if (s && !`${c.member_name} ${c.client_code} ${c.member_phone}`.toLowerCase().includes(s)) return false
      return true
    }).map((c) => ({ key: c.id, member_id: c.member_id, name: c.member_name, code: c.client_code, cc: c.member_country_code, phone: c.member_phone, photo: c.member_photo,
      check_in: c.check_in, check_out: c.check_out, count: counts.get(c.member_id) ?? 0, state: c.subscription_state, plan: c.plan_name }))
  }, [checkins.data, members.data, balance.data, f, search, memberMode, today, soon])
  const shown = rows.slice(page * 50, page * 50 + 50)
  const active = Object.values(f).reduce((t, v) => t + (Array.isArray(v) ? v.length : v ? 1 : 0), 0)
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setPage(0); setSelected(new Set()) }
  const exportCsv = (list: TrafficRow[]) => downloadCsv(`client-attendance-${range.from}-${range.to}.csv`, list, [['Customer Name', (r) => r.name], ['Customer Code', (r) => r.code],
    ['Mobile', (r) => r.phone], ['Checkin time', (r) => r.check_in], ['Checkout time', (r) => r.check_out], ['Checkin Count', (r) => r.count],
    ['Subscription Status', (r) => r.state], ['Membership Plan Name', (r) => r.plan]])
  const toggle = (id: string) => setSelected((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = shown.length > 0 && shown.every((r) => selected.has(r.key))

  return (
    <>
      <PageHeader title="Traffic Customer Listing" sub={studioLine(studio)}
        actions={<CsvOnly><button type="button" className="btn btn-sm" onClick={() => exportCsv(rows)}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search" className="pl-9" />
          </div>
          <span className="text-[12px] text-muted">From</span>
          <Select small ariaLabel="Date range" value={range.key} className="w-auto min-w-[200px]" onChange={(k) => {
            const n = { last_3: 3, last_7: 7, last_14: 14 }[k]; setPage(0)
            setRange(n ? { key: k, from: plusDays(today, -n), to: today } : { ...range, key: 'custom' })
          }} options={[[3, 'last_3'], [7, 'last_7'], [14, 'last_14']].map(([n, k]) => ({ value: String(k), label: `Last ${n} Days (${rangeLabel({ from: plusDays(today, -Number(n)), to: today })})` }))
            .concat([{ value: 'custom', label: 'Custom' }])} />
          {range.key === 'custom' && <>
            <TextInput small type="date" value={range.from} onChange={(v) => setRange({ ...range, from: v || today })} className="w-auto" />
            <TextInput small type="date" value={range.to} onChange={(v) => setRange({ ...range, to: v || today })} className="w-auto" />
          </>}
          <button type="button" className="btn btn-sm" onClick={() => setPanel(true)}><Icon name="filter" size={16} />Traffic Filter{active ? ` (${active})` : ''}</button>
        </div>
        <h2 className="eyebrow">{active ? 'Filters Applied ' : ''}Fetched {memberMode ? 'Members' : 'Members Checkins'}({rows.length})</h2>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <CsvOnly><button type="button" className="btn btn-sm" onClick={() => exportCsv(rows.filter((r) => selected.has(r.key)))}>Export to CSV</button></CsvOnly>
        </BulkBar>
        {checkins.isLoading || (memberMode && members.isLoading) ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No check-ins for these filters.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 44 }}><input type="checkbox" className="check" aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(shown.map((r) => r.key)))} /></th>
                <th>Customer Picture &amp; Customer Name</th><th>Fitness center</th><th>{memberMode ? 'Last Checkin' : 'Checkin time'}</th><th>Checkout time</th>
                <th className="num">Checkin Count</th><th>Subscription Status</th><th>Membership Plan Name</th><th>Action</th>
              </tr></thead>
              <tbody>{shown.map((r) => (
                <tr key={r.key}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${r.name}`} checked={selected.has(r.key)} onChange={() => toggle(r.key)} /></td>
                  <td><div className="flex items-center gap-2.5"><Avatar name={r.name} size={34} /><ClientCell id={r.member_id} name={r.name} code={r.code} countryCode={r.cc} phone={r.phone} /></div></td>
                  <td className="text-[12px]">{studioLine(studio)}</td>
                  <td className="nowrap">{r.check_in ? fmtDateTime(r.check_in) : 'Never'}</td>
                  <td className="nowrap">{r.check_out ? fmtTime(r.check_out) : '—'}</td>
                  <td className="num">{r.count}</td>
                  <td>{subChip(r.state)}</td>
                  <td>{r.plan ?? '—'}</td>
                  <td><ActionMenu actions={[{ label: 'View', href: `/clients/${r.member_id}` }, { label: 'Add Follow up', onClick: () => setFu({ memberId: r.member_id, memberName: r.name, defaultType: 'Feedback' }) }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <Pager page={page} pageSize={50} total={rows.length} onPage={setPage} />
      </div>
      <Sheet open={panel} onClose={() => setPanel(false)} title="Filters" wide>
        <div className="flex flex-col gap-5">
          <CheckboxGroup legend="Traffic by Gender" columns={3} values={f.genders} onChange={set('genders')} options={[{ value: 'male', label: 'Total Males' }, { value: 'female', label: 'Total Females' }, { value: 'other', label: 'Total Others' }]} />
          <CheckboxGroup legend="Current Traffic" values={f.present} onChange={set('present')} options={[{ value: 'now', label: 'Present Traffic' }]} />
          <CheckboxGroup legend="Checkin By day" columns={3} values={f.time} onChange={set('time')} options={[{ value: 'morning', label: 'Morning Checkins' }, { value: 'afternoon', label: 'Afternoon Checkins' }, { value: 'evening', label: 'Evening Checkins' }]} />
          <CheckboxGroup legend="Checkins by Age" columns={3} values={f.ages} onChange={set('ages')} options={AGES.map(([k]) => ({ value: k, label: `Age ${k}` }))} />
          <CheckboxGroup legend="Checkins by Level" columns={3} values={f.levels} onChange={set('levels')} options={['Beginner', 'Intermediate', 'Advanced'].map((l) => ({ value: l, label: l }))} />
          <CheckboxGroup legend="Bounced" values={f.who.filter((w) => w === 'not_2w')} onChange={(v) => set('who')([...f.who.filter((w) => w !== 'not_2w'), ...v])} options={[{ value: 'not_2w', label: 'Customers not visited gym from 2 weeks' }]} />
          <CheckboxGroup legend="Irregular Member" values={f.who.filter((w) => w.startsWith('irregular'))} onChange={(v) => set('who')([...f.who.filter((w) => !w.startsWith('irregular')), ...v])}
            options={[{ value: 'irregular_range', label: 'Active Customers not visited By Date Filter' }, { value: 'irregular_3d', label: 'Active Customers not visited gym from 3 days' }]} />
          <CheckboxGroup legend="Regular Member" values={f.who.filter((w) => w === 'regular_2w')} onChange={(v) => set('who')([...f.who.filter((w) => w !== 'regular_2w'), ...v])} options={[{ value: 'regular_2w', label: 'Customers visited gym atleast once in past 2 weeks' }]} />
          {desk && <CheckboxGroup legend="Balance Due" values={f.balance} onChange={set('balance')} options={[{ value: 'yes', label: 'Members With Balance Payment' }]} />}
          <CheckboxGroup legend="Subscription Status" values={f.status} onChange={set('status')} options={[{ value: 'active', label: 'Active Members' }, { value: 'inactive', label: 'Inactive Members' }]} />
          <CheckboxGroup legend="Present CheckIn with" columns={3} values={f.withSub} onChange={set('withSub')} options={[{ value: 'expired', label: 'Expire Subscription' }, { value: 'soon', label: 'About Expire Members' }, ...(desk ? [{ value: 'balance', label: 'Balance Due' }] : [])]} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select ariaLabel="Select Category" value={f.category} onChange={set('category')} placeholder="Select Category" options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
            <Select ariaLabel="Select Membership" value={f.plan} onChange={set('plan')} placeholder="Select Membership" options={plans.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name }))} />
          </div>
          {memberMode && <p className="m-0 text-[12px] text-muted">Bounced, irregular and regular filters list members (with their last check-in) instead of check-ins.</p>}
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => { setF({ genders: [], present: [], time: [], ages: [], levels: [], who: [], balance: [], status: [], withSub: [], category: '', plan: '' }); setPage(0) }}>Close</button>
            <button type="button" className="btn-gold flex-1" onClick={() => setPanel(false)}>Apply</button></div>
        </div>
      </Sheet>
      <FollowUpDialog target={fu} onClose={() => setFu(null)} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Check-ins Leaderboard
// ---------------------------------------------------------------------------
export function CheckinLeaderboard() {
  const me = useMe()
  const { data: studio } = useStudio()
  const today = studioToday()
  const [from, setFrom] = useState(plusDays(today, -7))
  const [to, setTo] = useState(today)
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [panel, setPanel] = useState(false)
  const [states, setStates] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const { data = [], isLoading } = useQuery({ queryKey: ['leaderboard', me.studioId, from, to], queryFn: () => checkinLeaderboard(me.studioId, from, to) })
  const rows = data.filter((r) => (!gender || r.member_gender === gender) && (!states.length || states.includes(r.live_status))
    && (!search || `${r.member_name} ${r.client_code} ${r.member_phone} ${r.member_email ?? ''}`.toLowerCase().includes(search.toLowerCase())))
  const top = rows.slice(0, 5)
  const shown = rows.slice(page * 50, page * 50 + 50)
  return (
    <>
      <PageHeader title="Client Check-ins Leaderboard" sub={studioLine(studio)}
        actions={<CsvOnly><button type="button" className="btn btn-sm" onClick={() => downloadCsv(`checkins-leaderboard-${from}-${to}.csv`, rows, [['Customer Name', (r: LeaderRow) => r.member_name],
          ['Customer Code', (r) => r.client_code], ['Mobile', (r) => r.member_phone], ['Total Check-ins', (r) => r.total], ['Latest Check-in', (r) => r.latest_in], ['Latest Check-out', (r) => r.latest_out],
          ['Subscription Status', (r) => r.live_status]])}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search by Name or Mobile Number or Email" className="pl-9" />
          </div>
          <span className="text-[12px] text-muted">Start Date</span><TextInput small type="date" value={from} onChange={(v) => { setFrom(v || today); setPage(0) }} className="w-auto" />
          <span className="text-[12px] text-muted">End Date</span><TextInput small type="date" value={to} onChange={(v) => { setTo(v || today); setPage(0) }} className="w-auto" />
          <Select small ariaLabel="Customer Gender" value={gender} onChange={(v) => { setGender(v); setPage(0) }} placeholder="Customer Gender" className="w-auto"
            options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
          <button type="button" className="btn btn-sm" onClick={() => setPanel(true)}><Icon name="filter" size={16} />Filters{states.length ? ` (${states.length})` : ''}</button>
        </div>
        <h2 className="eyebrow">Top 5 Check-ins ({fmtDay(from, 'MMMM dd, yyyy')} - {fmtDay(to, 'MMMM dd, yyyy')})</h2>
        {isLoading ? <Loading /> : <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {top.map((r, i) => (
              <Link key={r.member_id} to={`/clients/${r.member_id}`} className="card flex items-center gap-3 p-4 text-ink no-underline hover:border-gold">
                <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[15px] font-bold ${i === 0 ? 'bg-gold text-on-gold' : 'bg-surface-3'}`}>{i + 1}</span>
                <div className="min-w-0"><div className="truncate font-semibold">{r.member_name}</div><div className="text-[12px] text-muted">{r.total} check-ins</div></div>
              </Link>
            ))}
            {!top.length && <div className="card col-span-full px-5 py-8 text-center text-[14px] text-muted">No check-ins in these dates.</div>}
          </div>
          {rows.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Customer Name</th><th className="num">Total Check-ins</th><th>Latest (Check-in - Check-out)</th><th>Subscription Status</th></tr></thead>
                <tbody>{shown.map((r) => (
                  <tr key={r.member_id}><td><ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /></td>
                    <td className="num font-bold">{r.total}</td>
                    <td className="nowrap">{r.latest_in ? `${fmtDateTime(r.latest_in)} - ${r.latest_out ? fmtTime(r.latest_out) : 'not out'}` : '—'}</td>
                    <td>{liveChip(r.live_status)}{r.current_plan_name ? <div className="text-[12px] text-muted">{r.current_plan_name}</div> : null}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <Pager page={page} pageSize={50} total={rows.length} onPage={setPage} />
        </>}
      </div>
      <Sheet open={panel} onClose={() => setPanel(false)} title="Filters">
        <div className="flex flex-col gap-5">
          <CheckboxGroup legend="Subsciption Status" values={states} onChange={(v) => { setStates(v); setPage(0) }} options={[{ value: 'active', label: 'Active Subscriptions' },
            { value: 'pending', label: 'Pending Subscriptions' }, { value: 'inactive', label: 'Expired Subscriptions' }, { value: 'none', label: 'No Subscription' }]} />
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setStates([])}>Clear</button><button type="button" className="btn-gold flex-1" onClick={() => setPanel(false)}>Apply</button></div>
        </div>
      </Sheet>
    </>
  )
}
