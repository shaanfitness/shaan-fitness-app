import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { useAccess } from '../../access'
import { CsvOnly } from '../../access-ui'
import { supabase } from '../../lib/supabase'
import { throwIf, useList, useStudio, useTeam } from '../../db/studio'
import { amt } from '../../db/billing'
import { addPayroll, payrollCalculate, savePayrollSettings, type PayrollEntry, type PayrollRow } from '../../db/team'
import { downloadCsv } from '../../lib/csv'
import { fmtDay, studioToday } from '../../lib/dates'
import { Checkbox, Field, Notice, Select, TextInput } from '../../components/controls'
import { BulkBar } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL Accounts › Payroll: "Payroll Calculator" and "Payroll Register".

const studioLine = (s?: { name: string; branch_name: string | null }) => `${s?.name ?? ''}${s?.branch_name ? ` (${s.branch_name})` : ''}`
const monthRange = (ym: string) => { const [y, m] = ym.split('-').map(Number); const last = new Date(y, m, 0).getDate(); return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` } }

export function PayrollCalculator() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const access = useAccess()
  const { data: studio } = useStudio()
  const modes = useList('payment_mode')
  const [ym, setYm] = useState(studioToday().slice(0, 7))
  const { from, to } = monthRange(ym)
  const [bonus, setBonus] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [settings, setSettings] = useState(false)
  const [pay, setPay] = useState(false)
  const calc = useQuery({ queryKey: ['payroll', me.studioId, from, to], queryFn: () => payrollCalculate(me.studioId, from, to) })
  const rows = useMemo(() => (calc.data ?? []).map((r) => { const b = Number(bonus[r.staff_id] || 0); return { ...r, bonus: b, total: Math.round((r.payable + b) * 100) / 100 } }), [calc.data, bonus])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.staff_id))
  const sum = rows.filter((r) => selected.has(r.staff_id)).reduce((t, r) => t + r.total, 0)
  return (
    <>
      <PageHeader title="Payroll Calculator" sub={studioLine(studio)}
        actions={<>
          {access.can('payroll', 'view_settings') && <button type="button" className="btn btn-sm" onClick={() => setSettings(true)}><Icon name="settings" size={16} />Payroll Settings</button>}
          {access.can('payroll', 'view_register') && <Link to="/payroll/register" className="btn btn-sm">Payroll Register</Link>}
        </>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">Month</span>
          <TextInput small type="month" value={ym} onChange={(v) => { if (v) { setYm(v); setSelected(new Set()) } }} className="w-auto" />
          <span className="text-[13px] text-muted">{fmtDay(from)} – {fmtDay(to)}</span>
          {access.can('payroll', 'recalculate') && <button type="button" className="btn btn-sm" onClick={() => calc.refetch()}><Icon name="history" size={16} />Recalculate</button>}
        </div>
        {access.can('payroll', 'add') && <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <span className="text-[13px]">Payable {amt(sum)}</span>
          <button type="button" className="btn-gold min-h-9 px-3 text-[13px]" onClick={() => setPay(true)}>Add to Payroll Register</button>
        </BulkBar>}
        {calc.error && <Notice tone="error">{(calc.error as Error).message}</Notice>}
        {calc.isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">No staff with pay set. Set Basic Pay in each staff or trainer’s form (owner).</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl text-[13px]">
              <thead><tr>
                <th style={{ width: 44 }}><input type="checkbox" className="check" aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.staff_id)))} /></th>
                <th>Name of Employee</th><th className="num">Paid Days</th><th className="num">Present Days</th><th className="num">Absent Days</th><th className="num">Late Mark Days</th>
                <th className="num">Paid Leaves</th><th className="num">Total Holidays</th><th className="num">Basic salary</th><th className="num">PT Commission Earned</th>
                <th className="num">Sales Commission Earned</th><th>Bonus Incentive</th><th className="num">Deduction against Leave</th><th className="num">Payable Salary</th>
              </tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.staff_id}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${r.full_name}`} checked={selected.has(r.staff_id)} onChange={() => toggle(r.staff_id)} /></td>
                  <td className="min-w-[200px]"><div className="font-semibold">{r.full_name}</div><div className="text-[12px] text-muted">{r.staff_code} · {amt(r.basic_pay)} / {r.pay_per} · {r.working_days} working days</div></td>
                  <td className="num">{r.paid_days}</td><td className="num">{r.present_days}</td><td className={`num ${r.absent_days ? 'text-red' : ''}`}>{r.absent_days}</td>
                  <td className="num">{r.late_days}</td><td className="num">{r.paid_leaves}</td><td className="num">{r.holidays}</td>
                  <td className="num">{amt(r.basic_salary)}</td><td className="num">{amt(r.pt_commission)}</td><td className="num">{amt(r.sales_commission)}</td>
                  <td><TextInput small type="number" value={bonus[r.staff_id] ?? ''} onChange={(v) => setBonus({ ...bonus, [r.staff_id]: v })} placeholder="0" className="w-[100px]" /></td>
                  <td className="num">{amt(r.deduction)}</td><td className="num font-bold">{amt(r.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <p className="m-0 text-[12px] text-muted">From staff attendance, approved leave (paid or un-paid), holidays declared in Fitness Center Holiday, late marks (check-in after the shift start plus the grace period) and target commissions. Per-day pay = monthly pay ÷ days in the month.</p>
      </div>
      <SettingsSheet open={settings} onClose={() => setSettings(false)} canEdit={access.can('payroll', 'edit_settings')} />
      <Sheet open={pay} onClose={() => setPay(false)} title="Add to Payroll Register">
        {pay && <PayForm modes={modes.map((m) => m.label)} count={selected.size} total={sum} onDone={() => setPay(false)} save={async (p) => {
          const n = await addPayroll(me.studioId, { ...p, from_date: from, to_date: to, rows: rows.filter((r) => selected.has(r.staff_id)).map((r) => ({ ...r, payable: r.total })) })
          qc.invalidateQueries({ queryKey: ['payroll-register'] }); setSelected(new Set()); setBonus({}); toast(`${n} added to the payroll register`)
        }} />}
      </Sheet>
    </>
  )
}

