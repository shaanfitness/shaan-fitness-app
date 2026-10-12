import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { supabase } from '../../../lib/supabase'
import { throwIf, useStudio } from '../../../db/studio'
import { uploadStudioMedia } from '../../../db/classes'
import {
  cartTotals, getStore, GST_RATES, label, orderCounts, orderItems, orders, ORDER_STATUS, PAY_STATUS, PAY_TYPES, placeOrder, products, refundOrder, saveStore, setOrderStatus,
  storeCategories, storeList, updateOrderPayment, type Order, type OrderStatus, type PayType, type Product, type Store,
} from '../../../db/store'
import { fmtDateTime, fmtDay, studioToday } from '../../../lib/dates'
import { money, moneyExact } from '../../../lib/format'
import { ActiveChip, CrudList, studioLine, type CrudDef } from '../../../components/crud'
import { Register, type RegisterDef, type RegisterFilter } from '../../../components/register'
import { ClientLookup } from '../../../components/billing'
import { ActionMenu, Checkbox, Field, Notice, RadioGroup, Select, TextArea, TextInput } from '../../../components/controls'
import { DataTable } from '../../../components/table'
import { useToast } from '../../../components/toast'
import { Icon, Loading, PageHeader, Sheet } from '../../../components/ui'

// YDL More Options › E-commerce: Create Store, Store List, the store's page (orders by status, today's orders,
// categories and products) and Client Orders (Update Payment Details, status); plus Place Order for a client.

type Row = { id: string; created_at?: string; active?: boolean } & Record<string, unknown>
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const STATUS_CHIP: Record<OrderStatus, string> = { pending: 'chip-amber', confirmed: 'chip-info', collected: 'chip-green', cancelled: 'chip-muted' }
export const orderChip = (s: OrderStatus) => <span className={`chip ${STATUS_CHIP[s]}`}>{label(ORDER_STATUS, s)}</span>
/** A column title that may wrap, so YDL's wide order list fits the screen. */
const wrap = (h: string) => <span className="whitespace-normal">{h}</span>
const payChip = (s: Order['payment_status']) => <span className={`chip ${s === 'paid' ? 'chip-green' : s === 'pending' ? 'chip-amber' : 'chip-muted'}`}>{label(PAY_STATUS, s)}</span>

// Store List --------------------------------------------------------------------------------------------------------
export function StoreList() {
  const navigate = useNavigate()
  const def: CrudDef<Row> = {
    table: 'stores', title: 'Store Listing', noun: 'Store', addLabel: 'Create Store', basePath: '/store', pageForm: true, order: { column: 'created_at', ascending: true },
    searchText: (r) => `${str(r.name)} ${str(r.code)} ${str(r.description)}`,
    columns: [
      { key: 'code', header: 'Store Code', cell: (r) => str(r.code) },
      { key: 'name', header: 'Store Name', cell: (r) => <div><Link to={`/store/${r.id}`} className="font-semibold">{str(r.name)}</Link><div className="mt-1"><ActiveChip on={r.active} /></div></div> },
      { key: 'desc', header: 'Store Description', cell: (r) => <span className="line-clamp-2 max-w-[420px]">{str(r.description) || '-'}</span> },
    ],
    card: (r) => <div className="flex flex-col gap-1"><Link to={`/store/${r.id}`} className="font-semibold">{str(r.name)}</Link><span className="text-[13px] text-muted">{str(r.code)}</span><ActiveChip on={r.active} /></div>,
    rowActions: (r, edit) => [{ label: 'Edit', onClick: edit }, { label: 'View', onClick: () => navigate(`/store/${r.id}`) }],
    fields: [], emptyText: 'No store yet. Create one to sell supplements, shakers and merchandise.',
  }
  return <CrudList def={def} />
}

// Create / Edit Store ---------------------------------------------------------------------------------------------------
const BLANK = {
  name: '', company_name: '', same: false, tagline: '', description: '', address1: '', address2: '', city: '', state: '', country: 'India', gst_no: '',
  gst_type: 'inclusive', packaging_charges: '', min_amount_for_delivery: '', delivers: false, delivery_charge: '', contact_no: '', landline_no: '', whatsapp_no: '',
  website: '', facebook: '', instagram: '', twitter: '', youtube: '', active: true, logo_url: '', cover_url: '',
}
type StoreValues = typeof BLANK

const valuesOf = (s: Store): StoreValues => {
  const n = (x: number | null) => (x === null ? '' : String(Number(x)))
  return {
    name: s.name, company_name: s.company_name, same: s.company_name === s.name, tagline: s.tagline ?? '', description: s.description ?? '', address1: s.address1 ?? '',
    address2: s.address2 ?? '', city: s.city ?? '', state: s.state ?? '', country: s.country ?? '', gst_no: s.gst_no ?? '', gst_type: s.gst_type,
    packaging_charges: n(s.packaging_charges), min_amount_for_delivery: n(s.min_amount_for_delivery), delivers: s.delivers, delivery_charge: n(s.delivery_charge),
    contact_no: s.contact_no ?? '', landline_no: s.landline_no ?? '', whatsapp_no: s.whatsapp_no ?? '', website: s.website ?? '', facebook: s.facebook ?? '',
    instagram: s.instagram ?? '', twitter: s.twitter ?? '', youtube: s.youtube ?? '', active: s.active, logo_url: s.logo_url ?? '', cover_url: s.cover_url ?? '',
  }
}

export function StoreForm() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['store', id], queryFn: () => getStore(id!), enabled: !!id })
  if (id && q.isLoading) return <Loading />
  if (id && !q.data) return <div className="px-5 py-10"><Notice tone="error">{(q.error as Error)?.message ?? 'Store not found.'}</Notice></div>
  return <StoreFormBody key={id ?? 'new'} id={id ?? null} initial={q.data ? valuesOf(q.data) : BLANK} />
}

