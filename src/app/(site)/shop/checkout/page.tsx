import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChevronRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { CheckoutForm } from '@/components/shop/checkout-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Enter your delivery address and pay securely.',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  // Signing in is optional — a guest can buy. When there is a session we
  // prefill the name and email so a student isn't retyping what we already know.
  const user = await getCurrentUser()
  const t = await getTranslations('shop')

  return (
    <div className="container py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <Link href="/" className="hover:text-primary-600">{t('home')}</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <Link href="/shop" className="hover:text-primary-600">{t('shop')}</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <Link href="/shop/cart" className="hover:text-primary-600">{t('cart.crumb')}</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">{t('checkout.crumb')}</span>
      </nav>

      <h1 className="mb-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t('checkout.title')}
      </h1>

      <CheckoutForm signedInAs={user ? { name: user.name, email: user.email } : null} />
    </div>
  )
}
