import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/toast'
import { decideRequest } from '../../db/team'
import { CsvOnly } from '../../access-ui'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { amt, stateChip, STATE_LABEL, type Receipt, type Sub, type SubState } from '../../db/billing'
import { fmtDateTime, fmtDay } from '../../lib/dates'
import { ClientCell } from '../../components/client'
import { ActionMenu } from '../../components/controls'
import type { Column } from '../../components/table'
import {
  fBatch, fGender, fMode, fPlan, fService, fStaff, fSubState, fTrainer, Register, type RegisterCtx, type RegisterDef, type RegisterFilter,
} from '../../components/register'

// YDL's account registers, each as a definition for the shared register engine.

const chip = (s: string | null | undefined) => (s ? <span className={`chip ${stateChip(s as SubState)}`}>{STATE_LABEL[s as SubState] ?? s}</span> : '—')
const payChip = (s: string) => (s === 'paid' ? <span className="chip chip-green">Paid</span> : <span className="chip chip-amber">Pending</span>)
const sum = <T,>(rows: T[], f: (r: T) => number) => amt(rows.reduce((t, r) => t + Number(f(r) ?? 0), 0))
const day = (d: string | null | undefined) => (d ? fmtDay(d, 'dd-MM-yyyy') : '—')

// ---------------------------------------------------------------------------
// Receipts (Receipt Register, Cash Register, Receipt Register Log)
// ---------------------------------------------------------------------------
type R = Receipt & {
  invoice_no: string | null; client_code: string | null; member_country_code: string; member_phone: string | null; start_date: string | null; end_date: string | null
  bill_amount: number | null; bill_balance: number; subscription_state: string | null; client_rep_name: string | null; tax_amount: number; bill_net_amount: number | null
}
const receiptCols = (ctx: RegisterCtx, extra?: Column<R>): Column<R>[] => [
  { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => r.invoice_no ?? '—' },
  { key: 'rec', header: 'Receipt No.', className: 'nowrap', cell: (r) => <span className="font-semibold">{r.receipt_no ?? '—'}</span> },
  { key: 'date', header: 'Receipt Date', className: 'nowrap', cell: (r) => day(r.receipt_date) },
  ...(extra ? [extra] : []),
  { key: 'code', header: 'Customer Id.', className: 'nowrap', cell: (r) => r.client_code },
  { key: 'name', header: 'Customer Name', cell: (r) => <ClientCell id={r.member_id} name={r.member_name ?? ''} countryCode={r.member_country_code} phone={r.member_phone} /> },
  { key: 'by', header: 'Receipt added by', cell: (r) => r.added_by_name ?? '—' },
  { key: 'plan', header: 'Plan Name', cell: (r) => <>{r.plan_name ?? (r.purpose === 'subscription' ? '—' : r.purpose.replace('_', ' '))}{r.purpose !== 'subscription' && r.plan_name ? <div className="text-[12px] text-muted">{r.purpose.replace('_', ' ')}</div> : null}</> },
  { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) },
  { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) },
  { key: 'mode', header: 'Mode', cell: (r) => <>{r.mode}{r.status === 'cancelled' ? <div><span className="chip chip-red">Cancelled</span></div> : null}</> },
  { key: 'bill', header: 'Total Bill Amount', className: 'num', cell: (r) => (r.bill_amount != null ? amt(r.bill_amount) : '—') },
  { key: 'paid', header: 'Receipt Paid Amount', className: 'num', cell: (r) => amt(r.amount) },
  { key: 'bal', header: 'Total Balance Amount', className: 'num', cell: (r) => <span className={r.bill_balance > 0 ? 'text-red' : ''}>{amt(r.bill_balance)}</span> },
  { key: 'act', header: 'Action', cell: (r) => <ActionMenu actions={[
    { label: 'View', onClick: () => ctx.navigate(r.subscription_id ? `/clients/${r.member_id}/payments/${r.subscription_id}` : `/clients/${r.member_id}`) },
    { label: 'Print Receipt', href: `/print/receipt/${r.id}`, external: true },
  ]} /> },
]
const receiptCsv = (): [string, (r: R) => unknown][] => [
  ['Invoice No.', (r) => r.invoice_no], ['Receipt No.', (r) => r.receipt_no], ['Receipt Date', (r) => r.receipt_date], ['Customer Id.', (r) => r.client_code],
  ['Customer Name', (r) => r.member_name], ['Mobile', (r) => r.member_phone], ['Receipt added by', (r) => r.added_by_name], ['Bill Rep', (r) => r.bill_rep_name],
  ['Client Rep', (r) => r.client_rep_name], ['Plan Name', (r) => r.plan_name], ['Purpose', (r) => r.purpose], ['Start Date', (r) => r.start_date], ['End Date', (r) => r.end_date],
  ['Mode', (r) => r.mode], ['Status', (r) => r.status], ['Reference', (r) => r.reference], ['Total Bill Amount', (r) => r.bill_amount], ['Receipt Paid Amount', (r) => r.amount],
  ['Tax in receipt', (r) => r.tax_amount], ['Total Balance Amount', (r) => r.bill_balance],
]
const receiptFilters = (ctx: RegisterCtx, mode = true): RegisterFilter[] => [
  fPlan(ctx), fService(ctx), fStaff(ctx, 'by', 'added_by', 'Receipt added by'), ...(mode ? [fMode(ctx)] : []),
  { key: 'status', placeholder: 'Status', options: [{ value: 'paid', label: 'Paid' }, { value: 'cancelled', label: 'Cancel' }], apply: (q, v) => q.eq('status', v) },
  fStaff(ctx, 'rep', 'client_rep_id', 'Client Rep'), fGender(), fSubState('subscription_state', ['active', 'pending', 'expired']), fBatch(ctx),
]

