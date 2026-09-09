'use client'

import * as React from 'react'
import Link from 'next/link'
import { Heart, Compass, GraduationCap, ShoppingBag } from 'lucide-react'
import { CourseCard, type CourseCardData } from '@/components/course/course-card'
import { ProductCard, type ProductCardData } from '@/components/shop/product-card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Tab = 'courses' | 'products'

/**
 * The Saved hub's two shelves — courses and shop products — behind a tab.
 * Both datasets arrive already fetched from the server page; this only chooses
 * which to show, defaulting to whichever shelf actually has something on it.
 */
export function SavedTabs({
  courses,
  products,
}: {
  courses: CourseCardData[]
  products: ProductCardData[]
}) {
  const [tab, setTab] = React.useState<Tab>(courses.length === 0 && products.length > 0 ? 'products' : 'courses')

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'courses', label: 'Courses', icon: GraduationCap, count: courses.length },
    { key: 'products', label: 'Shop', icon: ShoppingBag, count: products.length },
  ]

  return (
    <div>
      <div role="tablist" aria-label="Saved items" className="mb-5 inline-flex rounded-xl border border-border bg-muted/50 p-1">
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors',
                active ? 'bg-primary-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span
                className={cn(
                  'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold',
                  active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {tab === 'courses' &&
        (courses.length === 0 ? (
          <EmptyShelf
            label="No saved courses yet"
            hint="Tap the heart on any course to save it here and come back to it later."
            href="/courses"
            cta="Browse courses"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} tilt={false} />
            ))}
          </div>
        ))}

      {tab === 'products' &&
        (products.length === 0 ? (
          <EmptyShelf
            label="No saved items yet"
            hint="Tap the heart on any book or stationery item to save it for later."
            href="/shop"
            cta="Browse the shop"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} tilt={false} />
            ))}
          </div>
        ))}
    </div>
  )
}

function EmptyShelf({
  label,
  hint,
  href,
  cta,
}: {
  label: string
  hint: string
  href: string
  cta: string
}) {
  return (
    <div className="card-base grid place-items-center px-6 py-16 text-center">
      <Heart aria-hidden className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-[15px] font-bold">{label}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{hint}</p>
      <Link href={href} className={buttonVariants({ variant: 'primary', size: 'sm', className: 'mt-5' })}>
        <Compass className="h-4 w-4" />
        {cta}
      </Link>
    </div>
  )
}
