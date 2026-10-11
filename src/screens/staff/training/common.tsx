import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { useList, useTeam } from '../../../db/studio'
import { listExercises, listFoods, listRecipes, type DietPlan, type WorkoutPlan } from '../../../db/training'
import { TextInput } from '../../../components/controls'
import { Icon } from '../../../components/ui'

// Shared by the workout and diet pages: who may make or change plans (YDL "Allow Workout /
// Allow Diet in Coach App"), the studio's lists, and a searchable picker.

export function usePlanRights() {
  const me = useMe()
  const team = useTeam()
  const desk = me.role === 'owner' || me.role === 'front_desk'
  const mine = team.all.find((s) => s.id === me.staffId)
  const myIds = new Set(team.all.filter((s) => s.user_id && s.user_id === mine?.user_id).map((s) => s.id))
  const may = (sw: 'allow_workout' | 'allow_diet') => desk || (me.role === 'coach' && (mine?.permissions?.[sw] ?? true) !== false)
  return {
    desk,
    myIds,
    mayWorkout: may('allow_workout'),
    mayDiet: may('allow_diet'),
    canEdit: (kind: 'workout' | 'diet', p: WorkoutPlan | DietPlan) =>
      desk || (may(kind === 'workout' ? 'allow_workout' : 'allow_diet') && (myIds.has(p.created_by ?? '') || myIds.has(p.trainer_id ?? ''))),
    trainerName: (id: string | null) => team.name(id),
    trainers: team.all.filter((s) => s.active && (s.role === 'coach' || s.role === 'doctor' || s.role === 'owner')),
  }
}

export function useTrainingLists() {
  const goals = useList('workout_goal').map((l) => l.label)
  const levels = useList('plan_level').map((l) => l.label)
  const types = useList('exercise_type').map((l) => l.label)
  const parts = useList('body_part').map((l) => l.label)
  const meals = useList('meal_time').map((l) => l.label)
  const units = useList('food_unit').map((l) => l.label)
  return {
    goals: goals.length ? goals : ['Fat Loss', 'Muscle Gain', 'Weight Gain', 'General Fitness'],
    levels: levels.length ? levels : ['General', 'Beginner', 'Intermediate', 'Advanced'],
    types, parts,
    meals: meals.length ? meals : ['Early Morning', 'Breakfast', 'Mid Morning', 'Lunch', 'Evening Snack', 'Dinner', 'Bed Time'],
    units: units.length ? units : ['g', 'ml', 'piece', 'cup', 'bowl'],
  }
}

export function useExercises() {
  const { studioId } = useMe()
  return useQuery({ queryKey: ['exercises', studioId], queryFn: () => listExercises(studioId), staleTime: 5 * 60_000 })
}
export function useFoods() {
  const { studioId } = useMe()
  return useQuery({ queryKey: ['foods', studioId], queryFn: () => listFoods(studioId), staleTime: 5 * 60_000 })
}
export function useRecipes() {
  const { studioId } = useMe()
  return useQuery({ queryKey: ['recipes', studioId], queryFn: () => listRecipes(studioId), staleTime: 5 * 60_000 })
}

/** A search box with a short list of matches to pick from. */
export function SearchPick<T>({ id, items, label, render, onPick, placeholder, value }: {
  id: string; items: T[]; label: (t: T) => string; render?: (t: T) => ReactNode; onPick: (t: T) => void; placeholder: string; value?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (s ? items.filter((t) => label(t).toLowerCase().includes(s)) : items).slice(0, 30)
  }, [q, items, label])
  return (
    <div className="relative">
      <div className="relative">
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <TextInput id={id} value={open ? q : value ?? q} placeholder={placeholder} className="pl-9" autoComplete="off"
          onChange={(v) => { setQ(v); setOpen(true) }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      </div>
      {open && (
        <div role="listbox" className="menu left-0 mt-1 max-h-72 w-full overflow-auto">
          {matches.map((t, i) => (
            <button key={i} type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(t); setQ(label(t)); setOpen(false) }}>
              {render ? render(t) : label(t)}
            </button>
          ))}
          {matches.length === 0 && <div className="px-3 py-2 text-[13px] text-muted">No match. You can type it as a custom item.</div>}
        </div>
      )}
    </div>
  )
}

export const n1 = (v: unknown) => {
  const x = Number(v)
  return Number.isFinite(x) ? (Math.round(x * 10) / 10).toString() : '0'
}
