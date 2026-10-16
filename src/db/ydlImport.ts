import { supabase } from '../lib/supabase'

// Moving the data from YDL (supabase/migrations/20261016000021_ydl_import.sql). The owner exports CSVs from YDL; each
// step here finds YDL's columns by their headings, turns each line into a plain row, and sends rows in parts.

export type ImportKind = 'members' | 'subscriptions' | 'receipts' | 'follow_ups' | 'freezes' | 'extensions' | 'attendance'
export type FieldType = 'text' | 'date' | 'datetime' | 'time' | 'number' | 'phone' | 'name_number' | 'sessions' | 'date_range'
export interface Field { key: string; label: string; type?: FieldType; aliases: string[]; required?: boolean }
export interface Step {
  id: string; kind: ImportKind; title: string; ydl: string; hint: string; fields: Field[]
  /** Rows this step leaves out (e.g. closed follow-ups), with the reason. */
  skip?: (row: Record<string, string>) => string | null
  /** Fixed values for every row (e.g. kind: enquiry). */
  fixed?: Record<string, string>
}

const client: Field[] = [
  { key: 'member_code', label: 'Member code', aliases: ['member code', 'customer id', 'customer id.', 'customer code', 'client code', 'member id', 'client id'] },
  { key: 'name', label: 'Name', type: 'name_number', aliases: ['member name & number', 'customer name', 'member name', 'client name', 'name', 'full name', 'name & number'] },
  { key: 'phone', label: 'Mobile', type: 'phone', aliases: ['mobile number', 'mobile', 'mobile no', 'mobile no.', 'phone', 'phone number', 'contact number', 'contact', 'number'] },
]

const memberFields: Field[] = [
  { ...client[0], aliases: [...client[0].aliases, 'code'] }, client[1], client[2],
  { key: 'first_name', label: 'First name', aliases: ['first name'] }, { key: 'last_name', label: 'Last name', aliases: ['last name', 'surname'] },
  { key: 'enquiry_code', label: 'Enquiry code', aliases: ['enquiry code', 'enquiry id'] },
  { key: 'email', label: 'Email', aliases: ['email', 'email address', 'email id', 'e-mail'] },
  { key: 'gender', label: 'Gender', aliases: ['gender', 'sex'] },
  { key: 'date_of_birth', label: 'Date of birth', type: 'date', aliases: ['date of birth', 'dob', 'birth date', 'birthday'] },
  { key: 'joined_on', label: 'Joined on', type: 'date', aliases: ['date of joining', 'joining date', 'joined on', 'member since', 'added on', 'created on', 'date'] },
  { key: 'source_promotion', label: 'Source of promotion', aliases: ['source of promotion', 'lead source', 'source'] },
  { key: 'client_rep', label: 'Client rep', aliases: ['client rep', 'added by', 'client representative', 'rep', 'handled by'] },
  { key: 'trainer', label: 'Trainer', aliases: ['assigned trainer', 'trainer', 'trainer name'] },
  { key: 'biometric_code', label: 'Biometric code', aliases: ['biometric code', 'biometric id', 'biometric', 'device code'] },
  { key: 'alt_phone', label: 'Other mobile', type: 'phone', aliases: ['alternate number', 'alternate mobile', 'alt number', 'other number'] },
  { key: 'occupation', label: 'Occupation', aliases: ['occupation', 'profession'] },
  { key: 'street1', label: 'Address', aliases: ['address', 'street', 'address line 1'] },
  { key: 'city', label: 'City', aliases: ['city'] }, { key: 'pincode', label: 'Pincode', aliases: ['pincode', 'pin code', 'zip'] },
  { key: 'emergency_phone', label: 'Emergency number', type: 'phone', aliases: ['emergency contact number', 'emergency number', 'emergency contact'] },
  { key: 'notes', label: 'Notes', aliases: ['remarks', 'notes', 'note', 'comment'] },
]