export const receiptRegister: RegisterDef<R> = {
  title: 'Receipt Register', view: 'payment_overview', dateCol: 'receipt_date', search: ['member_name', 'member_phone', 'receipt_no', 'invoice_no', 'client_code'],
  searchPlaceholder: 'Search name, mobile, receipt or invoice no.', base: (q) => q.eq('kind', 'payment'),
  filters: (ctx) => receiptFilters(ctx), columns: (ctx) => receiptCols(ctx), csv: receiptCsv, order: [['receipt_date', false], ['created_at', false]],
  totals: (rows) => [['Collected', sum(rows.filter((r) => r.status === 'paid'), (r) => r.amount)], ['Balance Amount', sum(uniqueBills(rows), (r) => r.bill_balance)]],
  actions: () => <Link to="/analysis/billing" className="btn btn-sm">View Billing Analysis</Link>,
}
function uniqueBills(rows: R[]) {
  const seen = new Set<string>()
  return rows.filter((r) => r.subscription_id && !seen.has(r.subscription_id) && seen.add(r.subscription_id))
}
export const cashRegister: RegisterDef<R> = {
  ...receiptRegister, title: 'Cash Payment Register', base: (q) => q.eq('kind', 'payment').eq('mode', 'CASH'), filters: (ctx) => receiptFilters(ctx, false), actions: undefined,
}
type L = R & { change_id: number; changed_at: string; old_values: Record<string, unknown>; new_values: Record<string, unknown>; changed_by_name: string | null }
export const receiptLog: RegisterDef<L> = {
  title: 'Receipt Register Log', view: 'receipt_log_overview', dateCol: 'receipt_date', search: ['member_name', 'member_phone', 'receipt_no', 'invoice_no'],
  rowKey: (r) => String(r.change_id), filters: (ctx) => receiptFilters(ctx), order: [['changed_at', false]],
  columns: (ctx) => {
    const cols = receiptCols(ctx, { key: 'created', header: 'Receipt Created Date', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) }) as unknown as Column<L>[]
    return [...cols.slice(0, -1), { key: 'change', header: 'Change', cell: (r: L) => (
      <div className="min-w-[200px] text-[12px]">
        <div className="text-muted">{fmtDateTime(r.changed_at)} by {r.changed_by_name ?? '—'}</div>
        {Object.keys(r.new_values).filter((k) => JSON.stringify(r.old_values[k]) !== JSON.stringify(r.new_values[k])).map((k) => (
          <div key={k}>{k.replace('_', ' ')}: <s className="text-muted">{String(r.old_values[k] ?? '—')}</s> → {String(r.new_values[k] ?? '—')}</div>
        ))}
      </div>) }, cols[cols.length - 1]]
  },
  csv: () => [...(receiptCsv() as unknown as [string, (r: L) => unknown][]), ['Changed At', (r) => r.changed_at], ['Changed By', (r) => r.changed_by_name],
    ['Old', (r) => JSON.stringify(r.old_values)], ['New', (r) => JSON.stringify(r.new_values)]],
}

// ---------------------------------------------------------------------------
// Subscriptions (Subscriptions Register, Expired, Balance Due, Coupon, Deleted, Cancelled, Trial, Recurring, PT)
// ---------------------------------------------------------------------------
type S = Sub & { coupon_name: string | null; coupon_type: string | null; coupon_active: boolean | null; renewed: boolean; voided_amount: number; member_deleted: boolean
  deleted_by_name: string | null; cancelled_by_name: string | null; last_receipt_date: string | null; is_renewal: boolean }
const nameCol: Column<S> = { key: 'name', header: 'Customer Name', cell: (r) => <ClientCell id={r.member_id} name={r.member_name} code={r.client_code} countryCode={r.member_country_code} phone={r.member_phone} /> }
const subActions = (ctx: RegisterCtx, extra: { label: string; onClick: (r: S) => void }[] = []): Column<S> => ({
  key: 'act', header: 'Action', cell: (r) => <ActionMenu actions={[
    { label: 'View', onClick: () => ctx.navigate(`/clients/${r.member_id}`) },
    { label: 'See Receipts', onClick: () => ctx.navigate(`/clients/${r.member_id}/payments/${r.id}`) },
    ...extra.map((e) => ({ label: e.label, onClick: () => e.onClick(r) })),
  ]} />,
})
const subCsv = (): [string, (r: S) => unknown][] => [
  ['Invoice No.', (r) => r.invoice_no], ['Invoice Date', (r) => r.invoice_date], ['Customer Name', (r) => r.member_name], ['Customer Code', (r) => r.client_code],
  ['Mobile', (r) => r.member_phone], ['Plan Name', (r) => r.plan_name], ['Type', (r) => r.kind], ['Start Date', (r) => r.start_date], ['End Date', (r) => r.end_date],
  ['Plan Status', (r) => STATE_LABEL[r.state]], ['Net Sale Amount', (r) => r.net_amount], ['GST', (r) => r.gst_amount], ['Total Sale Amount', (r) => r.total_amount],
  ['Paid', (r) => r.paid_amount], ['Balance', (r) => r.balance_amount], ['Payment Status', (r) => r.payment_status], ['Trainer', (r) => r.trainer_name],
  ['Bill Rep', (r) => r.bill_rep_name], ['Client Rep', (r) => r.client_rep_name], ['Renewal', (r) => (r.is_renewal ? 'Yes' : 'No')],
]
const saleCols = (ctx: RegisterCtx): Column<S>[] => [
  { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => <span className="font-semibold">{r.invoice_no ?? '—'}</span> },
  { key: 'invd', header: 'Invoice Date', className: 'nowrap', cell: (r) => day(r.invoice_date) },
  nameCol,
  { key: 'plan', header: 'Plan Name', cell: (r) => <>{r.plan_name}{r.is_renewal ? <div className="text-[12px] text-muted">Renewal</div> : null}</> },
  { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) },
  { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) },
  { key: 'state', header: 'Plan Status', cell: (r) => chip(r.state) },
  { key: 'net', header: 'Net Sale Amount', className: 'num', cell: (r) => amt(r.net_amount) },
  { key: 'gst', header: 'GST', className: 'num', cell: (r) => amt(r.gst_amount) },
  { key: 'total', header: 'Total Sale Amount', className: 'num', cell: (r) => amt(r.total_amount) },
  { key: 'pay', header: 'Payment Status', cell: (r) => payChip(r.payment_status) },
  subActions(ctx),
]
export const subscriptionsRegister: RegisterDef<S> = {
  title: 'Subscription Register', view: 'subscription_overview', dateCol: 'invoice_date', search: ['member_name', 'member_phone', 'invoice_no', 'plan_name', 'client_code'],
  base: (q) => q.is('deleted_at', null).is('cancelled_at', null),
  filters: (ctx) => [fPlan(ctx), fService(ctx), fStaff(ctx, 'by', 'bill_rep_id', 'Bill Rep'),
    { key: 'pay', placeholder: 'Payment Status', options: [{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }], apply: (q, v) => q.eq('payment_status', v) },
    fGender(), fSubState('state', ['active', 'expired', 'used', 'pending']),
    { key: 'type', placeholder: 'Subscription Type', options: [{ value: 'free', label: 'Free' }, { value: 'paid', label: 'Paid' }], apply: (q, v) => (v === 'free' ? q.eq('total_amount', 0) : q.gt('total_amount', 0)) },
    { key: 'svctype', placeholder: 'Subscription Service Type', options: [{ value: 'gym', label: 'Gym' }, { value: 'pt', label: 'P.T' }], apply: (q, v) => q.eq('kind', v) }],
  columns: saleCols, csv: subCsv, order: [['invoice_date', false], ['created_at', false]],
  totals: (rows) => [['Net Sale', sum(rows, (r) => r.net_amount)], ['GST', sum(rows, (r) => r.gst_amount)], ['Total Sale', sum(rows, (r) => r.total_amount)]],
  actions: () => <Link to="/registers/freezes" className="btn btn-sm">View Change Request</Link>,
}

