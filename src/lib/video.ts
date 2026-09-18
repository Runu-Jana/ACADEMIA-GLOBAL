/**
 * Turns a lesson's raw `contentUrl` into something the player can render.
 *
 * A lesson URL is admin-entered free text, so it's untrusted. Rather than drop
 * whatever was typed straight into an <iframe src> (which would let a typo — or
 * a malicious paste — frame an arbitrary origin), we recognise only YouTube and
 * Vimeo, extract the id, and rebuild a canonical embed URL ourselves. Direct
 * media files render in a native <video>, where the browser, not an embed, is in
 * control. Anything else is "unknown" and the player shows its empty state.
 */

export type ParsedVideo =
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string }
  | { kind: 'file'; fileUrl: string }
  | { kind: 'unknown' }

const YT_ID = /^[A-Za-z0-9_-]{11}$/
const ytEmbed = (id: string) => `https://www.youtube.com/embed/${id}?rel=0`

export function parseVideoUrl(raw: string | null | undefined): ParsedVideo {
  const s = (raw ?? '').trim()
  if (!s) return { kind: 'unknown' }

  let u: URL
  try {
    u = new URL(s)
  } catch {
    return { kind: 'unknown' }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { kind: 'unknown' }

  const host = u.hostname.replace(/^www\./, '').toLowerCase()

  // ----- YouTube -----
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    if (YT_ID.test(id)) return { kind: 'youtube', id, embedUrl: ytEmbed(id) }
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v')
    if (v && YT_ID.test(v)) return { kind: 'youtube', id: v, embedUrl: ytEmbed(v) }
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/)
    if (m) return { kind: 'youtube', id: m[1], embedUrl: ytEmbed(m[1]) }
  }

  // ----- Vimeo -----
  if (host === 'vimeo.com') {
    const m = u.pathname.match(/^\/(\d+)/)
    if (m) return { kind: 'vimeo', id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}` }
  }
  if (host === 'player.vimeo.com') {
    const m = u.pathname.match(/^\/video\/(\d+)/)
    if (m) return { kind: 'vimeo', id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}` }
  }

  // ----- Direct media file -----
  if (/\.(mp4|webm|ogv|ogg|mov|m4v|m3u8)(\?|#|$)/i.test(u.pathname + u.search)) {
    return { kind: 'file', fileUrl: s }
  }

  return { kind: 'unknown' }
}

/* ------------------------------------------------------------------ managed */

/**
 * A lesson's playable video, resolved from either a managed provider (adaptive
 * HLS, downloadable for offline) or the legacy `contentUrl` (YouTube/Vimeo/file).
 * This is the seam the player and the offline layer both read, so swapping in a
 * managed provider (Mux/Cloudflare/Bunny) never touches the player.
 */
export type LessonVideoSource =
  | { kind: 'hls'; src: string; poster: string | null; downloadUrl: string | null; provider: string | null }
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string }
  | { kind: 'file'; fileUrl: string; poster: string | null; downloadUrl: string | null }
  | { kind: 'unknown' }

/** The lesson fields the resolver reads (a subset of the Prisma Lesson). */
export type LessonVideoInput = {
  type?: string | null
  contentUrl?: string | null
  streamUrl?: string | null
  downloadUrl?: string | null
  posterUrl?: string | null
  videoProvider?: string | null
}

const clean = (v: string | null | undefined) => {
  const t = (v ?? '').trim()
  return t ? t : null
}

export function resolveLessonVideo(l: LessonVideoInput): LessonVideoSource {
  if (l.type === 'LIVE') return { kind: 'unknown' }

  const poster = clean(l.posterUrl)

  // A managed HLS source wins over the legacy contentUrl.
  const stream = clean(l.streamUrl)
  if (stream) {
    return { kind: 'hls', src: stream, poster, downloadUrl: clean(l.downloadUrl), provider: clean(l.videoProvider) }
  }

  const parsed = parseVideoUrl(l.contentUrl)
  switch (parsed.kind) {
    case 'youtube':
      return { kind: 'youtube', id: parsed.id, embedUrl: parsed.embedUrl }
    case 'vimeo':
      return { kind: 'vimeo', id: parsed.id, embedUrl: parsed.embedUrl }
    case 'file':
      // A directly-hosted file is itself downloadable; an explicit downloadUrl wins.
      return { kind: 'file', fileUrl: parsed.fileUrl, poster, downloadUrl: clean(l.downloadUrl) ?? parsed.fileUrl }
    default:
      return { kind: 'unknown' }
  }
}

/** Whether this lesson can be saved for offline viewing (never for YT/Vimeo embeds). */
export function isDownloadable(src: LessonVideoSource): boolean {
  return (src.kind === 'hls' || src.kind === 'file') && !!src.downloadUrl
}

/** The single URL a native client fetches to store the lesson offline, or null. */
export function downloadUrlOf(src: LessonVideoSource): string | null {
  if (src.kind === 'hls' || src.kind === 'file') return src.downloadUrl
  return null
}
