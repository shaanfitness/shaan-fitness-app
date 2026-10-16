import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dailyLogs, diary, foodLogs, myGoals, workoutAnalysis } from '../../../db/health'
import { totals, workoutLogs } from '../../../db/training'
import { fmtDay, plusDays, studioToday } from '../../../lib/dates'
import { Loading } from '../../../components/ui'
import { BarList, ColumnChart } from '../analysis/kit'

// Client profile › Tracking: what the client logs in the member app (water, steps, sleep, mood, food, workouts,
// diary), read-only, so their coach and the front desk can guide them. The diary shows to their coach or doctor only.

const MOOD = ['', 'Low', 'Tired', 'Okay', 'Good', 'Great']

export function ClientTrackingTab({ memberId }: { memberId: string }) {
  const today = studioToday()
  const from = plusDays(today, -13)
  const [day, setDay] = useState(today)
  const daily = useQuery({ queryKey: ['daily-logs', memberId, from, today], queryFn: () => dailyLogs(memberId, from, today) })
  const food = useQuery({ queryKey: ['food-logs', memberId, from, today], queryFn: () => foodLogs(memberId, from, today) })
  const wl = useQuery({ queryKey: ['workout-logs', memberId, from, today], queryFn: () => workoutLogs(memberId, from, today) })
  const goals = useQuery({ queryKey: ['my-goals', memberId], queryFn: () => myGoals(memberId) })
  const notes = useQuery({ queryKey: ['diary', memberId], queryFn: () => diary(memberId) })
  const wa = useQuery({ queryKey: ['workout-analysis', memberId], queryFn: () => workoutAnalysis(8, memberId) })
  if (daily.isLoading || food.isLoading) return <Loading />
  const days = Array.from({ length: 14 }, (_, i) => plusDays(today, -i))
  const dayFood = (food.data ?? []).filter((f) => f.date === day)
  const g = goals.data
  const weeks = wa.data?.weeks ?? []
  const nothing = !(daily.data?.length || food.data?.length || wl.data?.length)
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[13px] text-muted">What the client logs in the member app over the last 14 days.{g ? ` Goals: water ${g.water_ml / 1000} L, ${g.steps.toLocaleString('en-IN')} steps, sleep ${g.sleep_hours} h${g.calories ? `, ${g.calories} kcal` : ''}.` : ''}</p>
      {nothing && <div className="card p-5 text-[14px] text-muted">Nothing logged in the app in the last 14 days.</div>}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-[13px]">
          <caption className="sr-only">Daily tracking, last 14 days</caption>
          <thead><tr className="text-left text-muted">
            {['Day', 'Water', 'Steps', 'Sleep', 'Mood', 'Food', 'Exercises'].map((h, i) => <th key={h} scope="col" className={`px-3 py-2 font-semibold ${i ? 'text-right' : ''}`}>{h}</th>)}
          </tr></thead>
          <tbody>
            {days.map((d) => {
              const r = daily.data?.find((x) => x.date === d)
              const k = totals((food.data ?? []).filter((f) => f.date === d)).calories
              const ex = (wl.data ?? []).filter((w) => w.date === d).length
              return (
                <tr key={d} className={`border-t border-line-soft ${d === day ? 'bg-surface-2' : ''}`}>
                  <th scope="row" className="px-3 py-1.5 text-left font-semibold">
                    <button type="button" className="link-btn text-[13px] whitespace-nowrap" aria-pressed={d === day} onClick={() => setDay(d)}>{d === today ? 'Today' : fmtDay(d, 'EEE d')}</button>
                  </th>
                  <td className="px-3 py-1.5 text-right">{r?.water_ml ? `${r.water_ml / 1000} L` : '–'}</td>
                  <td className="px-3 py-1.5 text-right">{r?.steps != null ? r.steps.toLocaleString('en-IN') : '–'}</td>
                  <td className="px-3 py-1.5 text-right">{r?.sleep_hours != null ? `${Number(r.sleep_hours)} h` : '–'}</td>
                  <td className="px-3 py-1.5 text-right">{r?.mood ? MOOD[r.mood] : '–'}</td>
                  <td className="px-3 py-1.5 text-right">{k ? `${Math.round(k)} kcal` : '–'}</td>
                  <td className="px-3 py-1.5 text-right">{ex || '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <section className="card flex flex-col gap-2 p-4" aria-label={`Food on ${fmtDay(day, 'd MMM')}`}>
        <h3 className="m-0 text-[15px] font-bold">Food · {day === today ? 'today' : fmtDay(day, 'EEE d MMM')}</h3>
        {!dayFood.length ? <p className="m-0 text-[13px] text-muted">Nothing logged.</p> : (
          <ul className="m-0 list-none p-0 text-[13px]">
            {dayFood.map((f) => (
              <li key={f.id} className="flex justify-between gap-3 border-b border-line-soft py-1.5 last:border-b-0">
                <span><strong>{f.name}</strong> <span className="text-muted">· {f.meal}{f.quantity ? ` · ${Number(f.quantity)} ${f.unit ?? ''}` : ''}{f.plan_item_id ? ' · from plan' : ''}</span></span>
                <span className="whitespace-nowrap">{Math.round(Number(f.calories))} kcal</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {weeks.some((w) => w.exercises > 0) && (
        <section className="card flex flex-col gap-3 p-4" aria-label="Workout analysis">
          <h3 className="m-0 text-[15px] font-bold">Days trained each week</h3>
          <ColumnChart caption="Days trained each week" labels={weeks.map((w) => fmtDay(w.week, 'd MMM'))} titles={weeks.map((w) => `Week of ${fmtDay(w.week, 'd MMM yyyy')}`)}
            series={[{ name: 'Days', values: weeks.map((w) => w.days) }]} height={160} />
          <h3 className="m-0 text-[15px] font-bold">By body part (8 weeks)</h3>
          <BarList caption="Exercises by body part" rows={(wa.data?.parts ?? []).map((p) => ({ label: p.part, value: p.n }))} />
        </section>
      )}
      <section className="card flex flex-col gap-2 p-4" aria-label="Diary">
        <h3 className="m-0 text-[15px] font-bold">Diary</h3>
        {!notes.data?.length ? <p className="m-0 text-[13px] text-muted">No diary entries you can see. Only the client’s coach or doctor can read the diary.</p> : (
          <ul className="m-0 list-none p-0 text-[13px]">
            {notes.data.slice(0, 10).map((n) => <li key={n.id} className="border-b border-line-soft py-1.5 last:border-b-0"><span className="text-muted">{fmtDay(n.date, 'd MMM')} · </span>{n.body}</li>)}
          </ul>
        )}
      </section>
    </div>
  )
}