export const expiredRegister: RegisterDef<S> = {
  title: 'Expired Memberships Register', view: 'subscription_overview', dateCol: 'end_date', dateLabel: 'End date', presetKind: 'expiry', defaultPreset: 'next_7',
  search: ['member_name', 'member_phone', 'invoice_no', 'plan_name'],
  base: (q) => q.is('deleted_at', null).is('cancelled_at', null).eq('status', 'live').neq('kind', 'trial').eq('renewed', false),
  filters: (ctx) => [fPlan(ctx), fService(ctx), fStaff(ctx, 'by', 'bill_rep_id', 'Bill Rep'),
    { key: 'pay', placeholder: 'Payment Status', options: [{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }], apply: (q, v) => q.eq('payment_status', v) },
    { key: 'type', placeholder: 'Subscription Type', options: [{ value: 'gym', label: 'Gym' }, { value: 'pt', label: 'P.T' }], apply: (q, v) => q.eq('kind', v) },
    { key: 'expiry', placeholder: 'Expired / To be expired', options: [{ value: 'expired', label: 'Expired' }, { value: 'soon', label: 'To be expired' }], apply: (q, v) => (v === 'expired' ? q.in('state', ['expired', 'used']) : q.in('state', ['active', 'frozen', 'pending'])) },
    fTrainer(ctx, 'trainer_id', 'Assigned Trainer')],
  columns: (ctx) => [...saleCols(ctx).slice(0, -1), subActions(ctx, [{ label: 'Add Follow Up', onClick: (r) => ctx.navigate(`/clients/${r.member_id}/follow-ups`) }])],
  csv: subCsv, order: [['end_date', true]],
  notice: <p className="m-0 text-[13px] text-muted">Memberships ending in the chosen dates that haven't been renewed. Use WhatsApp on each client, or Add Follow Up, to bring them back.</p>,
  actions: () => <Link to="/registers/expired-sessions" className="btn btn-sm">Expired Session Register</Link>,
}

export const expiredSessions: RegisterDef<S> = {
  title: 'Expired Session Register', view: 'subscription_overview', search: ['member_name', 'member_phone', 'invoice_no', 'plan_name'],
  base: (q) => q.is('deleted_at', null).is('cancelled_at', null).eq('kind', 'pt').eq('renewed', false).or('state.eq.used,state.eq.expired,sessions_left.lte.2'),
  filters: (ctx) => [fPlan(ctx), fTrainer(ctx)],
  columns: (ctx) => [...saleCols(ctx).slice(0, 7), { key: 'sess', header: 'Sessions', className: 'num', cell: (r) => `${r.sessions_used}/${r.sessions_total ?? '∞'}` }, ...saleCols(ctx).slice(7)],
  csv: subCsv, order: [['end_date', false]],
  notice: <p className="m-0 text-[13px] text-muted">Personal training subscriptions whose sessions are used up, ended, or have 2 or fewer sessions left, and haven't been renewed.</p>,
}

export const balanceDue: RegisterDef<S> = {
  title: 'Balance Due Register', view: 'subscription_overview', dateCol: 'balance_due_date', dateLabel: 'Balance due date', presetKind: 'balance', defaultPreset: 'all',
  search: ['member_name', 'member_phone', 'invoice_no', 'plan_name'], base: (q) => q.is('deleted_at', null).is('cancelled_at', null).gt('balance_amount', 0),
  filters: (ctx) => [fPlan(ctx), fService(ctx), fStaff(ctx, 'by', 'bill_rep_id', 'Bill Rep'),
    { key: 'type', placeholder: 'Subscription Type', options: [{ value: 'gym', label: 'Gym' }, { value: 'pt', label: 'Personal Training' }], apply: (q, v) => q.eq('kind', v) }],
  columns: (ctx) => [
    { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => <span className="font-semibold">{r.invoice_no ?? '—'}</span> },
    nameCol,
    { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name },
    { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) },
    { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) },
    { key: 'due', header: 'Balance Due Date', className: 'nowrap', cell: (r) => <span className={r.balance_due_date && r.balance_due_date < ctx.today ? 'font-semibold text-red' : ''}>{day(r.balance_due_date)}</span> },
    { key: 'bill', header: 'Total Bill Amount', className: 'num', cell: (r) => amt(r.total_amount) },
    { key: 'bal', header: 'Balance Amount', className: 'num', cell: (r) => <span className="font-semibold text-red">{amt(r.balance_amount)}</span> },
    { key: 'paid', header: 'Paid Amount', className: 'num', cell: (r) => amt(r.paid_amount) },
    subActions(ctx, [{ label: 'Add Follow Up', onClick: (r) => ctx.navigate(`/clients/${r.member_id}/follow-ups`) }, { label: 'Make Payment', onClick: (r) => ctx.navigate(`/clients/${r.member_id}/payments/${r.id}`) }]),
  ],
  csv: subCsv, order: [['balance_due_date', true]], totals: (rows) => [['Total Balance Amount', sum(rows, (r) => r.balance_amount)]],
}

export const couponRegister: RegisterDef<S> = {
  title: 'Coupon Code Register', view: 'subscription_overview', dateCol: 'invoice_date', search: ['member_name', 'coupon_code', 'coupon_name'],
  base: (q) => q.not('coupon_id', 'is', null).is('deleted_at', null),
  filters: (ctx) => [fPlan(ctx), { key: 'coupon', placeholder: 'Select Coupon', options: ctx.coupons.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })), apply: (q, v) => q.eq('coupon_code', v) }, fSubState('state', ['active', 'pending', 'expired', 'used', 'cancelled'])],
  columns: (ctx) => [
    nameCol, { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name },
    { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) }, { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) },
    { key: 'state', header: 'Plan Status', cell: (r) => chip(r.state) }, { key: 'pd', header: 'Payment Date', className: 'nowrap', cell: (r) => day(r.last_receipt_date ?? r.invoice_date) },
    { key: 'cn', header: 'Coupon Name', cell: (r) => r.coupon_name ?? '—' }, { key: 'cc', header: 'Coupon Code', cell: (r) => <span className="font-semibold">{r.coupon_code}</span> },
    { key: 'ct', header: 'Coupon Type', cell: (r) => (r.coupon_type ?? '').replace('_', ' + ') }, { key: 'cs', header: 'Coupon Status', cell: (r) => (r.coupon_active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Inactive</span>) },
    { key: 'sale', header: 'Sale Amount', className: 'num', cell: (r) => amt(r.selling_price + r.sign_up_fee) }, { key: 'disc', header: 'Coupon Discount', className: 'num', cell: (r) => amt(r.coupon_discount) },
    { key: 'total', header: 'Total Sale Amount', className: 'num', cell: (r) => amt(r.total_amount) }, { key: 'pay', header: 'Payment Status', cell: (r) => payChip(r.payment_status) },
    subActions(ctx),
  ],
  csv: () => [...subCsv(), ['Coupon Name', (r) => r.coupon_name], ['Coupon Code', (r) => r.coupon_code], ['Coupon Discount', (r) => r.coupon_discount]],
  order: [['invoice_date', false]], totals: (rows) => [['Coupon Discount', sum(rows, (r) => r.coupon_discount)]],
}

