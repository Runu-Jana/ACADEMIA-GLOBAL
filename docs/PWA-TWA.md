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

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR_DOMAIN/manifest.webmanifest
# answer prompts: application id (e.g. in.shikshasarthi.app), name, launcher name,
# start url, colours (theme #1d4ed8) — most are read from the manifest
bubblewrap build          # produces app-release-signed.apk / .aab + prints the fingerprint
```

Keep `applicationId` in sync with `package_name` in `assetlinks.json`
(currently `in.shikshasarthi.app` — change both together if you pick another).

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

## Publish

- Google Play Developer account: **$25** one-time.
- Upload the **.aab**, fill the store listing (screenshots, description, the privacy
  policy URL), complete the data-safety form, submit for review.

## Updating

- Web changes deploy as normal — the TWA always renders the live site, so most
  updates need **no** new app release.
- Rebuild/republish the Android app only when you change the manifest identity,
  icons, app name, or native config. Bump `VERSION` in `sw.js` on deploys that change
  cached assets.
