import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPlans, getStudio, resetDemo } from '../data/api'
import { money } from '../lib/format'
import { setLanguage } from '../i18n'
import { useSession } from '../session'
import { GROUP_LABEL, THEMES, groupOf, useTheme, type ThemeGroup, type ThemeId } from '../theme'
import { Avatar, Icon, ScreenHeader, Section } from '../components/ui'

const roleLabel = { owner: 'Owner', front_desk: 'Front desk', coach: 'Coach', doctor: 'Doctor', member: 'Member' }

export default function More() {
  const { user, signOut } = useSession()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: studio } = useQuery({ queryKey: ['studio'], queryFn: getStudio })
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans })
  const { theme, personal, defaults, setPersonal, setDefault } = useTheme()
  if (!user) return null
  const s = studio?.settings

  return (
    <>
      <ScreenHeader title={user.role === 'member' ? t('nav.profile') : t('nav.more')} />
      <Section>
        <div className="card flex items-center gap-4 p-4">
          <Avatar name={user.name} size={52} gold />
          <div><div className="text-[17px] font-bold">{user.name}</div><div className="text-[13px] text-muted">{roleLabel[user.role]}</div></div>
        </div>
      </Section>

      <Section title={t('common.language')} id="lang-h">
        <div role="radiogroup" aria-labelledby="lang-h" className="grid grid-cols-2 gap-2.5">
          {(['en', 'te'] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={i18n.language === l} onClick={() => setLanguage(l)}
              className={`min-h-12 rounded-[14px] border text-[14px] font-semibold ${i18n.language === l ? 'border-gold bg-gold text-on-gold' : 'border-line text-ink'}`}>{l === 'en' ? 'English' : 'తెలుగు'}</button>
          ))}
        </div>
      </Section>

      <Section title="Look" id="look-h">
        <div role="radiogroup" aria-labelledby="look-h" className="grid grid-cols-3 gap-2.5">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const th = THEMES[id]
            const on = theme === id
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => setPersonal(id)}
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
          <button type="button" className="self-start text-[13px] font-semibold text-gold" onClick={() => setPersonal(null)}>
            Use the studio's default ({THEMES[defaults[groupOf(user.role)]].name})
          </button>
        )}
      </Section>

      {user.role === 'owner' && (
        <Section title="Default look for each login" id="defaults-h">
          <p className="m-0 text-[13px] text-muted">New people start with these. Everyone can still pick their own look.</p>
          <div className="card overflow-hidden">
            {(Object.keys(GROUP_LABEL) as ThemeGroup[]).map((g) => (
              <div key={g} className="row flex-wrap">
                <label htmlFor={`def-${g}`} className="min-w-[140px] flex-1 text-[14px] font-semibold">{GROUP_LABEL[g]}</label>
                <select id={`def-${g}`} className="input h-11 w-auto min-w-[170px]" value={defaults[g]} onChange={(e) => setDefault(g, e.target.value as ThemeId)}>
                  {(Object.keys(THEMES) as ThemeId[]).map((id) => <option key={id} value={id}>{THEMES[id].name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Section>
      )}

      {user.role === 'owner' && s && (
        <Section title="Studio rules" id="rules-h">
          <p className="m-0 text-[13px] text-muted">Every rule is a setting. Editing them arrives with the settings screens in the next build.</p>
          <div className="card overflow-hidden text-[14px]">
            {plans?.map((p) => <div key={p.id} className="row"><span className="flex-1">{p.name}</span><span className="text-muted">{money(p.price)} · {p.sessions} sessions · {p.duration_days} days</span></div>)}
            <div className="row"><span className="flex-1">Extensions</span><span className="text-muted">{s.extensions.max_per_cycle} per cycle, {s.extensions.days} days</span></div>
            <div className="row"><span className="flex-1">Freeze</span><span className="text-muted">{s.freeze.max_days ? `Up to ${s.freeze.max_days} days` : 'Off until you set it'}</span></div>
            <div className="row"><span className="flex-1">Unused sessions</span><span className="text-muted">{s.unused_sessions.mode === 'expire' ? 'Expire at cycle end' : s.unused_sessions.mode}</span></div>
            <div className="row"><span className="flex-1">Renewal reminder</span><span className="text-muted">{s.renewal_reminders.days_before.join(', ')} days before</span></div>
            <div className="row"><span className="flex-1">GST</span><span className="text-muted">{s.gst.enabled ? `${s.gst.rate}%` : 'Off (not registered)'}</span></div>
          </div>
        </Section>
      )}

      <Section>
        <button type="button" className="btn justify-start" onClick={() => { resetDemo(); qc.invalidateQueries() }}><Icon name="settings" size={18} />Reset demo data</button>
        <button type="button" className="btn justify-start" onClick={() => { signOut(); qc.clear(); navigate('/login', { replace: true }) }}><Icon name="logout" size={18} />{t('common.signOut')}</button>
      </Section>
    </>
  )
}