function StoreFormBody({ id, initial }: { id: string | null; initial: StoreValues }) {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const [v, setV] = useState<StoreValues>(initial)
  const [logo, setLogo] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof StoreValues>(k: K) => (x: StoreValues[K]) => setV((o) => ({ ...o, [k]: x, ...(k === 'name' && o.same ? { company_name: x as string } : {}) }))
  const save = useMutation({
    mutationFn: async (next: boolean) => {
      const t = (x: string) => x.trim() || null
      const num = (x: string) => (x.trim() === '' ? null : Number(x))
      const row: Partial<Store> = {
        name: v.name.trim(), company_name: (v.same ? v.name : v.company_name).trim(), tagline: t(v.tagline), description: t(v.description), address1: t(v.address1),
        address2: t(v.address2), city: t(v.city), state: t(v.state), country: t(v.country), gst_no: t(v.gst_no.toUpperCase()), gst_type: v.gst_type as Store['gst_type'],
        packaging_charges: num(v.packaging_charges) ?? 0, min_amount_for_delivery: num(v.min_amount_for_delivery), delivers: v.delivers, delivery_charge: num(v.delivery_charge) ?? 0,
        contact_no: t(v.contact_no), landline_no: t(v.landline_no), whatsapp_no: t(v.whatsapp_no), website: t(v.website), facebook: t(v.facebook), instagram: t(v.instagram),
        twitter: t(v.twitter), youtube: t(v.youtube), active: v.active,
        logo_url: logo ? await uploadStudioMedia(me.studioId, 'store', logo) : t(v.logo_url),
        cover_url: cover ? await uploadStudioMedia(me.studioId, 'store', cover) : t(v.cover_url),
      }
      return { sid: await saveStore(me.studioId, id, row), next }
    },
    onSuccess: ({ sid, next }) => {
      qc.invalidateQueries({ queryKey: ['stores'] }); qc.invalidateQueries({ queryKey: ['store', sid] })
      toast(id ? 'Store saved' : 'Store created'); navigate(next ? `/store/${sid}` : '/store')
    },
    onError: (e: Error) => setError(/gst_no/.test(e.message) ? 'Check the GST number (15 characters, e.g. 22AAAAA0000A1Z5).' : e.message),
  })
  const submit = (next: boolean) => {
    setError(null)
    if (!v.name.trim()) return setError('Store Name is required.')
    if (!v.same && !v.company_name.trim()) return setError('Company Name is required.')
    if (v.gst_no.trim() && !/^[0-9]{2}[A-Z0-9]{13}$/.test(v.gst_no.trim().toUpperCase())) return setError('Check the GST number (15 characters, e.g. 22AAAAA0000A1Z5).')
    for (const [k, l] of [['packaging_charges', 'Packaging Charges'], ['min_amount_for_delivery', 'Minimum Amount'], ['delivery_charge', 'Delivery Charge']] as const) {
      if (v[k].trim() && !(Number(v[k]) >= 0)) return setError(`${l} should be 0 or more.`)
    }
    for (const k of ['website', 'facebook', 'instagram', 'twitter', 'youtube'] as const) if (v[k].trim() && !/^https:\/\//i.test(v[k].trim())) return setError('Links should start with https://')
    for (const f of [logo, cover]) if (f && (!f.type.startsWith('image/') || f.size > 5 * 1024 * 1024)) return setError('Pictures should be images up to 5 MB.')
    save.mutate(next)
  }
  const text = (k: keyof StoreValues, l: string, extra: { placeholder?: string; hint?: string; type?: 'text' | 'number' | 'tel' | 'url' } = {}) => (
    <Field label={l} id={`st-${k}`} hint={extra.hint}><TextInput id={`st-${k}`} type={extra.type ?? 'text'} value={String(v[k])} onChange={(x) => set(k)(x as never)} placeholder={extra.placeholder} /></Field>
  )
  return (
    <>
      <PageHeader title={id ? 'Edit Store' : 'Create Store'} sub={studioLine(studio)} actions={<Link to="/store" className="btn btn-sm">Store Listing</Link>} />
      <form className="flex max-w-[900px] flex-col gap-5 px-5 pt-5 pb-10 lg:px-8" noValidate onSubmit={(e) => { e.preventDefault(); submit(true) }}>
        <div className="card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Store Basic Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Store Name" required id="st-name"><TextInput id="st-name" value={v.name} onChange={set('name')} placeholder="eg. Fitness store" /></Field>
            <div className="flex flex-col gap-1">
              <Field label="Company Name" required id="st-company"><TextInput id="st-company" value={v.same ? v.name : v.company_name} onChange={set('company_name')} disabled={v.same} /></Field>
              <Checkbox checked={v.same} onChange={(x) => setV((o) => ({ ...o, same: x, company_name: x ? o.name : o.company_name }))} label="Same as Store Name" />
            </div>
            {text('tagline', 'Tagline', { placeholder: 'eg. Where Trust Build' })}
          </div>
          <Field label="Description" id="st-desc"><TextArea id="st-desc" rows={4} value={v.description} onChange={set('description')} placeholder="Write nice & sweet store description." /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageField id="st-logo" label="Store Logo" current={v.logo_url} file={logo} onFile={setLogo} onRemove={() => set('logo_url')('')} />
            <ImageField id="st-cover" label="Store Cover Pic" current={v.cover_url} file={cover} onFile={setCover} onRemove={() => set('cover_url')('')} />
          </div>
        </div>
        <div className="card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Address and Tax</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {text('address1', 'Address One')}{text('address2', 'Address Two')}{text('city', 'City')}{text('state', 'State')}{text('country', 'Country')}
            {text('gst_no', 'GST No.', { placeholder: 'Eg. 22AAAAA0000A1Z5' })}
          </div>
          <RadioGroup name="st-gst" legend="GST Type" value={v.gst_type} onChange={set('gst_type')} options={[{ value: 'inclusive', label: 'Inclusive' }, { value: 'exclusive', label: 'Exclusive' }]} />
          <p className="m-0 text-[12px] text-muted">Inclusive: product prices already include GST. Exclusive: GST is added on top at checkout.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {text('packaging_charges', 'Packaging Charges (₹)', { type: 'number', hint: 'Added to every order.' })}
          </div>
          <Checkbox checked={v.delivers} onChange={set('delivers')} label="This store also delivers (otherwise orders are collected at the gym)" />
          {v.delivers && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {text('delivery_charge', 'Delivery Charge (₹)', { type: 'number' })}
              {text('min_amount_for_delivery', 'Minimum Amount To Apply Delivery Charge (₹)', { type: 'number', hint: 'Orders below this pay the delivery charge.' })}
            </div>
          )}
        </div>
        <div className="card flex flex-col gap-4 p-5">
          <h2 className="m-0 text-[17px] font-bold">Contact and Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {text('contact_no', 'Contact No.', { type: 'tel' })}{text('landline_no', 'Landline No.', { type: 'tel' })}{text('whatsapp_no', 'Whatsapp No.', { type: 'tel' })}
            {text('website', 'Website Link', { placeholder: 'https://' })}{text('facebook', 'Facebook Link', { placeholder: 'https://' })}{text('instagram', 'Instagram Link', { placeholder: 'https://' })}
            {text('twitter', 'Twitter Link', { placeholder: 'https://' })}{text('youtube', 'Youtube Link', { placeholder: 'https://' })}
          </div>
          <Checkbox checked={v.active} onChange={set('active')} label="Active (members see this store in the app)" />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Link to="/store" className="btn flex-1">Cancel</Link>
          <button type="button" className="btn flex-1" disabled={save.isPending} onClick={() => submit(false)}>Save</button>
          <button type="submit" className="btn-gold flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save & Next'}</button>
        </div>
      </form>
    </>
  )
}

