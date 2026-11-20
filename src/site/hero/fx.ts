import { prefersReducedMotion } from '../motion'
import { fixedQuality, hasWebgl2, softwareGpu } from './gpu'

// Which hero a device gets. The 3D emblem only where it will open smoothly and look sharp; everywhere else the flat
// logo with its own light motion, which is quick on any phone. A device that once couldn't keep up is remembered for
// a month, so it opens straight on the flat logo next time instead of trying again.
//   ?fx=3d or ?fx=2d in the address forces one (to compare them).

export type Fx = '3d' | '2d'

const SLOW_KEY = 'sf.fx.slow'
const MONTH = 30 * 864e5

interface Nav extends Navigator {
  connection?: { saveData?: boolean; effectiveType?: string }
  deviceMemory?: number
}

export function chooseFx(): { fx: Fx; why: string } {
  const asked = new URLSearchParams(window.location.search).get('fx')
  if (asked === '3d' || asked === '2d') return { fx: asked, why: 'asked' }
  if (fixedQuality()) return { fx: '3d', why: 'recording' }
  if (prefersReducedMotion()) return { fx: '2d', why: 'reduced-motion' }
  try {
    const t = Number(localStorage.getItem(SLOW_KEY))
    if (t && Date.now() - t < MONTH) return { fx: '2d', why: 'slow-before' }
  } catch { /* private mode */ }
  const nav = navigator as Nav
  if (nav.connection?.saveData) return { fx: '2d', why: 'data-saver' }
  if (/^(slow-2g|2g)$/.test(nav.connection?.effectiveType ?? '')) return { fx: '2d', why: 'slow-network' }
  if (nav.deviceMemory && nav.deviceMemory < 3) return { fx: '2d', why: 'low-memory' }
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) return { fx: '2d', why: 'few-cores' }
  if (!hasWebgl2()) return { fx: '2d', why: 'no-webgl2' }
  if (softwareGpu()) return { fx: '2d', why: 'no-graphics-chip' }
  return { fx: '3d', why: 'capable' }
}

/** This device couldn't hold the 3D smoothly: open on the flat logo for the next month. */
export function rememberSlow() {
  try { localStorage.setItem(SLOW_KEY, String(Date.now())) } catch { /* private mode: this visit only */ }
}
