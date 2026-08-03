/**
 * Minimal transactional email, in the same spirit as the AI layer: it works when
 * configured and degrades gracefully when it isn't. With no key set it logs and
 * returns `{ sent: false }` rather than throwing, so a feature that notifies the
 * admin (e.g. a live-counsellor request) still completes — the in-app signal is
 * the source of truth; email is the nudge on top.
 *
 * Uses Resend's HTTP API via fetch, so there's no SDK dependency to install.
 * Set RESEND_API_KEY and ADMIN_EMAIL (and optionally EMAIL_FROM) to switch it on.
 */

export interface AdminMail {
  subject: string
  text: string
  html?: string
}

export type EmailResult = { sent: boolean; reason?: string }

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL)
}

export async function sendAdminEmail(mail: AdminMail): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY
  const to = process.env.ADMIN_EMAIL
  // Resend's shared sender works without domain verification for quick starts.
  const from = process.env.EMAIL_FROM || 'Academia Global <onboarding@resend.dev>'

  if (!key || !to) {
    console.info(`[email] not configured — skipping admin notification: "${mail.subject}"`)
    return { sent: false, reason: 'email_not_configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[email] provider error ${res.status}: ${body.slice(0, 200)}`)
      return { sent: false, reason: `provider_error_${res.status}` }
    }
    return { sent: true }
  } catch (err) {
    console.error('[email] send failed:', err instanceof Error ? err.message : err)
    return { sent: false, reason: 'send_error' }
  }
}
