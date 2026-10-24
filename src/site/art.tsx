import type { CSSProperties, ReactNode } from 'react'

/** Sine and cosine in degrees, rounded: the build and the browser must draw exactly the same numbers. */
export const sind = (deg: number) => Math.round(Math.sin(deg * Math.PI / 180) * 1e6) / 1e6
export const cosd = (deg: number) => Math.round(Math.cos(deg * Math.PI / 180) * 1e6) / 1e6

// The website's own drawings: the SHAAN crest (a watch-bezel ring around a barbell), coach-to-member ratio
// diagrams, the five method glyphs, page illustrations and small icons. All line art, all original.

const DIAMOND = '✦'

export function Crest({ className }: { className?: string }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i)
  const text = `SHAAN FITNESS ${DIAMOND} KAKINADA ${DIAMOND} YOUR TRUSTED HEALTH PARTNER ${DIAMOND} `
  return (
    <svg className={className} viewBox="0 0 600 600" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="sf-crest-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3B5BFF" stopOpacity=".28" />
          <stop offset="60%" stopColor="#3B5BFF" stopOpacity=".06" />
          <stop offset="100%" stopColor="#3B5BFF" stopOpacity="0" />
        </radialGradient>
        <path id="sf-crest-text" d="M300,300 m-236,0 a236,236 0 1,1 472,0 a236,236 0 1,1 -472,0" />
      </defs>
      <circle cx="300" cy="300" r="300" fill="url(#sf-crest-glow)" />
      <circle className="sf-crest-draw" cx="300" cy="300" r="292" fill="none" stroke="#D9B97A" strokeOpacity=".7" strokeWidth="1.2" />
      <circle className="sf-crest-draw" cx="300" cy="300" r="206" fill="none" stroke="#EEF0F7" strokeOpacity=".16" strokeWidth="1" />
      <g className="sf-crest-ring">
        {ticks.map((i) => {
          const long = i % 5 === 0
          return <line key={i} x1="300" y1={long ? 14 : 18} x2="300" y2={long ? 38 : 30} stroke={i === 0 ? '#E8283B' : '#EEF0F7'} strokeOpacity={long ? .55 : .25}
            strokeWidth={long ? 2 : 1} transform={`rotate(${i * 6} 300 300)`} />
        })}
        <text fill="#D9B97A" fillOpacity=".75" fontSize="17" letterSpacing="6.2" fontFamily="'Archivo Variable', sans-serif" fontWeight="600">
          <textPath href="#sf-crest-text">{text}{text}</textPath>
        </text>
      </g>
      {/* The barbell: crimson bar, plates in champagne and cobalt. */}
      <g transform="translate(300 300)">
        <rect className="sf-crest-draw" x="-150" y="-4" width="300" height="8" rx="4" fill="none" stroke="#E8283B" strokeWidth="2" />
        <rect x="-150" y="-4" width="300" height="8" rx="4" fill="#E8283B" opacity=".9" />
        {[-1, 1].map((s) => (
          <g key={s} transform={`scale(${s} 1)`}>
            <rect x="-128" y="-58" width="22" height="116" rx="6" fill="#121A45" stroke="#D9B97A" strokeWidth="2" />
            <rect x="-100" y="-44" width="16" height="88" rx="5" fill="#121A45" stroke="#3B5BFF" strokeWidth="2" />
            <rect x="-80" y="-14" width="8" height="28" rx="3" fill="#EEF0F7" opacity=".7" />
          </g>
        ))}
      </g>
    </svg>
  )
}

