import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { useLists } from '../../db/studio'
import type { ListItem } from '../../db/types'
import { Field, Notice, Select, TextInput } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, PageHeader } from '../../components/ui'

// Every dropdown YDL has, editable by the owner: add, rename, reorder, hide.
// Items the app relies on (kind) can be renamed but keep their meaning.
const LISTS: { key: string; label: string; used: string }[] = [
  { key: 'source_promotion', label: 'Source of promotion', used: 'Enquiry and member forms, lists, reports' },
  { key: 'source_enquiry', label: 'Source of enquiry', used: 'Enquiry form and list' },
  { key: 'followup_type', label: 'Follow-up types', used: 'Follow-up dialog, dashboard, follow-up dashboard' },
  { key: 'followup_response', label: 'Follow-up responses', used: 'Follow-up dialog (open, successful, not interested)' },
  { key: 'convertibility', label: 'Convertibility', used: 'Follow-ups, enquiry filters' },
  { key: 'contact_type', label: 'Contact types', used: 'Follow-up dialog' },
  { key: 'quick_message', label: 'Quick messages', used: 'Follow-up to-do / comment' },
  { key: 'employment_status', label: 'Employment status', used: 'Enquiry and member forms' },
  { key: 'primary_tag', label: 'Primary tags', used: 'Enquiry and member forms' },
  { key: 'secondary_tag', label: 'Secondary tags', used: 'Enquiry and member forms' },
  { key: 'member_level', label: 'Member levels', used: 'Member form and filters' },
  { key: 'payment_mode', label: 'Payment modes', used: 'Billing, receipts, registers' },
  { key: 'expense_category', label: 'Expense categories', used: 'Expenses' },
  { key: 'expense_payment_type', label: 'Expense payment types', used: 'Expenses' },
  { key: 'trainer_type', label: 'Trainer types', used: 'Trainer form' },
  { key: 'staff_designation', label: 'Staff designations', used: 'Staff account form (Designation)' },
  { key: 'document_type', label: 'Document types', used: 'Member documents' },
  { key: 'appointment_purpose', label: 'Appointment purposes', used: 'Appointments' },
  { key: 'holiday_type', label: 'Holiday types', used: 'Holidays and events' },
  { key: 'facility', label: 'Facilities', used: 'Studio profile' },
]

const KIND_NOTE: Record<string, string> = {
  open: 'follows up again', successful: 'successful', not_interested: 'closes the enquiry', hot: 'hot', warm: 'warm', cold: 'cold', expected: 'expected',
  unpitched: 'unpitched', enquiry: 'used for new enquiries', renewal: 'renewal reminders', balance_due: 'balance reminders', birthday: 'birthday wishes',
  anniversary: 'anniversary wishes', irregular: 'irregular members', trial: 'trials', pt_renewal: 'PT renewals', pt_trial: 'PT trials', feedback: 'feedback',
  measurement: 'measurements', referral: 'referrals', freeze: 'freezes', ex_member: 'ex-members',
}

