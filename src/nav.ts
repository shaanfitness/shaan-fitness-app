import type { Role } from './db/types'

// The staff menu, exactly as YDL's: same groups, same order, same names.
// `ydl` is the YDL page each item replaces (see docs/ydl/PAGES.md for its fields, filters and columns).
// `roles` are the default permissions; the owner can change them in Staff › Staff Access Control.
// `extra` marks Shaan Fitness additions that YDL doesn't have.
export interface NavPage {
  path: string
  label: string
  ydl: string
  roles: Role[]
  built?: boolean
  extra?: boolean
}
export interface NavNode {
  label: string
  icon?: string
  page?: NavPage
  children?: NavNode[]
}

const O: Role[] = ['owner']
const D: Role[] = ['owner', 'front_desk']
const DC: Role[] = ['owner', 'front_desk', 'coach']
const ALL: Role[] = ['owner', 'front_desk', 'coach', 'doctor']

const p = (label: string, path: string, ydl: string, roles: Role[], more: Partial<NavPage> = {}): NavNode =>
  ({ label, page: { path, label, ydl, roles, ...more } })
const g = (label: string, children: NavNode[], icon?: string): NavNode => ({ label, icon, children })

export const NAV: NavNode[] = [
  { ...p('Dashboard', '/dashboard', '/fitness-center/dashboard/', D, { built: true }), icon: 'chart' },
  g('Enquiry', [
    p('Add Enquiry', '/enquiries/new', '/merchant/fitness-center/customers/enquiry-form/', D, { built: true }),
    p('Enquiry List', '/enquiries', '/merchant/fitness-center/customers/enquiry-list/', D, { built: true }),
  ], 'userPlus'),
  { ...p('Follow Ups', '/follow-ups', '/merchant/fitness-center/customers/follow-up-list/', DC, { built: true }), icon: 'list' },
  g('Members', [
    p('Add Member', '/members/new', '/fitness-center/customer/basic-information/', D, { built: true }),
    p('Add Quick Member', '/members/quick', '/fitness-center/customer-basic/basic-information/', D, { built: true }),
    p('My Members', '/members', '/merchant/fitness-centers/customers/', DC, { built: true }),
    p('Client DataBase', '/clients', '/merchant/fitness-center/client-database/', D, { built: true }),
    p('Client Referrals', '/clients/referrals', '/merchant/fitness-center/referals-client-database/', D, { built: true }),
    p('Members Birthday Listing', '/members/birthdays', '/merchant/fitness-center/customer-birthday/', D, { built: true }),
    p('Other Branch Members', '/members/other-branches', '/merchant/fitness-centers/other-branch-member/', D, { built: true }),
  ], 'people'),
  g('Analysis', [
    p('Traffic Analysis', '/analysis/traffic', '/gym-traffic/', D, { built: true }),
    p('Members Analysis', '/analysis/members', '/gym-members-report/', D, { built: true }),
    p('Enquiry FollowUp Stage Analysis', '/analysis/enquiry-stages', '/gym-enquiry-report/', D, { built: true }),
    p('Collection Analysis', '/analysis/collection', '/gym-collection-analysis/', O, { built: true }),
    p('Subscriptions Analysis', '/analysis/subscriptions', '/gym-subscription-analysis/', O, { built: true }),
    p('Follow up Analysis', '/analysis/follow-ups', '/followup-analysis/', D, { built: true }),
    p('Conversion Analysis', '/analysis/conversion', '/conversion-analysis/', D, { built: true }),
    p('Enquiry Analysis', '/analysis/enquiries', '/enquiry-analysis/', D, { built: true }),
    p('Enquiry Conversion Report', '/analysis/enquiry-conversion', '/staff-conversion-analysis/', O, { built: true }),
    p('Expense Analysis', '/analysis/expenses', '/gym-expense-analysis/', O, { built: true }),
    p('Profit & Loss Analysis', '/analysis/profit-loss', '/profit-loss-analysis/', O, { built: true }),
    p('Billing Analysis', '/analysis/billing', '/merchant/fitness-center/customers/payments-graph/', O, { built: true }),
    p('Sales Leaderboard', '/analysis/sales-leaderboard', '/sales-leaderboard/', O, { built: true }),
    p('Daily Collection Analysis', '/analysis/daily-collection', '/daily-collection-analysis/', D, { built: true }),
    p('PT Analysis', '/analysis/pt', '/pt-analysis/', O, { built: true }),
    p('Leaderboard', '/analysis/leaderboard', '/tr-sales-leaderboard/', O, { built: true }),
    p('Revenue Forecast', '/analysis/revenue-forecast', '/revenue-forecast/', O, { built: true }),
    p('Weight Loss Analysis', '/analysis/weight-loss', '/merchant/fitness-center/measurement_list/', DC, { built: true }),
    p('Lead Source Analysis', '/analysis/lead-sources', '/lead-source-analysis/', O, { built: true }),
    p('Branch Analysis', '/analysis/branches', '/merchant/fitness-center/multi-branch-analysis/', O, { built: true }),
  ], 'chart'),
  g('Memberships', [
    g('Membership Plans', [
      p('Create Membership Plan', '/plans/new', '/fitness-center/membership-plan/basic-information/', D, { built: true }),
      p('My Membership Plans', '/plans', '/merchant/fitness-center/membership-plan/', D, { built: true }),
    ]),
    p('Subscriptions', '/subscriptions', '/merchant/fitness-center/customers/subscriptions/', D, { built: true }),
    g('Coupon', [
      p('Create Coupon', '/coupons/new', '/fitness-center/customer/coupon-basic-information/', D, { built: true }),
      p('My Coupons', '/coupons', '/fitness-center/customer/coupons-list/', D, { built: true }),
    ]),
    g('Combo Offer', [
      p('Add Combo Offer', '/combos/new', '/merchant/fitness-center/create-combo-offer/', D, { built: true }),
      p('Combo Offer List', '/combos', '/merchant/fitness-center/combo-offer-list/', D, { built: true }),
    ]),
  ], 'receipt'),
  g('Batches & Classes', [
    p('Add Batch', '/batches/new', '/fitness-center/batch/add-batch/', D, { built: true }),
    p('Batch List', '/batches', '/fitness-center/batch/batch-list/', DC, { built: true }),
    p('Class Bookings', '/classes/bookings', '/fitness-center/class/customer-list/0/', DC, { built: true }),
    p('Classes Calender', '/classes/calendar', '/merchant/fitness-center/customers/day-classes/', DC, { built: true }),
    g('Program', [
      p('Add Program', '/programs/new', '/fixed-program/basic-information/', D, { built: true }),
      p('Program List', '/programs', '/fixed-program/list/', DC, { built: true }),
      p('Program Attendance', '/programs/attendance', '/fitness-center/program/program-attendance-list/', DC, { built: true }),
    ]),
    g('Other Options', [
      p('Classes Capacity Info', '/classes/capacity', '/fitness-center/class/class-list/', DC, { built: true }),
      p('Batchwise Attendance List', '/batches/attendance', '/fitness-center/batch/batch-attendance-list/', DC, { built: true }),
      p('Class Waiting List', '/classes/waiting-list', '/fitness-center/class/customer-class-bookings/', DC, { built: true }),
      p('Class Attendance', '/classes/attendance', '/merchant/fitness-center/customers/class-register/', DC, { built: true }),
      p('Cancelled Class Register', '/classes/cancelled', '/merchant/fitness-center/customers/cancel-class-register/', D, { built: true }),
      p('Deleted Class Register', '/classes/deleted', '/merchant/fitness-center/customers/delete-class-register/', D, { built: true }),
      p('Class Feedbacks', '/classes/feedback', '/merchant/fitness-center/customers/class-feedback-listing/', DC, { built: true }),
      p('Daily Booking Appointment', '/appointments/daily', '/merchant/fitness-center/customers/day-classes-appointment/', DC, { built: true }),
    ]),
  ], 'calendar'),
  g('Accounts', [
    g('Account Registers', [
      p('Collection Report', '/registers/collection', '/gym-collection-report/', D, { built: true }),
      p('Receipt Register', '/registers/receipts', '/merchant/fitness-center/customers/payments/', D, { built: true }),
      p('Subscriptions Register', '/registers/subscriptions', '/merchant/fitness-center/customers/sales-resgister/', D, { built: true }),
      p('Cash Register', '/registers/cash', '/merchant/fitness-center/customers/cash-payment-register/', D, { built: true }),
      p('Session Register', '/registers/sessions', '/merchant/fitness-center/customers/pt-register/', D, { built: true }),
      p('Recorded Session Register', '/registers/recorded-sessions', '/merchant/fitness-center/customers/recorded_session/', D, { built: true }),
      p('Deleted Session Register', '/registers/deleted-sessions', '/merchant/fitness-center/customers/delete-pt-register/', D, { built: true }),
      p('Coupon Code Register', '/registers/coupons', '/merchant/fitness-center/customers/coupon-code-register/', D, { built: true }),
      p('Expired Membership Register', '/registers/expired', '/merchant/fitness-center/customers/expiry-membership-resgister/', D, { built: true }),
      p('Expired Session Register', '/registers/expired-sessions', '/merchant/fitness-center/customers/expiry-membership-resgister-future/', D, { built: true }),
      p('Balance Due Register', '/registers/balance-due', '/merchant/fitness-center/customers/balance-due-register/', D, { built: true }),
      p('TAX Register', '/registers/tax', '/merchant/fitness-center/customers/gst-register/', O, { built: true }),
      p('Write Off Register', '/registers/write-offs', '/merchant/fitness-center/customers/write-off-register/', O, { built: true }),
      p('Deleted Subscription Register', '/registers/deleted-subscriptions', '/merchant/fitness-center/customers/deleted-subs-register/', O, { built: true }),
      p('Trial Register', '/registers/trials', '/merchant/fitness-center/customers/trial-subs-register/', D, { built: true }),
      p('Cancel Subscription Register', '/registers/cancelled', '/merchant/fitness-center/customers/cancel-subs-register/', D, { built: true }),
      p('Transfer Register', '/registers/transfers', '/merchant/fitness-center/customers/transfer-subs-register/', D, { built: true }),
      p('Freeze Register', '/registers/freezes', '/merchant/fitness-center/customers/freeze-subs-register/', D, { built: true }),
      p('Upgrade Register', '/registers/upgrades', '/merchant/fitness-center/customers/upgrade-register/', D, { built: true }),
      p('Extension Register', '/registers/extensions', '/merchant/fitness-center/customers/extend-subs-register/', D, { built: true }),
      p('Downgrade Register', '/registers/downgrades', '/merchant/fitness-center/customers/downgrade-subs-register/', D, { built: true }),
      p('Course Orders', '/registers/course-orders', '/fitness-centers/course-my-orders/', D, { built: true }),
      p('Receipt Register Log', '/registers/receipt-log', '/merchant/fitness-center/customers/updated-receipt-register/', O, { built: true }),
      p('Recurring Payments Register', '/registers/recurring', '/merchant/fitness-center/customers/recurring-subs-register/', D, { built: true }),
    ]),
    g('Payroll', [
      p('Payroll Calculator', '/payroll', '/fitness-center/staff/payroll-sales/', D, { built: true }),
      p('Payroll Register', '/payroll/register', '/fitness-center/staff/payroll-register/', D, { built: true }),
    ]),
    g('Expense', [
      p('Expense List', '/expenses', '/fitness-centers/expense/', O, { built: true }),
      p('Vendor List', '/vendors', '/fitness-centers/vendor-list/', O, { built: true }),
    ]),
  ], 'doc'),
  g('Notification & WhatsApp', [
    p('Notification', '/notifications/send', '/send-notification/', D, { built: true }),
    g('WhatsApp (Third Party)', [
      p('QR Manager', '/whatsapp/qr', '/improvised-unofficial-whatsapp/', O, { built: true }),
      p('WhatsApp Settings', '/whatsapp/settings', '/improvised-unofficial-whatsapp-settings/', O, { built: true }),
      p('Messages History', '/whatsapp/history', '/improvised-unofficial-whatsapp-history/', D, { built: true }),
    ]),
    g('SMS', [
      p('Balance & Recharge', '/sms/balance', '/sms-balance/', O, { built: true }),
      p('SMS Settings', '/sms/settings', '/dlt-sms-settings/', O, { built: true }),
      p('Send Bulk Messages', '/sms/bulk', '/dlt-sms-send-bulk-message/', D, { built: true }),
      p('Transactional SMS History', '/sms/history', '/dlt-sms-message-history/', D, { built: true }),
      p('Bulk Campaigns History', '/sms/campaigns', '/dlt-sms-message-bulk-history/', D, { built: true }),
      p('Recharge History', '/sms/recharges', '/dlt-sms-recharge-history/', O, { built: true }),
    ]),
    p('Email', '/email', '/merchant/fitness-center/customers/customer-message-listing/', D, { built: true }),
  ], 'chat'),
  g('Trainers', [
    p('Add Trainer', '/trainers/new', '/fitness-center/trainer/basic-information/', D, { built: true }),
    p('My Trainers', '/trainers', '/merchant/fitness-centers/trainers/', D, { built: true }),
    p('Manage Client Transformations', '/trainers/transformations', '/fitness-center/trainer/client-transformations/', DC, { built: true }),
    p('Trainer Leave Requests', '/trainers/leave', '/fitness-center/trainer/leave-requests/', DC, { built: true }),
  ], 'dumbbell'),
  g('Fitness Center', [
    p('My Fitness Centers', '/centers', '/merchant/fitness-centers/', D, { built: true }),
    p('Fitness Center Settings', '/centers/settings', '/fitness-center/app/settings/', D, { built: true }),
    p('Fitness Center Invoice Settings', '/centers/invoice-settings', '/fitness-center/overall/settings/', D, { built: true }),
    p('Fitness Center Biometric Manager', '/centers/biometric', '/fitness-centers/biometric-manager/', D, { built: true }),
    p('Extended Biometric Manager', '/centers/biometric-extended', '/fitness-centers/extended-biometric-manager/', D, { built: true }),
    p('Fitness Center DLT OTP Manager', '/centers/otp', '/fitness-centers/dlt-otp-manager/', O, { built: true }),
    p('Fitness Center Email Manager', '/centers/email', '/fitness-centers/email-manager/', O, { built: true }),
    p('Fitness Center Holiday', '/centers/holidays', '/fitness-centers/events/', D, { built: true }),
    g('Equipment', [p('Equipment List', '/centers/equipment', '/fitness-center/equipment/list/', D, { built: true })]),
    g('Notices & Rules', [
      p('Notices', '/centers/notices', '/fitness-centers/notices/', D, { built: true }),
      p('Rules', '/centers/rules', '/fitness-centers/rules/', D, { built: true }),
    ]),
    p('Currency Setting', '/centers/currency', '/fitness-centers/change-currency/', O, { built: true }),
    p('Feedback', '/centers/feedback', '/fitness-centers/feedback/', D, { built: true }),
    p('Dropdown Lists', '/settings/lists', '(every YDL dropdown, made editable)', O, { built: true, extra: true }),
    p('Website', '/settings/website', '(public website: words, contact, what it shows)', O, { built: true, extra: true }),
  ], 'settings'),
  g('Staff', [
    p('Add Staff Account', '/staff/new', '/fitness-center/account/basic-information/', D, { built: true }),
    p('Staff List', '/staff', '/merchant/fitness-centers/accounts/', D, { built: true }),
    p('Staff Access Control', '/staff/access', '/merchant/fitness-centers/accounts-access-control/', O, { built: true }),
    p('Staff/Trainer Target', '/staff/targets', '/merchant/fitness-centers/staff-trainer-target/', D, { built: true }),
  ], 'person'),
  g('Attendance Reports', [
    p('Staff & Trainer attendance', '/attendance/staff', '/gym-members-report-data/', D, { built: true }),
    p('Client Attendance', '/attendance/clients', '/merchant/fitness-center/customers/traffic/', DC, { built: true }),
    p('Check-ins Leaderboard', '/attendance/leaderboard', '/merchant/fitness-center/customers/checkins-leaderboard/', DC, { built: true }),
  ], 'qr'),
  g('App Settings', [
    p('On/Off Permission', '/app-settings/permissions', '/fitness-center/app/permission/', D, { built: true }),
    p('Services List', '/app-settings/services', '/fitness-center-categories/', D, { built: true }),
    g('Gallery Image', [
      p('Create Gallery', '/app-settings/gallery/new', '/fitness-center/gallery/basic-information/', D, { built: true }),
      p('Gallery List', '/app-settings/gallery', '/merchant/gallery/gallery-list/', D, { built: true }),
    ]),
    g('Action Item', [
      p('Create Action', '/app-settings/actions/new', '/fitness-center/action/action-item/', D, { built: true }),
      p('Action List', '/app-settings/actions', '/merchant/action-item-list/', D, { built: true }),
    ]),
    g('Quick Action Item', [
      p('Create Quick Action Item', '/app-settings/quick-actions/new', '/fitness-center/action/quick-action-item/', D, { built: true }),
      p('Quick Action Item List', '/app-settings/quick-actions', '/merchant/quick-action-item-list/', D, { built: true }),
    ]),
    g('Banner Image', [
      p('Create Banner', '/app-settings/banners/new', '/fitness-center/banner/basic-information/', D, { built: true }),
      p('Banner List', '/app-settings/banners', '/merchant/banner/banner-list/', D, { built: true }),
    ]),
    p('Add Social Links & QR', '/app-settings/social', '/fitness-center/app/social-link/', D, { built: true }),
    p('Measurement Settings', '/app-settings/measurements', '/fitness-centers/measurement_settings/', D, { built: true }),
    g('Workouts & Diet', [
      g('Workout Plans', [p('My Workout Plans', '/workouts', '/fitness-center/workout-plan/workout-plan-list/', DC, { built: true })]),
      g('Diet Plans', [
        p('My Diet Plans', '/diets', '/fitness-center/workout-plan/diet-plan-list/', DC, { built: true }),
        p('Verify Diet Food Listing', '/diets/foods', '/diet/master-diet-item/', DC, { built: true }),
        p('Verify Diet Recipe Listing', '/recipes/verify', '/fitness-center/workout/client-recipe-list/', DC, { built: true }),
        p('Recipe Listing', '/recipes', '/fitness-center/workout/recipe-list/', DC, { built: true }),
      ]),
      g('Exercises', [p('Exercise List', '/exercises', '/fitness-center/exercise/exercise-list/', DC, { built: true })]),
    ]),
    p('Community', '/community', '/community/pending-home-page/', D, { built: true }),
    g('Challenges', [
      p('Create Challenge', '/challenges/new', '/app-challenge/basic-information/', D, { built: true }),
      p('Challenge List', '/challenges', '/app-challenge/challenge-list/', D, { built: true }),
      p('Create Teams', '/challenges/teams/new', '/app-challenge/group/group-basic-information/', D, { built: true }),
      p('Team List', '/challenges/teams', '/app-challenge/group/group-list/', D, { built: true }),
    ]),
  ], 'sparkle'),
  g('Tutorial & Help Videos', [
    p('Tutorial Videos', '/help/videos', '/all_tutorial_videos/?data=Customer Application', ALL, { built: true }),
    p("Admin Dashboard FAQ's", '/help/faq', '/admin_dashboard/?data=Admin Dashboard', ALL, { built: true }),
  ], 'help'),
  { ...p('Appointments', '/appointments', '/book-appoinment/', DC, { built: true }), icon: 'clock' },
  g('More Options', [
    g('Wallet', [
      g('Categories', [
        p('Create Category', '/wallet/categories/new', '/fitness-center/wallet-category/basic-information/', O, { built: true }),
        p('Category List', '/wallet/categories', '/fitness-center/category/category-list/', O, { built: true }),
      ]),
      g('Activity Plans', [
        p('Create Activity', '/wallet/activities/new', '/fitness-center/activity/basic-information/', O, { built: true }),
        p('My Activity Plans', '/wallet/activities', '/fitness-center/activity/activity-list/', O, { built: true }),
      ]),
      p('Activity Traffic', '/wallet/traffic', '/fitness-center/activity/activity-traffic/', O, { built: true }),
      p('Wallet Register', '/wallet/register', '/fitness-center/activity/activity-register/', O, { built: true }),
    ]),
    g('E-commerce', [
      p('Create Store', '/store/new', '/ecommerce/store/basic-information/', O, { built: true }),
      p('Store List', '/store', '/ecommerce/store-list/', O, { built: true }),
      p('Client Orders', '/store/orders', '/ecommerce/product-order-list/', D, { built: true }),
    ]),
  ], 'more'),
]

