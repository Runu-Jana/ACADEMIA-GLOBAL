import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Crawler rules. The public marketing/discovery pages are open; anything behind
 * auth or that's a per-user funnel (admin, dashboards, the partner portal, the
 * apply/brochure lead flows and the API) is kept out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/partner', '/api/', '/apply/', '/brochure/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
