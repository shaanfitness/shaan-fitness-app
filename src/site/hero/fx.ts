import { fixedQuality, hasWebgl2, softwareGpu } from './gpu'

// Which hero a device gets: the 3D emblem on every device that can draw it, as always. Only a browser without WebGL 2,
// or a computer with no graphics chip at all (the processor would have to draw it, freezing the page), keeps the flat
// logo. Phones are never second-guessed by their core count, memory or a past visit.
//   ?fx=3d or ?fx=2d in the address forces one (to compare them).

export type Fx = '3d' | '2d'

// An earlier version remembered "slow" devices and showed them the flat logo for a month; clear that everywhere.
try { localStorage.removeItem('sf.fx.slow') } catch { /* private mode */ }

export function chooseFx(): { fx: Fx; why: string } {
  const asked = new URLSearchParams(window.location.search).get('fx')
  if (asked === '3d' || asked === '2d') return { fx: asked, why: 'asked' }
  if (fixedQuality()) return { fx: '3d', why: 'recording' }
  if (!hasWebgl2()) return { fx: '2d', why: 'no-webgl2' }
  if (softwareGpu()) return { fx: '2d', why: 'no-graphics-chip' }
  return { fx: '3d', why: 'capable' }
}
