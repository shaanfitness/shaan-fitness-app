import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useMe } from '../auth'
import type { Batch, ListItem, Plan, Service, Staff, Studio } from './types'

// Reference data every page needs: the studio, its dropdown lists, services,
// team, plans and batches. Loaded once and shared through React Query.
const LONG = 5 * 60_000

export function throwIf<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export function useStudio() {
  const { studioId } = useMe()
  return useQuery({
    queryKey: ['studio', studioId], staleTime: LONG,
    queryFn: async () => throwIf(await supabase.from('studios').select('*').eq('id', studioId).single()) as Studio,
  })
}

export function useLists() {
  const { studioId } = useMe()
  return useQuery({
    queryKey: ['lists', studioId], staleTime: LONG,
    queryFn: async () => {
      const rows = throwIf(await supabase.from('list_items').select('*').eq('studio_id', studioId).order('list').order('sort')) as ListItem[]
      const byList: Record<string, ListItem[]> = {}
      for (const r of rows) (byList[r.list] ??= []).push(r)
      return byList
    },
  })
}

/** Active labels of one dropdown list, in order. */
export function useList(name: string) {
  const { data } = useLists()
  return (data?.[name] ?? []).filter((i) => i.active)
}

export function useServices() {
  const { studioId } = useMe()
  return useQuery({
    queryKey: ['services', studioId], staleTime: LONG,
    queryFn: async () => throwIf(await supabase.from('services').select('*').eq('studio_id', studioId).order('sort')) as Service[],
  })
}

export function useStaff() {
  const { studioId, role } = useMe()
  return useQuery({
    queryKey: ['staff', studioId], staleTime: LONG, enabled: role !== 'member',
    queryFn: async () => throwIf(await supabase.from('staff').select('*').eq('studio_id', studioId).order('first_name')) as Staff[],
  })
}

/** Staff accounts (owner, front desk) and trainers, as YDL lists them separately. */
export function useTeam() {
  const q = useStaff()
  const data = q.data ?? []
  const active = data.filter((s) => s.active)
  return {
    ready: q.isSuccess,
    all: data,
    staffAccounts: active.filter((s) => s.role === 'owner' || s.role === 'front_desk'),
    trainers: active.filter((s) => s.role === 'coach'),
    everyone: active,
    name: (id: string | null | undefined) => data.find((s) => s.id === id)?.full_name ?? null,
  }
}

export function usePlans() {
  const { studioId } = useMe()
  return useQuery({
    queryKey: ['plans', studioId], staleTime: LONG,
    queryFn: async () => throwIf(await supabase.from('plans').select('*').eq('studio_id', studioId).order('app_sequence').order('name')) as Plan[],
  })
}

export function useBatches() {
  const { studioId } = useMe()
  return useQuery({
    queryKey: ['batches', studioId], staleTime: LONG,
    queryFn: async () => throwIf(await supabase.from('batches').select('*').eq('studio_id', studioId).order('start_time')) as Batch[],
  })
}