function ImageField({ id, label: l, current, file, onFile, onRemove }: { id: string; label: string; current: string; file: File | null; onFile: (f: File | null) => void; onRemove: () => void }) {
  return (
    <Field label={l} id={id} hint="An image up to 5 MB.">
      <input id={id} type="file" accept="image/*" className="input py-2" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {current && !file && (
        <div className="mt-2 flex items-center gap-3"><img src={current} alt="" className="h-16 w-auto max-w-[160px] rounded-lg border border-line object-cover" />
          <button type="button" className="link-btn text-[13px]" onClick={onRemove}>Check to remove image</button></div>
      )}
    </Field>
  )
}

// The store's page (YDL Store Orders) --------------------------------------------------------------------------------------
export function StoreView() {
  const { id = '' } = useParams()
  const me = useMe()
  const store = useQuery({ queryKey: ['store', id], queryFn: () => getStore(id) })
  const counts = useQuery({ queryKey: ['store-counts', id], queryFn: () => orderCounts(id) })
  const today = studioToday()
  const todays = useQuery({ queryKey: ['store-orders', id, today], queryFn: () => orders({ studioId: me.studioId, storeId: id, from: today, to: today }) })
  const items = useQuery({
    queryKey: ['store-order-items', id, today, (todays.data ?? []).map((o) => o.id).join(',')], enabled: !!todays.data?.length,
    queryFn: async () => throwIf(await supabase.from('store_order_items').select('order_id,name,qty').in('order_id', todays.data!.map((o) => o.id))) as { order_id: string; name: string; qty: number }[],
  })
  if (store.isLoading) return <Loading />
  if (!store.data) return <div className="px-5 py-10"><Notice tone="error">{(store.error as Error)?.message ?? 'Store not found.'}</Notice></div>
  const s = store.data
  const count = (k: OrderStatus) => counts.data?.find((c) => c.status === k)
  const names = (oid: string) => (items.data ?? []).filter((i) => i.order_id === oid).map((i) => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join(', ')
  return (
    <>
      <PageHeader title={s.name} sub={<span className="flex flex-wrap items-center gap-2">{s.code}{s.tagline ? ` · ${s.tagline}` : ''} <ActiveChip on={s.active} /></span>}
        actions={<><Link to={`/store/${s.id}/edit`} className="btn btn-sm"><Icon name="edit" size={16} />Profile</Link><Link to="/store/orders/new" className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Place Order</Link></>} />
      <div className="flex flex-col gap-5 px-5 pt-5 pb-10 lg:px-8">
        {s.cover_url && <img src={s.cover_url} alt="" className="max-h-48 w-full rounded-2xl object-cover" />}
        <section aria-label="My Orders" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(['cancelled', 'pending', 'confirmed', 'collected'] as OrderStatus[]).map((k) => (
            <Link key={k} to={`/store/orders?store=${s.id}&status=${k}`} className="card flex flex-col gap-1 p-4 text-ink no-underline hover:bg-surface-2">
              <span className="text-[13px] font-semibold text-muted">{label(ORDER_STATUS, k)}</span>
              <span className="text-[28px] leading-none font-bold">{count(k)?.total ?? 0}</span>
              <span className="text-[12px] text-muted">{count(k)?.today ?? 0} today</span>
            </Link>
          ))}
        </section>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to={`/store/${s.id}/categories?add=1`} className="card flex items-center gap-3 p-4 text-ink no-underline hover:bg-surface-2"><Icon name="plus" size={20} />Add category in store from here</Link>
          <Link to={`/store/${s.id}/categories`} className="card flex items-center gap-3 p-4 text-ink no-underline hover:bg-surface-2"><Icon name="list" size={20} />View all listed category from here</Link>
          <Link to={`/store/${s.id}/products?add=1`} className="card flex items-center gap-3 p-4 text-ink no-underline hover:bg-surface-2"><Icon name="plus" size={20} />Add Product in the store from here</Link>
          <Link to={`/store/${s.id}/products`} className="card flex items-center gap-3 p-4 text-ink no-underline hover:bg-surface-2"><Icon name="receipt" size={20} />View all listed product from here</Link>
        </section>
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2"><h2 className="m-0 text-[17px] font-bold">My Orders · Today’s Order</h2><Link to={`/store/orders?store=${s.id}`} className="btn btn-sm">See All orders</Link></div>
          <DataTable<Order> loading={todays.isLoading} rows={todays.data ?? []} rowKey={(o) => o.id} caption="Today's orders" empty="No orders today."
            columns={[
              { key: 'id', header: 'Order ID', cell: (o) => <strong>{o.order_no}</strong> },
              { key: 'products', header: 'Product Name', cell: (o) => <span className="line-clamp-2 max-w-[360px]">{names(o.id) || `${o.items_count} items`}</span> },
              { key: 'name', header: 'Customer Name', cell: (o) => <Link to={`/clients/${o.member_id}`}>{o.member_name}</Link> },
              { key: 'pin', header: 'Delivery Pincode', cell: (o) => o.delivery_pincode ?? (o.order_type === 'pickup' ? 'Pickup' : '-') },
              { key: 'status', header: 'Status', cell: (o) => orderChip(o.status) },
            ]}
            card={(o) => <div className="flex items-start justify-between gap-3"><div><strong>{o.order_no}</strong><div className="text-[13px] text-muted">{o.member_name} · {names(o.id)}</div></div>{orderChip(o.status)}</div>} />
        </section>
      </div>
    </>
  )
}

