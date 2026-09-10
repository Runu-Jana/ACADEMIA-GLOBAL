'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { ProductCard, type ProductCardData } from '@/components/shop/product-card'

/**
 * A "recently viewed" rail, kept entirely client-side. Each product page records
 * its own card data in localStorage; the rail then renders the ones viewed before
 * this visit (the current product excluded). Storing the full card data means the
 * rail needs no extra fetch — the cached card is enough, and clicking it lands on
 * the live product page anyway.
 */

const KEY = 'ss_recently_viewed'
const REMEMBER = 12
const SHOW = 4

export function RecentlyViewed({ current }: { current: ProductCardData }) {
  const t = useTranslations('shop.recentlyViewed')
  const [items, setItems] = React.useState<ProductCardData[]>([])

  React.useEffect(() => {
    let stored: ProductCardData[] = []
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
      if (Array.isArray(raw)) stored = raw
    } catch {
      stored = []
    }
    const others = stored.filter((p) => p && p.id !== current.id)
    setItems(others.slice(0, SHOW))
    try {
      localStorage.setItem(KEY, JSON.stringify([current, ...others].slice(0, REMEMBER)))
    } catch {
      /* storage unavailable — the rail just stays empty */
    }
    // Only re-run when the viewed product changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id])

  if (items.length === 0) return null

  return (
    <section className="mt-14">
      <h2 className="mb-4 font-display text-xl font-extrabold tracking-tight">{t('heading')}</h2>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
