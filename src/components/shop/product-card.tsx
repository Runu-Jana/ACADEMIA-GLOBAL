'use client'

import Link from 'next/link'
import { ShoppingCart, Check, BookOpen, Package } from 'lucide-react'
import { ProductCover } from './product-cover'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { Button, buttonVariants } from '@/components/ui/button'
import { TiltCard } from '@/components/fx/tilt-card'
import { useCart } from '@/lib/use-cart'
import { cn } from '@/lib/utils'
import { formatPaise, discountPct, stockState, categoryLabel } from '@/lib/shop'

export type ProductCardData = {
  id: string
  slug: string
  title: string
  subtitle: string
  kind: string
  category: string
  price: number
  mrp: number | null
  stock: number
  rating: number
  reviews: number
  author: string | null
  brand: string | null
  imageUrl: string | null
}

export function ProductCard({
  product,
  className,
  tilt = true,
}: {
  product: ProductCardData
  className?: string
  tilt?: boolean
}) {
  const { add, has, ready } = useCart()
  const inCart = ready && has(product.id)
  const off = discountPct(product.price, product.mrp)
  const stock = stockState(product.stock)
  const isBook = product.kind === 'BOOK'
  const byline = isBook ? product.author : product.brand

  const body = (
    <article
      className={cn(
        'group/card card-base holo-ring holo-ring-hover flex h-full flex-col overflow-hidden hover:shadow-lift',
        className,
      )}
    >
      <div className="relative">
        <Link href={`/shop/${product.slug}`} aria-label={product.title}>
          <ProductCover
            kind={product.kind}
            category={product.category}
            title={product.title}
            author={product.author}
            imageUrl={product.imageUrl}
            className="h-44"
          />
        </Link>

        {off > 0 && (
          <Badge tone="holo" className="absolute left-3 top-3 shadow-sm">
            {off}% OFF
          </Badge>
        )}

        {stock === 'OUT' && (
          // pointer-events-none is load-bearing: this sits over the whole cover,
          // which is itself the link to the product. Without it the badge ate the
          // click and an out-of-stock product could not be opened at all.
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-900/55 backdrop-blur-[1px]">
            <span className="rounded-lg bg-white/95 px-3 py-1.5 text-[12px] font-extrabold text-slate-800">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1.5 inline-flex w-fit items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
          {isBook ? <BookOpen className="h-3 w-3" /> : <Package className="h-3 w-3" />}
          {categoryLabel(product.category)}
        </span>

        <Link href={`/shop/${product.slug}`} className="group/title">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug transition-colors group-hover/title:text-primary-600">
            {product.title}
          </h3>
        </Link>

        {byline && (
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted-foreground">{byline}</p>
        )}

        {product.reviews > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <Stars rating={product.rating} size={12} />
            <span className="text-[11px] text-muted-foreground">({product.reviews})</span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-extrabold text-primary-700 dark:text-primary-300">
            {formatPaise(product.price)}
          </span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-xs text-red-600 line-through dark:text-red-400">
              {formatPaise(product.mrp)}
            </span>
          )}
        </div>

        {stock === 'LOW' && (
          <p className="mt-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            Only {product.stock} left
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-4">
          <Link
            href={`/shop/${product.slug}`}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'flex-1' })}
          >
            Details
          </Link>
          <Button
            variant={inCart ? 'secondary' : 'primary'}
            size="sm"
            className="flex-1"
            disabled={stock === 'OUT'}
            onClick={() =>
              add({
                productId: product.id,
                qty: 1,
                title: product.title,
                slug: product.slug,
                price: product.price,
              })
            }
          >
            {inCart ? (
              <>
                <Check className="h-4 w-4" />
                In cart
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  )

  return tilt ? (
    <TiltCard className="group h-full" intensity={7} scale={1.015}>
      {body}
    </TiltCard>
  ) : (
    body
  )
}
