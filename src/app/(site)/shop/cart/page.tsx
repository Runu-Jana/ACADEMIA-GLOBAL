import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChevronRight } from 'lucide-react'
import { CartView } from '@/components/shop/cart-view'

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review the books and stationery in your cart before checkout.',
  // A personal, session-specific page has nothing to offer an index.
  robots: { index: false, follow: true },
}

export default async function CartPage() {
  const t = await getTranslations('shop')

  return (
    <div className="container py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <Link href="/" className="hover:text-primary-600">{t('home')}</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <Link href="/shop" className="hover:text-primary-600">{t('shop')}</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">{t('cart.crumb')}</span>
      </nav>

      <h1 className="mb-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t('cart.title')}
      </h1>

      <CartView />
    </div>
  )
}
