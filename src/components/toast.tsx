import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

// One short confirmation at a time ("Follow-up saved"), announced to screen readers.
const ToastContext = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2800)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8">
        {msg && <div className="rounded-full border border-gold/40 bg-surface-3 px-5 py-3 text-[14px] font-semibold text-ink shadow-lg">{msg}</div>}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