// Categories and products ----------------------------------------------------------------------------------------------------
/** "Add … from here" on the store page opens the add form straight away. */
const addFromLink = () => new URLSearchParams(window.location.search).get('add') === '1'

function useStoreName(id: string) {
  return useQuery({ queryKey: ['store', id], queryFn: () => getStore(id) }).data?.name ?? ''
}
export function StoreCategories() {
  const { id = '' } = useParams()
  const name = useStoreName(id)
  const def: CrudDef<Row> = {
    table: 'store_categories', title: `Categories · ${name}`, noun: 'Category', nounPlural: 'Categories', addLabel: 'Add Category', fixed: { store_id: id },
    order: { column: 'seq', ascending: true }, searchText: (r) => str(r.name),
    columns: [
      { key: 'name', header: 'Category Name', cell: (r) => <strong>{str(r.name)}</strong> },
      { key: 'seq', header: 'Order', className: 'num', cell: (r) => str(r.seq) },
      { key: 'status', header: 'Status', cell: (r) => <ActiveChip on={r.active} /> },
    ],
    card: (r) => <div className="flex flex-col gap-1"><strong>{str(r.name)}</strong><ActiveChip on={r.active} /></div>,
    fields: [
      { key: 'name', label: 'Category Name', type: 'text', required: true, placeholder: 'e.g. Supplements' },
      { key: 'seq', label: 'Order in the app', type: 'number', default: '0' },
      { key: 'active', label: 'Is Active', type: 'yesno', required: true, default: true },
    ],
    emptyText: 'No categories yet. Add one, e.g. Supplements, Accessories, Apparel.',
  }
  return <CrudList def={def} openNew={addFromLink()} header={<div className="flex gap-2"><Link to={`/store/${id}`} className="btn btn-sm"><Icon name="chevronLeft" size={16} />Back to the store</Link><Link to={`/store/${id}/products`} className="btn btn-sm">Products</Link></div>} />
}

