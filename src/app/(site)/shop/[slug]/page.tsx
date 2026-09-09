import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronRight, BookOpen, Package, Truck, ShieldCheck, RefreshCcw, Check,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/shop/product-card'
import { ProductGallery } from '@/components/shop/product-gallery'
import { AddToCart } from '@/components/shop/add-to-cart'
import { ProductSaveButton } from '@/components/course/save-button'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { Reveal } from '@/components/fx/reveal'
import { JsonLd } from '@/components/seo/json-ld'
import { liveProducts, isProductLive } from '@/lib/visibility'
import { breadcrumbLd, productLd } from '@/lib/seo'
import { asList } from '@/lib/utils'
import {
  formatPaise, discountPct, stockState, categoryLabel, kindLabel,
  FREE_SHIPPING_OVER,
} from '@/lib/shop'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ meta */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      title: true, subtitle: true, status: true, kind: true, author: true,
      publisher: true, isbn: true, imageUrl: true, price: true, stock: true,
    },
  })

  if (!product || !isProductLive(product)) {
    return { title: 'Product not found' }
  }

  // Book titles read better in search results with the author appended — it's
  // how buyers actually search ("hc verma physics" style queries).
  const name = product.author ? `${product.title} — ${product.author}` : product.title
  const description = `${product.subtitle} Buy online at ${formatPaise(product.price)}${
    product.stock > 0 ? '' : ' (currently out of stock)'
  }. Free delivery over ${formatPaise(FREE_SHIPPING_OVER)}.`

  return {
    title: name,
    description,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: {
      title: name,
      description,
      url: `/shop/${slug}`,
      type: 'website',
      ...(product.imageUrl ? { images: [{ url: product.imageUrl }] } : {}),
    },
    twitter: {
      card: product.imageUrl ? 'summary_large_image' : 'summary',
      title: name,
      description,
    },
  }
}

/* ------------------------------------------------------------------ page */

