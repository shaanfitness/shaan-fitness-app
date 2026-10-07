import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROLE_LABEL, useAuth, useMe } from '../auth'
import { usePlans, useStudio } from '../db/studio'
import { money } from '../lib/format'
import { setLanguage } from '../i18n'
import { GROUP_LABEL, THEMES, groupOf, useTheme, type ThemeGroup, type ThemeId } from '../theme'
import { useToast } from '../components/toast'
import { Avatar, Icon, PageHeader, Section } from '../components/ui'

// Profile and settings: language, look, the studio's default looks and rules, sign out.
export default function More() {
  const me = useMe()
  const { signOut, switchRole } = useAuth()
  const toast = useToast()
  const { t, i18n } = useTranslation()
  const isMember = me.role === 'member'
  const { data: studio } = useStudio()
  const { data: plans } = usePlans()
  const { theme, personal, defaults, setPersonal, setDefault } = useTheme()
  const s = studio?.settings
  const save = (p: Promise<void>, msg: string) => p.then(() => toast(msg)).catch((e: Error) => toast(e.message))

  return (
    <>
      <PageHeader title={isMember ? t('nav.profile') : 'Settings'} />
      <Section>
        <div className="card flex items-center gap-4 p-4">
          <Avatar name={me.name} size={52} gold />
          <div className="min-w-0 flex-1"><div className="text-[17px] font-bold">{me.name}</div><div className="text-[13px] text-muted">{ROLE_LABEL[me.role]}{me.email ? ` · ${me.email}` : ''}</div></div>
        </div>
        {me.roles.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {me.roles.map((r) => (
              <button key={r.role} type="button" aria-pressed={r.role === me.role} onClick={() => switchRole(r.role)}
                className={`min-h-11 rounded-xl border px-4 text-[13px] font-semibold ${r.role === me.role ? 'border-gold bg-gold text-on-gold' : 'border-line text-ink'}`}>
                Open as {ROLE_LABEL[r.role]}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('common.language')} id="lang-h">
        <div role="radiogroup" aria-labelledby="lang-h" className="grid max-w-[420px] grid-cols-2 gap-2.5">
          {(['en', 'te'] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={i18n.language === l} onClick={() => setLanguage(l)}
              className={`min-h-12 rounded-[14px] border text-[14px] font-semibold ${i18n.language === l ? 'border-gold bg-gold text-on-gold' : 'border-line text-ink'}`}>{l === 'en' ? 'English' : 'తెలుగు'}</button>
          ))}
        </div>
      </Section>

      <Section title="Look" id="look-h">
        <div role="radiogroup" aria-labelledby="look-h" className="grid max-w-[560px] grid-cols-3 gap-2.5">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const th = THEMES[id]
            const on = theme === id
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => save(setPersonal(id), 'Look saved')}
                className={`flex flex-col overflow-hidden rounded-2xl border-2 text-left ${on ? 'border-gold' : 'border-line'}`}>
                <span aria-hidden="true" className="flex h-[92px] flex-col justify-between p-2.5" style={{ background: th.ground }}>
                  <span className="text-[19px] leading-none" style={{ fontFamily: th.font, color: th.ink, fontWeight: id === 'club' ? 700 : 500 }}>Aa</span>
                  <span className="flex flex-col gap-1.5 rounded-lg p-1.5" style={{ background: th.surface, border: `1px solid ${id === 'clinic' ? '#E1E6EB' : '#2A2A30'}` }}>
                    <span className="h-1.5 w-3/5 rounded-full" style={{ background: th.ink, opacity: 0.5 }} />
                    <span className="h-3 rounded-[5px]" style={{ background: th.accent }} />
                  </span>
                </span>
                <span className="flex flex-col gap-0.5 bg-surface px-2.5 py-2">
                  <span className="text-[12px] leading-tight font-bold">{th.name}</span>
                  <span className="text-[11px] leading-tight text-muted">{th.note}</span>
                </span>
              </button>
            )
          })}
        </div>
        {personal && (
          <button type="button" className="self-start text-[13px] font-semibold text-gold" onClick={() => save(setPersonal(null), 'Using the studio default')}>
            Use the studio's default ({THEMES[defaults[groupOf(me.role)]].name})
          </button>
        )}
      </Section>

      {me.role === 'owner' && (
        <Section title="Default look for each login" id="defaults-h">
          <p className="m-0 text-[13px] text-muted">New people start with these. Everyone can still pick their own look.</p>
          <div className="card max-w-[640px] overflow-hidden">
            {(Object.keys(GROUP_LABEL) as ThemeGroup[]).map((g) => (
              <div key={g} className="row flex-wrap">
                <label htmlFor={`def-${g}`} className="min-w-[140px] flex-1 text-[14px] font-semibold">{GROUP_LABEL[g]}</label>
                <select id={`def-${g}`} className="input h-11 w-auto min-w-[170px]" value={defaults[g]} onChange={(e) => save(setDefault(g, e.target.value as ThemeId), 'Default look saved')}>
                  {(Object.keys(THEMES) as ThemeId[]).map((id) => <option key={id} value={id}>{THEMES[id].name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Section>
      )}

      {me.role === 'owner' && s && (
        <Section title="Studio rules" id="rules-h">
          <p className="m-0 text-[13px] text-muted">Every rule is a setting. The settings pages (plans, invoices and receipts, freezes) come next; <Link to="/settings/lists">dropdown lists</Link> are editable now.</p>
          <div className="card max-w-[720px] overflow-hidden text-[14px]">
            {plans?.map((p) => <div key={p.id} className="row"><span className="flex-1">{p.name}</span><span className="text-muted">{money(p.total_price)} · {p.session_count ?? 'unlimited'} sessions · {p.tenure_value} {p.tenure_unit}</span></div>)}
            <div className="row"><span className="flex-1">Invoice numbers</span><span className="text-muted">{s.invoice.prefix}0001, restart every {s.invoice.restart}</span></div>
            <div className="row"><span className="flex-1">Receipt numbers</span><span className="text-muted">{s.receipt.prefix}0001, restart every {s.receipt.restart}</span></div>
            <div className="row"><span className="flex-1">Member and enquiry codes</span><span className="text-muted">{s.member_code.prefix}0001 · {s.enquiry_code.prefix}0001</span></div>
            <div className="row"><span className="flex-1">GST</span><span className="text-muted">{s.gst.enabled ? `${s.gst.rate}%` : 'Off (not registered)'}</span></div>
            <div className="row"><span className="flex-1">About to expire</span><span className="text-muted">{s.about_to_expire_days} days before the end date</span></div>
          </div>
        </Section>
      )}

      <Section>
        <button type="button" className="btn max-w-[320px] justify-start" onClick={() => signOut()}><Icon name="logout" size={18} />{t('common.signOut')}</button>
      </Section>
    </>
  )
}
