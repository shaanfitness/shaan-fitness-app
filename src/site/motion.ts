import { useEffect, useRef, useState, type RefObject } from 'react'

// Small motion helpers for the website. Everything checks "reduce motion", and nothing runs during the build's
// static render (no window there).

export const canUseDom = typeof window !== 'undefined' && typeof document !== 'undefined'

export function prefersReducedMotion() {
  return canUseDom && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** True once the element has been on screen (stays true). */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = '0px 0px -12% 0px') {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (!('IntersectionObserver' in window)) { setSeen(true); return }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin, seen])
  return seen
}

/** Counts up to a number once it scrolls into view. The static page shows the real number, and a number that was
 *  already on screen when the page loaded stays as it is. */
export function useCountUp(target: number, run: boolean, ms = 1200, ref?: RefObject<Element | null>) {
  const [n, setN] = useState(target)
  const started = useRef(false)
  useEffect(() => {
    const r = ref?.current?.getBoundingClientRect()
    if (r && r.top < window.innerHeight) started.current = true
  }, [ref])
  useEffect(() => {
    if (!run || started.current || prefersReducedMotion()) return
    started.current = true
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    setN(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, target, ms])
  return n
}

/** The current time in the gym's time zone, refreshed every minute (null during the static build). */
export function useNow(tz = 'Asia/Kolkata') {
  const [now, setNow] = useState<{ day: number; min: number } | null>(null)
  useEffect(() => {
    const read = () => {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
      const get = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
      const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1
      setNow({ day, min: (Number(get('hour')) % 24) * 60 + Number(get('minute')) })
    }
    read()
    const id = window.setInterval(read, 30_000)
    return () => window.clearInterval(id)
  }, [tz])
  return now
}

/** Header turns solid once the page scrolls; the phone dock rises after the hero. */
export function useScrolled(px = 24) {
  const [y, setY] = useState(0)
  useEffect(() => {
    let raf = 0
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setY(window.scrollY)) }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [])
  return { solid: y > px, y }
}

/**
 * Pointer effects for the whole site, set up once: panels with .sf-spot get a soft light that follows the pointer,
 * and .sf-magnet buttons lean toward it. Only for mouse and pen pointers, never with reduced motion.
 */
export function usePointerEffects() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || prefersReducedMotion()) return
    let magnet: HTMLElement | null = null
    const onMove = (e: PointerEvent) => {
      const target = e.target as Element | null
      const spot = target?.closest?.('.sf-spot') as HTMLElement | null
      if (spot) {
        const r = spot.getBoundingClientRect()
        spot.style.setProperty('--sx', `${e.clientX - r.left}px`)
        spot.style.setProperty('--sy', `${e.clientY - r.top}px`)
      }
      const m = target?.closest?.('.sf-magnet') as HTMLElement | null
      if (magnet && magnet !== m) { magnet.style.setProperty('--mx', '0px'); magnet.style.setProperty('--my', '0px') }
      magnet = m
      if (m) {
        const r = m.getBoundingClientRect()
        m.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - .5) * 10}px`)
        m.style.setProperty('--my', `${((e.clientY - r.top) / r.height - .5) * 8}px`)
      }
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => document.removeEventListener('pointermove', onMove)
  }, [])
}

// The page was built ahead of time and is already on screen: skip the first entrance animation so the page
// doesn't play twice when the app takes over.
// Read during the first render; the layout clears it after its first commit.