function PayForm({ modes, count, total, onDone, save }: { modes: string[]; count: number; total: number; onDone: () => void; save: (p: Record<string, unknown>) => Promise<void> }) {
  const [paid, setPaid] = useState(studioToday())
  const [mode, setMode] = useState(modes[0] ?? 'CASH')
  const [expense, setExpense] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(null)
      try { await save({ paid_date: paid, mode, as_expense: expense }); onDone() } catch (x) { setError((x as Error).message) } finally { setBusy(false) } }}>
      <p className="m-0 text-[14px]">{count} {count === 1 ? 'person' : 'people'} · {amt(total)}</p>
      <Field label="Paid Date" id="pd"><TextInput id="pd" type="date" value={paid} onChange={setPaid} /></Field>
      <Field label="Mode of Payment" id="pm"><Select id="pm" value={mode} onChange={setMode} options={modes.map((m) => ({ value: m, label: m }))} /></Field>
      <Checkbox checked={expense} onChange={setExpense} label="Also add each salary to Expenses (category Salary)" />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Cancel</button><button type="submit" className="btn-gold flex-1" disabled={busy}>Add</button></div>
    </form>
  )
}

function SettingsSheet({ open, onClose, canEdit }: { open: boolean; onClose: () => void; canEdit: boolean }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: studio } = useStudio()
  const p = (studio?.settings.payroll ?? {}) as { trainer_grace_minutes?: number; staff_grace_minutes?: number }
  const [t, setT] = useState('')
  const [s, setS] = useState('')
  const save = useMutation({
    mutationFn: () => savePayrollSettings(me.studioId, Number(t || p.trainer_grace_minutes || 0), Number(s || p.staff_grace_minutes || 0)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['studio'] }); qc.invalidateQueries({ queryKey: ['payroll'] }); toast('Payroll settings saved'); onClose() },
    onError: (e: Error) => toast(e.message),
  })
  return (
    <Sheet open={open} onClose={onClose} title="Payroll Settings">
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <Field label="Trainer Checked in Grace Period :" id="tg" hint="Minutes after the shift start before it counts as late"><TextInput id="tg" type="number" value={t || String(p.trainer_grace_minutes ?? 0)} onChange={setT} /></Field>
        <Field label="Staff Checked in Grace Period :" id="sg"><TextInput id="sg" type="number" value={s || String(p.staff_grace_minutes ?? 0)} onChange={setS} /></Field>
        <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onClose}>Close</button>{canEdit && <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>Submit</button>}</div>
      </form>
    </Sheet>
  )
}

