import createNextIntlPlugin from 'next-intl/plugin'

// Locale is resolved from a cookie (no /[locale]/ URL segment yet), so the
// request config lives here rather than behind i18n routing middleware.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
  // Uploaded course material can be large (recorded lectures, question banks).
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
}

export default withNextIntl(nextConfig)
