import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../../auth'
import { useStudio } from '../../../db/studio'
import { MAIN_MEASUREMENTS, MEASUREMENT_LABELS } from '../../../db/center'
import {
  deleteMeasurement, measurementUnit, memberMeasurements, memberPhotos, photoLink, saveMeasurement, TEXT_MEASUREMENTS, uploadProgressPhoto,
  type Measurement,
} from '../../../db/training'
import { fmtDay, studioToday } from '../../../lib/dates'
import { Field, Notice, TextInput } from '../../../components/controls'
import { useToast } from '../../../components/toast'
import { LineChart } from '../analysis/kit'
import { n1 } from './common'

// Body measurements and progress photos, shared by the client profile (staff) and the member app.

const IMAGES = new Set(['image', 'image_two', 'image_three'])
const DEFAULT_KEYS = ['weight_kg', 'height', 'general_body_fat', 'muscle_mass', 'visceral_fat', 'chest', 'waist', 'hips', 'upper_arm', 'thighs']

/** The fields the studio's Measurement Settings ask for, in their order (weight first). */
export function useMeasurementKeys() {
  const { data: studio } = useStudio()
  return useMemo(() => {
    const items = ((studio?.settings as unknown as { measurements?: { key: string; order: number; on: boolean }[] })?.measurements ?? [])
    const on = items.filter((i) => i.on && !IMAGES.has(i.key) && i.key !== 'bmi').sort((a, b) => a.order - b.order).map((i) => i.key)
    const keys = on.length ? on : DEFAULT_KEYS
    return ['weight_kg', ...keys.filter((k) => k !== 'weight_kg')]
  }, [studio])
}
export const mLabel = (k: string) => MEASUREMENT_LABELS[k] ?? k.replace(/_/g, ' ')
const withUnit = (k: string, v: unknown) => {
  if (v === undefined || v === null || v === '') return '-'
  if (TEXT_MEASUREMENTS.has(k)) return String(v)
  const u = measurementUnit(k)
  return `${n1(v)}${u === '%' ? '%' : u ? ` ${u}` : ''}`
}

export function useMeasurements(memberId: string) {
  return useQuery({ queryKey: ['measurements', memberId], queryFn: () => memberMeasurements(memberId), enabled: !!memberId })
}

/** Add a measurement: the studio's fields, the date, a note and up to three photos. */
export function MeasurementForm({ memberId, onDone }: { memberId: string; onDone: () => void }) {
  const { t } = useTranslation()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const keys = useMeasurementKeys()
  const today = studioToday()
  const [date, setDate] = useState(today)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const main = keys.filter((k) => MAIN_MEASUREMENTS.includes(k))
  const extra = keys.filter((k) => !MAIN_MEASUREMENTS.includes(k))
  const save = useMutation({
    mutationFn: async () => {
      const photos: string[] = []
      for (const f of files) photos.push(await uploadProgressPhoto(me.studioId, memberId, f))
      return saveMeasurement({ member_id: memberId, measured_on: date, values: vals, note: note.trim() || undefined, photos })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['measurements', memberId] }); qc.invalidateQueries({ queryKey: ['progress-photos', memberId] })
      toast(t('plan.saved')); onDone()
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = () => {
    setError(null)
    if (!date || date > today) return setError(t('plan.badDate'))
    for (const [k, v] of Object.entries(vals)) if (v.trim() && !TEXT_MEASUREMENTS.has(k) && !(Number(v) >= 0)) return setError(t('plan.badNumber', { what: mLabel(k) }))
    if (!Object.values(vals).some((v) => v.trim()) && !files.length) return setError(t('plan.enterOne'))
    if (files.some((f) => !f.type.startsWith('image/') || f.size > 8 * 1024 * 1024)) return setError(t('plan.badPhoto'))
    save.mutate()
  }
  const input = (k: string) => (
    <Field key={k} label={`${mLabel(k)}${measurementUnit(k) && !TEXT_MEASUREMENTS.has(k) ? ` (${measurementUnit(k)})` : ''}`} id={`ms-${k}`}>
      <TextInput id={`ms-${k}`} type={TEXT_MEASUREMENTS.has(k) ? 'text' : 'number'} inputMode={TEXT_MEASUREMENTS.has(k) ? 'text' : 'decimal'}
        value={vals[k] ?? ''} onChange={(v) => setVals((o) => ({ ...o, [k]: v }))} placeholder={k === 'blood_presure' ? '120/80' : ''} />
    </Field>
  )
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Field label={t('plan.date')} id="ms-date"><TextInput id="ms-date" type="date" value={date} onChange={setDate} /></Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{main.map(input)}</div>
      {extra.length > 0 && (
        <details className="rounded-xl border border-line p-3" open={extra.length <= 6}>
          <summary className="cursor-pointer text-[14px] font-semibold">{t('plan.moreMeasurements')}</summary>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{extra.map(input)}</div>
        </details>
      )}
      <Field label={t('plan.note')} id="ms-note"><TextInput id="ms-note" value={note} onChange={setNote} /></Field>
      <Field label={t('plan.photos')} id="ms-photos" hint={t('plan.photosHint')}>
        <input id="ms-photos" type="file" accept="image/*" multiple className="input py-2" onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 3))} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>{t('plan.close')}</button>
        <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? t('plan.saving') : t('plan.save')}</button>
      </div>
    </form>
  )
}