export const deletedSubs: RegisterDef<S> = {
  title: 'Deleted Subscriptions', view: 'subscription_overview', dateCol: 'deleted_at', search: ['member_name', 'member_phone', 'invoice_no'],
  base: (q) => q.not('deleted_at', 'is', null), panel: { gender: 'member_gender', payment: 'payment_status' },
  filters: (ctx) => [fPlan(ctx, 'plan_id', 'Membership'), fStaff(ctx, 'by', 'deleted_by', 'Deleted By'),
    { key: 'members', placeholder: "All subscriptions", options: [{ value: 'deleted', label: "Deleted Member's Subscriptions" }], apply: (q) => q.eq('member_deleted', true) }],
  columns: (ctx) => [
    { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => r.invoice_no ?? '—' }, nameCol,
    { key: 'by', header: 'Deleted By', cell: (r) => r.deleted_by_name ?? '—' }, { key: 'at', header: 'Deleted Date', className: 'nowrap', cell: (r) => fmtDateTime(r.deleted_at) },
    { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name }, { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) },
    { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) }, { key: 'state', header: 'Plan Status', cell: () => chip('deleted') },
    { key: 'why', header: 'Cancel Reason', cell: (r) => r.delete_reason ?? '—' }, { key: 'total', header: 'Total Price', className: 'num', cell: (r) => amt(r.total_amount) },
    { key: 'paid', header: 'Paid Price', className: 'num', cell: (r) => amt(r.voided_amount) }, { key: 'bal', header: 'Balance Price', className: 'num', cell: (r) => amt(Math.max(r.total_amount - r.voided_amount, 0)) },
    subActions(ctx),
  ],
  csv: () => [...subCsv(), ['Deleted By', (r) => r.deleted_by_name], ['Deleted At', (r) => r.deleted_at], ['Reason', (r) => r.delete_reason], ['Receipts voided', (r) => r.voided_amount]],
  order: [['deleted_at', false]],
}

export const cancelledSubs: RegisterDef<S> = {
  title: 'Cancel Subscriptions', view: 'subscription_overview', dateCol: 'cancelled_at', search: ['member_name', 'member_phone', 'invoice_no'],
  base: (q) => q.not('cancelled_at', 'is', null).is('deleted_at', null), panel: { gender: 'member_gender', payment: 'payment_status' },
  filters: (ctx) => [fPlan(ctx, 'plan_id', 'Membership'), fStaff(ctx, 'by', 'cancelled_by', 'Cancelled By')],
  columns: (ctx) => [
    { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => r.invoice_no ?? '—' }, nameCol,
    { key: 'by', header: 'Cancelled By', cell: (r) => r.cancelled_by_name ?? '—' }, { key: 'at', header: 'Cancel Date', className: 'nowrap', cell: (r) => fmtDateTime(r.cancelled_at) },
    { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name }, { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) },
    { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) }, { key: 'state', header: 'Plan Status', cell: () => chip('cancelled') },
    { key: 'why', header: 'Cancel Reason', cell: (r) => r.cancel_reason ?? '—' }, { key: 'total', header: 'Total Price', className: 'num', cell: (r) => amt(r.total_amount) },
    subActions(ctx),
  ],
  csv: () => [...subCsv(), ['Cancelled By', (r) => r.cancelled_by_name], ['Cancelled At', (r) => r.cancelled_at], ['Reason', (r) => r.cancel_reason]],
  order: [['cancelled_at', false]],
}

export const trialRegister: RegisterDef<S> = {
  title: 'Trial Subscriptions', view: 'subscription_overview', dateCol: 'start_date', search: ['member_name', 'member_phone', 'plan_name'],
  base: (q) => q.eq('kind', 'trial').is('deleted_at', null), panel: { gender: 'member_gender', state: 'state', end: 'end_date' },
  filters: (ctx) => [fStaff(ctx, 'rep', 'client_rep_id', 'Client Rep'), fTrainer(ctx, 'trainer_id', 'Assigned Trainer'),
    { key: 'ctype', placeholder: 'All Type', options: [{ value: 'enquiry', label: 'Enquiry' }, { value: 'member', label: 'Member' }], apply: (q, v) => q.eq('member_kind', v) }],
  columns: (ctx) => [
    nameCol, { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name },
    { key: 'type', header: 'Subscription Type', cell: (r) => (r.member_kind === 'member' ? 'Member' : 'Enquiry') },
    { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) }, { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) },
    { key: 'rep', header: 'Client Rep', cell: (r) => r.client_rep_name ?? '—' }, { key: 'tr', header: 'Assign Trainer', cell: (r) => r.trainer_name ?? '—' },
    { key: 'on', header: 'Assign on', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) }, subActions(ctx),
  ],
  csv: subCsv, order: [['start_date', false]],
}

export const recurringRegister: RegisterDef<S> = {
  title: 'Recurring Payment Register', view: 'subscription_overview', dateCol: 'invoice_date', search: ['member_name', 'member_phone', 'invoice_no'],
  base: (q) => q.eq('recurring', true).is('deleted_at', null), panel: { gender: 'member_gender', state: 'state', payment: 'payment_status', end: 'end_date', renewal: 'is_renewal' },
  filters: (ctx) => [fPlan(ctx, 'plan_id', 'Membership')],
  columns: (ctx) => [
    { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => r.invoice_no ?? '—' }, nameCol,
    { key: 'pd', header: 'Purchase Date', className: 'nowrap', cell: (r) => day(r.invoice_date) }, { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name },
    { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) }, { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) },
    { key: 'state', header: 'Plan Status', cell: (r) => chip(r.state) }, { key: 'total', header: 'Total Price', className: 'num', cell: (r) => amt(r.total_amount) },
    { key: 'bal', header: 'Total Balance Amount', className: 'num', cell: (r) => amt(r.balance_amount) }, { key: 'paid', header: 'Paid Price', className: 'num', cell: (r) => amt(r.paid_amount) },
    { key: 'npa', header: 'Next Payable Amount', className: 'num', cell: (r) => amt((r as S & { next_payable_amount: number | null }).next_payable_amount) },
    { key: 'npd', header: 'Next Payable Date', className: 'nowrap', cell: (r) => day((r as S & { next_payable_date: string | null }).next_payable_date) }, subActions(ctx),
  ],
  csv: subCsv, order: [['invoice_date', false]],
  notice: <p className="m-0 text-[13px] text-muted">Autopay subscriptions (monthly UPI / card mandates through Razorpay) appear here once autopay is switched on.</p>,
}