export function StoreProducts() {
  const { id = '' } = useParams()
  const name = useStoreName(id)
  const cats = useQuery({ queryKey: ['store_categories', id], queryFn: () => storeCategories(id) }).data ?? []
  const catName = (c: unknown) => cats.find((x) => x.id === c)?.name ?? '-'
  const def: CrudDef<Row> = {
    table: 'products', title: `Products · ${name}`, noun: 'Product', addLabel: 'Add Product', fixed: { store_id: id }, imageFolder: 'products',
    order: { column: 'name', ascending: true }, searchText: (r) => `${str(r.name)} ${str(r.sku)}`, searchPlaceholder: 'Search by product name or SKU',
    filters: (_rows, set) => <ProductFilters categories={cats} onChange={(c, stock) => set((r) => (!c || r.category_id === c) && (!stock || (stock === 'low' ? r.stock !== null && Number(r.stock) <= 5 : r.stock === 0)))} />,
    columns: [
      { key: 'name', header: 'Product', cell: (r) => (
        <div className="flex items-center gap-3">
          {r.image_url ? <img src={str(r.image_url)} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-muted"><Icon name="receipt" size={18} /></span>}
          <div><strong>{str(r.name)}</strong>{r.sku ? <div className="text-[12px] text-muted">SKU {str(r.sku)}</div> : null}</div>
        </div>
      ) },
      { key: 'cat', header: 'Category', cell: (r) => catName(r.category_id) },
      { key: 'price', header: 'Price', className: 'num', cell: (r) => <div><strong>{moneyExact(Number(r.price))}</strong>{r.mrp && Number(r.mrp) > Number(r.price) ? <div className="text-[12px] text-muted line-through">{moneyExact(Number(r.mrp))}</div> : null}</div> },
      { key: 'gst', header: 'GST', className: 'num', cell: (r) => `${Number(r.gst_percent)}%` },
      { key: 'stock', header: 'Stock', className: 'num', cell: (r) => (r.stock === null ? <span className="text-muted">Not counted</span> : Number(r.stock) === 0 ? <span className="chip chip-red">Out of stock</span> : Number(r.stock) <= 5 ? <span className="chip chip-amber">{str(r.stock)} left</span> : str(r.stock)) },
      { key: 'status', header: 'Status', cell: (r) => <ActiveChip on={r.active} /> },
    ],
    card: (r) => <div className="flex flex-col gap-1"><strong>{str(r.name)}</strong><span className="text-[13px] text-muted">{catName(r.category_id)} · {moneyExact(Number(r.price))} · {r.stock === null ? 'stock not counted' : `${str(r.stock)} in stock`}</span><ActiveChip on={r.active} /></div>,
    fields: [
      { key: 'name', label: 'Product Name', type: 'text', required: true },
      { key: 'category_id', label: 'Category', type: 'select', placeholder: 'No category', options: cats.map((c) => ({ value: c.id, label: c.name })) },
      { key: 'price', label: 'Selling Price (₹)', type: 'number', required: true },
      { key: 'mrp', label: 'MRP (₹)', type: 'number', hint: 'Shown struck through when higher than the price.' },
      { key: 'gst_percent', label: 'GST %', type: 'select', default: '18', options: GST_RATES.map((g) => ({ value: String(g), label: `${g}%` })) },
      { key: 'stock', label: 'Stock', type: 'number', hint: 'Empty: not counted. Orders take stock out; cancelled orders put it back.' },
      { key: 'sku', label: 'SKU / Barcode', type: 'text' },
      { key: 'active', label: 'Is Active', type: 'yesno', required: true, default: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'image_url', label: 'Product Image', type: 'image' },
    ],
    validate: (v) => (!(Number(v.price) >= 0) ? 'Enter the selling price.' : v.stock !== '' && v.stock !== null && !(Number.isInteger(Number(v.stock)) && Number(v.stock) >= 0) ? 'Stock should be a whole number, 0 or more.' : null),
    emptyText: 'No products yet.',
  }
  return <CrudList def={def} openNew={addFromLink()} header={<div className="flex gap-2"><Link to={`/store/${id}`} className="btn btn-sm"><Icon name="chevronLeft" size={16} />Back to the store</Link><Link to={`/store/${id}/categories`} className="btn btn-sm">Categories</Link></div>} />
}
function ProductFilters({ categories, onChange }: { categories: { id: string; name: string }[]; onChange: (cat: string, stock: string) => void }) {
  const [c, setC] = useState('')
  const [s, setS] = useState('')
  return (
    <>
      <Select small ariaLabel="Category" value={c} onChange={(x) => { setC(x); onChange(x, s) }} placeholder="All Categories" className="w-auto" options={categories.map((x) => ({ value: x.id, label: x.name }))} />
      <Select small ariaLabel="Stock" value={s} onChange={(x) => { setS(x); onChange(c, x) }} placeholder="Any stock" className="w-auto" options={[{ value: 'low', label: '5 or fewer left' }, { value: 'out', label: 'Out of stock' }]} />
    </>
  )
}

// Client Orders ----------------------------------------------------------------------------------------------------------------
export function ClientOrders() {
  const me = useMe()
  const params = new URLSearchParams(useLocation().search)
  const storeFilter = params.get('store')
  const statusFilter = params.get('status') as OrderStatus | null
  const clientFilter = params.get('client')
  const [view, setView] = useState<Order | null>(null)
  const [pay, setPay] = useState<Order | null>(null)
  const stores = useQuery({ queryKey: ['stores', me.studioId], queryFn: () => storeList(me.studioId) }).data ?? []
  const def: RegisterDef<Order> = {
    title: 'Orders Listing', view: 'store_order_overview', dateCol: 'created_at', dateLabel: 'Order Date',
    base: (q) => {
      let x = q
      if (storeFilter) x = x.eq('store_id', storeFilter)
      if (statusFilter) x = x.eq('status', statusFilter)
      if (clientFilter) x = x.eq('member_id', clientFilter)
      return x
    },
    search: ['member_name', 'client_code', 'order_no'], searchPlaceholder: 'Search by name, code or order id',
    filters: () => {
      const fs: RegisterFilter[] = [
        { key: 'type', placeholder: 'Select Payment Type', options: PAY_TYPES.map(([v, l]) => ({ value: v, label: l })), apply: (q, v) => q.eq('payment_type', v) },
        { key: 'pay', placeholder: 'Select Payment Status', options: PAY_STATUS.map(([v, l]) => ({ value: v, label: l })), apply: (q, v) => q.eq('payment_status', v) },
        { key: 'status', placeholder: 'Select Order Status', options: ORDER_STATUS.map(([v, l]) => ({ value: v, label: l })), apply: (q, v) => q.eq('status', v) },
      ]
      if (stores.length > 1) fs.push({ key: 'store', placeholder: 'All Stores', options: stores.map((s) => ({ value: s.id, label: s.name })), apply: (q, v) => q.eq('store_id', v) })
      return fs
    },
    order: [['created_at', false]],
    columns: () => [
      { key: 'name', header: 'Customer Name', cell: (o) => <div><Link to={`/clients/${o.member_id}`} className="font-semibold">{o.member_name}</Link><div className="text-[12px] text-muted">{o.client_code}</div></div> },
      { key: 'id', header: 'Order Id', cell: (o) => <button type="button" className="link-btn font-semibold" onClick={() => setView(o)}>{o.order_no}</button> },
      { key: 'date', header: wrap('Order Date'), cell: (o) => <span className="whitespace-nowrap">{fmtDay(o.created_at)}</span> },
      { key: 'items', header: wrap('Total Items Count'), className: 'num', cell: (o) => o.items_count },
      { key: 'total', header: wrap('Total Price'), className: 'num', cell: (o) => moneyExact(o.total) },
      { key: 'recv', header: wrap('Received Amount'), className: 'num', cell: (o) => moneyExact(o.received) },
      { key: 'bal', header: wrap('Balance Amount'), className: 'num', cell: (o) => <strong className={Number(o.balance) > 0 && o.status !== 'cancelled' ? 'text-amber' : ''}>{moneyExact(o.balance)}</strong> },
      { key: 'ptype', header: wrap('Payment Type'), cell: (o) => label(PAY_TYPES, o.payment_type) },
      { key: 'otype', header: wrap('Order Type'), cell: (o) => (o.order_type === 'pickup' ? 'Pickup' : 'Delivery') },
      { key: 'status', header: wrap('Order Status'), cell: (o) => orderChip(o.status) },
      { key: 'pstatus', header: wrap('Payment Status'), cell: (o) => <div>{payChip(o.payment_status)}{o.status === 'cancelled' && Number(o.received) > 0 ? <div className="mt-1 text-[12px] text-amber">Refund due</div> : null}</div> },
      { key: 'act', header: 'Action', width: 90, cell: (o) => <ActionMenu actions={[
        { label: 'View Order', onClick: () => setView(o) },
        { label: 'Update Payment Details', onClick: () => setPay(o), hidden: o.status === 'cancelled' },
        { label: 'Refund', onClick: () => setView(o), hidden: !(o.status === 'cancelled' && Number(o.received) > 0) },
      ]} /> },
    ],
    card: (o) => (
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setView(o)}>
        <div><strong>{o.order_no}</strong> · {o.member_name}<div className="text-[13px] text-muted">{fmtDay(o.created_at)} · {o.items_count} item{o.items_count === 1 ? '' : 's'} · {moneyExact(o.total)}{Number(o.balance) > 0 && o.status !== 'cancelled' ? ` · due ${moneyExact(o.balance)}` : ''}</div></div>
        <div className="flex flex-col items-end gap-1">{orderChip(o.status)}{payChip(o.payment_status)}</div>
      </button>
    ),
    totals: (rows) => {
      const live = rows.filter((o) => o.status !== 'cancelled')
      return [['Orders', String(live.length)], ['Total', money(live.reduce((s, o) => s + Number(o.total), 0))], ['Received', money(live.reduce((s, o) => s + Number(o.received), 0))],
        ['Balance', money(live.reduce((s, o) => s + Number(o.balance), 0))]]
    },
    csv: () => [['Customer Name', (o) => o.member_name], ['Code', (o) => o.client_code], ['Order Id', (o) => o.order_no], ['Order Date', (o) => fmtDay(o.created_at)],
      ['Total Items Count', (o) => o.items_count], ['Total Price', (o) => o.total], ['Received Amount', (o) => o.received], ['Balance Amount', (o) => o.balance],
      ['Payment Type', (o) => label(PAY_TYPES, o.payment_type)], ['Order Type', (o) => o.order_type], ['Order Status', (o) => label(ORDER_STATUS, o.status)],
      ['Payment Status', (o) => label(PAY_STATUS, o.payment_status)], ['Store', (o) => o.store_name]],
    bulk: (picked, done) => <BulkStatus ids={picked.map((o) => o.id)} done={done} />,
    actions: () => <Link to={`/store/orders/new${clientFilter ? `?client=${clientFilter}` : ''}`} className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Place Order</Link>,
    notice: (storeFilter || statusFilter || clientFilter) ? <Notice>Showing {statusFilter ? `${label(ORDER_STATUS, statusFilter).toLowerCase()} ` : ''}orders{storeFilter ? ` of ${stores.find((s) => s.id === storeFilter)?.name ?? 'one store'}` : ''}{clientFilter ? ' of one client' : ''}. <Link to="/store/orders">Show all orders</Link></Notice> : undefined,
  }
  return (
    <>
      <Register key={`${storeFilter}-${statusFilter}-${clientFilter}`} def={def} />
      <Sheet wide open={!!view} onClose={() => setView(null)} title={view ? `Order ${view.order_no}` : ''}>{view && <OrderDetails order={view} onPay={() => { setPay(view); setView(null) }} onDone={() => setView(null)} />}</Sheet>
      <Sheet open={!!pay} onClose={() => setPay(null)} title="Update Payment Details">{pay && <PaymentForm order={pay} onDone={() => setPay(null)} />}</Sheet>
    </>
  )
}

