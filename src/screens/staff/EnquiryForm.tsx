import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../auth'
import { findByCode, findByPhone, getClient, saveClient } from '../../db/clients'
import { useBatches, useLists, useServices, useTeam } from '../../db/studio'
import { fmtClock, localInput, localInputToIso, studioToday } from '../../lib/dates'
import { Checkbox, CheckboxGroup, Field, MultiSelect, Notice, RadioGroup, Select, TextArea, TextInput, opts } from '../../components/controls'
import { FollowUpDialog, FollowUpHistory, type FollowUpTarget } from '../../components/FollowUp'
import { useToast } from '../../components/toast'
import { Icon, PageHeader } from '../../components/ui'

// YDL "Enquiry form" (Enquiry basic information, Add follow up, Interested gym services
// & referral, Select a batch, Emergency contact), "Add Member" (Member Information, Member
// Status, Referral, Select a batch, Customer address, Guardian contact) and "Add Quick Member".
// A new member is saved as an enquiry until a membership is assigned, exactly like YDL.
export type ClientFormMode = 'enquiry' | 'member' | 'quick'

const blank = {
  first_name: '', last_name: '', email: '', country_code: '+91', phone: '', phone_withheld: false,
  add_alternate: false, alt_country_code: '+91', alt_phone: '', guardian_phone: '', date_of_birth: '',
  enquiry_date: studioToday(), added_by: '', gender: '', street1: '', street2: '', city: '', state: '', country: 'India', pincode: '',
  company_name: '', gst_number: '', aadhaar: '', aadhaar_last4: '', pan: '', source_promotion: '', source_enquiry: '',
  primary_tag: '', secondary_tag: '', trainer_id: '', ref_no: '',
  fu_stage: 'untapped', fu_type: 'Enquiry', fu_assign: '', fu_response: 'Open Follow up', fu_conv: '', fu_exp_date: '', fu_exp_amt: '',
  fu_next: localInput(1, 11), fu_contact: 'Phone', fu_notes: '', notes: '',
  referred_by_staff_id: '', member_lookup: '', referred_by_member_id: '', referred_by_label: '', third_party_referral: '',
  employment_status: '', occupation: '', interested_service_ids: [] as string[], batch_ids: [] as string[],
  emergency_first_name: '', emergency_last_name: '', emergency_email: '', emergency_phone: '', emergency_relationship: '',
}
type FormState = typeof blank

