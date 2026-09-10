'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Minus, Plus, Trash2, ShoppingBag, AlertTriangle, Loader2, Truck } from 'lucide-react'
import { ProductCover } from './product-cover'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCart } from '@/lib/use-cart'
import { cn } from '@/lib/utils'
import { formatPaise, FREE_SHIPPING_OVER, MAX_QTY } from '@/lib/shop'
import type { PricedCart } from '@/lib/shop-pricing'

/**
 * The cart, priced by the server.
 *
 * The browser holds ids and quantities; every rupee shown here comes back from
 * /api/shop/cart, so the totals a buyer reviews are the same numbers the
 * checkout will charge. A stale basket (price changed, item unpublished, stock
 * dropped) is corrected on load and the buyer is told what changed.
 */
export function CartView() {
  const t = useTranslations('shop.cart')
  const { lines, ready, setQty, remove } = useCart()
  const [priced, setPriced] = React.useState<PricedCart | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Re-price whenever the basket changes. The signature keeps this from firing
  // on every unrelated render.
  const signature = lines.map((l) => `${l.productId}:${l.qty}`).join('|')

  React.useEffect(() => {
    if (!ready) return

    if (lines.length === 0) {
      setPriced({ lines: [], removed: [], adjusted: false, subtotal: 0, shipping: 0, total: 0 })
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch('/api/shop/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })) }),
    })
      .then((r) => r.json())
      .then((data: PricedCart) => {
        if (cancelled) return
        setPriced(data)
        // Drop anything the server says is gone, so the badge count stops
        // counting items that can never be bought.
        for (const gone of data.removed ?? []) remove(gone.productId)
      })
      .catch(() => !cancelled && setPriced(null))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready])

  if (!ready || loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 aria-hidden className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!priced || priced.lines.length === 0) {
    return (
      <div className="card-base grid place-items-center px-6 py-16 text-center">
        <ShoppingBag aria-hidden className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-[15px] font-bold">{t('emptyTitle')}</p>
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
          {t('emptyBody')}
        </p>
        <Link href="/shop" className={buttonVariants({ variant: 'primary', size: 'sm', className: 'mt-5' })}>
          {t('browse')}
        </Link>
      </div>
    )
  }

  const toFreeShipping = FREE_SHIPPING_OVER - priced.subtotal
  // 44px on touch — a quantity control you nudge with a thumb needs a real tap
  // target; it tightens to 36px from sm up where there's a cursor.
  const stepBtn =
    'grid h-11 w-11 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent sm:h-9 sm:w-9'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-3">
        {(priced.removed.length > 0 || priced.adjusted) && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] dark:border-amber-500/25 dark:bg-amber-500/10">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-200">{t('changedTitle')}</p>
              <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-300/90">
                {priced.removed.map((r) => (
                  <li key={r.productId}>
                    {r.reason === 'out_of_stock'
                      ? t('removedOut', { title: r.title })
                      : t('removedGone', { title: r.title })}
                  </li>
                ))}
                {priced.adjusted && <li>{t('adjusted')}</li>}
              </ul>
            </div>
          </div>
        )}

        {priced.lines.map((line) => (
          <article key={line.productId} className="card-base flex gap-3 p-3 sm:gap-4 sm:p-4">
            <Link href={`/shop/${line.slug}`} className="shrink-0">
              <ProductCover
                kind={line.kind}
                category={line.category}
                title={line.title}
                author={line.author}
                imageUrl={line.imageUrl}
                compact
                className="h-24 w-20 rounded-lg sm:h-28 sm:w-24"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/shop/${line.slug}`} className="group/title">
                <h3 className="line-clamp-2 text-[14px] font-bold leading-snug transition-colors group-hover/title:text-primary-600">
                  {line.title}
                </h3>
              </Link>
              {(line.author || line.brand) && (
                <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
                  {line.author ?? line.brand}
                </p>
              )}

              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-extrabold text-primary-700 dark:text-primary-300">
                  {formatPaise(line.price)}
                </span>
                {line.mrp && line.mrp > line.price && (
                  <span className="text-[12px] text-red-600 line-through dark:text-red-400">
                    {formatPaise(line.mrp)}
                  </span>
                )}
              </div>

              {line.qty >= line.stock && (
                <p className="mt-1 text-[11.5px] font-semibold text-amber-600 dark:text-amber-400">
                  {t('onlyAvailable', { n: String(line.stock) })}
                </p>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2.5">
                <div className="inline-flex items-center overflow-hidden rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setQty(line.productId, line.qty - 1)}
                    aria-label={t('decreaseOf', { title: line.title })}
                    className={stepBtn}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-9 text-center text-[13px] font-extrabold tabular-nums">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(line.productId, line.qty + 1)}
                    disabled={line.qty >= Math.min(MAX_QTY, line.stock)}
                    aria-label={t('increaseOf', { title: line.title })}
                    className={stepBtn}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(line.productId)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 sm:min-h-0 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('remove')}
                </button>

                <span className="ml-auto text-[14px] font-extrabold tabular-nums">
                  {formatPaise(line.lineTotal)}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ------------------------------------------------------------ summary */}
      <aside className="card-base p-4 lg:sticky lg:top-24">
        <h2 className="text-[15px] font-extrabold tracking-tight">{t('summary')}</h2>

        <dl className="mt-3.5 space-y-2 text-[13.5px]">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t('subtotal')}</dt>
            <dd className="font-bold tabular-nums">{formatPaise(priced.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t('delivery')}</dt>
            <dd className={cn('font-bold tabular-nums', priced.shipping === 0 && 'text-emerald-600 dark:text-emerald-400')}>
              {priced.shipping === 0 ? t('free') : formatPaise(priced.shipping)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <dt className="font-extrabold">{t('total')}</dt>
            <dd className="text-lg font-extrabold tabular-nums text-primary-700 dark:text-primary-300">
              {formatPaise(priced.total)}
            </dd>
          </div>
        </dl>

        {toFreeShipping > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/60 p-2.5 text-[12px] text-muted-foreground">
            <Truck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {t.rich('addMore', {
                amount: formatPaise(toFreeShipping),
                b: (chunks) => <strong>{chunks}</strong>,
              })}
            </span>
          </p>
        )}

        <Link
          href="/shop/checkout"
          className={cn(buttonVariants({ variant: 'holo', size: 'md' }), 'mt-4 w-full')}
        >
          {t('checkout')}
        </Link>

        <Link
          href="/shop"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-2 w-full')}
        >
          {t('continue')}
        </Link>

        <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
          {t('fineprint')}
        </p>
      </aside>
    </div>
  )
}
