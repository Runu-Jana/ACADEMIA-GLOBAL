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

import { captureError } from '@/lib/observability'

export interface AdminMail {
  subject: string
  text: string
  html?: string
}

export type EmailResult = { sent: boolean; reason?: string }

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL)
}

/** Notifies the operator (ADMIN_EMAIL) — leads, callback requests, etc. */
export async function sendAdminEmail(mail: AdminMail): Promise<EmailResult> {
  return sendEmail(process.env.ADMIN_EMAIL ?? '', mail)
}

/**
 * Sends a transactional email to a specific recipient (a student's welcome,
 * enrolment confirmation, receipt…). Same graceful degradation as the admin
 * path: with no RESEND_API_KEY it logs and returns { sent: false } rather than
 * throwing, so the calling flow (signup, payment) always completes.
 */
export async function sendEmail(to: string, mail: AdminMail): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY
  // Resend's shared sender works without domain verification for quick starts.
  const from = process.env.EMAIL_FROM || 'Shiksha Sarthi <onboarding@resend.dev>'

  if (!key || !to) {
    console.info(`[email] not configured — skipping: "${mail.subject}"`)
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
      captureError(new Error(`Resend ${res.status}: ${body.slice(0, 200)}`), { scope: 'email' })
      return { sent: false, reason: `provider_error_${res.status}` }
    }
    return { sent: true }
  } catch (err) {
    captureError(err, { scope: 'email', subject: mail.subject })
    return { sent: false, reason: 'send_error' }
  }
}
