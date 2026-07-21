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

export default nextConfig
