import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '../auth'
import { supabase } from '../lib/supabase'
import { useStudio } from '../db/studio'
import { Checkbox, MultiSelect, Notice, Select, TextArea, TextInput, type Option } from './controls'
import { useToast } from './toast'
import { Loading, PageHeader } from './ui'
import { uploadStudioMedia } from '../db/classes'
import { studioLine } from './crud'

// YDL settings pages ("Operations | Permissions" tables of Yes/No switches, ticks and fields).
// Each page lists its rows; values live in one section of the studio's settings.

export type SItemType = 'yesno' | 'check' | 'text' | 'number' | 'select' | 'multiselect' | 'textarea' | 'image'
export interface SItem { key: string; label?: string; type: SItemType; options?: Option[]; placeholder?: string; upper?: boolean; arrayValue?: string }
export interface SRow { label: string; hint?: string; later?: string; items: SItem[] }

export async function saveSection(studioId: string, section: string, p: Record<string, unknown>) {
  const res = await supabase.rpc('save_studio_section', { p_studio: studioId, p_section: section, p })
  if (res.error) throw new Error(res.error.message)
}

export function YesNo({ name, value, onChange, upper, label }: { name: string; value: boolean; onChange: (v: boolean) => void; upper?: boolean; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {[true, false].map((b) => (
        <label key={String(b)} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold ${value === b ? 'border-gold bg-accent-tint text-ink' : 'border-line-strong text-muted'}`}>
          <input type="radio" name={name} className="check" checked={value === b} onChange={() => onChange(b)} />
          {b ? (upper ? 'YES' : 'Yes') : (upper ? 'NO' : 'No')}
        </label>
      ))}
    </div>
  )
}

export function SettingsRows({ rows, values, set, idPrefix }: { rows: SRow[]; values: Record<string, unknown>; set: (k: string, v: unknown) => void; idPrefix: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="hidden grid-cols-[minmax(220px,0.9fr)_2fr] border-b border-line bg-surface-2 text-[11px] font-bold tracking-[.06em] text-muted uppercase md:grid">
        <div className="px-4 py-2.5">Operations</div><div className="px-4 py-2.5">Permissions</div>
      </div>
      {rows.map((r, i) => (
        <div key={r.label + i} className="grid gap-2 border-b border-line-soft px-4 py-3.5 last:border-b-0 md:grid-cols-[minmax(220px,0.9fr)_2fr] md:gap-0 md:px-0">
          <div className="flex flex-col gap-1 md:px-4">
            <span className="text-[14px] font-bold">{r.label}</span>
            {r.hint && <span className="text-[12px] text-faint">{r.hint}</span>}
            {r.later && <span className="chip chip-muted self-start" title={r.later}>{r.later}</span>}
          </div>
          <div className="flex flex-col gap-3 md:px-4">
            {r.items.map((it) => {
              const id = `${idPrefix}-${it.key}${it.arrayValue ? `-${it.arrayValue}` : ''}`
              const v = values[it.key]
              const label = it.label ?? r.label
              let control: ReactNode
              if (it.type === 'yesno') control = <YesNo name={id} label={label} upper={it.upper} value={v === true} onChange={(x) => set(it.key, x)} />
              else if (it.type === 'check') {
                const on = it.arrayValue ? Array.isArray(v) && v.includes(it.arrayValue) : v === true
                control = <Checkbox id={id} checked={on} label={it.label ?? ''} onChange={(x) => set(it.key, it.arrayValue
                  ? (x ? [...((v as string[]) ?? []), it.arrayValue] : ((v as string[]) ?? []).filter((y) => y !== it.arrayValue)) : x)} />
                return <div key={id}>{control}</div>
              } else if (it.type === 'select') control = <Select id={id} ariaLabel={label} value={String(v ?? '')} onChange={(x) => set(it.key, x || null)} options={it.options ?? []} placeholder={it.placeholder ?? 'Select'} />
              else if (it.type === 'multiselect') control = <MultiSelect id={id} values={(v as string[]) ?? []} onChange={(x) => set(it.key, x)} options={it.options ?? []} placeholder={it.placeholder} />
              else if (it.type === 'image') control = <ImagePick id={id} value={(v as string | null) ?? null} onChange={(x) => set(it.key, x)} />
              else if (it.type === 'textarea') control = <TextArea id={id} value={String(v ?? '')} onChange={(x) => set(it.key, x)} placeholder={it.placeholder} rows={4} />
              else control = <TextInput id={id} type={it.type === 'number' ? 'number' : 'text'} value={v === null || v === undefined ? '' : String(v)} placeholder={it.placeholder}
                onChange={(x) => set(it.key, it.type === 'number' ? (x === '' ? null : Number(x)) : x === '' ? null : x)} />
              return (
                <div key={id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  {it.label && it.type !== 'yesno' ? <label htmlFor={id} className="min-w-[180px] text-[13px] text-ink-soft">{it.label}</label>
                    : it.label ? <span className="min-w-[180px] text-[13px] text-ink-soft">{it.label}</span> : null}
                  <div className="min-w-0 flex-1">{control}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Picks a picture and uploads it straight away (public studio pictures: banners). */
function ImagePick({ id, value, onChange }: { id: string; value: string | null; onChange: (url: string | null) => void }) {
  const me = useMe()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <input id={id} type="file" accept="image/*" className="input pt-2.5" disabled={busy} onChange={async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        setBusy(true); setError(null)
        try { onChange(await uploadStudioMedia(me.studioId, 'app', f)) } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
      }} />
      {busy && <span className="text-[12px] text-muted">Uploading…</span>}
      {error && <span className="text-[12px] text-red">{error}</span>}
      {value && (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-16 w-auto max-w-[200px] rounded-lg border border-line object-cover" />
          <button type="button" className="link-btn text-[13px]" onClick={() => onChange(null)}>Remove</button>
        </div>
      )}
    </div>
  )
}

/** A whole settings page for one section, with a Save button. */
export function SettingsPage({ title, section, rows, intro, extra }: { title: string; section: string; rows: SRow[]; intro?: ReactNode; extra?: ReactNode }) {
  const { data: studio } = useStudio()
  if (!studio) return <Loading />
  return <SettingsPageInner key={studio.id} title={title} section={section} rows={rows} intro={intro} extra={extra}
    initial={((studio.settings as unknown as Record<string, Record<string, unknown>>)[section]) ?? {}} sub={studioLine(studio)} />
}

function SettingsPageInner({ title, section, rows, intro, extra, initial, sub }: { title: string; section: string; rows: SRow[]; intro?: ReactNode; extra?: ReactNode; initial: Record<string, unknown>; sub: string }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setError(null); setBusy(true)
    try {
      await saveSection(me.studioId, section, values)
      await Promise.all([qc.invalidateQueries({ queryKey: ['studio'] }), qc.invalidateQueries({ queryKey: ['site'] })])
      toast(`${title} saved`)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title={title} sub={sub} actions={<button type="button" className="btn-gold min-h-10 px-6" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>} />
      <div className="flex max-w-[1100px] flex-col gap-4 px-5 pt-5 pb-10 lg:px-8">
        {intro}
        <SettingsRows rows={rows} values={values} set={(k, v) => setValues((o) => ({ ...o, [k]: v }))} idPrefix={section} />
        {extra}
        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className="btn-gold self-start px-8" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </>
  )
}
