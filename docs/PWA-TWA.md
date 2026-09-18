# PWA & TWA (downloadable Android app)

Shiksha Sarthi ships as an installable **PWA**, and is set up to be packaged as a
**TWA** (Trusted Web Activity) for the **Google Play Store**. A TWA is a thin
Android app that renders your live, hosted site full-screen with no browser
chrome — so the app store listing and the web app stay one codebase.

> iOS note: TWA is **Android only**. The Apple App Store does not allow it. For
> iOS you need a wrapper such as Capacitor (see the main "convert to mobile app"
> discussion) — that is a separate track.

## What's already configured (in this repo)

- **Web manifest** — `public/manifest.webmanifest`: `id`, `name`, `short_name`,
  `start_url` (`/dashboard`), `scope` (`/`), `display: standalone`, theme/background
  colours, `lang`/`dir`, categories, and app **shortcuts**. Linked from
  `src/app/layout.tsx` (`metadata.manifest`).
- **Icons** — `public/icons/`: `icon-192.png`, `icon-512.png` (purpose `any`),
  `icon-maskable-192.png`, `icon-maskable-512.png` (purpose `maskable`, full-bleed
  with the required 80% safe zone so Android's adaptive-icon mask never crops the
  logo), plus SVG and an `apple-touch-icon.png`.
  - Regenerate the maskable PNGs from `icon-maskable.svg` with `sharp` if the logo
    ever changes.
- **Service worker** — `public/sw.js`, registered in production only by
  `src/components/pwa-register.tsx`. Network-first for navigations with an
  `/offline` fallback, cache-first for static assets, and it **never caches**
  authenticated HTML (`/dashboard`, `/admin`, …) or any `/api/` response — this app
  runs on shared/family devices, so a cached dashboard would leak one student's data
  to the next. Bump `VERSION` in `sw.js` to invalidate old caches on deploy.
- **Digital Asset Links** — `public/.well-known/assetlinks.json` (served at
  `/.well-known/assetlinks.json`). This is what lets the TWA drop the browser
  address bar. **It currently holds a placeholder fingerprint — you must replace it
  (step 3 below).**

## Production checklist (before packaging)

1. **HTTPS on a real domain.** TWA/PWA installability both require it. Set
   `NEXT_PUBLIC_SITE_URL` to that domain (currently `https://your-domain.example`
   in `.env.example`).
2. **Real privacy policy & contact details.** Play Store review requires a working
   privacy policy URL; the current legal/contact copy is placeholder (a launch gate
   tracked elsewhere).
3. **Payments policy — decide first.** Google Play requires **Play Billing** for
   *digital* goods (course/degree access), with a 15–30% cut; selling course access
   via Razorpay *inside the app* can get it removed. Physical shop goods
   (books/stationery) are exempt. Common safe pattern: purchase course access on the
   **web**, and let the app only unlock already-purchased content.
4. **Verify the manifest & SW** with Chrome DevTools → Application, or run Lighthouse
   → "Installable". `npm run build && npm start`, then check on the deployed HTTPS URL.

## Build the TWA

### Option A — PWABuilder (easiest, web UI)

1. Deploy the site to its HTTPS domain.
2. Go to <https://www.pwabuilder.com>, enter the URL, let it score the manifest/SW.
3. Package for **Android** → download the project (it wraps the site as a TWA and
   generates a signing key — **keep that keystore safe; it signs every future
   update**).
4. Take the **SHA-256 fingerprint** it shows you into step 3 below.

### Option B — Bubblewrap (CLI, more control)

A ready-made config lives at repo root: **`twa-manifest.json`** (brand name,
colours, `packageId` `in.shikshasarthi.app`, `startUrl` `/dashboard`, the three
shortcuts, icon URLs). So you skip the interactive `init` and just point it at your
domain:

```bash
npm i -g @bubblewrap/cli

# 1. Replace every "your-domain.example" in twa-manifest.json with your real domain
#    (host, iconUrl, maskableIconUrl, webManifestUrl, fullScopeUrl, shortcut icons).
# 2. From the folder holding twa-manifest.json:
bubblewrap update          # pulls icons/manifest from the live site into the project
bubblewrap build           # produces app-release-bundle.aab (+ .apk) and prints the
                           # SHA-256 fingerprint you need for assetlinks.json
```

First run creates the Android signing keystore at `./android-signing.keystore`
(alias `shiksha`) — **back it up; it signs every future update.** Keep `packageId`
in `twa-manifest.json` in sync with `package_name` in `assetlinks.json` (both
`in.shikshasarthi.app` — change together if you pick another).

> Requirements for Bubblewrap: JDK 17 and the Android SDK (Bubblewrap can install a
> bundled JDK/SDK on first run). PWABuilder (Option A) needs neither — it's the
> faster route if you don't already have Android tooling.

## Step 3 — Digital Asset Links (drops the address bar)

1. Get the **SHA-256 fingerprint** of the key that signs the app:
   - PWABuilder prints it, or
   - Bubblewrap prints it after `build`, or
   - from a keystore:
     `keytool -list -v -keystore your.keystore -alias your-alias` (copy the SHA256).
   - If you use **Play App Signing** (recommended), also add the fingerprint Google
     shows under Play Console → your app → Setup → App integrity → App signing key.
2. Put the fingerprint(s) into `public/.well-known/assetlinks.json`, replacing
   `REPLACE_WITH_YOUR_APP_SIGNING_SHA256_FINGERPRINT`. You can list **multiple**
   fingerprints (upload key + Play signing key).
3. Redeploy, and confirm `https://YOUR_DOMAIN/.well-known/assetlinks.json` returns
   the real JSON over HTTPS. Verify with Google's tester:
   <https://developers.google.com/digital-asset-links/tools/generator>
4. Reinstall the app — the address bar should be gone.

## Play Store listing assets

| Asset | Requirement | Status |
|---|---|---|
| App icon | 512×512 PNG | ✅ `public/icons/icon-512.png` |
| Feature graphic | 1024×500 PNG | ✅ `store-assets/play-feature-graphic.png` (edit the `.svg` to restyle) |
| Phone screenshots | 2–8, min 320px, 16:9 or 9:16 | ⬜ capture from the running app (Chrome DevTools device mode, or a phone) |
| Short description | ≤ 80 chars | ⬜ e.g. "UGC-entitled online & distance degrees, courses, and exam prep." |
| Full description | ≤ 4000 chars | ⬜ |
| Privacy policy URL | public HTTPS page | ⬜ real policy required (current copy is placeholder) |
| Data safety form | in Play Console | ⬜ declare what you collect (name, email, payments) |
| Content rating | questionnaire | ⬜ |

## Publish

- Google Play Developer account: **$25** one-time.
- Upload the **.aab**, attach the assets above, complete the data-safety +
  content-rating forms, add the privacy policy URL, and submit for review
  (first review typically a few days).

## Where things live

- `public/manifest.webmanifest` — web manifest
- `public/sw.js` + `src/components/pwa-register.tsx` — service worker + registration
- `public/icons/` — all icons (incl. PNG maskables)
- `public/.well-known/assetlinks.json` — Digital Asset Links (fill the fingerprint)
- `twa-manifest.json` — Bubblewrap build config
- `store-assets/` — Play listing art (feature graphic + its source SVG)

## Updating

- Web changes deploy as normal — the TWA always renders the live site, so most
  updates need **no** new app release.
- Rebuild/republish the Android app only when you change the manifest identity,
  icons, app name, or native config. Bump `VERSION` in `sw.js` on deploys that change
  cached assets.