export const STEPS: Step[] = [
  {
    id: 'members', kind: 'members', title: 'Members', ydl: 'Members › My Members › Export to CSV (and Deactivated Members)',
    hint: 'Every member with their code, mobile, rep and trainer. Bring this first: the other files find clients by code or mobile.',
    fields: memberFields,
    fixed: { kind: 'member' },
  },
  {
    id: 'deactivated', kind: 'members', title: 'Deactivated members', ydl: 'Members › My Members › Deactivated Members › Export to CSV',
    hint: 'Members YDL has switched off. They come over switched off too (YDL’s “Inactive” just means no current plan; those stay in Members).',
    fields: memberFields,
    fixed: { kind: 'member', active: 'false' },
  },
  {
    id: 'enquiries', kind: 'members', title: 'Enquiries', ydl: 'Enquiry › Enquiry List › Export to CSV',
    hint: 'Open enquiries and leads (those who joined are matched to their member record).',
    fields: [
      { key: 'enquiry_code', label: 'Enquiry code', aliases: ['enquiry code', 'enquiry id', 'code'] }, client[1], client[2],
      { key: 'enquiry_date', label: 'Date of enquiry', type: 'date', aliases: ['date of enquiry', 'enquiry date', 'date', 'added on'] },
      { key: 'email', label: 'Email', aliases: ['email', 'email address', 'email id'] },
      { key: 'gender', label: 'Gender', aliases: ['gender'] },
      { key: 'client_rep', label: 'Handled by', aliases: ['handled by', 'client rep', 'added by', 'staff name'] },
      { key: 'source_enquiry', label: 'Source of enquiry', aliases: ['source of enquiry', 'enquiry source'] },
      { key: 'source_promotion', label: 'Source of promotion', aliases: ['source of promotion', 'lead source'] },
      { key: 'notes', label: 'Remarks', aliases: ['remarks', 'comment', 'notes'] },
      { key: 'not_interested', label: 'Not interested', aliases: ['not interested', 'enquiry status', 'lead status'] },
    ],
    fixed: { kind: 'enquiry' },
  },
  {
    id: 'subscriptions', kind: 'subscriptions', title: 'Subscriptions', ydl: 'Accounts › Account Registers › Subscriptions Register › Export to CSV',
    hint: 'Every plan sold, with invoice number, dates and amounts. Plans are matched by name (inactive plans count).',
    fields: [
      { key: 'invoice_no', label: 'Invoice no.', aliases: ['invoice no.', 'invoice no', 'invoice no..', 'invoice number', 'bill no'] },
      { key: 'invoice_date', label: 'Invoice date', type: 'date', aliases: ['invoice date', 'purchase date', 'bill date', 'sale date'] },
      ...client,
      { key: 'plan', label: 'Plan', aliases: ['plan name', 'package name', 'membership', 'plan', 'membership name', 'subscription name'], required: true },
      { key: 'start_date', label: 'Start date', type: 'date', aliases: ['start date', 'from'], required: true },
      { key: 'end_date', label: 'End date', type: 'date', aliases: ['end date', 'to', 'expiry date'] },
      { key: 'status', label: 'Plan status', aliases: ['plan status', 'status', 'subscription status'] },
      { key: 'net_amount', label: 'Net sale amount', type: 'number', aliases: ['net sale amount', 'net amount', 'sale amount', 'net price'] },
      { key: 'gst_amount', label: 'GST', type: 'number', aliases: ['gst', 'tax', 'gst amount', 'total tax amount'] },
      { key: 'total_amount', label: 'Total', type: 'number', aliases: ['total sale amount', 'total price', 'total bill amount', 'total amount', 'amount'] },
      { key: 'discount', label: 'Discount', type: 'number', aliases: ['discount', 'coupon discount'] },
      { key: 'sessions_used', label: 'Sessions (used / total)', type: 'sessions', aliases: ['sessions', 'sessions used', 'used sessions'] },
      { key: 'trainer', label: 'Trainer', aliases: ['trainer name', 'trainer', 'assigned trainer'] },
      { key: 'bill_rep', label: 'Bill rep', aliases: ['bill rep', 'sold by', 'sales rep', 'added by'] },
      { key: 'client_rep', label: 'Client rep', aliases: ['client rep', 'client rep.'] },
      { key: 'cancel_reason', label: 'Cancel reason', aliases: ['cancel reason'] },
    ],
  },
  {
    id: 'receipts', kind: 'receipts', title: 'Receipts', ydl: 'Accounts › Account Registers › Receipt Register › Export to CSV',
    hint: 'Every payment against an invoice. Balances here then match YDL.',
    fields: [
      { key: 'receipt_no', label: 'Receipt no.', aliases: ['receipt no.', 'receipt no', 'receipt number'] },
      { key: 'receipt_date', label: 'Receipt date', type: 'date', aliases: ['receipt date', 'receipt date.', 'payment date', 'paid on', 'date'], required: true },
      { key: 'invoice_no', label: 'Invoice no.', aliases: ['invoice no..', 'invoice no.', 'invoice no', 'invoice number'], required: true },
      { key: 'amount', label: 'Amount paid', type: 'number', aliases: ['receipt paid amount', 'paid amount', 'amount paid', 'amount', 'receipt amount'], required: true },
      { key: 'mode', label: 'Mode', aliases: ['mode', 'payment mode', 'mode of payment'] },
      { key: 'added_by', label: 'Added by', aliases: ['receipt added by', 'added by', 'received by'] },
      { key: 'status', label: 'Status', aliases: ['receipt status', 'status'] },
    ],
  },
  {
    id: 'follow_ups', kind: 'follow_ups', title: 'Follow-ups', ydl: 'Follow Ups › Export to CSV',
    hint: 'Open follow-ups only; done ones stay in YDL’s history.',
    fields: [
      { key: 'member_code', label: 'Code', aliases: ['member code', 'enquiry code', 'customer id', 'code'] }, client[1], client[2],
      { key: 'type', label: 'Follow-up type', aliases: ['follow up type', 'followup type', 'type', 'follow-up type'] },
      { key: 'due_at', label: 'Follow-up date', type: 'datetime', aliases: ['follow up date', 'follow up date & time', 'next follow up', 'next follow up date', 'due date', 'date & time', 'date'], required: true },
      { key: 'assigned_to', label: 'Assigned to', aliases: ['assigned to', 'handled by', 'staff name', 'assign to'] },
      { key: 'notes', label: 'Remarks', aliases: ['remarks', 'comment', 'notes', 'follow up remarks'] },
      { key: 'status', label: 'Status', aliases: ['status', 'follow up status'] },
    ],
    skip: (r) => (/(done|closed|complete|success|not interested)/i.test(r.status ?? '') ? 'Already handled in YDL' : null),
  },
  {
    id: 'freezes', kind: 'freezes', title: 'Freezes', ydl: 'Accounts › Account Registers › Freeze Register › Export to CSV',
    hint: 'Freeze history. End dates stay as YDL has them.',
    fields: [
      ...client, { key: 'plan', label: 'Plan', aliases: ['package name', 'plan name', 'subscription name'] },
      { key: 'days', label: 'Freeze days', type: 'number', aliases: ['freeze days', 'days', 'no. of days'] },
      { key: 'start_date', label: 'Freeze dates', type: 'date_range', aliases: ['freeze dates', 'freeze date', 'from date', 'start date'], required: true },
      { key: 'fee', label: 'Fee', type: 'number', aliases: ['freeze fees', 'freeze fee', 'fees', 'fee'] },
      { key: 'note', label: 'Notes', aliases: ['notes', 'note', 'remarks'] },
    ],
  },
  {
    id: 'extensions', kind: 'extensions', title: 'Extensions', ydl: 'Accounts › Account Registers › Extension Register › Export to CSV',
    hint: 'Days added to plans. End dates stay as YDL has them.',
    fields: [
      ...client, { key: 'plan', label: 'Plan', aliases: ['subscription name', 'package name', 'plan name'] },
      { key: 'days', label: 'Days added', type: 'number', aliases: ['no. of days added', 'days added', 'days'], required: true },
      { key: 'date', label: 'Extension date', type: 'date', aliases: ['extension date', 'date'] },
      { key: 'fee', label: 'Fee', type: 'number', aliases: ['extension fees', 'extension fee', 'fees', 'fee'] },
      { key: 'note', label: 'Notes', aliases: ['notes', 'note', 'remarks'] },
    ],
  },
  {
    id: 'attendance', kind: 'attendance', title: 'Check-ins', ydl: 'Attendance Reports › Client Attendance › Export to CSV',
    hint: 'Past check-ins for the attendance history and reports (they don’t use up PT sessions).',
    fields: [
      ...client,
      { key: 'date', label: 'Date', type: 'date', aliases: ['date', 'check in date', 'attendance date', 'check-in date'], required: true },
      { key: 'check_in', label: 'Check in', type: 'time', aliases: ['check in', 'check in time', 'in time', 'check-in', 'check-in time'] },
      { key: 'check_out', label: 'Check out', type: 'time', aliases: ['check out', 'check out time', 'out time', 'check-out', 'check-out time'] },
      { key: 'source', label: 'Source', aliases: ['source', 'check in source', 'type'] },
    ],
  },
]

