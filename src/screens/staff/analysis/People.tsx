import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { useMe } from '../../../auth'
import { useList, useTeam } from '../../../db/studio'
import {
  report, type ConversionSide, type ConversionYear, type EnquirySide, type EnquiryStages, type EnquiryYear, type FollowUpInsight,
  type LeadSourceRow, type LeadSources, type MembersInsight, type StaffConversion, type Traffic,
} from '../../../db/analysis'
import { CheckboxGroup, Notice, Select, TextInput } from '../../../components/controls'
import { Icon, Sheet } from '../../../components/ui'
import { CsvOnly } from '../../../access-ui'
import {
  AGE_GROUPS, AnalysisPage, BarList, Block, Card, ColumnChart, CsvButton, Grid, Hero, LineChart, MONTHS, MONTHS_SHORT, Meter, PickControl,
  RangeControl, ReportBody, SplitTable, Table, ThisThat, Tiles, YearControl, amount, count, dec, genderLine, num, pct, rangeFor, rangeTitle,
  thisYear, useReport, useThisThat, type Col, type RangeValue,
} from './kit'

const staffOptions = (team: ReturnType<typeof useTeam>) => team.everyone.map((s) => ({ value: s.id, label: s.full_name }))
const dayName = (d: string) => format(parseISO(d), 'EEEE')

