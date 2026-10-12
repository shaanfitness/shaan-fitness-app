import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import { useStudio } from '../../db/studio'
import { cancelMyOrder, cartTotals, myOrders, orderItems, placeOrder, shopProducts, type Order, type OrderStatus, type Product } from '../../db/store'
import { fmtDay } from '../../lib/dates'
import { moneyExact } from '../../lib/format'
import { Notice, TextArea } from '../../components/controls'
import { useToast } from '../../components/toast'
import { Icon, Loading, Sheet } from '../../components/ui'

// Member app: the gym's store (browse, a cart, order and collect at the gym, pay at the counter) and My orders.

function Back({ to = '/app' }: { to?: string }) {
  const { t } = useTranslation()
  return <Link to={to} className="flex items-center gap-1 self-start text-[13px] font-semibold no-underline lg:hidden"><Icon name="chevronLeft" size={16} />{t('app.back')}</Link>
}
const STATUS_CHIP: Record<OrderStatus, string> = { pending: 'chip-amber', confirmed: 'chip-info', collected: 'chip-green', cancelled: 'chip-muted' }

export function MemberStore() {
  const { t } = useTranslation()
  const me = useMe()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: studio } = useStudio()
  const q = useQuery({ queryKey: ['shop', me.studioId], queryFn: () => shopProducts(me.studioId) })
  const [storeId, setStoreId] = useState('')
  const [cat, setCat] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const stores = q.data?.stores ?? []
  const store = stores.find((s) => s.id === storeId) ?? stores[0]
  const cats = (q.data?.categories ?? []).filter((c) => c.store_id === store?.id)
  const items = (q.data?.products ?? []).filter((p) => p.store_id === store?.id)
  const shown = items.filter((p) => !cat || p.category_id === cat)
  const lines = Object.entries(cart).map(([id, qty]) => ({ product: items.find((p) => p.id === id)!, qty })).filter((l) => l.product && l.qty > 0)
  const totals = store ? cartTotals(store, lines) : null
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const setQty = (p: Product, n: number) => setCart((c) => {
    const max = p.stock === null ? 20 : Math.min(20, Number(p.stock))
    const next = { ...c, [p.id]: Math.max(0, Math.min(max, n)) }
    if (!next[p.id]) delete next[p.id]
    return next
  })
  const order = useMutation({
    mutationFn: () => placeOrder({ store_id: store!.id, items: lines.map((l) => ({ product_id: l.product.id, qty: l.qty })), notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shop'] }); qc.invalidateQueries({ queryKey: ['my-orders'] }); toast(t('shop.placed')); setCart({}); setOpen(false); navigate('/app/orders') },
    onError: (e: Error) => toast(e.message),
  })
  const banner = (studio?.settings.center as Record<string, unknown> | undefined)?.ecommerce_banner as string | undefined
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-28 lg:mx-auto lg:max-w-[760px]">
      <Back />
      <div className="flex items-end justify-between gap-3">
        <h1 className="title text-[36px]">{t('shop.title')}</h1>
        <Link to="/app/orders" className="btn btn-sm no-underline"><Icon name="receipt" size={16} />{t('shop.myOrders')}</Link>
      </div>
      {banner && <img src={banner} alt="" className="max-h-40 w-full rounded-2xl object-cover" />}
      {q.isLoading ? <Loading /> : !store ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('shop.closed')}</div> : (
        <>
          {stores.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={t('shop.title')}>
              {stores.map((s) => <button key={s.id} type="button" role="tab" aria-selected={s.id === store.id} onClick={() => { setStoreId(s.id); setCat(''); setCart({}) }}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${s.id === store.id ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>{s.name}</button>)}
            </div>
          )}
          {store.tagline && <p className="m-0 text-[14px] text-muted">{store.tagline}</p>}
          {cats.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={t('shop.categories')}>
              {[{ id: '', name: t('shop.all') }, ...cats].map((c) => <button key={c.id || 'all'} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${cat === c.id ? 'border-gold bg-gold text-on-gold' : 'border-line bg-surface'}`}>{c.name}</button>)}
            </div>
          )}
          {!shown.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('shop.empty')}</div> : (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
              {shown.map((p) => {
                const out = p.stock !== null && Number(p.stock) === 0
                const n = cart[p.id] ?? 0
                return (
                  <li key={p.id} className="card flex flex-col overflow-hidden">
                    {p.image_url ? <img src={p.image_url} alt="" loading="lazy" className="aspect-square w-full object-cover" /> : <div className="flex aspect-square w-full items-center justify-center bg-surface-2 text-muted"><Icon name="receipt" size={28} /></div>}
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <h2 className="m-0 line-clamp-2 text-[14px] font-bold">{p.name}</h2>
                      <div className="text-[14px]"><strong>{moneyExact(p.price)}</strong>{p.mrp && Number(p.mrp) > Number(p.price) ? <span className="ml-1.5 text-[12px] text-muted line-through">{moneyExact(p.mrp)}</span> : null}</div>
                      {p.stock !== null && Number(p.stock) <= 5 && <span className="text-[12px] text-muted">{out ? t('shop.out') : t('shop.left', { n: p.stock })}</span>}
                      <div className="mt-auto pt-1">
                        {!n ? <button type="button" className="btn btn-sm w-full" disabled={out} onClick={() => setQty(p, 1)} aria-label={`${t('shop.add')} ${p.name}`}>{t('shop.add')}</button> : (
                          <div className="flex items-center justify-between gap-2" role="group" aria-label={p.name}>
                            <button type="button" className="icon-btn icon-sm" aria-label={t('shop.less', { name: p.name })} onClick={() => setQty(p, n - 1)}>−</button>
                            <span className="text-[15px] font-bold" aria-live="polite">{n}</span>
                            <button type="button" className="icon-btn icon-sm" aria-label={t('shop.more', { name: p.name })} onClick={() => setQty(p, n + 1)}><Icon name="plus" size={14} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      {count > 0 && totals && (
        <div className="fixed inset-x-0 bottom-[76px] z-20 px-4 lg:bottom-6">
          <button type="button" className="btn-gold mx-auto flex w-full max-w-[560px] justify-between px-5 shadow-lg" onClick={() => setOpen(true)}>
            <span>{t('shop.items', { count })}</span><span>{moneyExact(totals.total)} · {t('shop.viewCart')}</span>
          </button>
        </div>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={t('shop.cart')}>
        {store && totals && (
          <div className="flex flex-col gap-4">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {lines.map((l) => (
                <li key={l.product.id} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="min-w-0 flex-1">{l.product.name}</span>
                  <span className="flex items-center gap-2">
                    <button type="button" className="icon-btn icon-sm" aria-label={t('shop.less', { name: l.product.name })} onClick={() => setQty(l.product, l.qty - 1)}>−</button>
                    <b>{l.qty}</b>
                    <button type="button" className="icon-btn icon-sm" aria-label={t('shop.more', { name: l.product.name })} onClick={() => setQty(l.product, l.qty + 1)}><Icon name="plus" size={14} /></button>
                  </span>
                  <span className="w-20 text-right">{moneyExact(Number(l.product.price) * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line pt-3 text-[14px]">
              {store.gst_type === 'exclusive' && totals.gst > 0 && <><dt className="text-muted">{t('shop.gst')}</dt><dd className="m-0 text-right">{moneyExact(totals.gst)}</dd></>}
              {totals.packing > 0 && <><dt className="text-muted">{t('shop.packing')}</dt><dd className="m-0 text-right">{moneyExact(totals.packing)}</dd></>}
              <dt className="font-bold">{t('shop.total')}</dt><dd className="m-0 text-right font-bold">{moneyExact(totals.total)}</dd>
            </dl>
            <TextArea id="cart-notes" rows={2} value={notes} onChange={setNotes} placeholder={t('shop.notes')} />
            <Notice>{t('shop.howItWorks')}</Notice>
            <button type="button" className="btn-gold" disabled={order.isPending || !lines.length} onClick={() => order.mutate()}>{order.isPending ? t('shop.placing') : t('shop.place')}</button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

export function MemberOrders() {
  const { t } = useTranslation()
  const me = useMe()
  const q = useQuery({ queryKey: ['my-orders', me.memberId], queryFn: () => myOrders(me.memberId!), enabled: !!me.memberId })
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[640px]">
      <Back to="/app/store" />
      <h1 className="title text-[36px]">{t('shop.myOrders')}</h1>
      {q.isLoading ? <Loading /> : !q.data?.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('shop.noOrders')} <Link to="/app/store">{t('shop.title')}</Link></div> : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">{q.data.map((o) => <OrderCard key={o.id} o={o} />)}</ul>
      )}
    </div>
  )
}

function OrderCard({ o }: { o: Order }) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const items = useQuery({ queryKey: ['order-items', o.id], queryFn: () => orderItems(o.id), enabled: open })
  const cancel = useMutation({
    mutationFn: () => cancelMyOrder(o.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-orders'] }); qc.invalidateQueries({ queryKey: ['shop'] }); toast(t('shop.cancelled')) },
    onError: (e: Error) => toast(e.message),
  })
  return (
    <li className="card flex flex-col gap-2 p-4">
      <button type="button" className="flex items-start justify-between gap-3 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span><strong>{o.order_no}</strong><span className="block text-[13px] text-muted">{fmtDay(o.created_at, 'd MMM yyyy')} · {t('shop.items', { count: o.items_count })} · {moneyExact(o.total)}</span></span>
        <span className={`chip ${STATUS_CHIP[o.status]}`}>{t(`shop.status.${o.status}`)}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-line pt-2 text-[14px]">
          {(items.data ?? []).map((i) => <div key={i.id} className="flex justify-between gap-2"><span>{i.name} × {i.qty}</span><span>{moneyExact(i.total)}</span></div>)}
          <div className="flex justify-between gap-2 font-bold"><span>{t('shop.total')}</span><span>{moneyExact(o.total)}</span></div>
          {Number(o.received) > 0 && <div className="flex justify-between gap-2 text-muted"><span>{t('shop.paid')}</span><span>{moneyExact(o.received)}</span></div>}
          {o.status !== 'cancelled' && Number(o.balance) > 0 && <div className="flex justify-between gap-2 text-muted"><span>{t('shop.due')}</span><span>{moneyExact(o.balance)}</span></div>}
          {o.status === 'pending' && <button type="button" className="link-btn self-start text-[13px]" disabled={cancel.isPending} onClick={() => { if (window.confirm(t('shop.confirmCancel'))) cancel.mutate() }}>{t('shop.cancel')}</button>}
        </div>
      )}
    </li>
  )
}
