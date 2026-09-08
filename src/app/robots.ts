import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Crawler rules. The public marketing/discovery pages are open; anything behind
 * auth or that's a per-user funnel (admin, dashboards, the partner portal, the
 * apply/brochure lead flows and the API) is kept out of the index.
 *
 * The shop is deliberately split: `/shop` and `/shop/<product>` are the whole
 * point of having product markup and must stay crawlable, while the cart,
 * checkout and per-order pages are personal, session-shaped and worthless in an
 * index — an order URL leaking into search results would be a privacy problem,
 * not just noise.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin', '/dashboard', '/partner', '/api/', '/apply/', '/brochure/',
          '/shop/cart', '/shop/checkout', '/shop/order/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