function BulkStatus({ ids, done }: { ids: string[]; done: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: (s: OrderStatus) => setOrderStatus(ids, s),
    onSuccess: (n, s) => { qc.invalidateQueries({ queryKey: ['store-counts'] }); qc.invalidateQueries({ queryKey: ['store-orders'] }); toast(`${n} order${n === 1 ? '' : 's'} marked ${label(ORDER_STATUS, s).toLowerCase()}`); done() },
    onError: (e: Error) => toast(e.message),
  })
  return (
    <>
      <button type="button" className="btn btn-sm" disabled={m.isPending} onClick={() => m.mutate('confirmed')}>Confirm</button>
      <button type="button" className="btn btn-sm" disabled={m.isPending} onClick={() => m.mutate('collected')}>Collected</button>
      <button type="button" className="btn btn-sm btn-danger" disabled={m.isPending} onClick={() => { if (window.confirm(`Cancel ${ids.length} order${ids.length === 1 ? '' : 's'}? Their stock goes back.`)) m.mutate('cancelled') }}>Cancel Orders</button>
    </>
  )
}

function OrderDetails({ order: o, onPay, onDone }: { order: Order; onPay: () => void; onDone: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const items = useQuery({ queryKey: ['order-items', o.id], queryFn: () => orderItems(o.id) })
  const refund = useMutation({
    mutationFn: (toWallet: boolean) => refundOrder(o.id, toWallet),
    onSuccess: (amt, toWallet) => { qc.invalidateQueries({ queryKey: ['registers'] }); qc.invalidateQueries({ queryKey: ['wallet'] }); toast(`${moneyExact(amt)} refunded${toWallet ? ' to the wallet' : ''}`); onDone() },
    onError: (e: Error) => toast(e.message),
  })
  const m = useMutation({
    mutationFn: (s: OrderStatus) => setOrderStatus([o.id], s),
    onSuccess: (_n, s) => { qc.invalidateQueries({ queryKey: ['registers'] }); qc.invalidateQueries({ queryKey: ['store-counts'] }); qc.invalidateQueries({ queryKey: ['store-orders'] }); toast(`Order ${o.order_no} ${label(ORDER_STATUS, s).toLowerCase()}`); onDone() },
    onError: (e: Error) => toast(e.message),
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">{orderChip(o.status)}{payChip(o.payment_status)}<span className="text-[13px] text-muted">{fmtDateTime(o.created_at)} · {o.store_name} · {o.placed_by_member ? 'from the app' : `by ${o.created_by_name ?? 'the desk'}`}</span></div>
      <div className="text-[14px]"><Link to={`/clients/${o.member_id}`} className="font-semibold">{o.member_name}</Link> ({o.client_code}){o.member_phone ? ` · ${o.member_country_code} ${o.member_phone}` : ''}</div>
      {o.order_type === 'delivery' && <div className="text-[14px]">Deliver to: {o.delivery_address} {o.delivery_pincode}</div>}
      {o.notes && <Notice>{o.notes}</Notice>}
      <table className="tbl text-[14px]">
        <thead><tr><th>Product</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Total</th></tr></thead>
        <tbody>
          {(items.data ?? []).map((i) => <tr key={i.id}><td>{i.name}{Number(i.gst_percent) ? <span className="text-[12px] text-muted"> · GST {Number(i.gst_percent)}%</span> : null}</td><td className="num">{i.qty}</td><td className="num">{moneyExact(i.price)}</td><td className="num">{moneyExact(i.total)}</td></tr>)}
        </tbody>
      </table>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[14px]">
        <dt className="text-muted">Items</dt><dd className="m-0 text-right">{moneyExact(o.subtotal)}</dd>
        {Number(o.gst_amount) > 0 && <><dt className="text-muted">GST {o.gst_amount && o.total > o.subtotal + o.packaging + o.delivery_charge ? '(added)' : '(included)'}</dt><dd className="m-0 text-right">{moneyExact(o.gst_amount)}</dd></>}
        {Number(o.packaging) > 0 && <><dt className="text-muted">Packaging</dt><dd className="m-0 text-right">{moneyExact(o.packaging)}</dd></>}
        {Number(o.delivery_charge) > 0 && <><dt className="text-muted">Delivery</dt><dd className="m-0 text-right">{moneyExact(o.delivery_charge)}</dd></>}
        <dt className="font-bold">Total</dt><dd className="m-0 text-right font-bold">{moneyExact(o.total)}</dd>
        <dt className="text-muted">Received{o.payment_type ? ` (${label(PAY_TYPES, o.payment_type)})` : ''}</dt><dd className="m-0 text-right">{moneyExact(o.received)}</dd>
        <dt className="text-muted">Balance</dt><dd className="m-0 text-right">{moneyExact(o.balance)}</dd>
      </dl>
      {o.status === 'cancelled' && Number(o.received) > 0 && (
        <div className="flex flex-col gap-2">
          <Notice tone="warn">{moneyExact(o.received)} was received for this cancelled order. Give it back:</Notice>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold flex-1" disabled={refund.isPending} onClick={() => refund.mutate(true)}>Refund to Wallet</button>
            <button type="button" className="btn flex-1" disabled={refund.isPending} onClick={() => refund.mutate(false)}>Refunded at the counter</button>
          </div>
        </div>
      )}
      {o.status !== 'cancelled' && (
        <div className="flex flex-wrap gap-2">
          {o.status === 'pending' && <button type="button" className="btn-gold flex-1" disabled={m.isPending} onClick={() => m.mutate('confirmed')}>Confirm Order</button>}
          {o.status !== 'collected' && <button type="button" className="btn flex-1" disabled={m.isPending} onClick={() => m.mutate('collected')}>Mark Collected</button>}
          <button type="button" className="btn flex-1" onClick={onPay}>Update Payment Details</button>
          <button type="button" className="btn btn-danger flex-1" disabled={m.isPending} onClick={() => { if (window.confirm(Number(o.received) > 0 ? `Cancel this order? Its stock goes back, and you can then refund the ${moneyExact(o.received)} received.` : 'Cancel this order? Its stock goes back.')) m.mutate('cancelled') }}>Cancel Order</button>
        </div>
      )}
    </div>
  )
}

function PaymentForm({ order: o, onDone }: { order: Order; onDone: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [total, setTotal] = useState(String(Number(o.total)))
  const [recv, setRecv] = useState(String(Number(o.received)))
  const [type, setType] = useState<PayType | ''>(o.payment_type ?? 'cash')
  const [error, setError] = useState<string | null>(null)
  const balance = Math.max(0, (Number(total) || 0) - (Number(recv) || 0))
  const m = useMutation({
    mutationFn: () => updateOrderPayment(o.id, Number(total), Number(recv), type),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['registers'] }); toast('Payment details saved'); onDone() },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
      e.preventDefault(); setError(null)
      if (!(Number(total) >= 0) || total === '') return setError('Enter the total price.')
      if (!(Number(recv) >= 0) || recv === '' || Number(recv) > Number(total)) return setError('The received amount should be between 0 and the total.')
      m.mutate()
    }}>
      <Field label="Total Price (₹)" id="op-total" hint={Number(total) < Number(o.total) ? `A discount of ${moneyExact(Number(o.total) - Number(total))}` : undefined}><TextInput id="op-total" type="number" inputMode="decimal" value={total} onChange={setTotal} /></Field>
      <Field label="Received Amount (₹)" id="op-recv"><TextInput id="op-recv" type="number" inputMode="decimal" value={recv} onChange={setRecv} /></Field>
      <Field label="Payment Type" id="op-type"><Select id="op-type" value={type} onChange={(x) => setType(x as PayType)} options={PAY_TYPES.map(([v, l]) => ({ value: v, label: l }))} /></Field>
      <p className="m-0 text-[15px]">Balance Amount: <strong>{moneyExact(balance)}</strong></p>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2"><button type="button" className="btn flex-1" onClick={onDone}>Cancel</button><button type="submit" className="btn-gold flex-1" disabled={m.isPending}>Save</button></div>
    </form>
  )
}

