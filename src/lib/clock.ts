/** A time of day as people read it: "18:30" → "6:30 PM". Kept apart from dates.ts so the website needs no date library. */
export const fmtClock = (hhmm: string | null | undefined) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