export const sessionRegister: RegisterDef<S> = {
  title: 'Session Register', view: 'subscription_overview', search: ['member_name', 'member_phone', 'plan_name', 'invoice_no'],
  base: (q) => q.eq('kind', 'pt').is('deleted_at', null).is('cancelled_at', null),
  filters: (ctx) => [fPlan(ctx), fTrainer(ctx), fStaff(ctx, 'by', 'bill_rep_id', 'Bill Rep'),
    { key: 'pay', placeholder: 'Payment Status', options: [{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }], apply: (q, v) => q.eq('payment_status', v) },
    fGender(), fSubState('state', ['active', 'pending', 'expired', 'used'])],
  columns: (ctx) => [
    { key: 'invd', header: 'Invoice Date', className: 'nowrap', cell: (r) => day(r.invoice_date) }, nameCol,
    { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name }, { key: 'tr', header: 'Trainer Name', cell: (r) => r.trainer_name ?? '—' },
    { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) }, { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) },
    { key: 'sess', header: 'Sessions', cell: (r) => <><strong>{r.sessions_used}</strong> / {r.sessions_total ?? '∞'}<div className="text-[12px] text-muted">{r.sessions_left ?? '∞'} left</div></> },
    { key: 'sale', header: 'Sale Amount', className: 'num', cell: (r) => amt(r.total_amount) }, { key: 'pay', header: 'Payment Status', cell: (r) => payChip(r.payment_status) },
    { key: 'act', header: 'Action', cell: (r) => <ActionMenu actions={[
      { label: 'Go to Sessions', onClick: () => ctx.navigate(`/registers/sessions?subscription=${r.id}`) },
      { label: 'View Client', onClick: () => ctx.navigate(`/clients/${r.member_id}`) },
    ]} /> },
  ],
  csv: () => [...subCsv(), ['Sessions Used', (r) => r.sessions_used], ['Sessions Total', (r) => r.sessions_total]],
  order: [['invoice_date', false]],
}

// ---------------------------------------------------------------------------
// Tax and write-offs
// ---------------------------------------------------------------------------
export const taxRegister: RegisterDef<R> = {
  title: 'TAX Register', view: 'payment_overview', dateCol: 'receipt_date', search: ['member_name', 'receipt_no', 'invoice_no'],
  base: (q) => q.eq('kind', 'payment').eq('status', 'paid'),
  filters: (ctx) => [fPlan(ctx), fService(ctx), fStaff(ctx, 'by', 'added_by', 'Added by'), fMode(ctx)],
  columns: (ctx) => [
    { key: 'rec', header: 'Receipt No.', className: 'nowrap', cell: (r) => <span className="font-semibold">{r.receipt_no}</span> },
    { key: 'date', header: 'Receipt Date', className: 'nowrap', cell: (r) => day(r.receipt_date) }, { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => r.invoice_no ?? '—' },
    { key: 'by', header: 'Added by', cell: (r) => r.added_by_name ?? '—' },
    { key: 'name', header: 'Customer Name', cell: (r) => <ClientCell id={r.member_id} name={r.member_name ?? ''} code={r.client_code} /> },
    { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name ?? '—' }, { key: 'start', header: 'Start Date', className: 'nowrap', cell: (r) => day(r.start_date) },
    { key: 'end', header: 'End Date', className: 'nowrap', cell: (r) => day(r.end_date) }, { key: 'mode', header: 'Mode', cell: (r) => r.mode },
    { key: 'paid', header: 'Receipt Paid Amount', className: 'num', cell: (r) => amt(r.amount) },
    { key: 'net', header: 'Net Sale Amount', className: 'num', cell: (r) => amt(r.amount - r.tax_amount) },
    { key: 'tax', header: 'Total TAX Amount', className: 'num', cell: (r) => amt(r.tax_amount) },
    { key: 'act', header: 'Action', cell: (r) => <ActionMenu actions={[{ label: 'Print Receipt', href: `/print/receipt/${r.id}`, external: true }, { label: 'View', onClick: () => ctx.navigate(`/clients/${r.member_id}`) }]} /> },
  ],
  csv: () => [...receiptCsv(), ['Net (excl. tax)', (r) => r.amount - r.tax_amount], ['CGST', (r) => r.tax_amount / 2], ['SGST', (r) => r.tax_amount / 2]],
  order: [['receipt_date', false]], totals: (rows) => [['Receipts', sum(rows, (r) => r.amount)], ['Net', sum(rows, (r) => r.amount - r.tax_amount)], ['TAX', sum(rows, (r) => r.tax_amount)]],
  notice: <p className="m-0 text-[13px] text-muted">Shaan Fitness isn't GST-registered yet, so tax is 0. Switch GST on in Fitness Center Invoice Settings once registered; tax then shows here split as CGST and SGST.</p>,
}

export const writeOffRegister: RegisterDef<R> = {
  title: 'Write Off Register', view: 'payment_overview', dateCol: 'receipt_date', search: ['member_name', 'receipt_no', 'invoice_no'],
  base: (q) => q.eq('kind', 'write_off'), filters: (ctx) => [fPlan(ctx), fService(ctx), fStaff(ctx, 'by', 'added_by', 'Written off by')],
  columns: (ctx) => [
    { key: 'rec', header: 'Receipt No.', className: 'nowrap', cell: (r) => r.receipt_no }, { key: 'date', header: 'Receipt Date', className: 'nowrap', cell: (r) => day(r.receipt_date) },
    { key: 'inv', header: 'Invoice No.', className: 'nowrap', cell: (r) => r.invoice_no ?? '—' },
    { key: 'name', header: 'Customer Name', cell: (r) => <ClientCell id={r.member_id} name={r.member_name ?? ''} code={r.client_code} /> },
    { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name ?? '—' }, { key: 'bill', header: 'Total Bill Amount', className: 'num', cell: (r) => amt(r.bill_amount) },
    { key: 'wo', header: 'Write Off Amount', className: 'num', cell: (r) => amt(r.amount) },
    { key: 'st', header: 'Payment Status', cell: (r) => (r.status === 'paid' ? <span className="chip chip-muted">Written off</span> : <span className="chip chip-red">Cancelled</span>) },
    { key: 'act', header: 'Action', cell: (r) => <ActionMenu actions={[{ label: 'View', onClick: () => ctx.navigate(`/clients/${r.member_id}/payments/${r.subscription_id}`) }]} /> },
  ],
  csv: receiptCsv, order: [['receipt_date', false]], totals: (rows) => [['Written off', sum(rows.filter((r) => r.status === 'paid'), (r) => r.amount)]],
}