export function PayrollRegister() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const access = useAccess()
  const team = useTeam()
  const { data: studio } = useStudio()
  const year = studioToday().slice(0, 4)
  const [from, setFrom] = useState(`${year}-01-01`)
  const [to, setTo] = useState(studioToday())
  const [person, setPerson] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState(false)
  const { data = [], isLoading } = useQuery({
    queryKey: ['payroll-register', me.studioId, from, to],
    queryFn: async () => throwIf(await supabase.from('payroll_entry_overview').select('*').eq('studio_id', me.studioId).gte('from_date', from).lte('from_date', to)
      .order('from_date', { ascending: false }).order('staff_name')) as (PayrollEntry & PayrollRow)[],
  })
  const rows = data.filter((r) => !person || r.staff_id === person)
  const del = useMutation({
    mutationFn: async () => { throwIf(await supabase.from('payroll_entries').delete().in('id', [...selected]).select('id')) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-register'] }); setSelected(new Set()); setConfirm(false); toast('Deleted from the register') },
    onError: (e: Error) => { setConfirm(false); toast(e.message) },
  })
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const total = rows.reduce((t, r) => t + Number(r.payable), 0)
  const exportCsv = () => downloadCsv(`payroll-register-${from}-${to}.csv`, rows, [['From', (r) => r.from_date], ['To', (r) => r.to_date], ['Name of Employee', (r) => r.staff_name],
    ['Paid Days', (r) => r.paid_days], ['Paid Date', (r) => r.paid_date], ['Present Days', (r) => r.present_days], ['Absent Days', (r) => r.absent_days],
    ['Late Mark Counts', (r) => r.late_days], ['Paid Leaves', (r) => r.paid_leaves], ['Total Holidays', (r) => r.holidays], ['Basic salary', (r) => r.basic_salary],
    ['PT Commission Earned', (r) => r.pt_commission], ['Sales Commission Earned', (r) => r.sales_commission], ['Bonus Incentive', (r) => r.bonus],
    ['Deduction against Leave', (r) => r.deduction], ['Payable Salary', (r) => r.payable], ['Mode', (r) => r.mode]])
  return (
    <>
      <PageHeader title="Payroll Register" sub={studioLine(studio)}
        actions={<CsvOnly><button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button></CsvOnly>} />
      <div className="flex flex-col gap-3 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">From</span><TextInput small type="date" value={from} onChange={setFrom} className="w-auto" />
          <span className="text-[12px] text-muted">To</span><TextInput small type="date" value={to} onChange={setTo} className="w-auto" />
          <Select small ariaLabel="Employee" value={person} onChange={setPerson} placeholder="All Employees" className="w-auto" options={team.all.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: s.full_name }))} />
          <span className="rounded-xl border border-line px-3 py-1.5 text-[13px]"><span className="text-muted">Total paid : </span><strong>{amt(total)}</strong></span>
        </div>
        {access.can('payroll', 'delete') && <BulkBar count={selected.size} onClear={() => setSelected(new Set())}><button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm(true)}>Delete</button></BulkBar>}
        {isLoading ? <Loading /> : !rows.length ? <div className="card px-5 py-10 text-center text-[14px] text-muted">Nothing in the register for these dates.</div> : (
          <div className="card overflow-x-auto">
            <table className="tbl text-[13px]">
              <thead><tr><th style={{ width: 44 }} /><th>From/To Date</th><th>Name of Employee</th><th className="num">Paid Days</th><th>Paid Date</th><th className="num">Present Days</th>
                <th className="num">Absent Days</th><th className="num">Late Mark Counts</th><th className="num">Paid Leaves</th><th className="num">Total Holidays</th><th className="num">Basic salary</th>
                <th className="num">PT Commission Earned</th><th className="num">Sales Commission Earned</th><th className="num">Bonus Incentive</th><th className="num">Deduction against Leave</th><th className="num">Payable Salary</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" className="check" aria-label={`Select ${r.staff_name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td className="nowrap">{fmtDay(r.from_date)}<div className="text-[12px] text-muted">{fmtDay(r.to_date)}</div></td>
                  <td className="font-semibold">{r.staff_name}{r.expense_id ? <div className="text-[12px] font-normal text-muted">In expenses</div> : null}</td>
                  <td className="num">{r.paid_days}</td><td className="nowrap">{fmtDay(r.paid_date)}<div className="text-[12px] text-muted">{r.mode}</div></td>
                  <td className="num">{r.present_days}</td><td className="num">{r.absent_days}</td><td className="num">{r.late_days}</td><td className="num">{r.paid_leaves}</td><td className="num">{r.holidays}</td>
                  <td className="num">{amt(r.basic_salary)}</td><td className="num">{amt(r.pt_commission)}</td><td className="num">{amt(r.sales_commission)}</td><td className="num">{amt(r.bonus)}</td>
                  <td className="num">{amt(r.deduction)}</td><td className="num font-bold">{amt(r.payable)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Are you sure?">
        <div className="flex flex-col gap-4"><p className="m-0 text-[15px]">Delete {selected.size} {selected.size === 1 ? 'entry' : 'entries'} from the payroll register? Expenses already recorded stay in Expenses.</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(false)}>No</button>
            <button type="button" className="btn btn-danger flex-1" disabled={del.isPending} onClick={() => del.mutate()}>Yes</button></div></div>
      </Sheet>
    </>
  )
}