/** One coach (crimson) and the people they coach in a session, gathering in when the row comes into view. */
export function RatioArt({ members }: { members: number }) {
  const cx = 26, cy = 55
  const pts = Array.from({ length: members }, (_, i) => {
    if (members === 1) return { x: 112, y: 55 }
    if (members === 2) return { x: 110, y: 30 + i * 50 }
    const a = -70 + (140 / (members - 1)) * i
    return { x: cx + cosd(a) * 92, y: cy + sind(a) * 48 }
  })
  return (
    <svg className="sf-tier-art" viewBox="0 0 150 110" aria-hidden="true" focusable="false">
      {pts.map((p, i) => (
        <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#D9B97A" strokeOpacity=".45" strokeWidth="1" strokeDasharray="60" style={{ transitionDelay: `${i * 60}ms` }} />
      ))}
      {pts.map((p, i) => (
        <circle key={`m${i}`} className="sf-m" cx={p.x} cy={p.y} r={members > 2 ? 8 : 11} fill="#EEF0F7"
          style={{ '--fx': `${cx - p.x}px`, '--fy': `${cy - p.y}px`, transitionDelay: `${i * 60}ms`, transformBox: 'fill-box', transformOrigin: 'center' } as CSSProperties} />
      ))}
      <circle cx={cx} cy={cy} r="15" fill="#E8283B" />
      <circle cx={cx} cy={cy} r="21" fill="none" stroke="#E8283B" strokeOpacity=".4" />
    </svg>
  )
}

const G = ({ children }: { children: ReactNode }) => (
  <svg className="sf-glyph" viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
)
export const GLYPHS: Record<string, ReactNode> = {
  FORGE: <G><path className="sf-draw" d="M10 48h76M22 30v36M30 34v28M74 30v36M66 34v28M14 42v12M82 42v12" /></G>,
  BLAZE: <G><path className="sf-draw" d="M8 56h18l7-20 10 40 9-52 9 44 6-12h21" /><path className="sf-draw" d="M48 86c-10 0-16-7-16-15 0-9 8-12 9-21 6 5 7 10 7 13 2-3 3-6 3-9 6 5 9 10 9 17 0 8-6 15-12 15z" strokeOpacity=".55" /></G>,
  FLOW: <G><path className="sf-draw" d="M6 40c10-12 20-12 30 0s20 12 30 0 16-10 24-4M6 60c10-12 20-12 30 0s20 12 30 0 16-10 24-4" /></G>,
  STRIKE: <G><path className="sf-draw" d="M54 6 22 52h24l-8 38 34-50H48z" /></G>,
  TRIBE: <G><circle className="sf-draw" cx="48" cy="48" r="30" strokeOpacity=".4" />{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={48 + sind(a) * 30} cy={48 - cosd(a) * 30} r="7" fill="currentColor" />)}<path className="sf-draw" d="M48 18 76.5 38.7 65.6 72.3H30.4L19.5 38.7z" strokeOpacity=".7" /></G>,
}

