import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { setLanguage } from '../i18n'
import { Field, Notice, TextInput } from '../components/controls'

// Staff sign in with email and password. Members will sign in with a mobile
// number and one-time code once the SMS / WhatsApp sender is connected.
export default function Login() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    if (!email.trim() || !password) return setError('Enter your email and password.')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(/invalid/i.test(error.message) ? 'That email and password don’t match. Check them and try again.' : error.message)
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

      <form className="relative flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <Field label="Email" id="email"><TextInput id="email" type="email" inputMode="email" autoComplete="username" value={email} onChange={setEmail} /></Field>
        <Field label="Password" id="password"><TextInput id="password" type="password" autoComplete="current-password" value={password} onChange={setPassword} /></Field>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn-gold min-h-[54px] text-[15px]" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="m-0 text-[12px] leading-normal text-muted">Owner, front desk, coaches and doctors sign in here. Members sign in with their mobile number once the member app opens.</p>
      </form>
    </div>
  )
}
