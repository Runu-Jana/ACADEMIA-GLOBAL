import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { PwaRegister } from '@/components/pwa-register'
import { InstallPrompt } from '@/components/install-prompt'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: {
    default: 'Shiksha Sarthi — Learn Today, Lead Tomorrow',
    template: '%s · Shiksha Sarthi',
  },
  description:
    'India’s trusted virtual learning platform. Restart, continue and complete your education from Class 10 to PG with UGC-entitled online, distance and regular degrees.',
  keywords: [
    'online degree', 'distance learning', 'UGC entitled', 'BBA', 'MBA',
    'online education India', 'virtual learning',
  ],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Shiksha Sarthi',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Shiksha Sarthi — Learn Today, Lead Tomorrow',
    description: 'Restart, continue and complete your education journey.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1e' },
  ],
}

// Applied before paint so a dark-mode reload never flashes white.
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-background font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  )
}