const P = ({ children }: { children: ReactNode }) => (
  <svg className="sf-page-art" viewBox="0 0 300 300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="150" cy="150" r="146" stroke="#EEF0F7" strokeOpacity=".1" />
    {children}
  </svg>
)
export const PAGE_ART: Record<string, ReactNode> = {
  personal: <P><path className="sf-draw" d="M112 108a38 38 0 1 1 76 0M104 112h92l12 92a24 24 0 0 1-24 26H116a24 24 0 0 1-24-26z" /><circle className="sf-draw" cx="150" cy="172" r="26" stroke="#E8283B" /></P>,
  group: <P>{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <circle key={a} className="sf-draw" cx={150 + cosd(a) * 92} cy={150 + sind(a) * 92} r="16" />)}<circle className="sf-draw" cx="150" cy="150" r="24" stroke="#E8283B" /></P>,
  weightLoss: <P><path className="sf-draw" d="M60 200a90 90 0 0 1 180 0" /><path className="sf-draw" d="M150 200 196 132" stroke="#E8283B" />{[0, 30, 60, 90, 120, 150, 180].map((a) => <path key={a} d={`M${150 - cosd(a) * 90} ${200 - sind(a) * 90}l${cosd(a) * 12} ${sind(a) * 12}`} strokeOpacity=".6" />)}<path className="sf-draw" d="M70 232h160" /></P>,
  plans: <P><path className="sf-draw" d="M78 96h104l44 54-44 54H78z" /><circle className="sf-draw" cx="182" cy="150" r="10" stroke="#E8283B" /><path className="sf-draw" d="M100 132h50M100 150h62M100 168h40" strokeOpacity=".7" /></P>,
  timings: <P><circle className="sf-draw" cx="150" cy="150" r="92" /><path className="sf-draw" d="M150 88v62l40 26" stroke="#E8283B" />{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${150 + sind(i * 30) * 80} ${150 - cosd(i * 30) * 80}L${150 + sind(i * 30) * 90} ${150 - cosd(i * 30) * 90}`} strokeOpacity=".6" />)}</P>,
  coaches: <P><circle className="sf-draw" cx="150" cy="160" r="70" /><path className="sf-draw" d="M150 90V66M138 60h24M200 110l14-14" /><path className="sf-draw" d="M150 160l30-34" stroke="#E8283B" /></P>,
  results: <P><path className="sf-draw" d="M64 220V80M64 220h176" strokeOpacity=".6" /><path className="sf-draw" d="M78 200l40-30 32 18 38-52 40-30" stroke="#E8283B" /><path className="sf-draw" d="M214 106h18v18" stroke="#E8283B" /></P>,
  about: <P><path className="sf-draw" d="M150 60 74 96v54c0 46 32 78 76 92 44-14 76-46 76-92V96z" /><path className="sf-draw" d="M112 152h76" stroke="#E8283B" strokeWidth="6" /></P>,
  contact: <P><path className="sf-draw" d="M150 236s-64-58-64-112a64 64 0 0 1 128 0c0 54-64 112-64 112z" /><circle className="sf-draw" cx="150" cy="124" r="22" stroke="#E8283B" /></P>,
}

// Icons -----------------------------------------------------------------------------------------------------------
const I = ({ d, size = 20, fill }: { d: ReactNode; size?: number; fill?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{d}</svg>
)
export const Ic = {
  phone: (s?: number) => <I size={s} d={<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />} />,
  whatsapp: (s?: number) => <I size={s} fill d={<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8M8.5 7.3c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.2 5 4.4 2.5 1 3 .8 3.5.7.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4l-.5-.3-1.9-.9c-.3-.1-.5-.2-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.4-1.5a8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5v-.5l-.9-2.1c-.2-.5-.4-.5-.6-.5z" />} />,
  check: (s?: number) => <I size={s} d={<path d="m5 12.5 4.5 4.5L19 7.5" />} />,
  down: (s?: number) => <I size={s} d={<path d="m6 9 6 6 6-6" />} />,
  menu: (s?: number) => <I size={s} d={<path d="M4 8h16M4 16h16" />} />,
  close: (s?: number) => <I size={s} d={<path d="M6 6l12 12M18 6 6 18" />} />,
  pin: (s?: number) => <I size={s} d={<><path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>} />,
  pause: (s?: number) => <I size={s} d={<path d="M9 6v12M15 6v12" />} />,
  play: (s?: number) => <I size={s} d={<path d="M8 5.5v13l10-6.5z" />} />,
  instagram: (s?: number) => <I size={s} d={<><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" /></>} />,
  facebook: (s?: number) => <I size={s} d={<path d="M14 8h3V4.5h-3a4 4 0 0 0-4 4V11H7v3.5h3V21h3.5v-6.5H17l.5-3.5h-4V8.5c0-.3.2-.5.5-.5z" />} />,
  youtube: (s?: number) => <I size={s} d={<><rect x="2.5" y="6" width="19" height="12" rx="4" /><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor" /></>} />,
  x: (s?: number) => <I size={s} d={<path d="M4 4l16 16M20 4 4 20" />} />,
  dumbbell: (s?: number) => <I size={s} d={<path d="M3 12h18M6 8v8M9 9.5v5M18 8v8M15 9.5v5" />} />,
  people: (s?: number) => <I size={s} d={<><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.4" /><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M15 15c2.6 0 4.6 1.2 5.3 4" /></>} />,
  flame: (s?: number) => <I size={s} d={<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.7 3.2-5 3.7-8.8 2.4 2 2.9 4 2.8 5.2.8-1.2 1.2-2.4 1.2-3.6 2.4 2 3.8 4.2 3.8 7.2 0 3.4-2.6 6-5 6z" />} />,
}