const PHONE_IN = /^[6-9]\d{9}$/
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GST = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EnquiryForm({ mode: modeProp }: { mode?: ClientFormMode }) {
  const { id } = useParams()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: lists } = useLists()
  const { data: services = [] } = useServices()
  const { data: batches = [] } = useBatches()
  const team = useTeam()
  const editing = !!id
  const existing = useQuery({ queryKey: ['clients', 'one', id], enabled: editing, queryFn: () => getClient(id!) })

  const [f, setF] = useState<FormState>({ ...blank, added_by: me.staffId ?? '', fu_assign: me.staffId ?? '' })
  const [showOptional, setShowOptional] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [dupes, setDupes] = useState<{ id: string; client_code: string; full_name: string }[]>([])
  const [confirmDupe, setConfirmDupe] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lookup, setLookup] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<FollowUpTarget | null>(null)
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    const d = existing.data
    if (!d) return
    const m = d.member
    setF((x) => ({
      ...x,
      first_name: m.first_name, last_name: m.last_name ?? '', email: m.email ?? '', country_code: m.country_code ?? '+91', phone: m.phone ?? '',
      phone_withheld: m.phone_withheld, add_alternate: !!m.alt_phone, alt_country_code: m.alt_country_code ?? '+91', alt_phone: m.alt_phone ?? '',
      guardian_phone: m.guardian_phone ?? '', date_of_birth: m.date_of_birth ?? '', enquiry_date: m.enquiry_date, added_by: m.added_by ?? '',
      gender: m.gender ?? '', street1: m.street1 ?? '', street2: m.street2 ?? '', city: m.city ?? '', state: m.state ?? '', country: m.country ?? '',
      pincode: m.pincode ?? '', company_name: d.billing?.company_name ?? '', gst_number: d.billing?.gst_number ?? '', pan: d.billing?.pan ?? '',
      aadhaar_last4: d.billing?.aadhaar_last4 ?? '', source_promotion: m.source_promotion ?? '', source_enquiry: m.source_enquiry ?? '',
      primary_tag: m.primary_tag ?? '', secondary_tag: m.secondary_tag ?? '', trainer_id: m.trainer_id ?? '', ref_no: m.ref_no ?? '', notes: m.notes ?? '',
      referred_by_staff_id: m.referred_by_staff_id ?? '', referred_by_member_id: m.referred_by_member_id ?? '', third_party_referral: m.third_party_referral ?? '',
      employment_status: m.employment_status ?? '', occupation: m.occupation ?? '', interested_service_ids: m.interested_service_ids ?? [],
      batch_ids: d.batchIds, emergency_first_name: m.emergency_first_name ?? '', emergency_last_name: m.emergency_last_name ?? '',
      emergency_email: m.emergency_email ?? '', emergency_phone: m.emergency_phone ?? '', emergency_relationship: m.emergency_relationship ?? '',
    }))
    setShowOptional(true)
  }, [existing.data])

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setF((x) => ({ ...x, [k]: v }))
  const label = (name: string) => opts((lists?.[name] ?? []).filter((i) => i.active).map((i) => i.label))
  const responses = (lists?.followup_response ?? []).filter((i) => i.active)
  const responseKind = responses.find((r) => r.label === f.fu_response)?.kind ?? 'open'
  const member = existing.data?.member
  const isMember = member?.kind === 'member'
  const mode: ClientFormMode = modeProp ?? (isMember ? 'member' : 'enquiry')
  const enq = mode === 'enquiry'
  const quick = mode === 'quick'

  const batchOptions = useMemo(() => batches.filter((b) => b.active).map((b) => ({
    value: b.id, label: `${fmtClock(b.start_time)} - ${fmtClock(b.end_time)} · ${b.name}`,
  })), [batches])

  const checkPhone = async () => {
    if (!f.phone) return setDupes([])
    setDupes(await findByPhone(me.studioId, `${f.country_code}${f.phone}`, id))
  }

  const lookupMember = async () => {
    const found = await findByCode(me.studioId, f.member_lookup)
    if (!found.length) { setLookup('No client found with that code or number.'); return }
    const m = found[0]
    setF((x) => ({ ...x, referred_by_member_id: m.id, referred_by_label: `${m.client_code} ${m.full_name}` }))
    setLookup(null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!f.first_name.trim()) e.first_name = 'Enter the first name'
    if (!f.phone_withheld) {
      const digits = f.phone.replace(/\D/g, '')
      if (!digits) e.phone = 'Enter the mobile number, or tick that the client won\'t share it'
      else if (f.country_code.trim() === '+91' && !PHONE_IN.test(digits)) e.phone = 'An Indian mobile number has 10 digits and starts with 6, 7, 8 or 9'
      else if (digits.length < 6 || digits.length > 15) e.phone = 'Check the mobile number'
    }
    if (f.add_alternate && f.alt_phone && f.alt_country_code.trim() === '+91' && !PHONE_IN.test(f.alt_phone.replace(/\D/g, ''))) e.alt_phone = 'Check the alternate number'
    if (f.email && !EMAIL.test(f.email.trim())) e.email = 'Check the email address'
    if (!f.gender) e.gender = 'Choose the gender'
    if (f.pan && !PAN.test(f.pan.trim().toUpperCase())) e.pan = 'A PAN looks like ABCDE1234F'
    if (f.gst_number && !GST.test(f.gst_number.trim().toUpperCase())) e.gst_number = 'A GST number has 15 characters, like 37ABCDE1234F1Z5'
    if (f.aadhaar && f.aadhaar.replace(/\D/g, '').length !== 12) e.aadhaar = 'An Aadhaar number has 12 digits'
    if (f.pincode && f.country.toLowerCase() === 'india' && !/^\d{6}$/.test(f.pincode)) e.pincode = 'A PIN code has 6 digits'
    if (!enq && !f.added_by) e.added_by = 'Choose the client rep'
    if (!editing && enq) {
      if (!f.fu_type) e.fu_type = 'Choose the follow-up type'
      if (!f.fu_assign) e.fu_assign = 'Choose who follows up'
      if (responseKind === 'open' && !f.fu_next) e.fu_next = 'Choose the next follow-up date'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (close: boolean, allowDupe = false) => {
    setFormError(null)
    if (!validate()) { setFormError('Please fix the fields marked below.'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        id: id ?? null, studio_id: me.studioId, kind: 'enquiry',
        first_name: f.first_name, last_name: f.last_name, email: f.email, country_code: f.country_code.trim(), phone: f.phone_withheld ? '' : f.phone.replace(/\D/g, ''),
        phone_withheld: f.phone_withheld, alt_country_code: f.add_alternate ? f.alt_country_code : '', alt_phone: f.add_alternate ? f.alt_phone.replace(/\D/g, '') : '',
        guardian_phone: f.guardian_phone, date_of_birth: f.date_of_birth || null, gender: f.gender || null, enquiry_date: f.enquiry_date || null,
        added_by: f.added_by || null, ref_no: f.ref_no, trainer_id: f.trainer_id || null, source_promotion: f.source_promotion, source_enquiry: f.source_enquiry,
        primary_tag: f.primary_tag, secondary_tag: f.secondary_tag, employment_status: f.employment_status, occupation: f.occupation,
        referred_by_staff_id: f.referred_by_staff_id || null, referred_by_member_id: f.referred_by_member_id || null, third_party_referral: f.third_party_referral,
        interested_service_ids: f.interested_service_ids, street1: f.street1, street2: f.street2, city: f.city, state: f.state, country: f.country, pincode: f.pincode,
        emergency_first_name: f.emergency_first_name, emergency_last_name: f.emergency_last_name, emergency_email: f.emergency_email,
        emergency_phone: f.emergency_phone, emergency_relationship: f.emergency_relationship, notes: f.notes,
        tapped: f.fu_stage === 'tapped',
        billing: { company_name: f.company_name, gst_number: f.gst_number, pan: f.pan, aadhaar: f.aadhaar },
        batch_ids: f.batch_ids,
        allow_duplicate_phone: allowDupe,
      }
      if (!editing && enq) {
        payload.follow_up = {
          type: f.fu_type, assigned_to: f.fu_assign, response: f.fu_response, convertibility: f.fu_conv || undefined,
          expected_date: f.fu_exp_date || undefined, expected_amount: f.fu_exp_amt ? Number(f.fu_exp_amt) : undefined,
          next_at: responseKind === 'open' ? localInputToIso(f.fu_next) : undefined, contact_type: f.fu_contact,
          notes: f.fu_notes.trim() || 'New enquiry',
        }
      }
      const savedId = await saveClient(payload)
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['followups'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast(editing ? 'Saved' : enq ? 'Enquiry added' : 'Member added. Assign a membership to make them a member.')
      setConfirmDupe(false)
      if (close) navigate(enq && !isMember ? '/enquiries' : '/members')
      else if (!editing) navigate(enq ? `/clients/${savedId}/edit` : `/clients/${savedId}`, { replace: true })
    } catch (e) {
      const msg = (e as Error).message
      if (msg.startsWith('DUPLICATE_PHONE')) { setConfirmDupe(true); setFormError(msg.replace('DUPLICATE_PHONE: ', '')) }
      else setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (editing && existing.isLoading) return <div className="px-8 py-10 text-muted" role="status">Loading…</div>
  if (editing && existing.error) return <div className="px-8 py-10"><Notice tone="error">{(existing.error as Error).message}</Notice></div>

  // Optional fields: always shown on the full forms, behind "Show optional fields" on the enquiry and quick forms.
  const opt = (show: boolean) => (!enq && !quick) || show || showOptional ? '' : 'hidden'
  const sectionCls = 'card flex flex-col gap-4 p-5'
  const grid = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
  const title = editing ? (enq ? 'Edit enquiry' : 'Member Information') : enq ? 'New enquiry' : quick ? 'Add Member Information' : 'Add Member'
  const staffOptions = team.staffAccounts.map((s) => ({ value: s.id, label: s.full_name }))
  const trainerOptions = team.trainers.map((s) => ({ value: s.id, label: `${s.full_name} (${s.staff_code})` }))

  const referral = (
    <>
      <Field label={enq ? 'Referral by trainer / employee' : 'Referral by'} id="refstaff">
        <Select id="refstaff" value={f.referred_by_staff_id} onChange={set('referred_by_staff_id')} placeholder="Referral by Trainer/Employee"
          options={team.everyone.map((s) => ({ value: s.id, label: s.full_name + (s.role === 'coach' ? ' (trainer)' : '') }))} />
      </Field>
      <Field label={enq ? 'Referred by member (code or mobile)' : 'OR Member Id'} id="refmem" hint={f.referred_by_label || undefined} error={lookup}>
        <div className="flex gap-2">
          <TextInput id="refmem" value={f.member_lookup} onChange={set('member_lookup')} placeholder="Enter Member Code" />
          <button type="button" className="btn btn-sm flex-none" onClick={lookupMember}>Lookup Member code</button>
        </div>
      </Field>
      {!quick && <Field label={enq ? 'Third party referral name' : 'OR Third Party Referral Name'} id="third"><TextInput id="third" value={f.third_party_referral} onChange={set('third_party_referral')} placeholder="Write Third Party Referral Name" /></Field>}
    </>
  )

  return (
    <>
      <PageHeader
        title={title}
        sub={editing ? `${member?.member_code ?? member?.enquiry_code ?? ''} · ${member?.full_name ?? ''}` : enq ? 'Enquiry basic information, follow-up, services, batch and emergency contact' : 'The member is added to your enquiries until you assign a membership'}
        actions={<>
          {editing && !enq && <Link to={`/clients/${id}`} className="btn btn-sm">Open profile</Link>}
          {editing && <button type="button" className="btn btn-sm" onClick={() => setFollowUp({ memberId: id!, memberName: member?.full_name ?? '', defaultType: isMember ? 'Feedback' : 'Enquiry' })}>Add follow up</button>}
          {editing && <button type="button" className="btn btn-sm" onClick={() => setHistory({ id: id!, name: member?.full_name ?? '' })}><Icon name="history" size={16} />Follow up history</button>}
          {(enq || quick) && <button type="button" className="btn btn-sm" aria-pressed={showOptional} onClick={() => setShowOptional(!showOptional)}>{showOptional ? 'Hide optional fields' : 'Show Optional Fields'}</button>}
        </>} />

      <form className="flex flex-col gap-4 px-5 pt-5 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(false) }}>
        <section className={sectionCls} aria-labelledby="basic-h">
          <h2 id="basic-h" className="m-0 text-[16px] font-bold">{enq ? 'Enquiry basic information' : 'Member Information'}</h2>
          <div className={grid}>
            <Field label="First name" required id="first" error={errors.first_name}><TextInput id="first" value={f.first_name} onChange={set('first_name')} autoComplete="off" /></Field>
            <Field label="Last name" id="last"><TextInput id="last" value={f.last_name} onChange={set('last_name')} autoComplete="off" /></Field>
            <Field label={enq ? 'Customer email' : 'Member Email'} id="email" error={errors.email}><TextInput id="email" type="email" inputMode="email" value={f.email} onChange={set('email')} autoComplete="off" placeholder="e.g. abc@gmail.com" /></Field>
            <Field label="Mobile number" required={!f.phone_withheld} id="mobile" error={errors.phone}>
              <div className="flex gap-2">
                <TextInput value={f.country_code} onChange={set('country_code')} className="w-[76px] flex-none" maxLength={5} />
                <TextInput id="mobile" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} onBlur={checkPhone} placeholder="e.g. 9876543210" />
              </div>
              {dupes.length > 0 && (
                <span className="text-[12px] text-amber" role="status">
                  Already in records: {dupes.map((d, i) => <span key={d.id}>{i ? ', ' : ''}<Link to={`/clients/${d.id}`}>{d.client_code} {d.full_name}</Link></span>)}
                </span>
              )}
            </Field>
            <div className="flex flex-col justify-end gap-1 pb-1">
              <Checkbox checked={f.phone_withheld} onChange={set('phone_withheld')} label="Customer reluctant to give Mobile Number." />
              <Checkbox checked={f.add_alternate} onChange={set('add_alternate')} label="Add an alternate mobile number" />
            </div>
            {f.add_alternate && (
              <Field label="Alternate mobile number" id="alt" error={errors.alt_phone}>
                <div className="flex gap-2">
                  <TextInput value={f.alt_country_code} onChange={set('alt_country_code')} className="w-[76px] flex-none" maxLength={5} />
                  <TextInput id="alt" type="tel" inputMode="tel" value={f.alt_phone} onChange={set('alt_phone')} />
                </div>
              </Field>
            )}
            {enq && <div className={opt(!!f.guardian_phone)}><Field label="Guardian contact mobile number" id="guardian"><TextInput id="guardian" type="tel" inputMode="tel" value={f.guardian_phone} onChange={set('guardian_phone')} /></Field></div>}
            <div className={enq ? opt(!!f.date_of_birth) : ''}><Field label="Date of birth" id="dob"><TextInput id="dob" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} /></Field></div>
            {!quick && <Field label="Enquiry date" required={!enq} id="edate"><TextInput id="edate" type="date" value={f.enquiry_date} onChange={set('enquiry_date')} /></Field>}
            <Field label={enq ? 'Created by' : 'Client Rep'} required={!enq} id="createdby" error={errors.added_by}>
              <Select id="createdby" value={f.added_by} onChange={set('added_by')} placeholder="Select staff" options={staffOptions} />
            </Field>
            <div className="sm:col-span-2 xl:col-span-1">
              <RadioGroup name="gender" legend="Gender" required value={f.gender} onChange={set('gender')}
                options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, ...(quick ? [] : [{ value: 'other', label: 'Other' }])]} />
              {errors.gender && <span className="text-[12px] text-red" role="alert">{errors.gender}</span>}
            </div>
            {enq && <Field label="Source of promotion" id="sp"><Select id="sp" value={f.source_promotion} onChange={set('source_promotion')} placeholder="Select source of promotion" options={label('source_promotion')} /></Field>}
            {enq && <Field label="Source of enquiry" id="se"><Select id="se" value={f.source_enquiry} onChange={set('source_enquiry')} placeholder="Select source of enquiry" options={label('source_enquiry')} /></Field>}
            {(isMember || !enq) && <div className={quick ? opt(!!f.ref_no) : ''}><Field label="Reference Number" id="refno"><TextInput id="refno" value={f.ref_no} onChange={set('ref_no')} /></Field></div>}
            {!quick && <div className={opt(!!(f.company_name || f.gst_number || f.pan || f.aadhaar_last4))}><Field label="Aadhaar Number" id="aadhaar" error={errors.aadhaar}
              hint={f.aadhaar_last4 ? `On file: XXXX XXXX ${f.aadhaar_last4}. Only the last 4 digits are kept.` : 'Only the last 4 digits are kept, for privacy.'}>
              <TextInput id="aadhaar" inputMode="numeric" value={f.aadhaar} onChange={set('aadhaar')} placeholder="e.g. 3675 9834 6012" maxLength={14} />
            </Field></div>}
            {!quick && <div className={opt(!!(f.company_name || f.gst_number || f.pan || f.aadhaar_last4))}><Field label="PAN Number" id="pan" error={errors.pan}><TextInput id="pan" value={f.pan} onChange={set('pan')} maxLength={10} placeholder="Enter Pan Number" /></Field></div>}
            <div className={opt(!!(f.company_name || f.gst_number || f.pan || f.aadhaar_last4))}><Field label="Customer GST Number" id="gst" error={errors.gst_number}><TextInput id="gst" value={f.gst_number} onChange={set('gst_number')} maxLength={15} placeholder="Eg. 22AAAAA0000A1Z5" /></Field></div>
            {!quick && <div className={opt(!!(f.company_name || f.gst_number || f.pan || f.aadhaar_last4))}><Field label="Customer Company Name" id="company"><TextInput id="company" value={f.company_name} onChange={set('company_name')} /></Field></div>}
            {!quick && <div className={enq ? opt(!!f.trainer_id) : ''}><Field label="Assign Trainer" id="trainer">
              <Select id="trainer" value={f.trainer_id} onChange={set('trainer_id')} placeholder="Assign Trainer" options={trainerOptions} />
            </Field></div>}
            {enq && <div className={opt(!!f.primary_tag)}><Field label="Primary tag" id="ptag"><Select id="ptag" value={f.primary_tag} onChange={set('primary_tag')} placeholder="Select primary tag" options={label('primary_tag')} /></Field></div>}
            {enq && <div className={opt(!!f.secondary_tag)}><Field label="Secondary tag" id="stag"><Select id="stag" value={f.secondary_tag} onChange={set('secondary_tag')} placeholder="Select secondary tag" options={label('secondary_tag')} /></Field></div>}
          </div>
          {quick && <Field label="Remarks/Summary" id="qremarks"><TextArea id="qremarks" value={f.notes} onChange={set('notes')} rows={3} /></Field>}

          {enq && <div className={`${grid} ${opt(!!(f.street1 || f.city))}`}>
            <Field label="Flat no., building name" id="s1"><TextInput id="s1" value={f.street1} onChange={set('street1')} /></Field>
            <Field label="Street, area" id="s2"><TextInput id="s2" value={f.street2} onChange={set('street2')} /></Field>
            <Field label="City" id="city"><TextInput id="city" value={f.city} onChange={set('city')} /></Field>
            <Field label="State" id="state"><TextInput id="state" value={f.state} onChange={set('state')} /></Field>
            <Field label="Country" id="country"><TextInput id="country" value={f.country} onChange={set('country')} /></Field>
            <Field label="PIN code" id="pin" error={errors.pincode}><TextInput id="pin" inputMode="numeric" value={f.pincode} onChange={set('pincode')} maxLength={10} /></Field>
          </div>}
        </section>

        {!enq && !editing && (
          <section className={sectionCls} aria-labelledby="status-h">
            <h2 id="status-h" className="m-0 text-[16px] font-bold">Member Status</h2>
            <Notice>The Member will be added to your Enquiry unless you assign a membership to the member.</Notice>
            <div className="text-[14px]"><span className="text-muted">Member Status <span className="text-red">*</span> </span><strong>New Enquiry</strong></div>
            {!quick && <Field label="Remarks/Summary" id="mremarks"><TextArea id="mremarks" value={f.notes} onChange={set('notes')} rows={4} /></Field>}
          </section>
        )}

        {enq && !editing && (
          <section className={sectionCls} aria-labelledby="fu-h">
            <h2 id="fu-h" className="m-0 text-[16px] font-bold">Add follow up</h2>
            <div className={grid}>
              <Field label="Follow-up stage" id="stage">
                <Select id="stage" value={f.fu_stage} onChange={set('fu_stage')} options={[{ value: 'tapped', label: 'Tapped' }, { value: 'untapped', label: 'Untapped' }]} />
              </Field>
              <Field label="Type of follow up" required id="futype" error={errors.fu_type}><Select id="futype" value={f.fu_type} onChange={set('fu_type')} options={label('followup_type')} /></Field>
              <Field label="Assign to" required id="fuassign" error={errors.fu_assign}>
                <Select id="fuassign" value={f.fu_assign} onChange={set('fu_assign')} placeholder="Select employee"
                  options={team.everyone.filter((s) => s.role !== 'doctor').map((s) => ({ value: s.id, label: `${s.full_name}${s.role === 'coach' ? ' (trainer)' : ''}` }))} />
              </Field>
              <Field label="Response" id="furesp"><Select id="furesp" value={f.fu_response} onChange={set('fu_response')} options={opts(responses.map((r) => r.label))} /></Field>
              <Field label="Convertibility" id="fuconv"><Select id="fuconv" value={f.fu_conv} onChange={set('fu_conv')} placeholder="Select the convertibility" options={label('convertibility')} /></Field>
              <Field label="Expected date" id="fuexpd"><TextInput id="fuexpd" type="date" value={f.fu_exp_date} onChange={set('fu_exp_date')} /></Field>
              <Field label="Expected amount (₹)" id="fuexpa"><TextInput id="fuexpa" type="number" inputMode="decimal" value={f.fu_exp_amt} onChange={set('fu_exp_amt')} /></Field>
              {responseKind === 'open' && (
                <Field label="Next follow up date" required id="funext" error={errors.fu_next}><TextInput id="funext" type="datetime-local" value={f.fu_next} onChange={set('fu_next')} /></Field>
              )}
              <Field label="Contact type" id="fucontact"><Select id="fucontact" value={f.fu_contact} onChange={set('fu_contact')} options={label('contact_type')} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label="To do / comment" id="funotes">
                <Select ariaLabel="Quick message" value="" placeholder="Quick message" options={label('quick_message')}
                  onChange={(v) => v && setF((x) => ({ ...x, fu_notes: x.fu_notes ? `${x.fu_notes} ${v}` : v }))} />
                <TextArea id="funotes" value={f.fu_notes} onChange={set('fu_notes')} placeholder="What was discussed, what to do next" />
              </Field>
              <Field label="Remarks / summary" id="remarks"><TextArea id="remarks" value={f.notes} onChange={set('notes')} rows={5} /></Field>
            </div>
          </section>
        )}
        {editing && (
          <section className={sectionCls} aria-labelledby="remarks-h">
            <h2 id="remarks-h" className="m-0 text-[16px] font-bold">Remarks</h2>
            <Field label="Remarks / summary" id="remarks2"><TextArea id="remarks2" value={f.notes} onChange={set('notes')} rows={4} /></Field>
          </section>
        )}

        {enq ? (
          <section className={`${sectionCls} ${opt(!!(f.referred_by_staff_id || f.referred_by_member_id || f.third_party_referral || f.interested_service_ids.length || f.occupation))}`} aria-labelledby="svc-h">
            <h2 id="svc-h" className="m-0 text-[16px] font-bold">Interested gym services & referral</h2>
            <div className={grid}>
              {referral}
              <Field label="Employment status" id="emp"><Select id="emp" value={f.employment_status} onChange={set('employment_status')} placeholder="Select" options={label('employment_status')} /></Field>
              <Field label="Occupation" id="occ"><TextInput id="occ" value={f.occupation} onChange={set('occupation')} /></Field>
            </div>
            <CheckboxGroup legend="Interested services" columns={3} values={f.interested_service_ids} onChange={set('interested_service_ids')}
              options={services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.custom_name ?? s.name }))} />
          </section>
        ) : (
          <section className={`${sectionCls} ${opt(!!(f.referred_by_staff_id || f.referred_by_member_id || f.source_promotion || f.employment_status))}`} aria-labelledby="ref-h">
            <h2 id="ref-h" className="m-0 text-[16px] font-bold">Referral</h2>
            <div className={grid}>
              {referral}
              <Field label="Source Promotion" id="msp"><Select id="msp" value={f.source_promotion} onChange={set('source_promotion')} placeholder="Unknown" options={label('source_promotion')} /></Field>
              {!quick && <Field label="Primary Tag" id="mptag"><Select id="mptag" value={f.primary_tag} onChange={set('primary_tag')} placeholder="Select Primary Tag" options={label('primary_tag')} /></Field>}
              {!quick && <Field label="Secondary Tag" id="mstag"><Select id="mstag" value={f.secondary_tag} onChange={set('secondary_tag')} placeholder="Select Secondary Tag" options={label('secondary_tag')} /></Field>}
              <Field label="Employment Status" id="memp"><Select id="memp" value={f.employment_status} onChange={set('employment_status')} placeholder="Unknown" options={label('employment_status')} /></Field>
              {quick && <Field label="Organization" id="qorg"><TextInput id="qorg" value={f.company_name} onChange={set('company_name')} /></Field>}
            </div>
          </section>
        )}

        <section className={`${sectionCls} ${opt(f.batch_ids.length > 0)}`} aria-labelledby="batch-h">
          <h2 id="batch-h" className="m-0 text-[16px] font-bold">Select A Batch</h2>
          <Field label="Batch" id="batches" hint="Choose one or more, or none">
            <MultiSelect id="batches" options={batchOptions} values={f.batch_ids} onChange={set('batch_ids')} placeholder="Select a batch (Select here for no batch.)" />
          </Field>
        </section>

        {!enq && (
          <section className={`${sectionCls} ${opt(!!(f.street1 || f.city))}`} aria-labelledby="addr-h">
            <h2 id="addr-h" className="m-0 text-[16px] font-bold">Customer Address</h2>
            <div className={grid}>
              <Field label="Address" id="ms1"><TextInput id="ms1" value={f.street1} onChange={set('street1')} placeholder="Flat No., Building name" /></Field>
              <Field label="Street, Area" id="ms2"><TextInput id="ms2" value={f.street2} onChange={set('street2')} placeholder="Street, Area" /></Field>
              <Field label="City" id="mcity"><TextInput id="mcity" value={f.city} onChange={set('city')} /></Field>
              <Field label="State" id="mstate"><TextInput id="mstate" value={f.state} onChange={set('state')} /></Field>
              <Field label="Country" id="mcountry"><TextInput id="mcountry" value={f.country} onChange={set('country')} /></Field>
              <Field label="Pincode" id="mpin" error={errors.pincode}><TextInput id="mpin" inputMode="numeric" value={f.pincode} onChange={set('pincode')} maxLength={10} /></Field>
            </div>
          </section>
        )}

        <section className={`${sectionCls} ${opt(!!(f.emergency_first_name || f.emergency_phone))}`} aria-labelledby="em-h">
          <h2 id="em-h" className="m-0 text-[16px] font-bold">Emergency contact</h2>
          <div className={grid}>
            <Field label={enq || quick ? 'First name' : 'Guardian Contact Name'} id="emf"><TextInput id="emf" value={f.emergency_first_name} onChange={set('emergency_first_name')} placeholder="First name" /></Field>
            <Field label="Last name" id="eml"><TextInput id="eml" value={f.emergency_last_name} onChange={set('emergency_last_name')} placeholder="Last name" /></Field>
            <Field label={enq || quick ? 'Mobile number' : 'Guardian Contact Mobile Number'} id="emp2"><TextInput id="emp2" type="tel" inputMode="tel" value={f.emergency_phone} onChange={set('emergency_phone')} placeholder="e.g. 9876543210" /></Field>
            <Field label={enq || quick ? 'Email' : 'Guardian Contact Email'} id="eme"><TextInput id="eme" type="email" value={f.emergency_email} onChange={set('emergency_email')} placeholder="e.g. abc@gmail.com" /></Field>
            <Field label={enq || quick ? 'Relation' : 'Relation with Guardian'} id="emr"><TextInput id="emr" value={f.emergency_relationship} onChange={set('emergency_relationship')} placeholder="e.g. Father" /></Field>
          </div>
        </section>

        {formError && <Notice tone="error">{formError}</Notice>}
        {confirmDupe && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">Save anyway, as a separate client?</span>
            <button type="button" className="btn btn-sm" onClick={() => submit(false, true)} disabled={saving}>Yes, save</button>
          </div>
        )}
        <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur lg:bottom-4">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Back</button>
          <div className="flex-1" />
          <button type="button" className="btn" disabled={saving} onClick={() => submit(true)}>Save & Close</button>
          <button type="submit" className="btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>

      <FollowUpDialog target={followUp} onClose={() => setFollowUp(null)} />
      <FollowUpHistory member={history} onClose={() => setHistory(null)} />
    </>
  )
}
