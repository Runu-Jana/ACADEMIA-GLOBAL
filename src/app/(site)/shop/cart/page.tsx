import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { CartView } from '@/components/shop/cart-view'

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review the books and stationery in your cart before checkout.',
  // A personal, session-specific page has nothing to offer an index.
  robots: { index: false, follow: true },
}

export default function CartPage() {
  return (
    <div className="container py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <Link href="/shop" className="hover:text-primary-600">Shop</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">Cart</span>
      </nav>

      <h1 className="mb-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        Your cart
      </h1>

      <CartView />
    </div>
  )
}