// ---------------------------------------------------------------------------
// Changes: transfer, upgrade, downgrade, freeze, extension
// ---------------------------------------------------------------------------
type C = { id: string; kind: string; created_at: string; from_member_id: string; to_member_id: string | null; from_member_name: string; to_member_name: string | null
  from_client_code: string | null; to_client_code: string | null; from_plan_name: string; to_plan_name: string | null; fee: number; created_by_name: string | null
  client_rep_name: string | null; old_amount: number | null; new_amount: number | null; refund_amount: number; note: string | null }
const changeBase = (kind: string) => (q: { eq: (c: string, v: string) => unknown }) => q.eq('kind', kind)
const clientLink = (id: string | null, name: string | null, code: string | null): ReactNode => (id ? <Link to={`/clients/${id}`} className="font-semibold">{name}{code ? <span className="block text-[12px] font-normal text-muted">{code}</span> : null}</Link> : '—')

export const transferRegister: RegisterDef<C> = {
  title: 'Transfer Subscriptions', view: 'change_overview', dateCol: 'created_at', base: changeBase('transfer'), search: ['from_member_name', 'to_member_name', 'from_plan_name'],
  panel: { gender: 'from_member_gender' },
  filters: (ctx) => [fStaff(ctx, 'rep', 'client_rep_id', 'Client Rep'), fStaff(ctx, 'by', 'created_by', 'Transfered By')],
  columns: () => [
    { key: 'pkg', header: 'Package Name', cell: (r) => r.from_plan_name }, { key: 'from', header: 'Transfered From', cell: (r) => clientLink(r.from_member_id, r.from_member_name, r.from_client_code) },
    { key: 'to', header: 'Transfered To', cell: (r) => clientLink(r.to_member_id, r.to_member_name, r.to_client_code) }, { key: 'fee', header: 'Transfer Fees', className: 'num', cell: (r) => amt(r.fee) },
    { key: 'by', header: 'Transfered By', cell: (r) => r.created_by_name ?? '—' }, { key: 'rep', header: 'Client Rep', cell: (r) => r.client_rep_name ?? '—' },
    { key: 'on', header: 'Transfer On', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) },
  ],
  csv: () => [['Package', (r) => r.from_plan_name], ['From', (r) => r.from_member_name], ['To', (r) => r.to_member_name], ['Fee', (r) => r.fee], ['By', (r) => r.created_by_name], ['Client Rep', (r) => r.client_rep_name], ['On', (r) => r.created_at]],
  order: [['created_at', false]], totals: (rows) => [['Transfer Fees', sum(rows, (r) => r.fee)]],
}
export const upgradeRegister: RegisterDef<C> = {
  title: 'Upgrade Register', view: 'change_overview', dateCol: 'created_at', dateLabel: 'Start Date', base: changeBase('upgrade'), search: ['from_member_name', 'from_plan_name', 'to_plan_name'],
  panel: { gender: 'from_member_gender' },
  filters: (ctx) => [fService(ctx, 'to_service_ids'), fStaff(ctx, 'rep', 'client_rep_id', 'Client Rep'), fStaff(ctx, 'by', 'created_by', 'Upgraded by')],
  columns: () => [
    { key: 'name', header: 'Customer Name', cell: (r) => clientLink(r.from_member_id, r.from_member_name, r.from_client_code) }, { key: 'plan', header: 'Plan Name', cell: (r) => r.from_plan_name },
    { key: 'up', header: 'Upgraded Package', cell: (r) => r.to_plan_name }, { key: 'by', header: 'Upgraded By', cell: (r) => r.created_by_name ?? '—' },
    { key: 'rep', header: 'Client Rep.', cell: (r) => r.client_rep_name ?? '—' }, { key: 'old', header: 'Old Amount', className: 'num', cell: (r) => amt(r.old_amount) },
    { key: 'new', header: 'Upgrade Amount', className: 'num', cell: (r) => amt(r.new_amount) }, { key: 'on', header: 'Date', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) },
  ],
  csv: () => [['Customer', (r) => r.from_member_name], ['Plan', (r) => r.from_plan_name], ['Upgraded Package', (r) => r.to_plan_name], ['By', (r) => r.created_by_name], ['Old Amount (paid)', (r) => r.old_amount], ['Upgrade Amount', (r) => r.new_amount], ['On', (r) => r.created_at]],
  order: [['created_at', false]],
}
export const downgradeRegister: RegisterDef<C> = {
  title: 'Downgrade Register', view: 'change_overview', dateCol: 'created_at', base: changeBase('downgrade'), search: ['from_member_name', 'from_plan_name', 'to_plan_name'],
  panel: { gender: 'from_member_gender' },
  filters: (ctx) => [fService(ctx, 'from_service_ids'), fStaff(ctx, 'by', 'created_by', 'Downgraded By'), fStaff(ctx, 'rep', 'client_rep_id', 'Client Rep'),
    { key: 'pkg', placeholder: 'All Packages', options: ctx.plans.map((p) => ({ value: p.id, label: p.name })), apply: (q, v) => q.eq('to_plan_id', v) }],
  columns: () => [
    { key: 'name', header: 'Customer Name', cell: (r) => clientLink(r.from_member_id, r.from_member_name, r.from_client_code) }, { key: 'plan', header: 'Plan Name', cell: (r) => r.from_plan_name },
    { key: 'down', header: 'Downgraded Package', cell: (r) => r.to_plan_name }, { key: 'by', header: 'Downgraded By', cell: (r) => r.created_by_name ?? '—' },
    { key: 'note', header: 'Notes', cell: (r) => r.note ?? '—' }, { key: 'rep', header: 'Client Rep', cell: (r) => r.client_rep_name ?? '—' },
    { key: 'old', header: 'Old Amount', className: 'num', cell: (r) => amt(r.old_amount) }, { key: 'new', header: 'Downgrade Amount', className: 'num', cell: (r) => amt(r.new_amount) },
    { key: 'ref', header: 'Refund', className: 'num', cell: (r) => <span className={r.refund_amount > 0 ? 'font-semibold text-amber' : ''}>{amt(r.refund_amount)}</span> },
  ],
  csv: () => [['Customer', (r) => r.from_member_name], ['Plan', (r) => r.from_plan_name], ['Downgraded Package', (r) => r.to_plan_name], ['By', (r) => r.created_by_name], ['Notes', (r) => r.note], ['Old Amount', (r) => r.old_amount], ['Downgrade Amount', (r) => r.new_amount], ['Refund', (r) => r.refund_amount], ['On', (r) => r.created_at]],
  order: [['created_at', false]], totals: (rows) => [['Refunds', sum(rows, (r) => r.refund_amount)]],
}

