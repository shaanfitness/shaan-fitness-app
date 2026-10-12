import { supabase } from '../lib/supabase'
import { throwIf } from './studio'

// The gym's store (supabase/migrations/20261012000017_wallet_store.sql): stores, categories, products and orders.

export interface Store {
  id: string; studio_id: string; code: string; name: string; company_name: string; tagline: string | null; description: string | null
  logo_url: string | null; cover_url: string | null; address1: string | null; address2: string | null; city: string | null; state: string | null; country: string | null
  gst_no: string | null; gst_type: 'inclusive' | 'exclusive'; packaging_charges: number; delivery_charge: number; min_amount_for_delivery: number | null; delivers: boolean
  contact_no: string | null; landline_no: string | null; whatsapp_no: string | null; website: string | null; facebook: string | null; instagram: string | null
  twitter: string | null; youtube: string | null; active: boolean; created_by: string | null; created_at: string
}
export interface StoreCategory { id: string; studio_id: string; store_id: string; name: string; active: boolean; seq: number; created_at: string }
export interface Product {
  id: string; studio_id: string; store_id: string; category_id: string | null; name: string; description: string | null; image_url: string | null; sku: string | null
  mrp: number | null; price: number; gst_percent: number; stock: number | null; active: boolean; created_at: string
}
export type OrderStatus = 'pending' | 'confirmed' | 'collected' | 'cancelled'
export type PayStatus = 'paid' | 'pending' | 'cancelled' | 'failed'
export type PayType = 'online' | 'cash' | 'card' | 'upi'
export interface Order {
  id: string; studio_id: string; store_id: string; member_id: string; order_no: string; items_count: number; subtotal: number; gst_amount: number; packaging: number
  delivery_charge: number; total: number; received: number; balance: number; payment_type: PayType | null; order_type: 'pickup' | 'delivery'; status: OrderStatus
  payment_status: PayStatus; delivery_address: string | null; delivery_pincode: string | null; notes: string | null; placed_by_member: boolean; created_by: string | null
  created_at: string; member_name: string; client_code: string | null; member_country_code: string; member_phone: string | null; store_name: string; created_by_name: string | null
}
export interface OrderItem { id: string; order_id: string; product_id: string | null; name: string; qty: number; price: number; gst_percent: number; gst_amount: number; total: number }

export const ORDER_STATUS: [OrderStatus, string][] = [['pending', 'Pending'], ['confirmed', 'Confirmed'], ['collected', 'Collected'], ['cancelled', 'Cancelled']]
export const PAY_STATUS: [PayStatus, string][] = [['paid', 'Paid'], ['pending', 'Pending'], ['cancelled', 'Cancelled'], ['failed', 'Failed']]
export const PAY_TYPES: [PayType, string][] = [['online', 'Online'], ['cash', 'Cash'], ['card', 'Card'], ['upi', 'UPI']]
export const GST_RATES = [0, 5, 12, 18, 28]
export const label = <K extends string>(list: [K, string][], k: K | null | undefined) => list.find(([v]) => v === k)?.[1] ?? '-'

export async function storeList(studioId: string) {
  return throwIf(await supabase.from('stores').select('*').eq('studio_id', studioId).order('created_at')) as Store[]
}
export async function getStore(id: string) {
  return throwIf(await supabase.from('stores').select('*').eq('id', id).single()) as Store
}
export async function saveStore(studioId: string, id: string | null, v: Partial<Store>) {
  const res = id ? await supabase.from('stores').update(v).eq('id', id).select('id').single()
    : await supabase.from('stores').insert({ ...v, studio_id: studioId }).select('id').single()
  return (throwIf(res) as { id: string }).id
}
export async function storeCategories(storeId: string) {
  return throwIf(await supabase.from('store_categories').select('*').eq('store_id', storeId).order('seq').order('name')) as StoreCategory[]
}
export async function products(storeId: string) {
  return throwIf(await supabase.from('products').select('*').eq('store_id', storeId).order('name')) as Product[]
}
/** Everything a member can buy: the gym's active stores and their products in stock. */
export async function shopProducts(studioId: string) {
  const [s, c, p] = await Promise.all([
    supabase.from('stores').select('*').eq('studio_id', studioId).eq('active', true).order('created_at'),
    supabase.from('store_categories').select('*').eq('studio_id', studioId).eq('active', true).order('seq').order('name'),
    supabase.from('products').select('*').eq('studio_id', studioId).eq('active', true).order('name'),
  ])
  return { stores: throwIf(s) as Store[], categories: throwIf(c) as StoreCategory[], products: throwIf(p) as Product[] }
}

