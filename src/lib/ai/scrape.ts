/**
 * Fetches a public web page and reduces it to plain text for AI extraction.
 *
 * Deliberately minimal and honest about its limits: it fetches server-rendered
 * HTML and strips it to text. Sites that render their catalogue entirely in
 * client-side JavaScript won't yield much — for those, the admin pastes the text
 * instead. It identifies itself with a descriptive User-Agent and only reads
 * HTML the server returns; nothing here bypasses a paywall or login.
 *
 * The extracted text is FACTS to be reviewed by a human before anything is
 * published — see the directory ingest flow.
 */

const MAX_BYTES = 3_000_000
const TIMEOUT_MS = 15_000
const UA = 'AcademiaGlobalBot/1.0 (+https://academiaglobal.in; directory listing; support@academiaglobal.in)'

export async function fetchPageText(rawUrl: string): Promise<string> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Enter a valid URL, including https://')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.')
  }

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,text/plain' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new Error('Could not reach that page. Check the URL, or paste the text instead.')
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