// Screens YDL opens from its top bar or from inside lists, not from the menu.
export const EXTRA_PAGES: NavPage[] = [
  { path: '/quick-billing', label: 'Quick Billing', ydl: '/fitness-center/customer/quick-add-customer-subscription/', roles: D, built: true },
  { path: '/notifications', label: 'Notifications', ydl: '/fitness-center/notifications/', roles: D },
  { path: '/batches/import', label: 'Import Batches', ydl: '/fitness-center/batch/csv/import/', roles: D },
  { path: '/plans/import', label: 'Import Membership', ydl: '(Import Membership button on My Membership Plans)', roles: O },
]

export interface FlatPage extends NavPage { trail: string[] }

function flatten(nodes: NavNode[], trail: string[] = []): FlatPage[] {
  return nodes.flatMap((n) => [
    ...(n.page ? [{ ...n.page, trail }] : []),
    ...(n.children ? flatten(n.children, [...trail, n.label]) : []),
  ])
}

export const ALL_PAGES: FlatPage[] = [...flatten(NAV), ...EXTRA_PAGES.map((x) => ({ ...x, trail: [] }))]
export const pageFor = (path: string) => ALL_PAGES.find((x) => x.path === path)

// Keeps only the branches this role may open; a role's overrides come from Staff Access Control.
export function navFor(role: Role, allowed?: (page: NavPage) => boolean): NavNode[] {
  const ok = allowed ?? ((x: NavPage) => x.roles.includes(role))
  const prune = (nodes: NavNode[]): NavNode[] => nodes.flatMap((n) => {
    if (n.page) return ok(n.page) ? [n] : []
    const kids = prune(n.children ?? [])
    return kids.length ? [{ ...n, children: kids }] : []
  })
  return prune(NAV)
}

export const nodeKey = (n: NavNode, trail: string[]) => [...trail, n.label].join(' › ')
export const containsPath = (n: NavNode, path: string): boolean =>
  n.page ? n.page.path === path : (n.children ?? []).some((c) => containsPath(c, path))