// ---------------------------------------------------------------------------------------------
// Traffic Analysis (YDL "Traffic Insights")
// ---------------------------------------------------------------------------------------------
export function TrafficAnalysis() {
  const { studioId } = useMe()
  const levels = useList('member_level')
  const [range, setRange] = useState<RangeValue>(() => rangeFor('last_30'))
  const [week, setWeek] = useState<'current' | 'last'>('current')
  const [panel, setPanel] = useState(false)
  const [f, setF] = useState({ genders: [] as string[], ages: [] as string[], levels: [] as string[] })
  const [draft, setDraft] = useState(f)
  const on = f.genders.length + f.ages.length + f.levels.length
  const q = useReport('traffic', [range.from, range.to, f, week], () => report<Traffic>('analysis_traffic', {
    p_studio: studioId, p_from: range.from, p_to: range.to, p_genders: f.genders, p_ages: f.ages, p_levels: f.levels, p_week: week,
  }))
  return (
    <AnalysisPage title="Traffic Analysis" filters={<>
      <RangeControl value={range} onChange={setRange} />
      <button type="button" className="btn btn-sm" onClick={() => { setDraft(f); setPanel(true) }}><Icon name="filter" size={16} />Traffic Filter{on ? ` (${on})` : ''}</button>
    </>}>
      <ReportBody q={q}>{(d) => {
        const ageRows = d.ages.map((a) => ({ ...a, label: `Age ${a.label}` }))
        const avgAll = d.all_unique ? d.all_total / d.all_unique : 0
        return <>
          <Block title="Total Check-ins">
            <Tiles items={[
              { label: 'Present Check-ins', value: count(d.present.total), hint: `${count(d.present.male)} men · ${count(d.present.female)} women · ${count(d.present.other)} other` },
              { label: 'Current Traffic Rate', value: d.capacity ? `${Math.round((num(d.present.total) / num(d.capacity)) * 100)}% Full` : '—', hint: d.capacity ? `Capacity ${count(d.capacity)}` : 'Set the capacity in Fitness Center' },
              { label: 'Total Traffic', value: count(d.all_total), hint: 'All check-ins' },
              { label: 'Total Unique Check-ins', value: count(d.all_unique), hint: 'Different people' },
              { label: 'Average Check-ins', value: dec(avgAll), hint: 'Per person' },
            ]} />
          </Block>
          <Block title="Traffic Stats" sub={rangeTitle(range)}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <Card title="Check-ins per day">
                <LineChart caption="Check-ins per day" labels={d.daily.map((p) => format(parseISO(p.date), 'dd MMM'))}
                  titles={d.daily.map((p) => format(parseISO(p.date), 'EEE, dd MMM yyyy'))} series={[{ name: 'Check-ins', values: d.daily.map((p) => num(p.n)) }]} />
              </Card>
              <Card title="In these dates">
                <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[14px]">
                  <dt className="text-muted">Total Traffic</dt><dd className="m-0 text-right font-bold">{count(d.range_total)}</dd>
                  <dt className="text-muted">Average Check-ins Per Day</dt><dd className="m-0 text-right font-bold">{dec(num(d.range_total) / Math.max(1, num(d.days)))}</dd>
                  <dt className="text-muted">Different people</dt><dd className="m-0 text-right font-bold">{count(d.range_unique)}</dd>
                </dl>
              </Card>
            </div>
          </Block>
          <div className="px-5 lg:px-8">
            <Grid>
              <Card title="Traffic at different parts of the day" sub={rangeTitle(range)}>
                <BarList caption="Check-ins by part of the day" rows={[
                  { label: 'Morning', note: '5 AM – 12 PM', value: num(d.parts.morning) }, { label: 'Afternoon', note: '12 PM – 5 PM', value: num(d.parts.afternoon) },
                  { label: 'Evening', note: '5 PM – 9 PM', value: num(d.parts.evening) }, { label: 'Late Night', note: '9 PM – 5 AM', value: num(d.parts.late_night) },
                ]} />
              </Card>
              <Card title="Traffic by Gender" sub={rangeTitle(range)}>
                <BarList caption="Check-ins by gender" rows={[
                  { label: 'Male', value: num(d.gender.male) }, { label: 'Female', value: num(d.gender.female) }, { label: 'Other', value: num(d.gender.other) },
                  ...(num(d.gender.unknown) ? [{ label: 'Gender not given', value: num(d.gender.unknown) }] : []),
                ]} />
              </Card>
            </Grid>
          </div>
          <Block title="Traffic by Age Group" sub={rangeTitle(range)}><SplitTable caption="Check-ins by age group" first="Age Group" rows={ageRows} /></Block>
          <Block title="Traffic by Level" sub={rangeTitle(range)}><SplitTable caption="Check-ins by level" first="Level" rows={d.levels} /></Block>
          <Block title="Weekly Data" sub={`${format(parseISO(d.week_start), 'MMM. d, yyyy')} - ${format(addDays(parseISO(d.week_start), 6), 'MMM. d, yyyy')}`}
            action={<Select small ariaLabel="Week" value={week} onChange={(v) => setWeek(v as 'current' | 'last')} className="w-auto"
              options={[{ value: 'current', label: 'Current Week' }, { value: 'last', label: 'Last Week' }]} />}>
            <Grid>
              <Card title="Check-ins by day">
                <ColumnChart caption="Check-ins by day of the week" labels={d.week.map((w) => format(parseISO(w.date), 'EEE'))} titles={d.week.map((w) => dayName(w.date))}
                  series={[{ name: 'Check-ins', values: d.week.map((w) => num(w.total)) }]} height={200} />
              </Card>
              <Table caption="Weekly data" rowKey={(w) => w.date} rows={d.week} cols={[
                { key: 'day', header: 'Day', cell: (w) => dayName(w.date) },
                { key: 'total', header: 'Total', num: true, cell: (w) => <b>{count(w.total)}</b> },
                { key: 'male', header: 'Male', num: true, cell: (w) => count(w.male) },
                { key: 'female', header: 'Female', num: true, cell: (w) => count(w.female) },
                { key: 'other', header: 'Other', num: true, cell: (w) => count(w.other) },
                { key: 'unknown', header: 'Gender Not Specified', num: true, cell: (w) => count(w.unknown) },
              ]} />
            </Grid>
          </Block>
        </>
      }}</ReportBody>
      <Sheet open={panel} onClose={() => setPanel(false)} title="Filters">
        <div className="flex flex-col gap-4">
          <CheckboxGroup legend="Traffic by Gender" values={draft.genders} onChange={(v) => setDraft({ ...draft, genders: v })}
            options={[{ value: 'male', label: 'Total Males' }, { value: 'female', label: 'Total Females' }, { value: 'other', label: 'Total Others' }]} />
          <CheckboxGroup legend="Checkins by Age" values={draft.ages} onChange={(v) => setDraft({ ...draft, ages: v })}
            options={AGE_GROUPS.map((a) => ({ value: a, label: `Age ${a}` }))} />
          <CheckboxGroup legend="Checkins by Level" values={draft.levels} onChange={(v) => setDraft({ ...draft, levels: v })}
            options={(levels.length ? levels.map((l) => l.label) : ['Beginner', 'Intermediate', 'Advanced']).map((l) => ({ value: l, label: l }))} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setPanel(false)}>Close</button>
            <button type="button" className="btn-gold" onClick={() => { setF(draft); setPanel(false) }}>Apply</button>
          </div>
        </div>
      </Sheet>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Members Analysis (YDL "Member Insights")
// ---------------------------------------------------------------------------------------------
export function MembersAnalysis() {
  const { studioId } = useMe()
  const [year, setYear] = useState(thisYear)
  const q = useReport('members', [year], () => report<MembersInsight>('analysis_members', { p_studio: studioId, p_year: year }))
  return (
    <AnalysisPage title="Members Analysis">
      <ReportBody q={q}>{(d) => <>
        <Block title="Member Insights">
          <Tiles items={[
            { label: 'Members', value: count(d.members.total), hint: genderLine(d.members) },
            { label: 'Live Members', value: count(d.live.total), hint: genderLine(d.live) },
            { label: 'New Members', value: count(d.new_30), hint: 'Added in last 30 days' },
            { label: 'Bounced Members', value: count(num(d.bounced.d30) + num(d.bounced.over30)), hint: 'Plan ended, not renewed' },
          ]} />
        </Block>
        <div className="px-5 lg:px-8">
          <Grid>
            <Card title="Bounced Members" sub="Days since their last plan ended">
              <BarList caption="Bounced members by days since their plan ended" share={false} rows={[
                { label: '0-7 Days', value: num(d.bounced.d7) }, { label: '0-15 Days', value: num(d.bounced.d15) },
                { label: '0-30 Days', value: num(d.bounced.d30) }, { label: 'More than 30 Days', value: num(d.bounced.over30) },
              ]} />
            </Card>
            <Card title="Members Status" sub="Active: checked in during the last 14 days">
              <BarList caption="Members by check-in status" rows={[
                { label: 'Active Members (Regular Checkins)', note: genderLine(d.status.active), value: num(d.status.active.total) },
                { label: 'Inactive Members', note: genderLine(d.status.inactive), value: num(d.status.inactive.total) },
                { label: 'Never Checked In', note: genderLine(d.status.never), value: num(d.status.never.total) },
              ]} />
            </Card>
          </Grid>
        </div>
        <Block title="New Active Members (Monthly)" sub={`Members whose first plan started each month of ${d.year}`} action={<YearControl value={year} onChange={setYear} />}>
          <Card>
            <ColumnChart caption={`New active members per month, ${d.year}`} labels={MONTHS_SHORT} titles={MONTHS.map((m) => `${m} ${d.year}`)}
              series={[{ name: 'New active members', values: d.months.map((m) => num(m.new_active)) }]} />
          </Card>
        </Block>
        <Block title="All Active Members (Month-wise)" sub={`Members with a plan running during each month of ${d.year}`}>
          <Card>
            <ColumnChart caption={`Active members per month, ${d.year}`} labels={MONTHS_SHORT} titles={MONTHS.map((m) => `${m} ${d.year}`)}
              series={[{ name: 'Active members', values: d.months.map((m) => num(m.all_active)) }]} />
          </Card>
        </Block>
        <div className="px-5 lg:px-8">
          <Grid>
            <Card title="Members by Gender">
              <BarList caption="Members by gender" rows={[{ label: 'Male', value: num(d.members.male) }, { label: 'Female', value: num(d.members.female) },
                ...(num(d.members.other) ? [{ label: 'Other', value: num(d.members.other) }] : [])]} />
            </Card>
            <div className="flex flex-col gap-2"><h3 className="m-0 text-[14px] font-bold">Members by Level</h3><SplitTable caption="Members by level" first="Level" rows={d.levels} other={false} /></div>
          </Grid>
        </div>
        <Block title="Members by Age Group"><SplitTable caption="Members by age group" first="Age group" rows={d.ages.map((a) => ({ ...a, label: `Age ${a.label}` }))} other={false} /></Block>
      </>}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Enquiry FollowUp Stage Analysis (YDL "Enquiry Insights")
// ---------------------------------------------------------------------------------------------
export function EnquiryStageAnalysis() {
  const { studioId } = useMe()
  const q = useReport('enquiry-stages', [], () => report<EnquiryStages>('analysis_enquiry_stages', { p_studio: studioId }))
  return (
    <AnalysisPage title="Enquiry FollowUp Stage Analysis">
      <ReportBody q={q}>{(d) => <>
        <Block title="Enquiry Insights">
          <Tiles items={[
            { label: 'Enquiry', value: count(d.enquiries.total), hint: genderLine(d.enquiries) },
            { label: 'Under Followup Stage', value: count(d.stages.followup.total) },
            { label: 'Under Trial Stage', value: count(d.stages.trial.total) },
            { label: 'Under Expected Stage', value: count(d.stages.expected.total) },
            { label: 'New Enquiries (30 Days)', value: count(d.new_30) },
          ]} />
        </Block>
        <div className="px-5 lg:px-8">
          <Grid>
            <Card title="Enquiry Status" sub={`Open enquiries by stage · ${count(d.not_interested)} not interested`}>
              <BarList caption="Open enquiries by stage" rows={[
                { label: 'Under Followup Stage', note: genderLine(d.stages.followup), value: num(d.stages.followup.total) },
                { label: 'Under Trial Stage', note: genderLine(d.stages.trial), value: num(d.stages.trial.total) },
                { label: 'Under Expected Stage', note: genderLine(d.stages.expected), value: num(d.stages.expected.total) },
              ]} />
            </Card>
            <Card title="Enquiry by Gender">
              <BarList caption="Enquiries by gender" rows={[{ label: 'Male', value: num(d.enquiries.male) }, { label: 'Female', value: num(d.enquiries.female) },
                ...(num(d.enquiries.other) ? [{ label: 'Other', value: num(d.enquiries.other) }] : [])]} />
            </Card>
          </Grid>
        </div>
        <Block title="Enquiry by Age Group"><SplitTable caption="Enquiries by age group" first="Age group" rows={d.ages.map((a) => ({ ...a, label: `Age ${a.label}` }))} other={false} /></Block>
        <Block title="Enquiry by Level"><SplitTable caption="Enquiries by level" first="Level" rows={d.levels} other={false} /></Block>
      </>}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Follow up Analysis
// ---------------------------------------------------------------------------------------------
const FU_TYPES: [string, string][] = [['enquiry', 'Enquiry'], ['balance_due', 'Balance Due'], ['renewal', 'Membership Renewal'], ['birthday', 'Birthday'],
  ['anniversary', 'Anniversary'], ['feedback', 'Feedback'], ['freeze', 'Freeze'], ['measurement', 'Measurement'], ['pt_renewal', 'PT Renewal'],
  ['irregular', 'Irregular'], ['trial', 'Trial'], ['other', 'OTHER'], ['commitment', 'Commitment']]

export function FollowUpAnalysis() {
  const me = useMe()
  const team = useTeam()
  const [range, setRange] = useState<RangeValue>(() => rangeFor('today'))
  const [staff, setStaff] = useState('')
  const q = useReport('follow-ups', [range.from, range.to, staff], () => report<FollowUpInsight>('analysis_follow_ups', {
    p_studio: me.studioId, p_from: range.from, p_to: range.to, p_staff: staff || null,
  }))
  const cols: Col<FollowUpInsight['staff'][number]>[] = [
    { key: 'name', header: 'Staff Name', cell: (r) => r.name },
    { key: 'open', header: 'Open Follow Ups', num: true, cell: (r) => count(r.open) },
    { key: 'successful', header: 'Successful Follow ups', num: true, cell: (r) => count(r.successful) },
    { key: 'ni', header: 'Not Interested', num: true, cell: (r) => count(r.not_interested) },
    { key: 'done', header: 'Follow Ups Done', num: true, cell: (r) => count(r.done) },
    { key: 'total', header: 'Total Follow ups', num: true, cell: (r) => <b>{count(r.total)}</b>, csv: (r) => r.total },
  ]
  return (
    <AnalysisPage title="Follow up Analysis" filters={<>
      <PickControl label="Assign To/Client Rep." value={staff} onChange={setStaff} options={staffOptions(team)} />
      <RangeControl value={range} onChange={setRange} label="Due date" keys={['today', 'yesterday', 'this_month', 'last_month', 'last_7', 'last_15', 'last_30', 'last_90']} />
    </>}>
      <ReportBody q={q}>{(d) => <>
        <div className="px-5 lg:px-8">
          <Grid>
            <Card title="Followup Status Group" sub={rangeTitle(range)}>
              <div className="flex items-baseline gap-2"><span className="text-[32px] leading-none font-bold">{count(d.status.total)}</span><span className="text-[13px] text-muted">Total Follow ups</span></div>
              <BarList caption="Follow-ups by status" rows={[
                { label: 'Open Follow Ups', value: num(d.status.open) }, { label: 'Successful Follow ups', value: num(d.status.successful) },
                { label: 'Not Interested', value: num(d.status.not_interested) }, { label: 'Follow Ups Done', value: num(d.status.done) },
              ]} />
            </Card>
            <Card title="Followup Type Group" sub={rangeTitle(range)}>
              <BarList caption="Follow-ups by type" rows={FU_TYPES.map(([k, l]) => ({ label: l, value: num(d.types[k]) }))} hideZero empty="No follow-ups in these dates." />
            </Card>
          </Grid>
        </div>
        <Block title="Followup Status Group (All Members)" sub="Total Follow ups by the person they're assigned to"
          action={<CsvButton filename={`follow-up-analysis-${range.from}-${range.to}.csv`} rows={d.staff} cols={cols} />}>
          <Table caption="Follow-ups by staff" rowKey={(r, i) => r.staff_id ?? `none-${i}`} rows={d.staff} cols={cols} empty="No follow-ups in these dates." />
        </Block>
      </>}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// This v/s That pickers (Conversion and Enquiry Analysis)
// ---------------------------------------------------------------------------------------------
function ThisThatPickers({ tt, staffLabel }: { tt: ReturnType<typeof useThisThat>; staffLabel: string }) {
  const team = useTeam()
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {(['This', 'That'] as const).map((s) => (
        <fieldset key={s} className="card m-0 flex min-w-0 flex-wrap items-end gap-2 p-4">
          <legend className="sr-only">{s}</legend>
          <span className="w-full text-[13px] font-bold">{s}</span>
          <RangeControl value={tt.range(s)} onChange={tt.setRange(s)} />
          <PickControl label={staffLabel} value={tt.staff(s)} onChange={tt.setStaff(s)} options={staffOptions(team)} />
        </fieldset>
      ))}
    </div>
  )
}

const bucketRows = (b: { b0_1: number; b2_5: number; b6_10: number; over10: number }) => [
  { label: '0-1', value: num(b.b0_1) }, { label: '2-5', value: num(b.b2_5) }, { label: '6-10', value: num(b.b6_10) }, { label: 'Above 10', value: num(b.over10) },
]

// ---------------------------------------------------------------------------------------------
// Conversion Analysis
// ---------------------------------------------------------------------------------------------
export function ConversionAnalysis() {
  const { studioId } = useMe()
  const [year, setYear] = useState(thisYear)
  const tt = useThisThat('last_90')
  const yq = useReport('conversion', [year], () => report<ConversionYear>('analysis_conversion', { p_studio: studioId, p_year: year }))
  const side = (s: 'This' | 'That') => ({ p_studio: studioId, p_from: tt.range(s).from, p_to: tt.range(s).to, p_staff: tt.staff(s) || null })
  const thisQ = useReport('conversion-side', [side('This')], () => report<ConversionSide>('analysis_conversion_compare', side('This')))
  const thatQ = useReport('conversion-side', [side('That')], () => report<ConversionSide>('analysis_conversion_compare', side('That')))
  const sideData = (s: 'This' | 'That') => (s === 'This' ? thisQ.data : thatQ.data)
  const amt = (a: { n: number; amount: number }) => <>{count(a.n)} <span className="text-faint">({amount(a.amount)})</span></>
  return (
    <AnalysisPage title="Conversion Analysis">
      <ReportBody q={yq}>{(d) => <>
        <Block title="Over All Enquiry to Member Conversion Ratio">
          <Card>
            <Hero label="Enquiries who became members" value={pct(d.ratio.converted, d.ratio.enquiries)} hint={`${count(d.ratio.converted)} of ${count(d.ratio.enquiries)} enquiries`} />
            <Meter value={num(d.ratio.converted)} max={num(d.ratio.enquiries)} label="Enquiry to member conversion" />
          </Card>
        </Block>
        <Block title={`Conversion monthwise graph Year (${d.year})`} sub="Conversions are new gym and PT memberships (not renewals), by invoice date" action={<YearControl value={year} onChange={setYear} />}>
          <Card>
            <ColumnChart caption={`Conversions per month, ${d.year}`} labels={MONTHS_SHORT} titles={MONTHS.map((m) => `${m} ${d.year}`)}
              series={[{ name: 'Gym', values: d.months.map((m) => num(m.gym.n)) }, { name: 'PT', values: d.months.map((m) => num(m.pt.n)) }]} />
          </Card>
          <Table caption="Conversions per month" wrapHeaders rowKey={(m) => String(m.month)} rows={d.months} cols={[
            { key: 'm', header: 'Month', nowrap: true, cell: (m) => `${MONTHS[m.month - 1]} ${d.year}` },
            { key: 'e', header: 'Total Enquiries', num: true, cell: (m) => count(m.enquiries) },
            { key: 's', header: 'Conversions Done (in same month)', num: true, cell: (m) => amt(m.same_month) },
            { key: 'o', header: 'Overall Conversions Done', num: true, cell: (m) => amt(m.overall) },
            { key: 'g', header: 'Total Conversions Done (Gym)', num: true, cell: (m) => amt(m.gym) },
            { key: 'gp', header: 'Conversions % (GYM)', num: true, cell: (m) => pct(m.gym.n, m.overall.n) },
            { key: 'p', header: 'Total Conversions Done (PT)', num: true, cell: (m) => amt(m.pt) },
          ]} />
        </Block>
      </>}</ReportBody>
      <Block title="This v/s That Comparison">
        <ThisThatPickers tt={tt} staffLabel="Client Rep" />
        {(thisQ.error || thatQ.error) && <Notice tone="error">{(thisQ.error ?? thatQ.error)?.message}</Notice>}
        <ThisThat render={(s) => {
          const c = sideData(s)
          return (
            <div key={s} className={`flex flex-col gap-4 ${(s === 'This' ? thisQ : thatQ).isFetching ? 'opacity-60' : ''}`}>
              <Card title={`Conversion Analysis · ${s}`} sub={rangeTitle(tt.range(s))}>
                {c ? <Tiles items={[{ label: 'Total Conversions', value: count(c.total) }, { label: 'Male Conversions', value: count(c.male) }, { label: 'Female Conversions', value: count(c.female) }]} cols={3} /> : <p className="m-0 text-muted">Loading…</p>}
              </Card>
              <Card title={`Conversion Source Analysis · ${s}`} sub="Source of promotion">
                {c && <BarList caption={`Conversions by source, ${s}`} rows={c.sources.map((x) => ({ label: x.label, value: num(x.n) }))} empty="No conversions in these dates." />}
              </Card>
              <Card title={`Conversion Followup Analysis · ${s}`} sub="Follow-ups before joining">
                {c && <BarList caption={`Conversions by number of follow-ups, ${s}`} rows={bucketRows(c.followups)} />}
              </Card>
            </div>
          )
        }} />
      </Block>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Enquiry Analysis
// ---------------------------------------------------------------------------------------------
export function EnquiryAnalysis() {
  const { studioId } = useMe()
  const [year, setYear] = useState(thisYear)
  const tt = useThisThat('last_30')
  const yq = useReport('enquiries', [year], () => report<EnquiryYear>('analysis_enquiries', { p_studio: studioId, p_year: year }))
  const side = (s: 'This' | 'That') => ({ p_studio: studioId, p_from: tt.range(s).from, p_to: tt.range(s).to, p_staff: tt.staff(s) || null })
  const thisQ = useReport('enquiry-side', [side('This')], () => report<EnquirySide>('analysis_enquiry_compare', side('This')))
  const thatQ = useReport('enquiry-side', [side('That')], () => report<EnquirySide>('analysis_enquiry_compare', side('That')))
  const sideData = (s: 'This' | 'That') => (s === 'This' ? thisQ.data : thatQ.data)
  return (
    <AnalysisPage title="Enquiry Analysis">
      <ReportBody q={yq}>{(d) => <>
        <Block title="Enquiry Analysis">
          <Tiles items={[
            { label: 'Total', value: count(d.total), hint: 'Enquiries now' },
            { label: 'Open', value: count(d.open) },
            { label: 'Not Interested', value: count(d.not_interested) },
            { label: 'New Enquiries', value: count(d.new_30), hint: 'Added in last 30 days' },
            { label: 'Average Enquiries Per Month', value: dec(d.average, 1), hint: `In ${d.year}` },
          ]} />
        </Block>
        <div className="px-5 lg:px-8">
          <Grid>
            <Card title="Bounced" sub="Open enquiries with no follow-up for 15 days or more">
              <BarList caption="Bounced enquiries by days without a follow-up" rows={[
                { label: '15 - 30 days', value: num(d.bounced.d15_30) }, { label: '30 - 60 days', value: num(d.bounced.d30_60) },
                { label: '60 - 90 days', value: num(d.bounced.d60_90) }, { label: 'More than 90 days', value: num(d.bounced.over90) },
              ]} />
            </Card>
            <Table caption="Enquiries by gender" rowKey={(r) => r.k} rows={[
              { k: 'Total Enquiries', g: d.gender.total }, { k: 'Open Enquiries', g: d.gender.open }, { k: 'Not interested Enquiries', g: d.gender.not_interested },
            ]} cols={[
              { key: 'k', header: 'Enquiries', cell: (r) => r.k },
              { key: 'm', header: 'Male', num: true, cell: (r) => count(r.g.male) },
              { key: 'f', header: 'Female', num: true, cell: (r) => count(r.g.female) },
              { key: 'o', header: 'Other', num: true, cell: (r) => count(r.g.other) },
            ]} />
          </Grid>
        </div>
        <Block title={`Enquiry monthwise graph Year (${d.year})`} sub="Enquiries added each month" action={<YearControl value={year} onChange={setYear} />}>
          <Card>
            <ColumnChart caption={`Enquiries per month, ${d.year}`} labels={MONTHS_SHORT} titles={MONTHS.map((m) => `${m} ${d.year}`)}
              series={[{ name: 'Enquiries', values: d.months.map((m) => num(m.n)) }]} />
          </Card>
        </Block>
      </>}</ReportBody>
      <Block title="This v/s That Comparison">
        <ThisThatPickers tt={tt} staffLabel="Client Rep" />
        {(thisQ.error || thatQ.error) && <Notice tone="error">{(thisQ.error ?? thatQ.error)?.message}</Notice>}
        <ThisThat render={(s) => {
          const e = sideData(s)
          return (
            <div key={s} className={`flex flex-col gap-4 ${(s === 'This' ? thisQ : thatQ).isFetching ? 'opacity-60' : ''}`}>
              <Card title={`Enquiry Gender Analysis · ${s}`} sub={rangeTitle(tt.range(s))}>
                {e ? <Tiles items={[{ label: 'Total Enquiries', value: count(e.total) }, { label: 'Male Enquiries', value: count(e.male) }, { label: 'Female Enquiries', value: count(e.female) }]} cols={3} /> : <p className="m-0 text-muted">Loading…</p>}
              </Card>
              <Card title={`Enquiry Source Analysis · ${s}`} sub="Source of promotion">
                {e && <BarList caption={`Enquiries by source, ${s}`} rows={e.sources.map((x) => ({ label: x.label, value: num(x.n) }))} empty="No enquiries in these dates." />}
              </Card>
              <Card title={`Enquiry Conversions From Enquiries · ${s}`}>
                {e && <>
                  <div className="flex items-baseline justify-between gap-2"><span className="text-[28px] leading-none font-bold">{pct(e.converted, e.total)}</span>
                    <span className="text-[13px] text-muted">{count(e.converted)} of {count(e.total)} joined</span></div>
                  <Meter value={num(e.converted)} max={num(e.total)} label={`Enquiries converted, ${s}`} />
                </>}
              </Card>
              <Card title={`Enquiry Followup Analysis · ${s}`} sub="Follow-ups per enquiry">
                {e && <BarList caption={`Enquiries by number of follow-ups, ${s}`} rows={bucketRows(e.followups)} />}
              </Card>
              <Card title={`Enquiry Location Analysis · ${s}`} sub="City">
                {e && <BarList caption={`Enquiries by city, ${s}`} rows={e.locations.slice(0, 12).map((x) => ({ label: x.label, value: num(x.n) }))} empty="No enquiries in these dates." />}
              </Card>
            </div>
          )
        }} />
      </Block>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Enquiry Conversion Report (per staff member)
// ---------------------------------------------------------------------------------------------
export function EnquiryConversionReport() {
  const { studioId } = useMe()
  const [range, setRange] = useState<RangeValue>(() => rangeFor('this_month'))
  const q = useReport('enquiry-conversion', [range.from, range.to], () => report<StaffConversion[]>('analysis_enquiry_conversion', { p_studio: studioId, p_from: range.from, p_to: range.to }))
  const cols: Col<StaffConversion>[] = [
    { key: 'name', header: 'Emp Name', cell: (r) => r.name },
    { key: 'enq', header: 'Total Enquiry', num: true, cell: (r) => count(r.enquiries), csv: (r) => r.enquiries },
    { key: 'conv', header: 'Total Conv', num: true, cell: (r) => count(r.conversions), csv: (r) => r.conversions },
    { key: 'units', header: 'Total Subscriptions Sale Units', num: true, cell: (r) => count(r.units), csv: (r) => r.units },
    { key: 'pt', header: 'Total Subscriptions Sale Units PT', num: true, cell: (r) => <>{count(r.pt_units)} <span className="text-faint">({amount(r.pt_amount)})</span></>, csv: (r) => `${r.pt_units} (${r.pt_amount})` },
    { key: 'gym', header: 'Total Subscriptions Sale Units GYM', num: true, cell: (r) => <>{count(r.gym_units)} <span className="text-faint">({amount(r.gym_amount)})</span></>, csv: (r) => `${r.gym_units} (${r.gym_amount})` },
    { key: 'sale', header: 'Total Sale Amt', num: true, cell: (r) => amount(r.sale), csv: (r) => r.sale },
    { key: 'rec', header: 'Received Amt', num: true, cell: (r) => amount(r.received), csv: (r) => r.received },
    { key: 'bal', header: 'Bal Amt', num: true, cell: (r) => amount(r.balance), csv: (r) => r.balance },
  ]
  const total = (rows: StaffConversion[]): StaffConversion => rows.reduce((t, r) => ({
    ...t, enquiries: t.enquiries + num(r.enquiries), conversions: t.conversions + num(r.conversions), units: t.units + num(r.units),
    pt_units: t.pt_units + num(r.pt_units), pt_amount: t.pt_amount + num(r.pt_amount), gym_units: t.gym_units + num(r.gym_units),
    gym_amount: t.gym_amount + num(r.gym_amount), sale: t.sale + num(r.sale), received: t.received + num(r.received), balance: t.balance + num(r.balance),
  }), { staff_id: null, name: 'Total', staff_code: null, enquiries: 0, conversions: 0, units: 0, pt_units: 0, pt_amount: 0, gym_units: 0, gym_amount: 0, sale: 0, received: 0, balance: 0 })
  return (
    <AnalysisPage title="Enquiry Conversion Report" filters={<RangeControl value={range} onChange={setRange} />}
      actions={q.data ? <CsvButton filename={`enquiry-conversion-${range.from}-${range.to}.csv`} rows={q.data} cols={cols} /> : null}>
      <ReportBody q={q}>{(rows) => (
        <Block title="Enquiry Conversion Report" sub={`${rangeTitle(range)} · enquiries each person added, and bills where they are the client rep`}>
          <Table caption="Enquiry conversion by staff" rowKey={(r, i) => r.staff_id ?? `none-${i}`} rows={rows} total={rows.length ? total(rows) : null} cols={cols} wrapHeaders />
        </Block>
      )}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Lead Source Analysis
// ---------------------------------------------------------------------------------------------
export function LeadSourceAnalysis() {
  const { studioId } = useMe()
  const [range, setRange] = useState<RangeValue>(() => rangeFor('last_30'))
  const q = useReport('lead-sources', [range.from, range.to], () => report<LeadSources>('analysis_lead_sources', { p_studio: studioId, p_from: range.from, p_to: range.to }))
  const cols: Col<LeadSourceRow>[] = [
    { key: 'source', header: 'Lead Source', cell: (r) => r.source },
    { key: 'total', header: 'Total Enquiries', num: true, cell: (r) => count(r.total), csv: (r) => r.total },
    { key: 'open', header: 'Open Enquiries', num: true, cell: (r) => count(r.open), csv: (r) => r.open },
    { key: 'ni', header: 'Not Intrested Enquiries', num: true, cell: (r) => count(r.not_interested), csv: (r) => r.not_interested },
    { key: 'spot', header: 'Spot Conversion', num: true, cell: (r) => count(r.spot), csv: (r) => r.spot },
    { key: 'fu', header: 'Followup Conversion', num: true, cell: (r) => count(r.followup), csv: (r) => r.followup },
    { key: 'conv', header: 'Total Conversion', num: true, cell: (r) => <b>{count(r.conversions)}</b>, csv: (r) => r.conversions },
    { key: 'pct', header: 'Percentage Conversion', num: true, cell: (r) => `${dec(r.pct ?? 0)}%`, csv: (r) => `${r.pct ?? 0}%` },
    { key: 'base', header: 'Conversion Base Price', num: true, cell: (r) => amount(r.base_price), csv: (r) => r.base_price },
    { key: 'sale', header: 'Conversion Sale Price', num: true, cell: (r) => amount(r.sale_price), csv: (r) => r.sale_price },
  ]
  return (
    <AnalysisPage title="Lead Source Analysis" filters={<RangeControl value={range} onChange={setRange} label="Enquiry date" keys={['last_30']} />}
      actions={q.data ? <CsvOnly><CsvButton filename={`lead-source-analysis-${range.from}-${range.to}.csv`} rows={q.data.rows} cols={cols} /></CsvOnly> : null}>
      <ReportBody q={q}>{(d) => <>
        <Block title="Lead Source Analysis Listing" sub={`${rangeTitle(range)} · spot conversion: joined the day they enquired; prices from their first bill`}>
          <Table caption="Enquiries and conversions by lead source" wrapHeaders rowKey={(r) => r.source} rows={d.rows} total={d.rows.length ? { source: 'Total', ...d.total } : null} cols={cols}
            empty="No enquiries in these dates." />
        </Block>
        {d.rows.length > 0 && (
          <div className="px-5 lg:px-8">
            <Grid>
              <Card title="Enquiries by lead source"><BarList caption="Enquiries by lead source" rows={d.rows.map((r) => ({ label: r.source, value: num(r.total) }))} /></Card>
              <Card title="Conversions by lead source"><BarList caption="Conversions by lead source" rows={d.rows.map((r) => ({ label: r.source, value: num(r.conversions) }))} hideZero empty="No conversions yet." /></Card>
            </Grid>
          </div>
        )}
      </>}</ReportBody>
    </AnalysisPage>
  )
}

// ---------------------------------------------------------------------------------------------
// Weight Loss Analysis (YDL "Client Weight Loss List")
// ---------------------------------------------------------------------------------------------
export function WeightLossAnalysis() {
  const team = useTeam()
  const sources = useList('source_promotion')
  const employment = useList('employment_status')
  const [range, setRange] = useState<RangeValue>(() => rangeFor('this_month'))
  const [search, setSearch] = useState('')
  const [f, setF] = useState({ source: '', employment: '', lead: '', rep: '', gender: '', type: '', coach: '' })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  return (
    <AnalysisPage title="Weight Loss Analysis" filters={<>
      <RangeControl value={range} onChange={setRange} label="Created Date" />
      <PickControl label="Source of Promotion" value={f.source} onChange={set('source')} options={sources.map((s) => ({ value: s.label, label: s.label }))} />
      <PickControl label="Employment Type" value={f.employment} onChange={set('employment')} options={employment.map((s) => ({ value: s.label, label: s.label }))} />
      <PickControl label="Lead Type" value={f.lead} onChange={set('lead')} placeholder="All Convertibility" options={['Hot', 'Warm', 'Cold', 'Expected'].map((l) => ({ value: l, label: l }))} />
      <PickControl label="Client Rep" value={f.rep} onChange={set('rep')} options={staffOptions(team)} />
      <PickControl label="Gender" value={f.gender} onChange={set('gender')} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
      <PickControl label="Client Type" value={f.type} onChange={set('type')} placeholder="All Clients" options={[{ value: 'enquiry', label: 'Enquiry' }, { value: 'member', label: 'Member' }]} />
      <PickControl label="Assigned Coach" value={f.coach} onChange={set('coach')} options={team.trainers.map((s) => ({ value: s.id, label: s.full_name }))} />
      <div className="relative min-w-[220px] flex-1">
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <TextInput small value={search} onChange={setSearch} placeholder="Search by Mobile Number or Email Address" className="pl-9" />
      </div>
    </>}>
      <Block title="Client Weight Loss List" sub={rangeTitle(range)}>
        <div className="card px-5 py-10 text-center text-[14px] text-muted">
          No body measurements are recorded yet. When coaches record clients’ weight, everyone who lost weight in these dates is listed here with
          their first and latest weight, ready to export.
        </div>
      </Block>
    </AnalysisPage>
  )
}
