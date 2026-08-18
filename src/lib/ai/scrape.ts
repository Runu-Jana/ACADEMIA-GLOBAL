import { lookup } from 'node:dns/promises'
import { SITE_URL } from '@/lib/site-url'
import { SUPPORT_EMAIL } from '@/lib/contact'

/**
 * Fetches a public web page and reduces it to plain text for AI extraction.
 *
 * Deliberately minimal and honest about its limits: it fetches server-rendered
 * HTML and strips it to text. Sites that render their catalogue entirely in
 * client-side JavaScript won't yield much — for those, the admin pastes the text
 * instead. It identifies itself with a descriptive User-Agent and only reads
 * HTML the server returns; nothing here bypasses a paywall or login.
 *
 * SSRF hardening: the target host is DNS-resolved and rejected if it maps to a
 * loopback / private / link-local (incl. cloud-metadata 169.254.169.254) address,
 * and redirects are followed manually so each hop is re-validated — a public URL
 * can't 302 the server into the internal network. (A determined DNS-rebind could
 * still race the resolve-then-connect gap, but this closes the common cases; the
 * surface is admin/approved-partner only.)
 *
 * The extracted text is FACTS to be reviewed by a human before anything is
 * published — see the directory ingest flow.
 */

const MAX_BYTES = 3_000_000
const TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 4
// Site owners read this in their logs, so it has to point at a URL and a mailbox
// that actually reach us — both come from the app's own configuration.
const UA = `ShikshaSarthiBot/1.0 (+${SITE_URL}; directory listing; ${SUPPORT_EMAIL})`
const BLOCKED = 'That address is not allowed.'

function ipv4IsPrivate(ip: string): boolean {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = p
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224 // multicast / reserved
  )
}

function ipIsPrivate(ip: string): boolean {
  const l = ip.toLowerCase()
  if (l.includes(':')) {
    if (l === '::1' || l === '::') return true
    if (l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80')) return true // ULA + link-local
    // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4 address.
    const mapped = l.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return ipv4IsPrivate(mapped[1]!)
    return false
  }
  return ipv4IsPrivate(l)
}

/** Rejects hosts that resolve to non-public addresses (or obvious internal names). */
async function assertPublicHost(hostname: string): Promise<void> {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) {
    throw new Error(BLOCKED)
  }
  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new Error('Could not resolve that host. Check the URL, or paste the text instead.')
  }
  if (!addresses.length || addresses.some((a) => ipIsPrivate(a.address))) {
    throw new Error(BLOCKED)
  }
}

function parseUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Enter a valid URL, including https://')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.')
  }
  return url
}

export async function fetchPageText(rawUrl: string): Promise<string> {
  let url = parseUrl(rawUrl)

  // Follow redirects by hand so every hop is host-validated.
  let res: Response
  for (let hop = 0; ; hop++) {
    await assertPublicHost(url.hostname)
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html,text/plain' },
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      throw new Error('Could not reach that page. Check the URL, or paste the text instead.')
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (hop >= MAX_REDIRECTS) throw new Error('That page redirected too many times.')
      url = parseUrl(new URL(res.headers.get('location')!, url).toString())
      continue
    }
    break
  }

  if (!res.ok) throw new Error(`Could not fetch that page (HTTP ${res.status}).`)

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new Error('That link is not a readable web page. Paste the text instead.')
  }

  const html = (await res.text()).slice(0, MAX_BYTES)
  const text = htmlToText(html)
  if (text.length < 200) {
    throw new Error(
      'That page had almost no readable text (it may render with JavaScript). Paste the text instead.',
    )
  }
  return text
}

/** Strips HTML to readable text. Not a full parser — good enough for the model. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Turn block-level closings into line breaks so structure survives.
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|table)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