type F = { id: string; member_id: string; member_name: string; client_code: string | null; plan_name: string; days: number; start_date: string; end_date?: string; created_by_name: string | null
  note: string | null; client_rep_name: string | null; fee: number; status: string; created_at: string }
export const freezeRegister: RegisterDef<F> = {
  title: 'Freezed Subscriptions', view: 'freeze_overview', dateCol: 'start_date', search: ['member_name', 'plan_name'], panel: { gender: 'member_gender' },
  filters: (ctx) => [fStaff(ctx, 'rep', 'client_rep_id', 'Client Rep'), fStaff(ctx, 'by', 'created_by', 'Freezed By'),
    { key: 'status', placeholder: 'All freezes', options: [{ value: 'requested', label: 'Freeze Requests' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }], apply: (q, v) => q.eq('status', v) }],
  columns: (ctx) => [
    { key: 'name', header: 'Customer Name', cell: (r) => clientLink(r.member_id, r.member_name, r.client_code) }, { key: 'pkg', header: 'Package Name', cell: (r) => r.plan_name },
    { key: 'days', header: 'Freeze Days', className: 'num', cell: (r) => r.days }, { key: 'dates', header: 'Freeze Dates', className: 'nowrap', cell: (r) => `${day(r.start_date)} – ${day(r.end_date)}` },
    { key: 'by', header: 'Freezed By', cell: (r) => r.created_by_name ?? '—' }, { key: 'note', header: 'Notes', cell: (r) => r.note ?? '—' },
    { key: 'rep', header: 'Client Rep', cell: (r) => r.client_rep_name ?? '—' }, { key: 'fee', header: 'Freeze Fees', className: 'num', cell: (r) => amt(r.fee) },
    { key: 'st', header: 'Status', cell: (r) => (r.status === 'approved' ? <span className="chip chip-green">Approved</span> : r.status === 'requested' ? <span className="chip chip-amber">Requested</span> : <span className="chip chip-red">Rejected</span>) },
    { key: 'act', header: 'Action', cell: (r) => <RequestActions kind="freeze" id={r.id} status={r.status} owner={ctx.role === 'owner'} /> },
  ],
  csv: () => [['Customer', (r) => r.member_name], ['Package', (r) => r.plan_name], ['Days', (r) => r.days], ['From', (r) => r.start_date], ['To', (r) => r.end_date], ['By', (r) => r.created_by_name], ['Notes', (r) => r.note], ['Client Rep', (r) => r.client_rep_name], ['Fee', (r) => r.fee], ['Status', (r) => r.status]],
  order: [['start_date', false]], totals: (rows) => [['Freeze Fees', sum(rows, (r) => r.fee)]],
}
export const extensionRegister: RegisterDef<F> = {
  title: 'Extension Register', view: 'extension_overview', dateCol: 'created_at', dateLabel: 'Start Date', search: ['member_name', 'plan_name'], panel: { gender: 'member_gender' },
  filters: (ctx) => [fStaff(ctx, 'rep', 'client_rep_id', 'Client Rep'), fStaff(ctx, 'by', 'created_by', 'Extended By'),
    { key: 'status', placeholder: 'All extensions', options: [{ value: 'requested', label: 'Extension Requests' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }], apply: (q, v) => q.eq('status', v) }],
  columns: (ctx) => [
    { key: 'name', header: 'Customer Name', cell: (r) => clientLink(r.member_id, r.member_name, r.client_code) }, { key: 'sub', header: 'Subscription Name', cell: (r) => r.plan_name },
    { key: 'by', header: 'Extension Done by', cell: (r) => r.created_by_name ?? '—' }, { key: 'days', header: 'No. of Days Added', className: 'num', cell: (r) => r.days },
    { key: 'on', header: 'Extension Date', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) }, { key: 'note', header: 'Notes', cell: (r) => r.note ?? '—' },
    { key: 'rep', header: 'Client Rep.', cell: (r) => r.client_rep_name ?? '—' }, { key: 'fee', header: 'Extension Fees', className: 'num', cell: (r) => amt(r.fee) },
    { key: 'st', header: 'Status', cell: (r) => (r.status === 'approved' ? <span className="chip chip-green">Approved</span> : r.status === 'requested' ? <span className="chip chip-amber">Requested</span> : <span className="chip chip-red">Rejected</span>) },
    { key: 'act', header: 'Action', cell: (r) => <RequestActions kind="extension" id={r.id} status={r.status} owner={ctx.role === 'owner'} /> },
  ],
  csv: () => [['Customer', (r) => r.member_name], ['Subscription', (r) => r.plan_name], ['By', (r) => r.created_by_name], ['Days', (r) => r.days], ['On', (r) => r.created_at], ['Notes', (r) => r.note], ['Client Rep', (r) => r.client_rep_name], ['Fee', (r) => r.fee]],
  order: [['created_at', false]], totals: (rows) => [['Extension Fees', sum(rows, (r) => r.fee)]],
}

// ---------------------------------------------------------------------------
// Sessions recorded and deleted, course orders
// ---------------------------------------------------------------------------
type A = { id: string; member_id: string; member_name: string; client_code: string | null; trainer_name: string | null; marked_by_name: string | null; activity: string | null
  status: string; check_in: string; source: string; plan_name: string | null }