export default function Lists() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: lists, isLoading } = useLists()
  const [which, setWhich] = useState(LISTS[0].key)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const items = lists?.[which] ?? []
  const meta = LISTS.find((l) => l.key === which)!

  const refresh = () => qc.invalidateQueries({ queryKey: ['lists'] })
  const run = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ error: { message: string } | null }>) => { const r = await fn(); if (r.error) throw new Error(r.error.message) },
    onSuccess: refresh,
    onError: (e: Error) => toast(/duplicate/.test(e.message) ? 'That option is already in the list' : e.message),
  })

  const add = () => {
    const label = draft.trim()
    if (!label) return
    const sort = (items.at(-1)?.sort ?? 0) + 10
    run.mutate(() => supabase.from('list_items').insert({ studio_id: me.studioId, list: which, label, sort }))
    setDraft('')
  }
  const rename = (it: ListItem) => {
    const label = (editing[it.id] ?? '').trim()
    if (!label || label === it.label) return setEditing((e) => { const n = { ...e }; delete n[it.id]; return n })
    run.mutate(() => supabase.from('list_items').update({ label }).eq('id', it.id))
    setEditing((e) => { const n = { ...e }; delete n[it.id]; return n })
  }
  const move = (i: number, dir: -1 | 1) => {
    const a = items[i], b = items[i + dir]
    if (!a || !b) return
    run.mutate(async () => {
      const r1 = await supabase.from('list_items').update({ sort: b.sort }).eq('id', a.id)
      if (r1.error) return r1
      return supabase.from('list_items').update({ sort: a.sort }).eq('id', b.id)
    })
  }

  return (
    <>
      <PageHeader title="Dropdown lists" sub="Every dropdown in the app. Add, rename, reorder or hide options; hidden ones stay on old records." />
      <div className="grid grid-cols-1 gap-4 px-5 pt-5 lg:grid-cols-[280px_1fr] lg:px-8">
        <div className="lg:hidden"><Select ariaLabel="List" value={which} onChange={setWhich} options={LISTS.map((l) => ({ value: l.key, label: l.label }))} /></div>
        <nav aria-label="Lists" className="card hidden flex-col p-2 lg:flex">
          {LISTS.map((l) => (
            <button key={l.key} type="button" onClick={() => setWhich(l.key)} aria-current={which === l.key}
              className={`flex min-h-10 items-center justify-between rounded-lg border-0 px-3 text-left text-[14px] ${which === l.key ? 'bg-surface-2 font-semibold text-gold' : 'bg-transparent text-ink-soft hover:text-ink'}`}>
              {l.label}<span className="text-[12px] text-muted">{(lists?.[l.key] ?? []).filter((i) => i.active).length}</span>
            </button>
          ))}
        </nav>
        <section className="card flex flex-col gap-4 p-5" aria-labelledby="list-h">
          <div>
            <h2 id="list-h" className="m-0 text-[18px] font-bold">{meta.label}</h2>
            <p className="m-0 mt-1 text-[13px] text-muted">Used in: {meta.used}</p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
            <Field label="Add an option" id="new-opt" className="flex-1"><TextInput id="new-opt" small value={draft} onChange={setDraft} placeholder="Type a new option" /></Field>
            <button type="submit" className="btn-gold mt-auto min-h-10 px-4" disabled={!draft.trim()}><Icon name="plus" size={16} />Add</button>
          </form>
          {isLoading && <div className="text-muted" role="status">Loading…</div>}
          {!isLoading && items.length === 0 && <Notice>This list is empty. Add the first option above.</Notice>}
          <ol className="m-0 flex list-none flex-col p-0">
            {items.map((it, i) => (
              <li key={it.id} className="flex flex-wrap items-center gap-2 border-b border-line-soft py-2 last:border-0">
                <span className="w-7 text-right text-[12px] text-muted">{i + 1}</span>
                <div className="min-w-[180px] flex-1">
                  {editing[it.id] !== undefined ? (
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); rename(it) }}>
                      <TextInput small value={editing[it.id]} onChange={(v) => setEditing((x) => ({ ...x, [it.id]: v }))} />
                      <button type="submit" className="btn btn-sm">Save</button>
                    </form>
                  ) : (
                    <div className={`text-[14px] ${it.active ? '' : 'text-faint line-through'}`}>
                      {it.label}
                      {it.kind && <span className="ml-2 text-[12px] text-muted">({KIND_NOTE[it.kind] ?? it.kind})</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button type="button" className="icon-btn h-8 w-8" aria-label={`Move ${it.label} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="chevronRight" size={14} className="-rotate-90" /></button>
                  <button type="button" className="icon-btn h-8 w-8" aria-label={`Move ${it.label} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}><Icon name="chevronRight" size={14} className="rotate-90" /></button>
                  <button type="button" className="btn btn-sm" onClick={() => setEditing((x) => ({ ...x, [it.id]: it.label }))}>Rename</button>
                  <button type="button" className="btn btn-sm" onClick={() => run.mutate(() => supabase.from('list_items').update({ active: !it.active }).eq('id', it.id))}>{it.active ? 'Hide' : 'Show'}</button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  )
}
