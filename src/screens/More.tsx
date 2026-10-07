import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPlans, getStudio, resetDemo } from '../data/api'
import { money } from '../lib/format'
import { setLanguage } from '../i18n'
import { useSession } from '../session'
import { Avatar, Icon, ScreenHeader, Section } from '../components/ui'

const roleLabel = { owner: 'Owner', front_desk: 'Front desk', coach: 'Coach', doctor: 'Doctor', member: 'Member' }

export default function More() {
  const { user, signOut } = useSession()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: studio } = useQuery({ queryKey: ['studio'], queryFn: getStudio })
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans })
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