const showLabel = (s: string) => (s === 'present' ? <span className="chip chip-green">Show</span> : s === 'late_cancel' ? <span className="chip chip-amber">No show (deducted)</span> : <span className="chip chip-muted">No show</span>)
export const recordedSessions: RegisterDef<A> = {
  title: 'Recorded Session Listing', view: 'session_overview', dateCol: 'date', search: ['member_name', 'activity'], base: (q) => q.eq('source', 'pt'),
  filters: (ctx) => [fTrainer(ctx), fStaff(ctx, 'by', 'marked_by', 'Action Taken By'),
    { key: 'show', placeholder: 'All Show', options: [{ value: 'present', label: 'Show Client' }, { value: 'absent', label: 'Client No Show' }], apply: (q, v) => (v === 'present' ? q.eq('status', 'present') : q.in('status', ['absent', 'late_cancel'])) },
    fGender(), fBatch(ctx)],
  columns: () => [
    { key: 'date', header: 'Record Date', className: 'nowrap', cell: (r) => fmtDateTime(r.check_in) }, { key: 'name', header: 'Customer Name', cell: (r) => clientLink(r.member_id, r.member_name, r.client_code) },
    { key: 'tr', header: 'Trainer Name', cell: (r) => r.trainer_name ?? '—' }, { key: 'by', header: 'Action Taken By', cell: (r) => r.marked_by_name ?? '—' },
    { key: 'act', header: 'Activity', cell: (r) => <>{r.activity ?? '—'}<div className="text-[12px] text-muted">{r.plan_name}</div></> }, { key: 'show', header: 'Client Show/No Show', cell: (r) => showLabel(r.status) },
  ],
  csv: () => [['Record Date', (r) => r.check_in], ['Customer', (r) => r.member_name], ['Trainer', (r) => r.trainer_name], ['Action Taken By', (r) => r.marked_by_name], ['Activity', (r) => r.activity], ['Show', (r) => r.status], ['Plan', (r) => r.plan_name]],
  order: [['check_in', false]],
  actions: (_ctx, rows) => <CsvOnly><button type="button" className="btn btn-sm" onClick={() => incentivesCsv(rows)}>Export Incentives CSV</button></CsvOnly>,
}
function incentivesCsv(rows: A[]) {
  const by = new Map<string, { trainer: string; show: number; noShow: number }>()
  for (const r of rows) {
    const k = r.trainer_name ?? 'Not assigned'
    const x = by.get(k) ?? { trainer: k, show: 0, noShow: 0 }
    if (r.status === 'present' || r.status === 'late_cancel') x.show++; else x.noShow++
    by.set(k, x)
  }
  import('../../lib/csv').then(({ downloadCsv }) => downloadCsv('trainer-incentives.csv', [...by.values()], [['Trainer', (x) => x.trainer], ['Sessions counted', (x) => x.show], ['No shows not counted', (x) => x.noShow]]))
}

type D = { id: string; member_id: string | null; member_name: string | null; client_code: string | null; plan_name: string | null; check_in: string; status: string; trainer_name: string | null
  plan_service_ids: string[] | null; batch_name: string | null; deleted_at: string; deleted_by_name: string | null; reason: string | null; source: string }
export const deletedSessions: RegisterDef<D> = {
  title: 'Deleted Session Register', view: 'deleted_session_overview', dateCol: 'deleted_at', search: ['member_name', 'plan_name'],
  filters: (ctx) => [fStaff(ctx, 'by', 'deleted_by', 'Select Staff')],
  columns: (ctx) => [
    { key: 'name', header: 'Customer Name', cell: (r) => clientLink(r.member_id, r.member_name, r.client_code) }, { key: 'plan', header: 'Plan Name', cell: (r) => r.plan_name ?? '—' },
    { key: 'at', header: 'Deduct Date-Time', className: 'nowrap', cell: (r) => fmtDateTime(r.check_in) }, { key: 'show', header: 'Show/No Show', cell: (r) => showLabel(r.status) },
    { key: 'tr', header: 'Trainer', cell: (r) => r.trainer_name ?? '—' },
    { key: 'svc', header: 'Service', cell: (r) => ctx.services.filter((s) => r.plan_service_ids?.includes(s.id)).map((s) => s.custom_name ?? s.name).slice(0, 3).join(', ') || '—' },
    { key: 'cls', header: 'Class', cell: (r) => r.batch_name ?? '—' }, { key: 'del', header: 'Deleted On', className: 'nowrap', cell: (r) => <>{fmtDateTime(r.deleted_at)}<div className="text-[12px] text-muted">{r.deleted_by_name}</div></> },
    { key: 'src', header: 'Delete Source', cell: (r) => <>{r.source === 'pt' ? 'Session register' : r.source}{r.reason ? <div className="text-[12px] text-muted">{r.reason}</div> : null}</> },
  ],
  csv: () => [['Customer', (r) => r.member_name], ['Plan', (r) => r.plan_name], ['Deduct Date-Time', (r) => r.check_in], ['Show', (r) => r.status], ['Trainer', (r) => r.trainer_name], ['Class', (r) => r.batch_name], ['Deleted On', (r) => r.deleted_at], ['Deleted By', (r) => r.deleted_by_name], ['Reason', (r) => r.reason]],
  order: [['deleted_at', false]],
}

type O = { id: string; created_at: string; member_id: string; member_name: string; client_code: string | null; course_name: string; validity_days: number | null; amount: number; payment_status: string; course_type: string }
export const courseOrders: RegisterDef<O> = {
  title: 'Course Orders', view: 'course_order_overview', search: ['member_name', 'course_name'],
  filters: () => [
    { key: 'type', placeholder: 'Select Course Type', options: [{ value: 'free', label: 'FREE' }, { value: 'paid', label: 'PAID' }], apply: (q, v) => q.eq('course_type', v) },
    { key: 'pay', placeholder: 'Payment Status', options: [{ value: 'paid', label: 'Paid' }, { value: 'failed', label: 'Failed' }], apply: (q, v) => q.eq('payment_status', v) }],
  columns: () => [
    { key: 'date', header: 'Invoice Date', className: 'nowrap', cell: (r) => fmtDateTime(r.created_at) }, { key: 'name', header: 'Customer Name', cell: (r) => clientLink(r.member_id, r.member_name, r.client_code) },
    { key: 'course', header: 'Course Name', cell: (r) => r.course_name }, { key: 'val', header: 'Validity', cell: (r) => (r.validity_days ? `${r.validity_days} days` : 'Lifetime') },
    { key: 'amt', header: 'Sale Amount', className: 'num', cell: (r) => amt(r.amount) }, { key: 'pay', header: 'Payment Status', cell: (r) => (r.payment_status === 'paid' ? <span className="chip chip-green">Paid</span> : <span className="chip chip-red">{r.payment_status}</span>) },
  ],
  order: [['created_at', false]],
  notice: <p className="m-0 text-[13px] text-muted">Online courses bought in the member app show here once courses are added to the app.</p>,
}

export function RegisterPage<T extends { id?: string }>({ def }: { def: RegisterDef<T> }) {
  return <Register key={def.title} def={def} />
}

/** The owner approves or rejects a freeze or extension request (staff without "Allow Freeze/Extension"). */
function RequestActions({ kind, id, status, owner }: { kind: 'freeze' | 'extension'; id: string; status: string; owner: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const run = useMutation({
    mutationFn: (approve: boolean) => decideRequest(kind, id, approve),
    onSuccess: (_d, approve) => { qc.invalidateQueries({ queryKey: ['registers'] }); qc.invalidateQueries({ queryKey: ['subs'] }); toast(approve ? 'Approved' : 'Rejected') },
    onError: (e: Error) => toast(e.message),
  })
  if (status !== 'requested') return <span className="text-muted">—</span>
  if (!owner) return <span className="text-[12px] text-muted">Waiting for the owner</span>
  return <div className="flex gap-1.5"><button type="button" className="btn btn-sm" disabled={run.isPending} onClick={() => run.mutate(true)}>Approve</button>
    <button type="button" className="btn btn-sm" disabled={run.isPending} onClick={() => run.mutate(false)}>Reject</button></div>
}
