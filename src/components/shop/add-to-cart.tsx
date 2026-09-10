'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ShoppingCart, Check, Minus, Plus, Truck, Zap } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCart, MAX_QTY } from '@/lib/use-cart'
import { cn } from '@/lib/utils'
import { formatPaise, FREE_SHIPPING_OVER, SHIPPING_FLAT } from '@/lib/shop'

/**
 * Quantity stepper + add-to-cart for the product page.
 *
 * The quantity is capped at whichever is smaller: the per-line cap, or the units
 * actually on hand. Letting someone add 10 of a book with 3 in stock only moves
 * the disappointment to the checkout screen.
 */
export function AddToCart({
  productId,
  slug,
  title,
  price,
  stock,
}: {
  productId: string
  slug: string
  title: string
  price: number
  stock: number
}) {
  const t = useTranslations('shop.addToCart')
  const router = useRouter()
  const { add, has, qtyOf, ready } = useCart()
  const [qty, setQty] = React.useState(1)
  const [justAdded, setJustAdded] = React.useState(false)

  const max = Math.min(MAX_QTY, stock)
  const inCart = ready && has(productId)
  const cartQty = qtyOf(productId)
  const soldOut = stock <= 0

  React.useEffect(() => {
    if (!justAdded) return
    const t = setTimeout(() => setJustAdded(false), 2200)
    return () => clearTimeout(t)
  }, [justAdded])

  if (soldOut) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center">
        <p className="text-[14px] font-bold">{t('soldOutTitle')}</p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {t('soldOutBody')}
        </p>
      </div>
    )
  }

  // h-full so the two step buttons inherit the container's height, which is
  // pinned to h-13 to match the lg Add-to-cart button sitting beside it.
  const stepBtn =
    'grid h-full w-11 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-13 shrink-0 items-center overflow-hidden rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label={t('decrease')}
            className={stepBtn}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span aria-live="polite" className="min-w-8 text-center text-[14px] font-extrabold tabular-nums sm:min-w-10">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            disabled={qty >= max}
            aria-label={t('increase')}
            className={stepBtn}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <Button
          size="lg"
          variant="holo"
          // Fills the row beside the stepper so its right edge lines up with the
          // full-width Buy-now / Go-to-cart / Save buttons below. min-w-0 lets it
          // shrink on a narrow phone rather than overflow the card.
          className="min-w-0 flex-1 px-4 sm:px-7"
          onClick={() => {
            add({ productId, qty, title, slug, price })
            setJustAdded(true)
          }}
        >
          {justAdded ? (
            <>
              <Check className="h-5 w-5" />
              {t('added')}
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" />
              {t('add')}
            </>
          )}
        </Button>
      </div>

      {/* Buy now — drop this item into the cart and jump straight to checkout,
          reusing the same priced checkout + payment flow as the cart. */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => {
          add({ productId, qty, title, slug, price })
          router.push('/shop/checkout')
        }}
      >
        <Zap className="h-5 w-5" />
        {t('buyNow')}
      </Button>

      {inCart && (
        <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted-foreground">
          <Check aria-hidden className="h-3.5 w-3.5 text-emerald-500" />
          {t('inCart', { count: String(cartQty) })}
          <Link href="/shop/cart" className="font-bold text-primary-600 hover:underline">
            {t('viewCart')}
          </Link>
        </p>
      )}

      <p className="flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
        <Truck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {price >= FREE_SHIPPING_OVER
            ? t('freeOnItem')
            : t('flatDelivery', {
                flat: formatPaise(SHIPPING_FLAT),
                over: formatPaise(FREE_SHIPPING_OVER),
              })}
        </span>
      </p>

      {/* Full-width like the buttons above, so the whole control stack shares
          one left and right edge. */}
      <Link
        href="/shop/cart"
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
      >
        {t('goToCart')}
      </Link>
    </div>
  )
}
