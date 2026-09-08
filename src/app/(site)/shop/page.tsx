import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, SearchX, BookOpen, Package, Truck, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/shop/product-card'
import {
  ShopActiveChips, ShopFilterDrawer, ShopFilterSidebar, ShopSearchBox, ShopSortSelect,
  type ShopFacetCounts,
} from '@/components/shop/shop-filters'
import { Reveal } from '@/components/fx/reveal'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { JsonLd } from '@/components/seo/json-ld'
import { cn } from '@/lib/utils'
import { liveProducts } from '@/lib/visibility'
import { breadcrumbLd, itemListLd } from '@/lib/seo'
import { formatPaise, FREE_SHIPPING_OVER, PRICE_BUCKETS } from '@/lib/shop'
import {
  PAGE_SIZE, buildShopOrderBy, buildShopWhere, hasAnyFilter, parseShopFilters,
  shopQueryString, type RawSearchParams, type ShopFilterState,
} from './filters'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Student Shop — Competitive Exam Books & Stationery',
  description:
    'Buy competitive exam books for JEE, NEET, UPSC, SSC, CAT and CLAT, plus notebooks, pens and exam-day stationery. Genuine editions, student pricing and free delivery over ₹499.',
  alternates: { canonical: '/shop' },
  openGraph: {
    title: 'Student Shop — Competitive Exam Books & Stationery',
    description:
      'Competitive exam books and study stationery at student pricing. Free delivery over ₹499.',
    url: '/shop',
    type: 'website',
  },
}

const productSelect = {
  id: true, slug: true, title: true, subtitle: true, kind: true, category: true,
  price: true, mrp: true, stock: true, rating: true, reviews: true,
  author: true, brand: true, imageUrl: true,
} as const

function tally(values: string[]) {
  const out: Record<string, number> = {}
  for (const v of values) out[v] = (out[v] ?? 0) + 1
  return out
}

/** 1 … 4 5 6 … 12 — fixed-width control at any page count. */
function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const out: (number | 'gap')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) out.push('gap')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('gap')
  out.push(total)

  return out
}

function Pagination({ state, page, totalPages }: {
  state: ShopFilterState
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const href = (n: number) => `/shop${shopQueryString(state, { page: n })}`
  const stepClass =
    'inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border border-border px-3 text-[13px] font-bold transition-all duration-300 ease-spring'

  return (
    <nav aria-label="Shop results pages" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cn(stepClass, 'bg-card hover:border-primary-300 hover:shadow-card')}>
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Prev
        </Link>
      ) : (
        <span className={cn(stepClass, 'cursor-not-allowed opacity-40')} aria-disabled>
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Prev
        </span>
      )}

      {pageWindow(page, totalPages).map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">…</span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              stepClass,
              n === page
                ? 'border-transparent bg-primary-600 text-white shadow-glow'
                : 'bg-card hover:border-primary-300 hover:shadow-card',
            )}
          >
            {n}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={cn(stepClass, 'bg-card hover:border-primary-300 hover:shadow-card')}>
          Next
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(stepClass, 'cursor-not-allowed opacity-40')} aria-disabled>
          Next
          <ChevronRight aria-hidden className="h-4 w-4" />
        </span>
      )}
    </nav>
  )
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const state = parseShopFilters(await searchParams)
  const where = buildShopWhere(state)

  // Facet counts come from the unfiltered live set so a zero-count row still
  // renders (greyed) instead of vanishing — a rail that reshuffles as you tick
  // boxes is disorienting.
  const [total, products, facetRows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: productSelect,
      orderBy: buildShopOrderBy(state),
      skip: (state.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.findMany({
      where: liveProducts(),
      select: { kind: true, category: true, price: true },
    }),
  ])

  const counts: ShopFacetCounts = {
    kind: tally(facetRows.map((r) => r.kind)),
    category: tally(facetRows.map((r) => r.category)),
    price: tally(
      facetRows.flatMap((r) => {
        const bucket = PRICE_BUCKETS.find((b) => r.price >= b.min && r.price <= b.max)
        return bucket ? [bucket.value as string] : []
      }),
    ),
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtered = hasAnyFilter(state)

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
        ])}
      />
      <JsonLd
        data={itemListLd(
          products.map((p) => ({ name: p.title, path: `/shop/${p.slug}` })),
          'Student Shop',
        )}
      />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-border bg-slate-950">
        <Aurora palette="cool" density={2} />
        <GridPattern />
        <div className="container relative py-12 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <Badge tone="holo" className="mb-4">Student Shop</Badge>
            <h1 className="text-balance font-display text-3xl font-extrabold text-white sm:text-4xl">
              Everything you need to <span className="holo-text">prepare and pass</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-[15px] text-white/70">
              Competitive exam books and study stationery, priced for students. Free delivery on
              orders above {formatPaise(FREE_SHIPPING_OVER)}.
            </p>
          </div>

          <div className="mx-auto mt-7 max-w-xl">
            <ShopSearchBox />
          </div>

          <ul className="mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] font-semibold text-white/75">
            <li className="flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="h-4 w-4 text-holo-cyan" />
              Genuine editions
            </li>
            <li className="flex items-center gap-1.5">
              <Truck aria-hidden className="h-4 w-4 text-holo-cyan" />
              Free delivery over {formatPaise(FREE_SHIPPING_OVER)}
            </li>
            <li className="flex items-center gap-1.5">
              <BookOpen aria-hidden className="h-4 w-4 text-holo-cyan" />
              Curated for Indian entrance exams
            </li>
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- results */}
      <section className="container py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">Shop</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <div className="hidden lg:block">
            <ShopFilterSidebar counts={counts} />
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-tight">
                  {filtered ? 'Matching products' : 'All products'}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {total} {total === 1 ? 'product' : 'products'}
                  {totalPages > 1 && ` · Page ${state.page} of ${totalPages}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ShopFilterDrawer counts={counts} total={total} />
                <ShopSortSelect />
              </div>
            </div>

            <ShopActiveChips />

            {products.length === 0 ? (
              <div className="card-base grid place-items-center px-6 py-16 text-center">
                <SearchX aria-hidden className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-[15px] font-bold">Nothing matched those filters</p>
                <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
                  Try removing a filter, or search by book title, author or ISBN.
                </p>
                <Link href="/shop" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-5' })}>
                  Clear all filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p, i) => (
                  <Reveal key={p.id} delay={Math.min(i, 6) * 40}>
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            )}

            <Pagination state={state} page={state.page} totalPages={totalPages} />
          </div>
        </div>
      </section>
    </>
  )
}
