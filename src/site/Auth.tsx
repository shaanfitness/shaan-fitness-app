import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { digitsOnly, prettyPhone, telLink, useSite, whatsappLink } from '../db/site'
import { money } from '../lib/format'
import { Field, Notice, Select, TextInput } from '../components/controls'
import { Icon } from '../components/ui'
import { LangToggle, Wordmark, useSiteLook } from './chrome'
import { PRIVACY_VERSION } from './Privacy'
import { planDuration } from './Website'

// Sign in, join and password pages: one for everyone. After signing in, the app sends each
// person to their own place (members to the app, coaches to their day, staff to the CRM).
type T = (k: string, o?: Record<string, unknown>) => string

function authError(msg: string, t: T) {
  if (/not authorized/i.test(msg)) return t('auth.cantEmail')
  if (/rate limit|too many|security purposes/i.test(msg)) return t('auth.tooMany')
  if (/already registered|already exists/i.test(msg)) return t('auth.exists')
  if (/password should|weak password/i.test(msg)) return t('auth.errPwd')
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(msg)) return t('auth.errEmail')
  return msg
}

const origin = () => window.location.origin

export function AuthFrame({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  const { t } = useTranslation()
  useSiteLook()
  useEffect(() => { document.title = `${title} · Shaan Fitness` }, [title])
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 55% at 30% 60%, color-mix(in srgb, var(--color-gold) 24%, transparent), transparent 72%)' }} />
        <div className="relative"><Wordmark /></div>
        <div className="relative flex flex-col gap-6">
          <p className="headline text-[76px]">{t('login.tagline')}</p>
          <p className="m-0 text-[18px] font-semibold text-ink">{t('auth.sideTitle')}</p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px] text-ink-soft">
            {(['side1', 'side2', 'side3'] as const).map((k) => (
              <li key={k} className="flex items-start gap-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />{t(`auth.${k}`)}</li>
            ))}
          </ul>
        </div>
        <Link to="/" className="relative text-[14px] font-semibold no-underline">← {t('auth.backToSite')}</Link>
      </aside>
      <main className="flex min-h-dvh flex-col px-5 pt-4 pb-10 sm:px-8 lg:px-14">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex min-h-11 items-center gap-1.5 text-[14px] font-semibold no-underline lg:invisible">
            <Icon name="chevronLeft" size={18} />{t('auth.backToSite')}
          </Link>
          <LangToggle compact />
        </div>
        <div className="mx-auto my-auto flex w-full max-w-[420px] flex-col gap-6 py-8">
          <img src="/icon-192.png" alt="Shaan Fitness" width="64" height="64" className="h-16 w-16 rounded-[16px] border border-line lg:hidden" />
          <div className="flex flex-col gap-2.5">
            <h1 className="headline text-[44px]">{title}</h1>
            {sub && <div className="text-[15px] leading-normal text-muted">{sub}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

function Password({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <TextInput id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} className="pr-14" />
      <button type="button" className="absolute top-1/2 right-1.5 flex h-9 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink"
        aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((s) => !s)}>
        <Icon name="eye" size={18} />
      </button>
    </div>
  )
}