/** One row of the bibliographic / specification table. */
function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-3 border-b border-border py-2.5 last:border-0 sm:grid-cols-[11rem_1fr]">
      <dt className="text-[12.5px] font-bold text-muted-foreground">{label}</dt>
      <dd className="text-[13.5px] font-medium">{value}</dd>
    </div>
  )
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const product = await prisma.product.findUnique({ where: { slug } })
  if (!product || !isProductLive(product)) notFound()

  const highlights = asList(product.highlights)
  const specs = asList(product.specs)
  const examTags = asList(product.examTags)
  const images = asList(product.images)

  const isBook = product.kind === 'BOOK'
  const off = discountPct(product.price, product.mrp)
  const stock = stockState(product.stock)
  const saving = product.mrp && product.mrp > product.price ? product.mrp - product.price : 0

  // Same shelf, excluding this item. Keeps a dead-end page from being a dead end.
  const related = await prisma.product.findMany({
    where: liveProducts({ category: product.category, NOT: { id: product.id } }),
    select: {
      id: true, slug: true, title: true, subtitle: true, kind: true, category: true,
      price: true, mrp: true, stock: true, rating: true, reviews: true,
      author: true, brand: true, imageUrl: true,
    },
    orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
    take: 4,
  })

  // Delivery/authenticity promises. Defined once and placed differently per
  // breakpoint — see the two render slots below.
  const promises = (
    <ul className="mt-4 grid gap-2.5 text-[12.5px] text-muted-foreground">
      <li className="flex items-center gap-2">
        <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-primary-500" />
        {isBook ? 'Genuine, publisher-sourced edition' : 'Genuine, brand-sourced stock'}
      </li>
      <li className="flex items-center gap-2">
        <Truck aria-hidden className="h-4 w-4 shrink-0 text-primary-500" />
        Free delivery over {formatPaise(FREE_SHIPPING_OVER)}
      </li>
      <li className="flex items-center gap-2">
        <RefreshCcw aria-hidden className="h-4 w-4 shrink-0 text-primary-500" />
        7-day replacement for damaged items
      </li>
    </ul>
  )

  return (
    <>
      <JsonLd data={productLd(product)} />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: categoryLabel(product.category), path: `/shop?category=${product.category}` },
          { name: product.title, path: `/shop/${product.slug}` },
        ])}
      />

      <div className="container py-6 sm:py-8">
        {/* ---------------------------------------------------- breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          <Link href="/shop" className="hover:text-primary-600">Shop</Link>
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          <Link href={`/shop?category=${product.category}`} className="hover:text-primary-600">
            {categoryLabel(product.category)}
          </Link>
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          <span className="line-clamp-1 font-semibold text-foreground">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-10">
          {/* -------------------------------------------------- gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {/* Carousel + zoom lightbox. Capped and centred on a phone: at full
                width the 3:4 frame came out 357×476, an entire screen before the
                buyer saw a price. Fills the sticky rail again from lg up. */}
            <ProductGallery
              kind={product.kind}
              category={product.category}
              title={product.title}
              author={product.author}
              imageUrl={product.imageUrl}
              images={images}
            />

            {/* On a phone these three lines sat between the cover and the
                title, pushing the price further down; there they render after
                the buy box instead. Rendered in both slots and shown in exactly
                one, so the markup order stays sensible for a screen reader. */}
            <div className="hidden lg:block">{promises}</div>
          </div>

          {/* ----------------------------------------------------- detail */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">
                {isBook ? <BookOpen className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                {kindLabel(product.kind)}
              </Badge>
              <Link href={`/shop?category=${product.category}`}>
                <Badge tone="default" className="transition-colors hover:border-primary-300">
                  {categoryLabel(product.category)}
                </Badge>
              </Link>
              {product.featured && <Badge tone="holo">Bestseller</Badge>}
            </div>

            <h1 className="mt-3 text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              {product.title}
            </h1>
            <p className="mt-2 text-pretty text-[15px] text-muted-foreground">{product.subtitle}</p>

            {(product.author || product.brand) && (
              <p className="mt-2.5 text-[13.5px]">
                <span className="text-muted-foreground">{isBook ? 'By ' : 'Brand: '}</span>
                <span className="font-bold">{product.author ?? product.brand}</span>
                {product.publisher && (
                  <span className="text-muted-foreground"> · {product.publisher}</span>
                )}
              </p>
            )}

            {product.reviews > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <Stars rating={product.rating} size={15} />
                <span className="text-[13px] font-bold">{product.rating.toFixed(1)}</span>
                <span className="text-[13px] text-muted-foreground">
                  ({product.reviews.toLocaleString('en-IN')} ratings)
                </span>
              </div>
            )}

            {/* ------------------------------------------------- pricing */}
            <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-extrabold text-primary-700 dark:text-primary-300">
                  {formatPaise(product.price)}
                </span>
                {product.mrp && product.mrp > product.price && (
                  <>
                    <span className="text-[15px] text-red-600 line-through dark:text-red-400">
                      {formatPaise(product.mrp)}
                    </span>
                    <span className="rounded-md bg-accent-green px-2 py-0.5 text-[12px] font-bold leading-none text-white">
                      {off}% OFF
                    </span>
                  </>
                )}
              </div>
              {saving > 0 && (
                <p className="mt-1.5 text-[12.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                  You save {formatPaise(saving)}
                </p>
              )}
              <p className="mt-1 text-[11.5px] text-muted-foreground">Inclusive of all taxes</p>

              <div className="mt-3 flex items-center gap-2 text-[13px] font-bold">
                {stock === 'OUT' ? (
                  <span className="text-red-600 dark:text-red-400">Out of stock</span>
                ) : stock === 'LOW' ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    Only {product.stock} left in stock
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check aria-hidden className="h-4 w-4" />
                    In stock
                  </span>
                )}
              </div>

              <div className="mt-4">
                <AddToCart
                  productId={product.id}
                  slug={product.slug}
                  title={product.title}
                  price={product.price}
                  stock={product.stock}
                />
              </div>

              <div className="mt-3">
                <ProductSaveButton
                  productId={product.id}
                  variant="chip"
                  className="w-full justify-center"
                />
              </div>
            </div>

            <div className="lg:hidden">{promises}</div>

            {/* ---------------------------------------------- highlights */}
            {highlights.length > 0 && (
              <section className="mt-7">
                <h2 className="font-display text-lg font-extrabold tracking-tight">Highlights</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-[13.5px]">
                      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ------------------------------------------------ exam tags */}
            {examTags.length > 0 && (
              <section className="mt-7">
                <h2 className="font-display text-lg font-extrabold tracking-tight">
                  Recommended for
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {examTags.map((tag) => (
                    <Link key={tag} href={`/shop?exam=${encodeURIComponent(tag)}`}>
                      <Badge tone="cyan" className="transition-colors hover:border-primary-300">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ---------------------------------------------- description */}
            <section className="mt-7">
              <h2 className="font-display text-lg font-extrabold tracking-tight">
                About this {isBook ? 'book' : 'product'}
              </h2>
              <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-muted-foreground">
                {product.description.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>

            {/* ---------------------------------------------------- specs */}
            <section className="mt-7">
              <h2 className="font-display text-lg font-extrabold tracking-tight">
                {isBook ? 'Book details' : 'Specifications'}
              </h2>
              <dl className="mt-3 rounded-2xl border border-border px-4 py-1">
                {isBook ? (
                  <>
                    {product.author && <SpecRow label="Author" value={product.author} />}
                    {product.publisher && <SpecRow label="Publisher" value={product.publisher} />}
                    {product.edition && <SpecRow label="Edition" value={product.edition} />}
                    {product.isbn && (
                      <SpecRow label="ISBN-13" value={<span className="tabular-nums">{product.isbn}</span>} />
                    )}
                    {product.language && <SpecRow label="Language" value={product.language} />}
                    {product.pages && <SpecRow label="Pages" value={`${product.pages} pages`} />}
                    {product.binding && <SpecRow label="Binding" value={product.binding} />}
                    {product.publishedYear && (
                      <SpecRow label="Published" value={product.publishedYear} />
                    )}
                  </>
                ) : (
                  <>
                    {product.brand && <SpecRow label="Brand" value={product.brand} />}
                    {specs.map((s) => {
                      // Specs are stored as "Label: value" so one column drives both.
                      const idx = s.indexOf(':')
                      const label = idx > 0 ? s.slice(0, idx) : 'Detail'
                      const value = idx > 0 ? s.slice(idx + 1).trim() : s
                      return <SpecRow key={s} label={label} value={value} />
                    })}
                  </>
                )}
                {product.sku && <SpecRow label="SKU" value={product.sku} />}
                <SpecRow label="Category" value={categoryLabel(product.category)} />
              </dl>
            </section>
          </div>
        </div>

        {/* ------------------------------------------------------ related */}
        {related.length > 0 && (
          <section className="mt-14">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="font-display text-xl font-extrabold tracking-tight">
                More in {categoryLabel(product.category)}
              </h2>
              <Link
                href={`/shop?category=${product.category}`}
                className="text-[13px] font-bold text-primary-600 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 4) * 50}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
