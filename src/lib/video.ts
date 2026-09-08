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
  | { kind: 'youtube'; embedUrl: string }
  | { kind: 'vimeo'; embedUrl: string }
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
    if (YT_ID.test(id)) return { kind: 'youtube', embedUrl: ytEmbed(id) }
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v')
    if (v && YT_ID.test(v)) return { kind: 'youtube', embedUrl: ytEmbed(v) }
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/)
    if (m) return { kind: 'youtube', embedUrl: ytEmbed(m[1]) }
  }

  // ----- Vimeo -----
  if (host === 'vimeo.com') {
    const m = u.pathname.match(/^\/(\d+)/)
    if (m) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${m[1]}` }
  }
  if (host === 'player.vimeo.com') {
    const m = u.pathname.match(/^\/video\/(\d+)/)
    if (m) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${m[1]}` }
  }

  // ----- Direct media file -----
  if (/\.(mp4|webm|ogv|ogg|mov|m4v|m3u8)(\?|#|$)/i.test(u.pathname + u.search)) {
    return { kind: 'file', fileUrl: s }
  }

  return { kind: 'unknown' }
}