// Parsing -----------------------------------------------------------------------------------------------------------------
export const normHead = (s: string) => s.replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[*:]+$/, '').trim()

/** Which CSV column feeds each field (by heading; the first alias that is present wins). */
export function guessColumns(step: Step, headers: string[]) {
  const heads = headers.map(normHead)
  const used = new Set<number>()
  const out: Record<string, number> = {}
  for (const f of step.fields) {
    for (const a of f.aliases) {
      const i = heads.findIndex((h, k) => h === a && !used.has(k))
      if (i >= 0) { out[f.key] = i; used.add(i); break }
    }
  }
  return out
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const pad = (n: number) => String(n).padStart(2, '0')
const valid = (y: number, m: number, d: number) => y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate()

/** 16-10-2026, 16/10/2026, 2026-10-16, 16-Oct-2026, 16 Oct 2026, Oct. 16, 2026, October 16, 2026 (with or without a time) → 2026-10-16. */
export function parseDate(s: string): string | null {
  const v = s.trim().toLowerCase().replace(/\./g, '').replace(/,/g, ' ').replace(/\s+/g, ' ')
  if (!v) return null
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return valid(+m[1], +m[2], +m[3]) ? `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` : null
  m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/)
  if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return valid(y, +m[2], +m[1]) ? `${y}-${pad(+m[2])}-${pad(+m[1])}` : null }
  m = v.match(/^(\d{1,2})[- ]([a-z]{3})[a-z]*[- ](\d{4})/)
  if (m) { const mo = MONTHS.indexOf(m[2]) + 1; return mo && valid(+m[3], mo, +m[1]) ? `${m[3]}-${pad(mo)}-${pad(+m[1])}` : null }
  m = v.match(/^([a-z]{3})[a-z]* (\d{1,2}) (\d{4})/)
  if (m) { const mo = MONTHS.indexOf(m[1]) + 1; return mo && valid(+m[3], mo, +m[2]) ? `${m[3]}-${pad(mo)}-${pad(+m[2])}` : null }
  return null
}

