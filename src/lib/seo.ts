/**
 * SEO helpers: JSON-LD (schema.org) builders used for rich results. Everything
 * keys off SITE_URL so switching domains is one env var — see lib/site-url.ts,
 * which owns that value for the whole app.
 */

import { SITE_URL, abs } from '@/lib/site-url'

export { SITE_URL, abs }

export const SITE_NAME = 'Shiksha Sarthi'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ld = Record<string, any>

/** Site-wide publisher identity. */
export function organizationLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: abs('/icons/icon.svg'),
    description:
      'India’s trusted virtual learning platform — online, distance and regular degrees from partner universities.',
    areaServed: { '@type': 'Country', name: 'India' },
  }
}

/** WebSite entity with a sitelinks search box pointing at course search. */
export function websiteLd(): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: abs('/courses?q={search_term_string}') },
      'query-input': 'required name=search_term_string',
    },
  }
}

const COURSE_MODE_LD: Record<string, string> = {
  ONLINE: 'online',
  DISTANCE: 'blended',
  PART_TIME: 'blended',
  REGULAR: 'onsite',
}

/** A single course listing, with provider, price and rating when available. */
export function courseLd(course: {
  slug: string
  title: string
  about?: string | null
  subtitle?: string | null
  mode: string
  durationYears: number
  feePerYear: number
  rating?: number | null
  reviews?: number | null
  university: { name: string; slug: string }
}): Ld {
  const url = abs(`/courses/${course.slug}`)
  const description = (course.about || course.subtitle || course.title).slice(0, 500)

  const ld: Ld = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description,
    url,
    provider: {
      '@type': 'CollegeOrUniversity',
      name: course.university.name,
      sameAs: abs(`/universities/${course.university.slug}`),
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: COURSE_MODE_LD[course.mode] ?? 'online',
      // ISO-8601 duration, e.g. a 3-year programme -> "P3Y".
      courseWorkload: `P${Math.max(1, Math.round(course.durationYears))}Y`,
    },
  }

  if (course.feePerYear > 0) {
    ld.offers = {
      '@type': 'Offer',
      category: 'Tuition',
      price: Math.round(course.feePerYear),
      priceCurrency: 'INR',
      url,
    }
  }

  if (course.rating && course.reviews && course.reviews > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: course.rating,
      reviewCount: course.reviews,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return ld
}

/** Breadcrumb trail. Pass [{ name, path }] from home down to the current page. */
export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  }
}

/**
 * A listing page's results, as an ordered ItemList.
 *
 * Gives a crawler the shape of a category page — which products it holds and in
 * what order — without pretending each entry is a full Product record. The real
 * Product markup lives on the individual product pages, which is where Google
 * expects to validate price and availability.
 */
export function itemListLd(items: { name: string; path: string }[], name: string): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: abs(it.path),
    })),
  }
}

/**
 * Product rich-result markup for one shop item.
 *
 * A book is emitted as a `Book` with `@type: ['Product', 'Book']` so it can
 * carry ISBN, author and numberOfPages while still qualifying for the shopping
 * rich result — Google reads the Product half for price and availability and the
 * Book half for the bibliographic panel.
 *
 * `aggregateRating` is emitted ONLY when real reviews exist. Fabricating a
 * rating on a product nobody has reviewed is a structured-data violation and a
 * manual-action risk, quite apart from being a lie to buyers.
 */
export function productLd(product: {
  slug: string
  title: string
  subtitle: string
  description: string
  kind: string
  price: number // paise
  mrp?: number | null
  stock: number
  sku?: string | null
  imageUrl?: string | null
  rating: number
  reviews: number
  author?: string | null
  publisher?: string | null
  isbn?: string | null
  brand?: string | null
  language?: string | null
  pages?: number | null
  binding?: string | null
  publishedYear?: number | null
}): Ld {
  const isBook = product.kind === 'BOOK'
  const url = abs(`/shop/${product.slug}`)

  const ld: Ld = {
    '@context': 'https://schema.org',
    '@type': isBook ? ['Product', 'Book'] : 'Product',
    name: product.title,
    description: product.subtitle || product.description.slice(0, 300),
    url,
    // Schema.org wants a decimal string in major units, not our internal paise.
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: (product.price / 100).toFixed(2),
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  }

  if (product.imageUrl) ld.image = product.imageUrl
  if (product.sku) ld.sku = product.sku

  if (isBook) {
    if (product.isbn) {
      ld.isbn = product.isbn
      // gtin13 is what the shopping result actually matches on for books.
      ld.gtin13 = product.isbn
    }
    if (product.author) ld.author = { '@type': 'Person', name: product.author }
    if (product.publisher) ld.publisher = { '@type': 'Organization', name: product.publisher }
    if (product.pages) ld.numberOfPages = product.pages
    if (product.language) ld.inLanguage = product.language
    if (product.binding) {
      // schema.org only defines a few formats; anything else (Spiral) has no
      // valid mapping, so we omit rather than mislabel it.
      const format: Record<string, string> = {
        Paperback: 'https://schema.org/Paperback',
        Hardcover: 'https://schema.org/Hardcover',
      }
      if (format[product.binding]) ld.bookFormat = format[product.binding]
    }
    if (product.publishedYear) ld.datePublished = String(product.publishedYear)
    ld.brand = { '@type': 'Brand', name: product.publisher ?? SITE_NAME }
  } else if (product.brand) {
    ld.brand = { '@type': 'Brand', name: product.brand }
  }

  if (product.reviews > 0 && product.rating > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviews,
      bestRating: '5',
      worstRating: '1',
    }
  }

  return ld
}
