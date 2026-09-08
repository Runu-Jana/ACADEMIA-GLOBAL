import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { listedCourseWhere, listedUniversityWhere, liveProducts } from '@/lib/visibility'
import { SITE_URL } from '@/lib/seo'
import { generateStaticParams as legalParams } from '@/app/(site)/legal/[slug]/page'

export const dynamic = 'force-dynamic'

/**
 * Full sitemap: the static discovery pages plus every publicly listed course
 * and university, and the legal pages. Course/university entries carry their
 * real lastModified so crawlers re-fetch only what changed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, universities, products] = await Promise.all([
    prisma.course.findMany({ where: listedCourseWhere, select: { slug: true, updatedAt: true } }),
    prisma.university.findMany({ where: listedUniversityWhere, select: { slug: true, updatedAt: true } }),
    // Published only — liveProducts keeps drafts and archived stock out of the
    // index, which is the whole reason a crawler must never see them.
    prisma.product.findMany({ where: liveProducts(), select: { slug: true, updatedAt: true } }),
  ])

  const now = new Date()
  const url = (path: string): string => `${SITE_URL}${path}`

  const staticPages: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: url('/courses'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: url('/universities'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/exams'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: url('/scholarships'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: url('/compare'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/blog'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: url('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/contact'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: url('/for-universities'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/verify'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: url('/counsellor'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/shop'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ]

  const coursePages: MetadataRoute.Sitemap = courses.map((c) => ({
    url: url(`/courses/${c.slug}`),
    lastModified: c.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const universityPages: MetadataRoute.Sitemap = universities.map((u) => ({
    url: url(`/universities/${u.slug}`),
    lastModified: u.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Product pages carry price and availability markup, so a stale lastModified
  // is worse than none — it tells the crawler not to re-check a changed price.
  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: url(`/shop/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const legalPages: MetadataRoute.Sitemap = legalParams().map(({ slug }) => ({
    url: url(`/legal/${slug}`),
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.2,
  }))

  return [...staticPages, ...coursePages, ...universityPages, ...productPages, ...legalPages]
}
