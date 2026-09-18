import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor packages Shiksha Sarthi as native Android + iOS apps.
 *
 * Because this is a Next.js SSR app (server components, API routes, middleware
 * auth) it can't be statically exported into the app — so the native WebView
 * loads the LIVE hosted site (`server.url`). That keeps SSR, the API and the
 * existing JWT-in-cookie auth working exactly as on the web (the WebView is
 * first-party to your domain). `mobile-shell/` is the required local web
 * directory and doubles as the offline / first-paint fallback.
 *
 * Set the hosted URL when building the apps:
 *   CAP_SERVER_URL=https://your-domain.in npx cap sync
 * Leaving it unset loads the local shell (useful only for a smoke test).
 */
const SERVER_URL = process.env.CAP_SERVER_URL?.trim()

const config: CapacitorConfig = {
  appId: 'in.shikshasarthi.app',
  appName: 'Shiksha Sarthi',
  webDir: 'mobile-shell',
  backgroundColor: '#ffffff',
  server: {
    androidScheme: 'https',
    ...(SERVER_URL ? { url: SERVER_URL, cleartext: false } : {}),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#1d4ed8',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1d4ed8',
    },
  },
}

export default config
