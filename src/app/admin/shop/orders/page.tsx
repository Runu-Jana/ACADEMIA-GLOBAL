import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty,
} from '@/components/admin/admin-ui'
import { FilterBar } from '@/components/admin/filter-bar'
import { ShopOrderControls } from '@/components/admin/shop-order-controls'
import { formatDate } from '@/lib/utils'
import { formatPaise, SHOP_ORDER_STATUSES } from '@/lib/shop'

export const metadata: Metadata = { title: 'Shop Orders' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key]
  return typeof v === 'string' ? v : ''
}

const STATUS_TONE = {
  PENDING: 'warning',
  PAID: 'primary',
  PACKED: 'violet',
  SHIPPED: 'cyan',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
} as const satisfies Record<string, React.ComponentProps<typeof Badge>['tone']>

export default async function AdminShopOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const values = { q: one(sp, 'q'), status: one(sp, 'status') }

  const where: Prisma.ShopOrderWhereInput = {
    ...(values.q && {
      OR: [
        { orderNumber: { contains: values.q, mode: 'insensitive' } },
        { name: { contains: values.q, mode: 'insensitive' } },
        { email: { contains: values.q, mode: 'insensitive' } },
        { phone: { contains: values.q } },
        { trackingNumber: { contains: values.q, mode: 'insensitive' } },
      ],
    }),
    ...(values.status && { status: values.status }),
  }

  const [orders, total, awaiting, revenue] = await Promise.all([
    prisma.shopOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { items: true },
    }),
    prisma.shopOrder.count(),
    // What actually needs a human today: paid, not yet dispatched.
    prisma.shopOrder.count({ where: { status: { in: ['PAID', 'PACKED'] } } }),
    prisma.shopOrder.aggregate({
      _sum: { total: true },
      where: { status: { in: ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'] } },
    }),
  ])

  return (
    <>
      <PageHeader
        title="Shop Orders"
        sub={`${orders.length} of ${total} order${total === 1 ? '' : 's'} · ${formatPaise(revenue._sum.total ?? 0)} collected`}
      />

      {awaiting > 0 && (
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 p-3 text-[13px] dark:border-primary-500/25 dark:bg-primary-500/10">
          <span className="font-semibold text-primary-800 dark:text-primary-200">
            {awaiting} {awaiting === 1 ? 'order is' : 'orders are'} paid and waiting to be dispatched.
          </span>
        </div>
      )}

      <FilterBar
        basePath="/admin/shop/orders"
        values={values}
        searchPlaceholder="Search by order number, name, email, phone or tracking…"
        selects={[
          {
            name: 'status',
            label: 'All statuses',
            options: SHOP_ORDER_STATUSES.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Order</Th>
              <Th>Buyer</Th>
              <Th>Items</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th className="text-right">Fulfilment</Th>
            </Thead>
            <Tbody>
              {orders.length === 0 && (
                <TableEmpty colSpan={6}>
                  No orders match those filters.{' '}
                  <Link href="/admin/shop/orders" className="font-semibold text-primary-600 hover:underline">
                    Reset
                  </Link>
                </TableEmpty>
              )}

              {orders.map((o) => (
                <tr key={o.id} className="align-top transition-colors hover:bg-muted/40">
                  <Td className="whitespace-nowrap">
                    <Link
                      href={`/shop/order/${encodeURIComponent(o.orderNumber)}`}
                      target="_blank"
                      className="group inline-flex items-center gap-1 font-mono font-bold hover:text-primary-600"
                    >
                      {o.orderNumber}
                      <ExternalLink aria-hidden className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </span>
                    {o.trackingNumber && (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {o.courier ? `${o.courier} · ` : ''}
                        <span className="font-mono">{o.trackingNumber}</span>
                      </span>
                    )}
                  </Td>

                  <Td className="max-w-[13rem]">
                    <span className="block truncate font-semibold">{o.name}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">{o.phone}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      {o.city}, {o.state} {o.pincode}
                    </span>
                  </Td>

                  <Td className="max-w-[16rem]">
                    <ul className="space-y-0.5 text-[12px] text-muted-foreground">
                      {o.items.map((i) => (
                        <li key={i.id} className="truncate">
                          {i.title} <span className="whitespace-nowrap">× {i.qty}</span>
                        </li>
                      ))}
                    </ul>
                  </Td>

                  <Td className="whitespace-nowrap">
                    <span className="font-bold tabular-nums">{formatPaise(o.total)}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {o.shipping === 0 ? 'Free delivery' : `incl. ${formatPaise(o.shipping)} delivery`}
                    </span>
                  </Td>

                  <Td>
                    <Badge tone={STATUS_TONE[o.status as keyof typeof STATUS_TONE] ?? 'default'}>
                      {o.status}
                    </Badge>
                  </Td>

                  <Td className="min-w-[13rem] text-right">
                    <ShopOrderControls
                      orderId={o.id}
                      status={o.status}
                      courier={o.courier}
                      trackingNumber={o.trackingNumber}
                    />
                  </Td>
                </tr>
              ))}
            </Tbody>
          </DataTable>
        </TableWrap>
      </div>
    </>
  )
}
