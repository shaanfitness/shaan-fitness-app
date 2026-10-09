import { useSyncExternalStore } from 'react'

// "Add to home screen": Android and desktop Chrome hand us an install prompt to show from our
// own button; iPhone has none, so we show the Share › Add to Home Screen steps instead.
interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallPromptEvent; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
export const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

export function useInstall() {
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null, () => false)
  return {
    canPrompt,
    installed: isStandalone(),
    ios: isIos(),
    prompt: async () => {
      if (!deferred) return false
      const e = deferred
      deferred = null
      notify()
      await e.prompt()
      return (await e.userChoice).outcome === 'accepted'
    },
  }
}

/** Registers the small service worker that shows an offline page when there's no connection. */
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* the app works without it */ }) })
}
