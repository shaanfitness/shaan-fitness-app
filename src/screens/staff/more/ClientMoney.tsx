import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../../../auth'
import { orders, label, PAY_STATUS, type Order } from '../../../db/store'
import { fmtDay } from '../../../lib/dates'
import { moneyExact } from '../../../lib/format'
import { DataTable } from '../../../components/table'
import { Icon } from '../../../components/ui'
import { ClientWallet } from './Wallet'
import { orderChip } from './Store'

// The client profile's "Wallet & Orders" tab (a Shaan Fitness addition): the wallet and the client's store orders.

export function ClientMoneyTab({ memberId, name }: { memberId: string; name: string }) {
  const me = useMe()
  const q = useQuery({ queryKey: ['client-orders', memberId], queryFn: () => orders({ studioId: me.studioId, memberId }) })
  return (
    <div className="flex flex-col gap-6">
      <ClientWallet memberId={memberId} name={name} />
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[17px] font-bold">Store Orders</h2>
          <div className="flex gap-2">
            <Link to={`/store/orders?client=${memberId}`} className="btn btn-sm">All orders</Link>
            <Link to={`/store/orders/new?client=${memberId}`} className="btn-gold min-h-10 px-4"><Icon name="plus" size={18} />Place Order</Link>
          </div>
        </div>
        <DataTable<Order> loading={q.isLoading} rows={(q.data ?? []).slice(0, 20)} rowKey={(o) => o.id} caption="Store orders" empty="No store orders yet."
          columns={[
            { key: 'no', header: 'Order Id', cell: (o) => <strong>{o.order_no}</strong> },
            { key: 'date', header: 'Order Date', cell: (o) => fmtDay(o.created_at) },
            { key: 'items', header: 'Items', className: 'num', cell: (o) => o.items_count },
            { key: 'total', header: 'Total', className: 'num', cell: (o) => moneyExact(o.total) },
            { key: 'bal', header: 'Balance', className: 'num', cell: (o) => moneyExact(o.balance) },
            { key: 'status', header: 'Order Status', cell: (o) => orderChip(o.status) },
            { key: 'pay', header: 'Payment Status', cell: (o) => label(PAY_STATUS, o.payment_status) },
          ]}
          card={(o) => <div className="flex items-start justify-between gap-3"><div><strong>{o.order_no}</strong><div className="text-[13px] text-muted">{fmtDay(o.created_at)} · {moneyExact(o.total)}</div></div>{orderChip(o.status)}</div>} />
      </section>
    </div>
  )
}
