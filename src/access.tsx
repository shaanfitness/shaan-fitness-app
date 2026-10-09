import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { useMe } from './auth'
import { supabase } from './lib/supabase'
import spec from './lib/access-control.json'
import type { NavPage } from './nav'

// YDL "Staff Accounts Access Control" in the app: which pages, buttons and CSV exports a
// front-desk staff member gets. The owner gets everything; the database enforces the same rules.

export type Rights = Record<string, string[]>
export interface AccessSpec {
  types: { key: string; label: string }[]
  rows: { key: string; label: string; subs: [string, string][]; default: Record<string, string[]> }[]
  nav_menu: string[]
  nav_off_default: Record<string, string[]>
}
export const ACCESS_SPEC = spec as unknown as AccessSpec
export const ACCESS_TYPES = ACCESS_SPEC.types
export const OWNER_TYPE = { key: 'owner', label: 'Owner' }
export const accessTypeLabel = (k: string | null | undefined) =>
  k === 'owner' ? 'Owner' : ACCESS_TYPES.find((t) => t.key === k)?.label ?? 'Front Desk Executive'

/** The right each page needs (path → [right, part]). Pages not listed need only the role. */
export const PAGE_RIGHT: Record<string, [string, string]> = {
  '/enquiries/new': ['enquiry', 'add'], '/enquiries': ['enquiry', 'view'], '/follow-ups': ['enquiry', 'view'],
  '/members/new': ['members', 'add'], '/members/quick': ['members', 'add'], '/members': ['members', 'view'], '/clients': ['members', 'view'],
  '/members/birthdays': ['members', 'view'], '/clients/referrals': ['members', 'view'], '/members/other-branches': ['members', 'view'],
  '/analysis/traffic': ['traffic_insight', 'on'], '/analysis/members': ['members_insight', 'on'], '/analysis/subscriptions': ['subscription_insight', 'on'],
  '/plans/new': ['plans', 'add'], '/combos/new': ['plans', 'add'], '/combos': ['plans', 'add'],
  '/quick-billing': ['subscriptions', 'add'],
  '/coupons/new': ['coupons', 'on'], '/coupons': ['coupons', 'on'],
  '/batches/new': ['batches', 'add'], '/batches': ['batches', 'view'], '/programs/new': ['programs', 'add'], '/programs': ['programs', 'view'],
  '/programs/attendance': ['program_attendance', 'view'], '/classes/capacity': ['class_capacity', 'view'], '/batches/attendance': ['batch_attendance', 'view'],
  '/classes/attendance': ['class_attendance', 'view'], '/classes/calendar': ['class_calendar', 'view'],
  '/payroll': ['payroll', 'view_calculator'], '/payroll/register': ['payroll', 'view_register'],
  '/notifications/send': ['notices', 'on'], '/whatsapp/qr': ['broadcast', 'on'], '/whatsapp/settings': ['broadcast', 'on'], '/whatsapp/history': ['broadcast', 'on'],
  '/sms/balance': ['broadcast', 'on'], '/sms/settings': ['broadcast', 'on'], '/sms/bulk': ['broadcast', 'on'], '/sms/history': ['broadcast', 'on'],
  '/sms/campaigns': ['broadcast', 'on'], '/sms/recharges': ['broadcast', 'on'], '/email': ['broadcast', 'on'],
  '/trainers/new': ['trainers', 'add'], '/trainers': ['trainers', 'view'], '/trainers/transformations': ['transformations', 'on'], '/trainers/leave': ['trainers', 'leave'],
  '/centers': ['fitness_center', 'view'], '/centers/settings': ['fitness_center', 'edit'], '/centers/invoice-settings': ['fitness_center', 'edit'],
  '/centers/biometric': ['biometric', 'on'], '/centers/biometric-extended': ['biometric', 'on'], '/centers/rules': ['rules', 'on'], '/centers/feedback': ['feedback', 'on'],
  '/staff/new': ['staff_accounts', 'add'], '/staff': ['staff_accounts', 'view'], '/staff/targets': ['targets', 'view_page'],
  '/community': ['community', 'on'], '/app/permissions': ['app_settings', 'on'], '/app/services': ['app_settings', 'on'],
}

/** YDL "Download CSV Access": which list or register may be exported (path → CSV right). */
export const CSV_RIGHT: Record<string, string> = {
  '/registers/collection': 'collection_register', '/registers/receipts': 'receipt_register', '/registers/receipt-log': 'receipt_register_log',
  '/registers/subscriptions': 'subscription_register', '/registers/sessions': 'session_register', '/registers/expired': 'expiry_register',
  '/registers/tax': 'tax_register', '/registers/upgrades': 'upgrade_register', '/registers/balance-due': 'balance_due_register',
  '/registers/recorded-sessions': 'recorded_session_register', '/registers/deleted-subscriptions': 'deleted_subscription_register',
  '/registers/transfers': 'transfer_subscription_register', '/registers/extensions': 'extend_subscription_register',
  '/registers/downgrades': 'downgrade_subscription_register', '/registers/trials': 'trial_register', '/registers/cancelled': 'cancel_subscription_register',
  '/analysis/weight-loss': 'weight_loss_analysis', '/analysis/lead-sources': 'lead_source_analysis', '/payroll/register': 'payroll_register',
  '/members': 'my_members_page', '/enquiries': 'enquiry_list_page', '/follow-ups': 'follow_up_page', '/clients': 'client_database_page',
  '/members/birthdays': 'members_birthday_page', '/attendance/clients': 'customer_attendance_listing_page',
  '/batches/attendance': 'batch_wise_attendance_listing_page', '/plans': 'membership_list_page',
}

export interface Access {
  owner: boolean
  ready: boolean
  can: (key: string, sub?: string) => boolean
  page: (p: Pick<NavPage, 'path' | 'label' | 'roles'>) => boolean
  csv: (path: string) => boolean
}

export function useAccess(): Access {
  const me = useMe()
  const owner = me.role === 'owner'
  const desk = me.role === 'front_desk'
  const q = useQuery({
    queryKey: ['my-access', me.studioId, me.userId], enabled: desk, staleTime: 60_000,
    queryFn: async () => {
      const res = await supabase.rpc('my_access', { p_studio: me.studioId })
      if (res.error) throw new Error(res.error.message)
      return res.data as { owner: boolean; type: string | null; rights: Rights; nav_off: string[] }
    },
  })
  return useMemo<Access>(() => {
    const rights = q.data?.rights ?? {}
    const navOff = new Set(q.data?.nav_off ?? [])
    const can = (key: string, sub = 'on') => owner || (desk && !!rights[key]?.includes(sub))
    return {
      owner,
      ready: !desk || !!q.data || !!q.error,
      can,
      page: (p) => {
        if (!p.roles.includes(me.role)) return false
        if (!desk) return true
        if (navOff.has(p.label)) return false
        const r = PAGE_RIGHT[p.path]
        return !r || can(r[0], r[1])
      },
      csv: (path) => owner || (desk && !!CSV_RIGHT[path] && can('csv', CSV_RIGHT[path])),
    }
  }, [q.data, q.error, owner, desk, me.role])
}

/** Whether the current page's list may be exported to CSV (YDL "Download CSV Access"). */
export function useCanCsv() {
  const { pathname } = useLocation()
  return useAccess().csv(pathname)
}