export function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null); setUnconfirmed(null); setResent(false)
    if (!email.trim() || !password) return setError(t('auth.enterBoth'))
    setBusy(true)
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (!e) return
    if (/not confirmed/i.test(e.message)) return setUnconfirmed(email.trim())
    setError(/invalid/i.test(e.message) ? t('auth.wrong') : authError(e.message, t))
  }
  const resend = async () => {
    if (!unconfirmed) return
    const { error: e } = await supabase.auth.resend({ type: 'signup', email: unconfirmed, options: { emailRedirectTo: `${origin()}/login` } })
    if (e) setError(authError(e.message, t)); else setResent(true)
  }

  return (
    <AuthFrame title={t('auth.loginTitle')} sub={t('auth.loginSub')}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
        <Field label={t('auth.email')} id="email"><TextInput id="email" type="email" inputMode="email" autoComplete="username" value={email} onChange={setEmail} /></Field>
        <Field label={t('auth.password')} id="password"><Password id="password" autoComplete="current-password" value={password} onChange={setPassword} /></Field>
        <Link to="/forgot-password" className="-mt-1 self-end text-[13px] font-semibold no-underline">{t('auth.forgot')}</Link>
        {error && <Notice tone="error">{error}</Notice>}
        {unconfirmed && (
          <Notice tone="warn">
            {t('auth.notConfirmed', { email: unconfirmed })}{' '}
            {resent ? <strong>{t('auth.resent')}</strong> : <button type="button" className="link-btn" onClick={resend}>{t('auth.resend')}</button>}
          </Notice>
        )}
        <button type="submit" className="btn-gold min-h-[54px] text-[15px]" disabled={busy}>{busy ? t('auth.signingIn') : t('auth.signIn')}</button>
      </form>
      <p className="m-0 border-t border-line pt-5 text-[14px] text-muted">
        {t('auth.newHere')} <Link to="/join" className="font-semibold">{t('auth.createAccount')}</Link>
      </p>
    </AuthFrame>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function Join() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { data: site } = useSite()
  const planId = params.get('plan')
  const plan = site?.plans.find((p) => p.id === planId)
  const [f, setF] = useState({ first: '', last: '', mobile: '', email: '', password: '', gender: '', interest: '' })
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const phone = site?.studio.mobile ?? null

  const submit = async () => {
    setError(null)
    const mob = digitsOnly(f.mobile).replace(/^(91|0)(?=\d{10}$)/, '')
    const e: Record<string, string> = {}
    if (!f.first.trim()) e.first = t('auth.errName')
    if (!/^[6-9]\d{9}$/.test(mob)) e.mobile = t('auth.errMobile')
    if (!EMAIL_RE.test(f.email.trim())) e.email = t('auth.errEmail')
    if (f.password.length < 8) e.password = t('auth.errPwd')
    if (!consent) e.consent = t('auth.errConsent')
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    const email = f.email.trim().toLowerCase()
    const { data, error: err } = await supabase.auth.signUp({
      email, password: f.password,
      options: {
        emailRedirectTo: `${origin()}/login`,
        data: {
          signup: 'website', studio: site?.studio.slug ?? 'shaan-fitness', first_name: f.first.trim(), last_name: f.last.trim() || null,
          full_name: `${f.first.trim()} ${f.last.trim()}`.trim(), phone: mob, gender: f.gender || null, interest: f.interest || null,
          plan: plan?.id ?? null, privacy_version: PRIVACY_VERSION,
        },
      },
    })
    setBusy(false)
    if (err) return setError(authError(err.message, t))
    if (data.session) return // signed straight in; the app opens their page
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return setError(t('auth.exists'))
    setDone(email)
  }
  const resend = async () => {
    if (!done) return
    const { error: e } = await supabase.auth.resend({ type: 'signup', email: done, options: { emailRedirectTo: `${origin()}/login` } })
    if (e) setError(authError(e.message, t)); else setResent(true)
  }

  if (site && site.studio.can_sign_up === false) {
    return (
      <AuthFrame title={t('auth.joinTitle')}>
        <Notice>{t('auth.closed')}</Notice>
        {phone && (
          <div className="flex flex-wrap gap-2.5">
            <a href={telLink(phone) ?? undefined} className="btn"><Icon name="phone" size={18} />{prettyPhone(phone)}</a>
            <a href={whatsappLink(site.website.whatsapp || phone) ?? undefined} target="_blank" rel="noreferrer" className="btn"><Icon name="whatsapp" size={18} />WhatsApp</a>
          </div>
        )}
        <Link to="/login" className="text-[14px] font-semibold no-underline">{t('auth.haveAccount')} {t('auth.signIn')}</Link>
      </AuthFrame>
    )
  }

  if (done) {
    return (
      <AuthFrame title={t('auth.checkTitle')}>
        <div className="card flex flex-col gap-4 p-5">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-tint text-gold"><Icon name="check" size={24} /></span>
          <p className="m-0 text-[15px] leading-relaxed text-ink-soft" role="status">{t('auth.checkText', { email: done })}</p>
          {error && <Notice tone="error">{error}</Notice>}
          {resent ? <Notice tone="success">{t('auth.resent')}</Notice> : <button type="button" className="btn" onClick={resend}>{t('auth.resend')}</button>}
        </div>
        <Link to="/login" className="text-[14px] font-semibold no-underline">{t('auth.haveAccount')} {t('auth.signIn')}</Link>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title={t('auth.joinTitle')} sub={t('auth.joinSub')}>
      {plan && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent-line bg-accent-tint px-4 py-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold tracking-[.1em] text-muted uppercase">{t('auth.plan')}</div>
            <div className="truncate text-[15px] font-bold">{plan.name}</div>
            <div className="text-[13px] text-muted">{money(plan.total_price)} · {planDuration(plan, t)}</div>
          </div>
          <Link to="/#plans" className="flex-none text-[13px] font-semibold no-underline">Change</Link>
        </div>
      )}
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('auth.first')} id="jfirst" required error={errors.first}><TextInput id="jfirst" autoComplete="given-name" value={f.first} onChange={set('first')} /></Field>
          <Field label={t('auth.last')} id="jlast"><TextInput id="jlast" autoComplete="family-name" value={f.last} onChange={set('last')} /></Field>
        </div>
        <Field label={t('auth.mobile')} id="jmobile" required error={errors.mobile}>
          <div className="flex gap-2">
            <span className="input flex w-[68px] flex-none items-center justify-center text-muted" aria-hidden="true">+91</span>
            <TextInput id="jmobile" type="tel" inputMode="tel" autoComplete="tel-national" value={f.mobile} onChange={set('mobile')} maxLength={14} />
          </div>
        </Field>
        <Field label={t('auth.email')} id="jemail" required error={errors.email}><TextInput id="jemail" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} /></Field>
        <Field label={t('auth.password')} id="jpass" required error={errors.password} hint={t('auth.pwdHint')}>
          <Password id="jpass" autoComplete="new-password" value={f.password} onChange={set('password')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('auth.gender')} id="jgender">
            <Select id="jgender" value={f.gender} onChange={set('gender')} placeholder={t('auth.preferNot')}
              options={[{ value: 'male', label: t('auth.male') }, { value: 'female', label: t('auth.female') }, { value: 'other', label: t('auth.other') }]} />
          </Field>
          <Field label={t('auth.interest')} id="jint">
            <Select id="jint" value={f.interest} onChange={set('interest')} placeholder={t('auth.notSure')}
              options={(site?.services ?? []).map((v) => ({ value: v.name, label: v.name }))} />
          </Field>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="jconsent" className="flex cursor-pointer items-start gap-3 text-[14px] leading-normal text-ink-soft">
            <input id="jconsent" type="checkbox" className="check mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} />
            <span>{t('auth.consentA')} <Link to="/privacy" target="_blank" rel="noreferrer">{t('auth.consentLink')}</Link> {t('auth.consentB')}</span>
          </label>
          {errors.consent && <span className="pl-8 text-[12px] text-red" role="alert">{errors.consent}</span>}
        </div>
        {error && (
          <Notice tone="error">
            {error}
            {error === t('auth.cantEmail') && phone && (
              <span className="mt-2 flex flex-wrap gap-4">
                <a href={telLink(phone) ?? undefined}>{prettyPhone(phone)}</a>
                <a href={whatsappLink(site?.website.whatsapp || phone) ?? undefined} target="_blank" rel="noreferrer">WhatsApp</a>
              </span>
            )}
          </Notice>
        )}
        <button type="submit" className="btn-gold min-h-[54px] text-[15px]" disabled={busy}>{busy ? t('auth.creating') : t('auth.create')}</button>
      </form>
      <p className="m-0 border-t border-line pt-5 text-[14px] text-muted">
        {t('auth.haveAccount')} <Link to="/login" className="font-semibold">{t('auth.signIn')}</Link>
      </p>
    </AuthFrame>
  )
}

