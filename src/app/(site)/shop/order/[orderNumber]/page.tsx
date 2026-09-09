import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Package, Truck, Home, ChevronRight, Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { formatPaise } from '@/lib/shop'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Order',
  // Order pages are keyed by a reference that arrives in email; never index them.
  robots: { index: false, follow: false },
}

/** The fulfilment ladder as a buyer sees it. */
const STEPS = [
  { key: 'PAID', label: 'Order confirmed', icon: CheckCircle2 },
  { key: 'PACKED', label: 'Packed', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
] as const

const STEP_ORDER = STEPS.map((s) => s.key) as string[]

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'default'> = {
  PENDING: 'warning',
  PAID: 'primary',
  PACKED: 'primary',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { orderNumber } = await params
  const { just_paid } = await searchParams

  const order = await prisma.shopOrder.findUnique({
    where: { orderNumber: decodeURIComponent(orderNumber) },
    include: { items: { include: { product: { select: { slug: true } } } } },
  })

  if (!order) notFound()

  const currentStep = STEP_ORDER.indexOf(order.status)
  const closed = order.status === 'CANCELLED' || order.status === 'REFUNDED'
  const justPaid = just_paid === '1'

  return (
    <div className="container max-w-3xl py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <Link href="/shop" className="hover:text-primary-600">Shop</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">Order</span>
      </nav>

      {justPaid && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-[15px] font-extrabold text-emerald-800 dark:text-emerald-200">
              Payment successful
            </p>
            <p className="mt-0.5 text-[13px] text-emerald-700 dark:text-emerald-300/90">
              A confirmation has been emailed to {order.email}. We&apos;ll dispatch within two working days.
            </p>
          </div>
        </div>
      )}

      <div className="card-base p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">
              Order reference
            </p>
            <p className="font-display text-2xl font-extrabold tracking-tight">{order.orderNumber}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <Clock aria-hidden className="h-3.5 w-3.5" />
              Placed {formatDate(order.createdAt)}
            </p>
          </div>
          <Badge tone={STATUS_TONE[order.status] ?? 'default'}>{order.status}</Badge>
        </div>

        {/* ------------------------------------------------------- progress */}
        {!closed && order.status !== 'PENDING' && (
          <ol className="mt-6 grid grid-cols-4 gap-1">
            {STEPS.map((step, i) => {
              const done = i <= currentStep
              const Icon = step.icon
              return (
                <li key={step.key} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={cn(
                      'grid h-9 w-9 place-items-center rounded-full border-2 transition-colors',
                      done
                        ? 'border-transparent bg-primary-600 text-white'
                        : 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    <Icon aria-hidden className="h-4 w-4" />
                  </span>
                  <span className={cn('text-[10.5px] font-bold leading-tight', !done && 'text-muted-foreground')}>
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        {order.trackingNumber && (
          <div className="mt-5 rounded-xl bg-muted/50 p-3.5 text-[13px]">
            <p className="font-bold">Tracking</p>
            <p className="mt-0.5 text-muted-foreground">
              {order.courier ? `${order.courier} · ` : ''}
              <span className="font-mono font-semibold text-foreground">{order.trackingNumber}</span>
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------- items */}
        <div className="mt-6">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Items
          </h2>
          <ul className="mt-2.5 divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  {item.product ? (
                    <Link href={`/shop/${item.product.slug}`} className="text-[13.5px] font-semibold hover:text-primary-600">
                      {item.title}
                    </Link>
                  ) : (
                    <span className="text-[13.5px] font-semibold">{item.title}</span>
                  )}
                  <p className="text-[12px] text-muted-foreground">
                    {formatPaise(item.price)} × {item.qty}
                  </p>
                </div>
                <span className="shrink-0 text-[13.5px] font-bold tabular-nums">
                  {formatPaise(item.price * item.qty)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* -------------------------------------------------------- totals */}
        <dl className="mt-4 space-y-1.5 border-t border-border pt-3.5 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-bold tabular-nums">{formatPaise(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd className="font-bold tabular-nums">−{formatPaise(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="font-bold tabular-nums">
              {order.shipping === 0 ? 'Free' : formatPaise(order.shipping)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <dt className="font-extrabold">Total</dt>
            <dd className="text-base font-extrabold tabular-nums text-primary-700 dark:text-primary-300">
              {formatPaise(order.total)}
            </dd>
          </div>
        </dl>

        {/* ------------------------------------------------------- address */}
        <div className="mt-6">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Delivering to
          </h2>
          <address className="mt-2 text-[13.5px] not-italic leading-relaxed">
            <span className="font-bold">{order.name}</span>
            <br />
            {order.line1}
            <br />
            {order.line2 && (
              <>
                {order.line2}
                <br />
              </>
            )}
            {order.city}, {order.state} {order.pincode}
            <br />
            <span className="text-muted-foreground">{order.phone}</span>
          </address>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/shop" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Continue shopping
        </Link>
        <Link href="/dashboard/support" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Need help with this order?
        </Link>
      </div>
    </div>
  )
}