// Place Order (for a client) ---------------------------------------------------------------------------------------------------
export function AddOrder() {
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const preset = new URLSearchParams(useLocation().search).get('client')
  const presetClient = useQuery({
    queryKey: ['order-client', preset], enabled: !!preset,
    queryFn: async () => throwIf(await supabase.from('members').select('id,full_name,member_code,enquiry_code').eq('id', preset!).single()) as { id: string; full_name: string; member_code: string | null; enquiry_code: string | null },
  })
  const stores = useQuery({ queryKey: ['stores', me.studioId], queryFn: () => storeList(me.studioId) })
  const live = (stores.data ?? []).filter((s) => s.active)
  const [storeId, setStoreId] = useState('')
  const store = live.find((s) => s.id === storeId) ?? live[0]
  const prods = useQuery({ queryKey: ['products', store?.id], queryFn: () => products(store!.id), enabled: !!store })
  const cats = useQuery({ queryKey: ['store_categories', store?.id], queryFn: () => storeCategories(store!.id), enabled: !!store })
  const [client, setClient] = useState<{ id: string; label: string } | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('')
  const [f, setF] = useState({ status: 'confirmed' as OrderStatus, payment_type: 'cash' as PayType | '', received: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const who = client ?? (presetClient.data ? { id: presetClient.data.id, label: `${presetClient.data.member_code ?? presetClient.data.enquiry_code ?? ''} ${presetClient.data.full_name}`.trim() } : null)
  const list = (prods.data ?? []).filter((p) => p.active && (!cat || p.category_id === cat) && (!search || `${p.name} ${p.sku ?? ''}`.toLowerCase().includes(search.toLowerCase())))
  const lines = Object.entries(cart).map(([pid, qty]) => ({ product: (prods.data ?? []).find((p) => p.id === pid)!, qty })).filter((l) => l.product && l.qty > 0)
  const totals = store ? cartTotals(store, lines) : null
  const setQty = (p: Product, q: number) => setCart((c) => {
    const max = p.stock === null ? 99 : Math.min(99, Number(p.stock))
    const n = { ...c, [p.id]: Math.max(0, Math.min(max, q)) }
    if (!n[p.id]) delete n[p.id]
    return n
  })
  const save = useMutation({
    mutationFn: () => placeOrder({
      store_id: store!.id, member_id: who!.id, items: lines.map((l) => ({ product_id: l.product.id, qty: l.qty })), status: f.status,
      payment_type: f.payment_type, received: f.received ? Number(f.received) : 0, notes: f.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registers'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['store-counts'] })
      toast('Order placed'); navigate(preset ? `/store/orders?client=${preset}` : '/store/orders')
    },
    onError: (e: Error) => setError(e.message),
  })
  const submit = () => {
    setError(null)
    if (!who) return setError('Look the client up first.')
    if (!lines.length) return setError('Add at least one product.')
    if (f.received && (!(Number(f.received) >= 0) || Number(f.received) > (totals?.total ?? 0))) return setError('The amount received should be between 0 and the total.')
    if (Number(f.received) > 0 && !f.payment_type) return setError('Choose how the client paid.')
    save.mutate()
  }
  if (stores.isLoading) return <Loading />
  if (!store) return <><PageHeader title="Place Order" /><div className="px-5 pt-5 lg:px-8"><Notice>There is no active store yet. {me.role === 'owner' ? <Link to="/store/new">Create the store</Link> : 'Ask the owner to create the store.'} first.</Notice></div></>
  return (
    <>
      <PageHeader title="Place Order" sub={store.name} actions={<Link to="/store/orders" className="btn btn-sm">Orders Listing</Link>} />
      <div className="grid grid-cols-1 gap-5 px-5 pt-5 pb-10 lg:grid-cols-[1fr_380px] lg:px-8">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="card flex flex-col gap-3 p-4">
            {who && !client ? <p className="m-0 text-[14px]">Client: <strong>{who.label}</strong> <button type="button" className="link-btn text-[13px]" onClick={() => setClient(null)}>Change</button></p> : null}
            {(!who || client) && <ClientLookup id="or-client" label="Select A Client" required onFound={setClient} />}
            {live.length > 1 && <Field label="Store" id="or-store"><Select id="or-store" value={store.id} onChange={(x) => { setStoreId(x); setCart({}) }} options={live.map((s) => ({ value: s.id, label: s.name }))} /></Field>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <TextInput small value={search} onChange={setSearch} placeholder="Search products" className="pl-9" ariaLabel="Search products" />
            </div>
            <Select small ariaLabel="Category" value={cat} onChange={setCat} placeholder="All Categories" className="w-auto" options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          </div>
          {prods.isLoading ? <Loading /> : !list.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">No products{search || cat ? ' match' : ' yet'}.</div> : (
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => {
                const q = cart[p.id] ?? 0
                const out = p.stock !== null && Number(p.stock) === 0
                return (
                  <li key={p.id} className="card flex gap-3 p-3">
                    {p.image_url ? <img src={p.image_url} alt="" className="h-16 w-16 flex-none rounded-lg object-cover" /> : <span className="flex h-16 w-16 flex-none items-center justify-center rounded-lg bg-surface-2 text-muted"><Icon name="receipt" size={20} /></span>}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <strong className="truncate text-[14px]">{p.name}</strong>
                      <span className="text-[13px]">{moneyExact(p.price)}{p.stock !== null ? <span className="text-muted"> · {out ? 'out of stock' : `${p.stock} left`}</span> : null}</span>
                      <QtyStepper name={p.name} qty={q} disabled={out} onChange={(n) => setQty(p, n)} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <aside className="card flex h-fit flex-col gap-4 p-4 lg:sticky lg:top-4">
          <h2 className="m-0 text-[17px] font-bold">Order</h2>
          {!lines.length ? <p className="m-0 text-[14px] text-muted">Add products from the list.</p> : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {lines.map((l) => <li key={l.product.id} className="flex justify-between gap-2 text-[14px]"><span>{l.product.name} × {l.qty}</span><span>{moneyExact(Number(l.product.price) * l.qty)}</span></li>)}
            </ul>
          )}
          {totals && lines.length > 0 && (
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line pt-3 text-[14px]">
              {store.gst_type === 'exclusive' && totals.gst > 0 && <><dt className="text-muted">GST</dt><dd className="m-0 text-right">{moneyExact(totals.gst)}</dd></>}
              {totals.packing > 0 && <><dt className="text-muted">Packaging</dt><dd className="m-0 text-right">{moneyExact(totals.packing)}</dd></>}
              <dt className="font-bold">Total</dt><dd className="m-0 text-right font-bold">{moneyExact(totals.total)}</dd>
              {store.gst_type === 'inclusive' && totals.gst > 0 && <dd className="col-span-2 m-0 text-[12px] text-muted">Includes GST of {moneyExact(totals.gst)}</dd>}
            </dl>
          )}
          <Field label="Order Status" id="or-status"><Select id="or-status" value={f.status} onChange={(x) => setF({ ...f, status: x as OrderStatus })} options={ORDER_STATUS.filter(([v]) => v !== 'cancelled').map(([v, l]) => ({ value: v, label: l }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Received (₹)" id="or-recv"><TextInput id="or-recv" type="number" inputMode="decimal" value={f.received} onChange={(x) => setF({ ...f, received: x })} placeholder="0" /></Field>
            <Field label="Payment Type" id="or-pay"><Select id="or-pay" value={f.payment_type} onChange={(x) => setF({ ...f, payment_type: x as PayType })} options={PAY_TYPES.map(([v, l]) => ({ value: v, label: l }))} /></Field>
          </div>
          {totals && lines.length > 0 && <button type="button" className="link-btn self-start text-[13px]" onClick={() => setF({ ...f, received: String(totals.total) })}>Received in full ({moneyExact(totals.total)})</button>}
          <Field label="Notes" id="or-notes"><TextArea id="or-notes" rows={2} value={f.notes} onChange={(x) => setF({ ...f, notes: x })} /></Field>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="button" className="btn-gold" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Placing…' : 'Place Order'}</button>
        </aside>
      </div>
    </>
  )
}

export function QtyStepper({ name, qty, onChange, disabled }: { name: string; qty: number; onChange: (n: number) => void; disabled?: boolean }) {
  if (!qty) return <button type="button" className="btn btn-sm self-start" disabled={disabled} aria-label={`Add ${name}`} onClick={() => onChange(1)}><Icon name="plus" size={15} />Add</button>
  return (
    <div className="flex items-center gap-2 self-start" role="group" aria-label={`${name} quantity`}>
      <button type="button" className="icon-btn icon-sm" aria-label={`One less ${name}`} onClick={() => onChange(qty - 1)}>−</button>
      <span className="min-w-6 text-center text-[14px] font-bold" aria-live="polite">{qty}</span>
      <button type="button" className="icon-btn icon-sm" aria-label={`One more ${name}`} onClick={() => onChange(qty + 1)}><Icon name="plus" size={14} /></button>
    </div>
  )
}
