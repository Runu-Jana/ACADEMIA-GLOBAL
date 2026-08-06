/**
 * SEO helpers: the canonical site URL plus JSON-LD (schema.org) builders used
 * for rich results. Everything keys off SITE_URL so switching domains is one
 * env var (NEXT_PUBLIC_APP_URL).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

export const SITE_NAME = 'Shiksha Sarthi'

/** Absolute URL for a site-relative path. */
export const abs = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

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