/** Weight over time (oldest first). */
export function WeightChart({ rows }: { rows: Measurement[] }) {
  const { t } = useTranslation()
  const pts = rows.filter((m) => m.weight_kg != null).slice(0, 60).reverse()
  if (pts.length < 2) return <p className="m-0 text-[13px] text-muted">{t('plan.chartLater')}</p>
  return (
    <LineChart fit caption={t('plan.weightChart')} labels={pts.map((m) => fmtDay(m.measured_on, 'd MMM'))} titles={pts.map((m) => fmtDay(m.measured_on))}
      series={[{ name: t('plan.weight'), values: pts.map((m) => Number(m.weight_kg)) }]} format={(n) => `${n1(n)} kg`} height={200} />
  )
}

/** The latest value of each measurement, with the change since the first one. */
export function LatestValues({ rows }: { rows: Measurement[] }) {
  const { t } = useTranslation()
  const keys = useMeasurementKeys()
  if (!rows.length) return null
  const latest: Record<string, { v: number | string; first: number | string }> = {}
  for (const m of [...rows].reverse()) {
    for (const [k, v] of Object.entries(m.vals)) {
      latest[k] = { v, first: latest[k]?.first ?? v }
    }
  }
  const shown = [...keys, 'bmi'].filter((k) => latest[k] !== undefined && k !== 'deviation_note')
  return (
    <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {shown.map((k) => {
        const { v, first } = latest[k]
        const diff = typeof v === 'number' || !Number.isNaN(Number(v)) ? Number(v) - Number(first) : 0
        return (
          <div key={k} className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="text-[12px] text-muted">{mLabel(k)}</dt>
            <dd className="m-0 text-[16px] font-bold">{withUnit(k, v)}
              {diff !== 0 && !TEXT_MEASUREMENTS.has(k) && <span className="ml-1.5 text-[12px] font-normal text-muted">{diff > 0 ? '+' : ''}{n1(diff)} {t('plan.sinceFirst')}</span>}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** Every measurement, newest first. */
export function MeasurementHistory({ memberId, rows, canDelete, byName }: {
  memberId: string; rows: Measurement[]; canDelete: (m: Measurement) => boolean
  /** Staff pages name who recorded each entry; the member app says "by the gym" or "by you". */
  byName?: (staffId: string | null) => string
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const keys = useMeasurementKeys()
  const [open, setOpen] = useState<string | null>(null)
  const del = useMutation({
    mutationFn: deleteMeasurement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['measurements', memberId] }); qc.invalidateQueries({ queryKey: ['progress-photos', memberId] }); toast(t('plan.deleted')) },
    onError: (e: Error) => toast(e.message),
  })
  if (!rows.length) return <p className="m-0 text-[14px] text-muted">{t('plan.noMeasurements')}</p>
  const cols = ['weight_kg', 'bmi', 'general_body_fat', 'waist'].filter((k) => rows.some((m) => m.vals[k] !== undefined))
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <caption className="sr-only">{t('plan.history')}</caption>
        <thead><tr><th>{t('plan.date')}</th>{cols.map((k) => <th key={k} className="num">{mLabel(k)}</th>)}<th>{t('plan.more')}</th><th>{t('plan.note')}</th><th /></tr></thead>
        <tbody>{rows.map((m) => {
          const others = Object.keys(m.vals).filter((k) => !cols.includes(k))
          return (
            <tr key={m.id}>
              <td className="nowrap">{fmtDay(m.measured_on)}<div className="text-[11px] text-faint">{byName ? byName(m.recorded_by) : m.recorded_by ? t('plan.byGym') : t('plan.bySelf')}</div></td>
              {cols.map((k) => <td key={k} className="num nowrap">{withUnit(k, m.vals[k])}</td>)}
              <td>{others.length ? (
                open === m.id
                  ? <ul className="m-0 list-none p-0 text-[12px]">{[...keys, ...others].filter((k, i, a) => others.includes(k) && a.indexOf(k) === i).map((k) => <li key={k}>{mLabel(k)}: {withUnit(k, m.vals[k])}</li>)}</ul>
                  : <button type="button" className="link-btn text-[13px]" onClick={() => setOpen(m.id)}>{t('plan.showMore', { count: others.length })}</button>
              ) : '-'}</td>
              <td className="text-[13px]">{m.note ?? ''}</td>
              <td>{canDelete(m) && <button type="button" className="btn btn-sm btn-danger" disabled={del.isPending} onClick={() => { if (window.confirm(t('plan.confirmDelete'))) del.mutate(m.id) }}>{t('plan.delete')}</button>}</td>
            </tr>
          )
        })}</tbody>
      </table>
    </div>
  )
}

/** Progress photos (only the owner, the client's coach or doctor, and the client can open them). */
export function ProgressPhotos({ memberId }: { memberId: string }) {
  const { t } = useTranslation()
  const photos = useQuery({ queryKey: ['progress-photos', memberId], queryFn: () => memberPhotos(memberId) })
  const links = useQuery({
    queryKey: ['progress-photo-links', memberId, photos.data?.map((p) => p.id).join(',')], enabled: !!photos.data?.length, staleTime: 50 * 60_000,
    queryFn: async () => Promise.all(photos.data!.slice(0, 24).map(async (p) => ({ ...p, url: await photoLink(p.path).catch(() => '') }))),
  })
  if (photos.isLoading) return null
  if (!photos.data?.length) return <p className="m-0 text-[13px] text-muted">{t('plan.noPhotos')}</p>
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-6">
      {(links.data ?? []).map((p) => (
        <li key={p.id} className="flex flex-col gap-1">
          {p.url ? <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={t('plan.photoOf', { date: fmtDay(p.created_at) })} className="aspect-[3/4] w-full rounded-lg object-cover" loading="lazy" /></a>
            : <div className="aspect-[3/4] rounded-lg bg-surface-2" />}
          <span className="text-[11px] text-muted">{fmtDay(p.created_at)}</span>
        </li>
      ))}
    </ul>
  )
}
