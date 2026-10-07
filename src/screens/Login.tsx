import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { demoUsers, homeFor } from '../data/api'
import { setLanguage } from '../i18n'
import { useSession } from '../session'

export default function Login() {
  const { t, i18n } = useTranslation()
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState<string | null>(null)

  const open = (u: (typeof demoUsers)[number]) => {
    signIn({ role: u.role, name: u.name, initials: u.initials, staffId: u.staffId, memberId: u.memberId })
    navigate(homeFor(u.role), { replace: true })
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[440px] flex-col gap-7 overflow-hidden px-6 pt-16 pb-8">
      <div aria-hidden="true" className="absolute -top-[120px] -right-[120px] h-[360px] w-[360px] rounded-full border border-gold/20" />
      <div aria-hidden="true" className="absolute -top-[60px] -right-[60px] h-[240px] w-[240px] rounded-full border border-gold/15" />

      <div className="relative flex items-center justify-between">
        <img src="/icon-512.png" alt="Shaan Fitness" width="72" height="72" className="h-[72px] w-[72px] rounded-[18px] border border-line" />
        <div role="group" aria-label={t('common.language')} className="flex rounded-xl border border-line p-[3px]">
          {(['en', 'te'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={i18n.language === l} onClick={() => setLanguage(l)}
              className={`min-h-9 rounded-[10px] px-3 text-[12px] font-semibold ${i18n.language === l ? 'bg-ink text-ground' : 'text-muted'}`}>
              {l === 'en' ? 'EN' : 'తెలుగు'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col gap-3.5">
        <h1 className="title text-[46px] leading-[1.02]">{t('login.tagline')}</h1>
        <p className="m-0 text-[15px] leading-normal text-muted">{t('login.intro')}</p>
      </div>

      <form className="relative flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); setNote(t('login.demoNote')) }}>
        <label htmlFor="phone" className="text-[12px] font-semibold text-muted">{t('login.mobile')}</label>
        <div className="flex gap-2">
          <span className="inline-flex h-[54px] items-center rounded-[14px] border border-line-strong bg-surface px-3.5 font-semibold">+91</span>
          <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input h-[54px] min-w-0 flex-1 rounded-[14px] text-[17px] font-semibold tracking-wide" />
        </div>
        <button type="submit" className="btn-gold min-h-[54px] text-[15px]">{t('login.send')}</button>
        <p className="m-0 text-[12px] leading-normal text-muted">{note ?? t('login.codeNote')}</p>
      </form>

      <div className="flex-1" />

      <div className="relative flex flex-col gap-2.5">
        <div className="text-[11px] font-bold tracking-[.18em] text-muted uppercase">{t('login.demo')}</div>
        <div className="grid grid-cols-3 gap-2">
          {demoUsers.map((u) => (
            <button key={u.role} type="button" onClick={() => open(u)}
              className="min-h-11 rounded-xl border border-line text-[12px] font-semibold text-muted hover:border-gold hover:text-ink">
              {u.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
