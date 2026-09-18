# Managed video & offline download

The foundation for adaptive, downloadable course video — the feature that lets
Shiksha Sarthi match PhysicsWallah / Unacademy on offline lectures, and the main
reason to go native (Capacitor) over a TWA.

## Why this exists

Course videos are currently YouTube/Vimeo embeds or direct files. YouTube/Vimeo
**cannot be downloaded** for offline viewing and give you no control. To offer
offline lectures you move video to a **managed provider** that serves adaptive
HLS for streaming and a progressive MP4 for download.

## The seam (already built)

Everything reads video through one resolver, so swapping in a provider never
touches the player:

- **Data model** — `Lesson` gained `streamUrl` (HLS `.m3u8`), `downloadUrl`
  (progressive MP4 for offline), `posterUrl` (thumbnail), and `videoProvider`
  (`mux` | `cloudflare` | `bunny`).
- **Resolver** — `resolveLessonVideo()` in `src/lib/video.ts` returns a typed
  `LessonVideoSource` (`hls` | `youtube` | `vimeo` | `file` | `unknown`). A managed
  `streamUrl` takes precedence over the legacy `contentUrl`. `isDownloadable()` and
  `downloadUrlOf()` say whether/where a lesson can be saved offline (never for
  YouTube/Vimeo).
- **Playback** — the player plays managed HLS everywhere: native on Safari/iOS,
  via **hls.js** on Android/Chrome. Posters are shown before play. All the existing
  watch-tracking, resume and auto-complete work unchanged.
- **Offline manifest API** — `GET /api/courses/[courseId]/offline` (enrollment-
  gated) returns the course's downloadable lessons + materials with their URLs,
  posters and sizes. This is what a native client reads to download a course.

## Choosing a provider

| Provider | Notes for India | Downloadable MP4 | DRM |
|---|---|---|---|
| **Bunny Stream** | Cheapest, good India CDN PoPs — usually the best value | Yes | Basic token auth |
| **Cloudflare Stream** | Simple per-minute pricing, strong global CDN | Yes (downloads API) | Signed URLs |
| **Mux** | Best DX/analytics, pricier | Yes (static renditions) | Signed + DRM add-on |

For a cost-sensitive Indian audience, **Bunny Stream** is the usual starting point.

## Wiring a provider (per-video)

1. Add the provider's API key to `.env` (e.g. `BUNNY_STREAM_API_KEY`,
   `BUNNY_LIBRARY_ID`) — never commit keys.
2. In the admin lesson editor (follow-up UI — see below), upload the source file to
   the provider, then store on the `Lesson`:
   - `streamUrl` = the provider's HLS playback URL
   - `downloadUrl` = the provider's MP4 download URL
   - `posterUrl` = the provider's thumbnail
   - `videoProvider` = the provider tag
3. That's it — the player switches to adaptive HLS automatically, and the lesson
   becomes eligible for offline download.

> **Signed URLs:** for paid content, generate short-lived signed URLs at request
> time. The natural place is the offline manifest route (`/api/courses/[id]/offline`)
> and a small `/api/lessons/[id]/playback` route — mint the signed URL there instead
> of returning a static one.

## The native offline flow (Capacitor)

Once a provider is wired, the app-side download layer (see `CAPACITOR.md`) is:

1. Learner taps **Download** on a course.
2. App calls `GET /api/courses/[id]/offline` for the manifest.
3. For each item, download the file with `@capacitor/filesystem` to app storage;
   show progress; store a local record (course, lesson, local path, size).
4. Playback checks local-first: if a lesson is downloaded, play the local file
   (`Capacitor.convertFileSrc(path)`); otherwise stream.
5. Watch progress is saved locally offline and synced to `/api/progress` +
   `/api/progress/watch` when back online.
6. A "Downloads" screen to manage storage and delete courses.

## Built vs. still to do

**Built (this foundation):** data model, resolver, hls.js playback, posters, the
offline manifest API.

**To do:**
- Admin lesson UI to upload to a provider and populate the four fields.
- Provider upload helper + signed-URL minting in `src/lib/` (once a provider is chosen).
- The Capacitor download/store/offline-playback layer + a Downloads screen.
- Optional DRM (Widevine/FairPlay) for high-value content.