export function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setError(null)
    if (!EMAIL_RE.test(email.trim())) return setError(t('auth.errEmail'))
    setBusy(true)
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin()}/reset-password` })
    setBusy(false)
    if (e) return setError(authError(e.message, t))
    setSent(true)
  }
  return (
    <AuthFrame title={t('auth.forgotTitle')} sub={t('auth.forgotSub')}>
      {sent ? <Notice tone="success">{t('auth.sent')}</Notice> : (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
          <Field label={t('auth.email')} id="femail"><TextInput id="femail" type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} /></Field>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" className="btn-gold min-h-[54px] text-[15px]" disabled={busy}>{busy ? t('auth.sending') : t('auth.send')}</button>
        </form>
      )}
      <Link to="/login" className="text-[14px] font-semibold no-underline">← {t('auth.signIn')}</Link>
    </AuthFrame>
  )
}

/** Opened from the "reset your password" email: the link signs the person in, then they choose a new password. */
export function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setError(null)
    if (password.length < 8) return setError(t('auth.errPwd'))
    if (password !== again) return setError(t('auth.mismatch'))
    setBusy(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (e) return setError(/session|missing/i.test(e.message) ? t('auth.expired') : authError(e.message, t))
    navigate('/login', { replace: true })
  }
  return (
    <AuthFrame title={t('auth.newPassword')}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
        <Field label={t('auth.password')} id="np" hint={t('auth.pwdHint')}><Password id="np" autoComplete="new-password" value={password} onChange={setPassword} /></Field>
        <Field label={t('auth.again')} id="np2"><Password id="np2" autoComplete="new-password" value={again} onChange={setAgain} /></Field>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn-gold min-h-[54px] text-[15px]" disabled={busy}>{busy ? t('auth.saving') : t('auth.save')}</button>
      </form>
    </AuthFrame>
  )
}
