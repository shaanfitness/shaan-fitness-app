import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Field, Notice, TextInput } from '../components/controls'

// Opened from the "reset your password" email: the link signs the person in, then they set a new password.
export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setError(null)
    if (password.length < 6) return setError('Use at least 6 characters.')
    if (password !== again) return setError('The two passwords don’t match.')
    setBusy(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (e) return setError(/session/i.test(e.message) ? 'This reset link has expired. Ask for a new one.' : e.message)
    navigate('/', { replace: true })
  }
  return (
    <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-4 px-6">
      <img src="/icon-192.png" alt="" width="64" height="64" className="rounded-[16px]" />
      <h1 className="title text-[32px]">Set a new password</h1>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <Field label="New password" id="np"><TextInput id="np" type="password" autoComplete="new-password" value={password} onChange={setPassword} /></Field>
        <Field label="Type it again" id="np2"><TextInput id="np2" type="password" autoComplete="new-password" value={again} onChange={setAgain} /></Field>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className="btn-gold" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </div>
  )
}