export async function orders(a: { studioId: string; storeId?: string; memberId?: string; from?: string; to?: string }) {
  let q = supabase.from('store_order_overview').select('*').eq('studio_id', a.studioId)
  if (a.storeId) q = q.eq('store_id', a.storeId)
  if (a.memberId) q = q.eq('member_id', a.memberId)
  if (a.from) q = q.gte('created_at', `${a.from}T00:00:00+05:30`)
  if (a.to) q = q.lte('created_at', `${a.to}T23:59:59+05:30`)
  return throwIf(await q.order('created_at', { ascending: false }).limit(5000)) as Order[]
}
export async function myOrders(memberId: string) {
  return throwIf(await supabase.from('store_order_overview').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).limit(200)) as Order[]
}
export async function orderItems(orderId: string) {
  return throwIf(await supabase.from('store_order_items').select('*').eq('order_id', orderId).order('name')) as OrderItem[]
}

const rpc = async <T>(fn: string, args: Record<string, unknown>) => {
  const res = await supabase.rpc(fn, args)
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
export const placeOrder = (p: {
  store_id: string; member_id?: string; items: { product_id: string; qty: number }[]; received?: number; payment_type?: PayType | ''; status?: OrderStatus
  order_type?: 'pickup' | 'delivery'; delivery_address?: string; delivery_pincode?: string; notes?: string
}) => rpc<string>('place_store_order', { p })
export const setOrderStatus = (ids: string[], status: OrderStatus) => rpc<number>('set_order_status', { p_ids: ids, p_status: status })
export const updateOrderPayment = (id: string, total: number, received: number, paymentType: PayType | '') =>
  rpc<null>('update_order_payment', { p_id: id, p_total: total, p_received: received, p_payment_type: paymentType || null })
export const cancelMyOrder = (id: string) => rpc<null>('cancel_my_order', { p_id: id })
export const refundOrder = (id: string, toWallet: boolean) => rpc<number>('refund_order', { p_id: id, p_to_wallet: toWallet })
export const orderCounts = (storeId: string) => rpc<{ status: OrderStatus; total: number; today: number }[]>('store_order_counts', { p_store: storeId })

/** The price breakdown of a cart, the same way the database works it out. */
export function cartTotals(store: Pick<Store, 'gst_type' | 'packaging_charges' | 'delivery_charge' | 'min_amount_for_delivery'>, lines: { product: Product; qty: number }[], delivery = false) {
  let sub = 0, gst = 0
  for (const l of lines) {
    const line = Number(l.product.price) * l.qty
    const rate = Number(l.product.gst_percent)
    const tax = store.gst_type === 'exclusive' ? Math.round(line * rate) / 100 : Math.round((line * rate / (100 + rate)) * 100) / 100
    sub += line; gst += tax
  }
  const packing = lines.length ? Number(store.packaging_charges) : 0
  const min = store.min_amount_for_delivery === null ? null : Number(store.min_amount_for_delivery)
  const deliveryCharge = delivery && Number(store.delivery_charge) > 0 && (min === null || sub < min) ? Number(store.delivery_charge) : 0
  const total = sub + (store.gst_type === 'exclusive' ? gst : 0) + packing + deliveryCharge
  return { sub, gst, packing, delivery: deliveryCharge, total: Math.round(total * 100) / 100 }
}
