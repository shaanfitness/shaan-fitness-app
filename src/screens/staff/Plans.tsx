import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { supabase } from '../../lib/supabase'
import { throwIf, usePlans, useServices, useStudio, useTeam } from '../../db/studio'
import type { Plan } from '../../db/types'
import { amt } from '../../db/billing'
import { downloadCsv } from '../../lib/csv'
import { ActionMenu, Checkbox, CheckboxGroup, Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../components/controls'
import { BulkBar } from '../../components/table'
import { useToast } from '../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../components/ui'

// YDL "Create Membership Plan" and "My Membership Plans" (Active Membership plans Listing).

const tenure = (p: Plan) => `${p.tenure_value} ${p.tenure_value === 1 ? p.tenure_unit.replace(/s$/, '') : p.tenure_unit}`

export function PlanList() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: plans = [], isLoading } = usePlans()
  const { data: services = [] } = useServices()
  const { data: studio } = useStudio()
  const team = useTeam()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [deactivated, setDeactivated] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<null | { action: 'delete' | 'deactivate' | 'activate'; ids: string[] }>(null)
  const [preview, setPreview] = useState<Plan | null>(null)
  const owner = me.role === 'owner'

  const rows = useMemo(() => plans.filter((p) => p.active === !deactivated
    && (!search || `${p.name} ${p.plan_code}`.toLowerCase().includes(search.toLowerCase()))
    && (!category || p.service_ids.includes(category))), [plans, deactivated, search, category])
  const groups: [string, Plan[]][] = [
    ['Free Trials Memberships', rows.filter((p) => p.is_free_trial)],
    ['Membership plans (General)', rows.filter((p) => !p.is_free_trial && p.kind === 'gym')],
    ['Membership Plans (Personalised)', rows.filter((p) => !p.is_free_trial && p.kind === 'pt')],
  ]
  const svc = (p: Plan) => services.filter((s) => p.service_ids.includes(s.id)).map((s) => s.custom_name ?? s.name).join(', ')

  const act = useMutation({
    mutationFn: async ({ action, ids }: { action: 'delete' | 'deactivate' | 'activate'; ids: string[] }) => {
      if (action === 'delete') {
        const used = throwIf(await supabase.from('subscriptions').select('plan_id').in('plan_id', ids).limit(1)) as unknown[]
        if (used.length) throw new Error('A plan that has been sold can’t be deleted. Deactivate it instead.')
        throwIf(await supabase.from('plans').delete().in('id', ids).select('id'))
      } else throwIf(await supabase.from('plans').update({ active: action === 'activate' }).in('id', ids).select('id'))
      return { action, n: ids.length }
    },
    onSuccess: ({ action, n }) => { qc.invalidateQueries({ queryKey: ['plans'] }); setSelected(new Set()); setConfirm(null); toast(`${n} ${n === 1 ? 'plan' : 'plans'} ${action === 'delete' ? 'deleted' : action + 'd'}`) },
    onError: (e: Error) => { setConfirm(null); toast(e.message) },
  })

  const exportCsv = () => downloadCsv(`membership-plans.csv`, selected.size ? rows.filter((r) => selected.has(r.id)) : rows, [
    ['Plan Name', (p) => p.name], ['Plan Code', (p) => p.plan_code], ['Type', (p) => (p.is_free_trial ? 'Free trial' : p.kind === 'pt' ? 'Personalised' : 'General')],
    ['Services', svc], ['Status', (p) => (p.active ? 'Active' : 'Deactivated')], ['Tenure', tenure], ['Price', (p) => p.price], ['Discount Price', (p) => p.discount_price],
    ['Total', (p) => p.total_price], ['Sessions', (p) => p.session_count], ['Freeze Days', (p) => p.freeze_days], ['Created by', (p) => team.name(p.created_by)],
  ])

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <>
      <PageHeader title={deactivated ? 'Deactivated Membership plans' : 'Active Membership plans Listing'} sub={`${studio?.name ?? ''}${studio?.branch_name ? ` (${studio.branch_name})` : ''}`}
        actions={<>
          <button type="button" className="btn btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export to CSV</button>
          {owner && <Link to="/plans/import" className="btn btn-sm">Import Membership</Link>}
          <button type="button" className="btn btn-sm" onClick={() => { setDeactivated(!deactivated); setSelected(new Set()) }}>{deactivated ? 'Active Plans' : 'Deactivated Plans'}</button>
          {owner && <Link to="/plans/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Create Membership</Link>}
        </>} />
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <TextInput small value={search} onChange={setSearch} placeholder="Search" className="pl-9" />
          </div>
          <Select small ariaLabel="Category" value={category} onChange={setCategory} placeholder="Select Category" options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} className="w-auto" />
        </div>
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <button type="button" className="btn btn-sm" onClick={exportCsv}>Export to CSV</button>
          {owner && <button type="button" className="btn btn-sm" onClick={() => setConfirm({ action: deactivated ? 'activate' : 'deactivate', ids: [...selected] })}>{deactivated ? 'Activate' : 'Deactivate'}</button>}
        </BulkBar>
        {isLoading ? <Loading /> : groups.map(([title, list]) => (
          <section key={title} className="flex flex-col gap-2">
            <h2 className="eyebrow">{title} ({list.length})</h2>
            {!list.length ? <div className="card px-5 py-5 text-[13px] text-muted">None.</div> : (
              <div className="card overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th style={{ width: 40 }} /><th>Plan Name</th><th>Plan Code</th><th>Fitness center</th><th>Services</th><th>Status</th><th>Tenure</th><th className="num">Price</th><th className="num">Discount Price</th><th>Created by</th><th>Action</th></tr></thead>
                  <tbody>{list.map((p) => (
                    <tr key={p.id}>
                      <td><input type="checkbox" className="check" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                      <td className="font-semibold"><button type="button" className="link-btn text-left text-ink" onClick={() => setPreview(p)}>{p.name}</button></td>
                      <td className="nowrap">{p.plan_code}</td>
                      <td>{studio?.name}{studio?.branch_name ? ` (${studio.branch_name})` : ''}</td>
                      <td className="max-w-[240px] text-[12px] text-muted">{svc(p)}</td>
                      <td>{p.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-muted">Deactivated</span>}</td>
                      <td className="nowrap">{tenure(p)}</td>
                      <td className="num">{amt(p.price)}</td>
                      <td className="num">{p.discount_price != null ? amt(p.discount_price) : '—'}</td>
                      <td>{team.name(p.created_by) ?? '—'}</td>
                      <td><ActionMenu actions={[
                        { label: 'View', onClick: () => setPreview(p) },
                        { label: 'Edit', hidden: !owner, onClick: () => navigate(`/plans/${p.id}/edit`) },
                        { label: p.active ? 'Deactivate' : 'Activate', hidden: !owner, onClick: () => setConfirm({ action: p.active ? 'deactivate' : 'activate', ids: [p.id] }) },
                        { label: 'Delete', danger: true, hidden: !owner, onClick: () => setConfirm({ action: 'delete', ids: [p.id] }) },
                      ]} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?">
        {confirm && <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px]">ARE YOU SURE YOU WANT TO {confirm.action.toUpperCase()} {confirm.ids.length === 1 ? 'THIS MEMBERSHIP PLAN' : `${confirm.ids.length} MEMBERSHIP PLANS`}?</p>
          <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={() => setConfirm(null)}>No</button>
            <button type="button" className={`flex-1 ${confirm.action === 'delete' ? 'btn btn-danger' : 'btn-gold'}`} disabled={act.isPending} onClick={() => act.mutate(confirm)}>Yes</button></div>
        </div>}
      </Sheet>
      <PlanPreview plan={preview} onClose={() => setPreview(null)} services={svc} trainers={(ids) => ids.map((i) => team.name(i)).filter(Boolean).join(', ')} />
    </>
  )
}

function PlanPreview({ plan: p, onClose, services, trainers }: { plan: Plan | null; onClose: () => void; services: (p: Plan) => string; trainers: (ids: string[]) => string }) {
  const rows: [string, string | null | undefined][] = p ? [
    ['Membership Plan Name', p.name], ['Plan Code', p.plan_code], ['Description', p.description], ['Category', services(p)],
    ['Show in App', p.show_in_app ? 'Yes' : 'No'], ['Assigned Trainers', trainers(p.trainer_ids) || '—'],
    ['Session Count', p.unlimited_sessions ? 'Unlimited' : p.session_count != null ? String(p.session_count) : '—'],
    ['Tenure', tenure(p)], ['Is One Time', p.is_one_time ? 'Yes' : 'No'], ['Freeze Days', String(p.freeze_days)],
    ['Weekly class limit', String(p.weekly_class_limit ?? 0)], ['Free Trial', p.is_free_trial ? 'Yes' : 'No'],
    ['Price', amt(p.price)], ['Discounted Price', p.discount_price != null ? amt(p.discount_price) : '—'], ['Total', amt(p.total_price)],
    ['Appointment Type', p.appointment_type], ['Terms & Condition', p.terms], ['FAQs', p.faqs], ['Guidelines', p.guidelines],
    ["Dos and Don'ts", p.dos_donts], ['Shopping List', p.shopping_list], ['Snack List', p.snack_list], ['Activities', p.activities], ['Other Text', p.other_text],
  ] : []
  return (
    <Sheet wide open={!!p} onClose={onClose} title="Membership Plan Preview">
      <dl className="m-0 grid grid-cols-[170px_1fr] gap-x-4 gap-y-2 text-[13px]">
        {rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="m-0 whitespace-pre-wrap">{v}</dd></div>)}
      </dl>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Create / edit a membership plan
// ---------------------------------------------------------------------------
const blank = {
  name: '', description: '', service_ids: [] as string[], show_in_app: '1', trainer_ids: [] as string[], session_count: '0', unlimited_sessions: false,
  disable_messages_followups: '0', terms: '', tenure_value: '', tenure_unit: 'months', is_one_time: false, freeze_days: '', weekly_class_limit: '0',
  is_free_trial: false, price: '', discount_price: '', app_sequence: '0', appointment_type: '', faqs: '', guidelines: '', dos_donts: '',
  shopping_list: '', snack_list: '', activities: '', other_text: '',
}

export function PlanForm() {
  const { id } = useParams()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: services = [] } = useServices()
  const team = useTeam()
  const editing = !!id
  const existing = useQuery({ queryKey: ['plans', 'one', id], enabled: editing, queryFn: async () => throwIf(await supabase.from('plans').select('*').eq('id', id!).single()) as Plan })
  const [f, setF] = useState(blank)
  const [optional, setOptional] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const p = existing.data
    if (!p) return
    setF({
      name: p.name, description: p.description ?? '', service_ids: p.service_ids, show_in_app: p.show_in_app ? '1' : '0', trainer_ids: p.trainer_ids,
      session_count: String(p.session_count ?? 0), unlimited_sessions: p.unlimited_sessions, disable_messages_followups: p.disable_messages_followups ? '1' : '0',
      terms: p.terms ?? '', tenure_value: String(p.tenure_value), tenure_unit: p.tenure_unit, is_one_time: p.is_one_time, freeze_days: String(p.freeze_days || ''),
      weekly_class_limit: String(p.weekly_class_limit ?? 0), is_free_trial: p.is_free_trial, price: String(p.price), discount_price: p.discount_price != null ? String(p.discount_price) : '',
      app_sequence: String(p.app_sequence), appointment_type: p.appointment_type ?? '', faqs: p.faqs ?? '', guidelines: p.guidelines ?? '', dos_donts: p.dos_donts ?? '',
      shopping_list: p.shopping_list ?? '', snack_list: p.snack_list ?? '', activities: p.activities ?? '', other_text: p.other_text ?? '',
    })
  }, [existing.data])
  const set = <K extends keyof typeof blank>(k: K) => (v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }))
  const total = f.discount_price !== '' ? Number(f.discount_price) : Number(f.price || 0)

  const save = useMutation({
    mutationFn: async (close: boolean) => {
      const row = {
        studio_id: me.studioId, name: f.name.trim(), description: f.description || null, service_ids: f.service_ids, show_in_app: f.show_in_app === '1',
        trainer_ids: f.trainer_ids, kind: f.trainer_ids.length ? 'pt' : 'gym',
        session_count: f.unlimited_sessions ? null : Number(f.session_count || 0) || null, unlimited_sessions: f.unlimited_sessions,
        disable_messages_followups: f.disable_messages_followups === '1', terms: f.terms || null,
        tenure_value: Number(f.tenure_value), tenure_unit: f.tenure_unit, is_one_time: f.is_one_time, freeze_days: Number(f.freeze_days || 0),
        weekly_class_limit: Number(f.weekly_class_limit || 0), is_free_trial: f.is_free_trial, price: Number(f.price || 0),
        discount_price: f.discount_price === '' ? null : Number(f.discount_price), app_sequence: Number(f.app_sequence || 0),
        appointment_type: f.appointment_type || null, faqs: f.faqs || null, guidelines: f.guidelines || null, dos_donts: f.dos_donts || null,
        shopping_list: f.shopping_list || null, snack_list: f.snack_list || null, activities: f.activities || null, other_text: f.other_text || null,
      }
      const res = editing
        ? throwIf(await supabase.from('plans').update(row).eq('id', id!).select('id').single())
        : throwIf(await supabase.from('plans').insert(row).select('id').single())
      return { close, id: (res as unknown as { id: string }).id }
    },
    onSuccess: ({ close, id: pid }) => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast(editing ? 'Plan saved' : 'Plan created')
      navigate(close ? '/plans' : `/plans/${pid}/edit`, { replace: true })
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = (close: boolean) => {
    setError(null)
    if (!f.name.trim()) return setError('Enter the membership plan name.')
    if (!f.service_ids.length) return setError('Select at least one category.')
    if (!Number(f.tenure_value)) return setError('Enter the membership plan tenure.')
    if (f.price === '' || Number(f.price) < 0) return setError('Enter the price.')
    if (f.discount_price !== '' && Number(f.discount_price) > Number(f.price)) return setError('The discounted price is more than the price.')
    save.mutate(close)
  }
  if (editing && existing.isLoading) return <Loading />
  const card = 'card flex flex-col gap-4 p-5'
  return (
    <>
      <PageHeader title={editing ? 'Edit Membership Plan' : 'Membership Plans'} sub="Basic Information"
        actions={<button type="button" className="btn btn-sm" aria-pressed={optional} onClick={() => setOptional(!optional)}>{optional ? 'Hide Optional Fields' : 'Show Optional Fields'}</button>} />
      <form className="flex flex-col gap-4 px-5 pt-5 pb-8 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
        <section className={card}>
          <Field label="Membership Plan Name" required id="pname"><TextInput id="pname" value={f.name} onChange={set('name')} placeholder="e.g. Platinum membership" /></Field>
          <Field label="Membership Plan Description" id="pdesc"><TextArea id="pdesc" value={f.description} onChange={set('description')} rows={3} /></Field>
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Membership category</h2>
          <p className="m-0 text-[13px] text-muted">Select the categories the membership is applicable for.</p>
          <CheckboxGroup legend="Category *" columns={3} values={f.service_ids} onChange={set('service_ids')} options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
          <RadioGroup name="showapp" legend="Show Membership in App" value={f.show_in_app} onChange={set('show_in_app')} options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]} />
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Assign Trainer</h2>
          <p className="m-0 text-[13px] text-muted">Select a trainer from below only if it's a personal training membership. Plans with trainers are listed as Personalised.</p>
          <Checkbox checked={team.trainers.length > 0 && f.trainer_ids.length === team.trainers.length} onChange={(on) => set('trainer_ids')(on ? team.trainers.map((t) => t.id) : [])} label="Select All" />
          <CheckboxGroup legend="Trainers" columns={3} values={f.trainer_ids} onChange={set('trainer_ids')} options={team.trainers.map((t) => ({ value: t.id, label: t.full_name }))} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Session Count" id="psess"><TextInput id="psess" type="number" value={f.session_count} onChange={set('session_count')} placeholder="Total Session Count" /></Field>
            <div className="flex items-end"><Checkbox checked={f.unlimited_sessions} onChange={set('unlimited_sessions')} label="Show Unlimited Sessions in App" /></div>
          </div>
          <RadioGroup name="nomsg" legend="Disable WhatsApp Messages & Follow-up" value={f.disable_messages_followups} onChange={set('disable_messages_followups')} options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]} />
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Terms &amp; Condition</h2>
          <Field label="Terms & Condition" id="pterms" hint="The provided terms will be shown to the customer during payment on the app."><TextArea id="pterms" value={f.terms} onChange={set('terms')} rows={4} /></Field>
        </section>
        <section className={card}>
          <h2 className="m-0 text-[16px] font-bold">Pricing &amp; Duration</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Membership Plan Tenure" required id="pten">
              <div className="flex gap-2"><TextInput id="pten" type="number" value={f.tenure_value} onChange={set('tenure_value')} placeholder="E.g. 3" />
                <Select ariaLabel="Tenure unit" value={f.tenure_unit} onChange={set('tenure_unit')} options={[{ value: 'months', label: 'Months' }, { value: 'years', label: 'Years' }, { value: 'days', label: 'Days' }]} className="w-[120px] flex-none" /></div>
            </Field>
            <div className="flex items-end"><Checkbox checked={f.is_one_time} onChange={set('is_one_time')} label="Is One Time" /></div>
            <Field label="Membership Plan Freeze Days" id="pfreeze"><TextInput id="pfreeze" type="number" value={f.freeze_days} onChange={set('freeze_days')} placeholder="E.g. 3" /></Field>
            <Field label="Weekly class limit" required id="plimit" hint="Provide limit for client he/she can book class in week."><TextInput id="plimit" type="number" value={f.weekly_class_limit} onChange={set('weekly_class_limit')} /></Field>
          </div>
          <Checkbox checked={f.is_free_trial} onChange={set('is_free_trial')} label="Free Trial (for new members, for the days specified)" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Price" required id="pprice"><TextInput id="pprice" type="number" value={f.price} onChange={set('price')} /></Field>
            <Field label="Discounted Price" id="pdisc"><TextInput id="pdisc" type="number" value={f.discount_price} onChange={set('discount_price')} /></Field>
            <Field label="Total" id="ptotal" hint="You can enter the sign up fee during subscription."><TextInput id="ptotal" value={amt(total)} onChange={() => {}} className="opacity-70" /></Field>
          </div>
        </section>
        <section className={`${card} ${optional ? '' : 'hidden'}`}>
          <Field label="Membership Plan Sequencing in App" required id="pseq"><TextInput id="pseq" type="number" value={f.app_sequence} onChange={set('app_sequence')} /></Field>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {([['faqs', 'FAQs'], ['guidelines', 'Guidelines'], ['dos_donts', "Dos and Don'ts"], ['shopping_list', 'Shopping List'], ['snack_list', 'Snack List'], ['activities', 'Activities'], ['other_text', 'Other Text']] as const).map(([k, l]) => (
              <Field key={k} label={l} id={`p-${k}`}><TextArea id={`p-${k}`} value={f[k]} onChange={set(k)} rows={3} /></Field>
            ))}
          </div>
          <Field label="Appointment Type" id="pappt" hint="Based upon appointment type, User can interact with trainer via live session.">
            <Select id="pappt" value={f.appointment_type} onChange={set('appointment_type')} placeholder="Select An Appointment Type"
              options={[{ value: 'daily', label: 'Daily' }, { value: 'alternate_day', label: 'Alternate Day' }, { value: 'every_third_day', label: 'Every Third Day' }, { value: 'once_a_week', label: 'Once A Week' }, { value: 'one_time', label: 'One Time' }]} />
          </Field>
        </section>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur lg:bottom-4">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Back</button>
          <div className="flex-1" />
          <button type="button" className="btn" disabled={save.isPending} onClick={() => submit(true)}>Save & Close</button>
          <button type="submit" className="btn-gold" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </>
  )
}
