import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from './ui'

// Form controls shared by the staff pages. Labels are always visible and tied to
// their control, required fields are marked, and errors sit under the field.

export interface Option { value: string; label: string }
export const opts = (labels: string[]): Option[] => labels.map((l) => ({ value: l, label: l }))

export function Field({ label, required, hint, error, children, id, className = '' }: {
  label: ReactNode; required?: boolean; hint?: ReactNode; error?: string | null; children: ReactNode; id?: string; className?: string
}) {
  return (
    <div className={`field min-w-0 ${className}`}>
      <label htmlFor={id}>{label}{required && <span className="text-red"> *</span>}</label>
      {children}
      {error ? <span className="text-[12px] text-red" role="alert">{error}</span> : hint ? <span className="text-[12px] text-faint">{hint}</span> : null}
    </div>
  )
}

export function Select({ id, value, onChange, options, placeholder, small, disabled, ariaLabel, className = '' }: {
  id?: string; value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string; small?: boolean; disabled?: boolean; ariaLabel?: string; className?: string
}) {
  return (
    <select id={id} aria-label={ariaLabel} className={`input ${small ? 'input-sm' : ''} ${className}`} value={value} disabled={disabled}
      onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function TextInput({ id, value, onChange, type = 'text', placeholder, small, inputMode, autoComplete, onBlur, maxLength, ariaLabel, className = '', disabled }: {
  id?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; small?: boolean
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal'; autoComplete?: string; onBlur?: () => void; maxLength?: number; ariaLabel?: string; className?: string; disabled?: boolean
}) {
  return (
    <input id={id} type={type} aria-label={ariaLabel} className={`input ${small ? 'input-sm' : ''} ${className}`} value={value} placeholder={placeholder} disabled={disabled}
      inputMode={inputMode} autoComplete={autoComplete} maxLength={maxLength} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} />
  )
}

export function TextArea({ id, value, onChange, placeholder, rows = 3 }: { id?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea id={id} className="input" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

export function Checkbox({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; id?: string }) {
  const auto = useId()
  return (
    <label htmlFor={id ?? auto} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[14px] text-ink">
      <input id={id ?? auto} type="checkbox" className="check" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function CheckboxGroup({ legend, options, values, onChange, columns = 2 }: {
  legend: string; options: Option[]; values: string[]; onChange: (v: string[]) => void; columns?: number
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[12px] font-semibold text-muted">{legend}</legend>
      <div className="grid gap-x-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <Checkbox key={o.value} label={o.label} checked={values.includes(o.value)}
            onChange={(on) => onChange(on ? [...values, o.value] : values.filter((v) => v !== o.value))} />
        ))}
      </div>
    </fieldset>
  )
}

export function RadioGroup({ legend, options, value, onChange, required, name }: {
  legend: string; options: Option[]; value: string; onChange: (v: string) => void; required?: boolean; name: string
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[12px] font-semibold text-muted">{legend}{required && <span className="text-red"> *</span>}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-[14px] font-semibold ${value === o.value ? 'border-gold bg-accent-tint text-ink' : 'border-line-strong text-muted'}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="check" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** A dropdown of checkboxes, for multi-select fields like batches. */
export function MultiSelect({ id, options, values, onChange, placeholder = 'Select', small }: {
  id?: string; options: Option[]; values: string[]; onChange: (v: string[]) => void; placeholder?: string; small?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const chosen = options.filter((o) => values.includes(o.value))
  return (
    <div ref={ref} className="relative">
      <button id={id} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}
        className={`input ${small ? 'input-sm' : ''} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${chosen.length ? 'text-ink' : 'text-faint'}`}>
          {chosen.length === 0 ? placeholder : chosen.length <= 2 ? chosen.map((c) => c.label).join(', ') : `${chosen.length} selected`}
        </span>
        <Icon name="chevronRight" size={16} className="rotate-90 text-muted" />
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" className="menu left-0 mt-1 max-h-72 w-full overflow-auto">
          {options.map((o) => (
            <label key={o.value} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[14px] hover:bg-surface-2">
              <input type="checkbox" className="check" checked={values.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...values, o.value] : values.filter((v) => v !== o.value))} />
              {o.label}
            </label>
          ))}
          {options.length === 0 && <div className="px-3 py-2 text-[13px] text-muted">Nothing to choose yet</div>}
        </div>
      )}
    </div>
  )
}

/** "Actions" button with a small menu; closes on outside click or Escape. */
export interface MenuAction { label: string; onClick?: () => void; href?: string; danger?: boolean; hidden?: boolean; external?: boolean }
export function ActionMenu({ actions, label = 'Actions', align = 'right', small = true }: { actions: MenuAction[]; label?: string; align?: 'left' | 'right'; small?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const visible = actions.filter((a) => !a.hidden)
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" className={`btn ${small ? 'btn-sm' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}<Icon name="chevronRight" size={14} className="rotate-90" />
      </button>
      {open && (
        <div role="menu" className={`menu mt-1 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {visible.map((a) => a.href ? (
            <a key={a.label} role="menuitem" href={a.href} target={a.external ? '_blank' : undefined} rel={a.external ? 'noreferrer' : undefined}
              className={a.danger ? 'danger' : ''} onClick={() => setOpen(false)}>{a.label}</a>
          ) : (
            <button key={a.label} role="menuitem" type="button" className={a.danger ? 'danger' : ''} onClick={() => { setOpen(false); a.onClick?.() }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success' | 'warn'; children: ReactNode }) {
  const cls = tone === 'error' ? 'border-red/40 text-red' : tone === 'success' ? 'border-green/40 text-green' : tone === 'warn' ? 'border-amber/40 text-amber' : 'border-line text-muted'
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-[13px] leading-normal ${cls}`}>{children}</div>
}
