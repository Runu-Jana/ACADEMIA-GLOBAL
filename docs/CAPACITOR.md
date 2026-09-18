# Capacitor — native Android + iOS apps

Capacitor packages Shiksha Sarthi as real apps for the **Google Play Store and
the Apple App Store**, reusing the existing web app.

## How it works (important)

This is a **Next.js SSR** app (server components, API routes, middleware auth), so
it **cannot** be statically exported into the app. Instead the native WebView
loads the **live hosted site** via `server.url` in `capacitor.config.ts`.

What that buys you:

- **Reuses 100% of the app** — every screen, unchanged.
- **Auth just works.** The WebView is first-party to your domain, so the existing
  JWT-in-cookie login flows normally. No token rework needed for the basic app.
- **Web deploys update the app instantly** — most releases need no new app build.

The trade-off: a remote-URL app is **online-first**. True offline (download a
course, watch on a train) is **not** included here — that's Phase 2 (native
download plugins + your own hosted video; YouTube/Vimeo embeds can never be
downloaded). See "Roadmap" below.

## What's set up in this repo

- `capacitor.config.ts` — `appId` `in.shikshasarthi.app`, `appName` "Shiksha
  Sarthi", `webDir` `mobile-shell`, splash + status-bar theming, and `server.url`
  read from the `CAP_SERVER_URL` env var.
- `mobile-shell/index.html` — the required local web dir; shown only as the
  offline / first-paint fallback (the app normally loads the hosted site).
- npm scripts: `cap:add:android`, `cap:add:ios`, `cap:sync`, `cap:android`,
  `cap:ios`.
- `android/` and `ios/` are **git-ignored** (regenerate with `cap add`). Commit
  them later if you start customising native code.

## Prerequisites

- **Android:** Android Studio (bundles the SDK + JDK).
- **iOS:** a **Mac** with Xcode + CocoaPods. iOS cannot be built on Windows.

## Build & run

Always pass your live HTTPS domain so the app loads the real site:

```bash
# 1. Point the app at your deployed site (must be HTTPS)
export CAP_SERVER_URL=https://your-domain.in      # Windows PowerShell: $env:CAP_SERVER_URL="https://your-domain.in"

# 2. Add platforms (once)
npm run cap:add:android
npm run cap:add:ios        # on a Mac only

# 3. Sync config/plugins into the native projects (after any config or plugin change)
npm run cap:sync

# 4. Open the native IDE to run on a device/emulator and to build the release
npm run cap:android        # opens Android Studio -> Build > Generate Signed Bundle (.aab)
npm run cap:ios            # opens Xcode (Mac)
```

> Re-run `npm run cap:sync` whenever you change `capacitor.config.ts`,
> `CAP_SERVER_URL`, or add a plugin. The `android/` folder generated during setup
> carries whatever `CAP_SERVER_URL` was set at the time — sync again with the real
> URL before you build for release.

## App icons & splash

Generate native icons/splash from a source image with the official tool:

```bash
npm i -D @capacitor/assets
# put a 1024x1024 icon at resources/icon.png and a splash at resources/splash.png
npx capacitor-assets generate
```

Use the existing brand art in `public/icons/` as the source.

## Roadmap — the native features worth adding

Add these as Capacitor plugins once the basic wrapper is shipping:

1. **Push notifications** — `@capacitor/push-notifications` + FCM (Android) / APNs
   (iOS) + a device-token table. Web push was never built, so this is net-new.
2. **Offline course download** — `@capacitor/filesystem` + a **managed video
   pipeline** (Mux / Cloudflare Stream / Bunny) with signed, DRM-protected
   downloads. This is the India-competitive feature and the main reason to go
   native over a TWA.
3. **Secure token auth** — only needed if you make native API calls *outside* the
   WebView; use `@capacitor/preferences` + a bearer-token path alongside cookies.
4. **Deep links / app links** — `@capacitor/app` to route `https://your-domain`
   URLs into the app.

## Store submission notes

- **Apple review 4.2:** a pure website wrapper can be rejected. Ship with real
  native value (push, offline downloads, native share) to pass comfortably.
- **Payments (both stores):** digital goods (course/degree access) are expected to
  use **Play Billing / Apple IAP** (15–30% cut). Selling course access via Razorpay
  *inside the app* risks rejection. Physical shop goods are exempt. Safest pattern:
  buy course access on the **web**, the app only unlocks it.
- **Privacy:** point both stores' privacy questionnaires at `/legal/privacy` and
  keep them consistent with what the app collects.

## Relationship to the TWA

The TWA (see `PWA-TWA.md`) is a **quick Android-only** win. Capacitor is the
**both-stores** path and the only route to the **App Store**. If you ship both to
Google Play, use **different package ids** (or retire the TWA once the Capacitor
Android app is live) — Play won't accept two apps with the same id.