/** 6:05 AM, 18:10, 6.05 pm, 06:05:00 → 06:05. */
export function parseClock(s: string): string | null {
  const m = s.trim().toLowerCase().match(/(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?/)
  if (!m) return null
  let h = +m[1]
  const ap = m[3]?.replace(/\./g, '')
  if (ap) { if (h < 1 || h > 12) return null; if (ap === 'pm' && h !== 12) h += 12; if (ap === 'am' && h === 12) h = 0 }
  return h <= 23 && +m[2] <= 59 ? `${pad(h)}:${m[2]}` : null
}

export interface Parsed { line: number; row: Record<string, string>; problems: string[]; skipped: string | null }

/** CSV lines → plain rows for the server, with problems found on this side (missing or unreadable values). */
export function toRows(step: Step, grid: string[][], cols: Record<string, number>): Parsed[] {
  return grid.slice(1).map((cells, i) => {
    const row: Record<string, string> = { ...(step.fixed ?? {}) }
    const problems: string[] = []
    for (const f of step.fields) {
      const at = cols[f.key]
      const raw = at === undefined ? '' : (cells[at] ?? '').trim()
      if (!raw) { if (f.required) problems.push(`${f.label} is empty`); continue }
      switch (f.type) {
        case 'date': { const d = parseDate(raw); if (d) row[f.key] = d; else problems.push(`${f.label} not understood: ${raw}`); break }
        case 'datetime': { const d = parseDate(raw); const t = parseClock(raw.replace(/^\S+\s*/, '')) ?? (raw.match(/\d{1,2}:\d{2}/) ? parseClock(raw) : null)
          if (d) row[f.key] = t ? `${d} ${t}` : d; else problems.push(`${f.label} not understood: ${raw}`); break }
        case 'time': { const t = parseClock(raw); if (t) row[f.key] = t; break }
        case 'phone': row[f.key] = raw; break
        case 'number': row[f.key] = raw; break
        case 'sessions': { const m = raw.match(/(\d+)\s*(?:\/|of)\s*(\d+)/); if (m) { row.sessions_used = m[1]; row.sessions_total = m[2] } else if (/^\d+$/.test(raw)) row.sessions_used = raw; break }
        case 'date_range': {
          const parts = raw.split(/\s+(?:to|-|–)\s+|\s*(?:to|–)\s*/i).map((x) => x.trim()).filter(Boolean)
          const a = parseDate(parts[0] ?? ''), b = parseDate(parts[1] ?? '')
          if (!a) problems.push(`${f.label} not understood: ${raw}`); else { row[f.key] = a; if (b) row.end_date = b }
          break
        }
        case 'name_number': {
          // YDL's "Member Name & Number" holds both: "Rohit Sharma 9848012345" or "Rohit Sharma (+91 98480 12345)".
          const num = raw.match(/(\+?\d[\d\s-]{8,}\d)/)
          const name = (num ? raw.replace(num[0], '') : raw).replace(/[()\-|,]+\s*$/, '').replace(/\s*[(|]\s*$/, '').trim()
          if (name) row.name = name
          if (num && !row.phone) row.phone = num[1]
          break
        }
        default: row[f.key] = raw
      }
    }
    if (step.kind === 'members' && !row.name && !row.first_name) problems.push('Name is empty')
    if (step.kind !== 'members' && step.kind !== 'receipts' && !row.member_code && !row.name && !row.phone) problems.push('No code, name or mobile to find the client')
    if (step.id === 'enquiries' && row.not_interested) row.not_interested = /not interested|closed|lost/i.test(row.not_interested) ? 'true' : 'false'
    return { line: i + 2, row, problems, skipped: step.skip ? step.skip(row) : null }
  })
}

export interface ImportResult { added: number; updated: number; same: number; problems: { line: number; message: string }[] }

/** Sends ready rows in parts of 500; reports progress. */
export async function sendRows(studioId: string, kind: ImportKind, rows: Parsed[], onProgress: (done: number) => void): Promise<ImportResult> {
  const total: ImportResult = { added: 0, updated: 0, same: 0, problems: [] }
  for (let i = 0; i < rows.length; i += 500) {
    const part = rows.slice(i, i + 500).map((r) => ({ ...r.row, _line: r.line }))
    const res = await supabase.rpc('ydl_import', { p_studio: studioId, p_kind: kind, p_rows: part })
    if (res.error) throw new Error(res.error.message)
    const d = res.data as ImportResult
    total.added += d.added; total.updated += d.updated; total.same += d.same; total.problems.push(...d.problems)
    onProgress(Math.min(rows.length, i + 500))
  }
  return total
}

export async function importCounts(studioId: string) {
  const res = await supabase.rpc('ydl_import_counts', { p_studio: studioId })
  if (res.error) throw new Error(res.error.message)
  return res.data as Record<string, number>
}
