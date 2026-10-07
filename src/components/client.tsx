import { Link } from 'react-router-dom'
import { telLink, waLink } from '../lib/format'
import { Icon } from './ui'

// "Name & Number" cell used across YDL lists: name (opens the client), code, phone with call and WhatsApp.
export const fullPhone = (cc: string | null | undefined, phone: string | null | undefined) =>
  phone ? `${(cc ?? '+91').trim()} ${phone}` : ''

export function ClientCell({ id, name, code, countryCode, phone }: { id: string; name: string; code?: string | null; countryCode?: string | null; phone?: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link to={`/clients/${id}/edit`} className="truncate font-semibold text-ink no-underline hover:text-gold">{name}</Link>
      <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
        {code && <span>{code}</span>}
        {phone && <span>{fullPhone(countryCode, phone)}</span>}
      </div>
    </div>
  )
}

export function ContactButtons({ countryCode, phone, message }: { countryCode?: string | null; phone?: string | null; message?: string }) {
  if (!phone) return null
  const full = `${(countryCode ?? '+91').replace(/\D/g, '')}${phone.replace(/\D/g, '')}`
  return (
    <div className="flex flex-none gap-1.5">
      <a className="icon-btn icon-sm" href={telLink(`+${full}`)} aria-label="Call"><Icon name="phone" size={16} /></a>
      <a className="icon-btn icon-sm" href={waLink(full, message)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" size={16} /></a>
    </div>
  )
}
