/**
 * Branded transactional email templates. Each returns { subject, text, html }
 * ready for sendEmail(). HTML is inline-styled and table-free-ish so it survives
 * the usual email clients; a plain-text fallback always accompanies it.
 */

import type { AdminMail } from '@/lib/email'
import { SITE_URL } from '@/lib/site-url'

const BRAND = 'Shiksha Sarthi'
const APP_URL = SITE_URL

const inr = (rupees: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(rupees))}`

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

/** Shared branded shell: header bar, white card, muted footer. */
function shell(previewText: string, innerHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <span style="display:none;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${previewText}</span>
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;padding:8px 0 18px;">
      <span style="display:inline-block;font-size:18px;font-weight:800;letter-spacing:-.3px;color:#1e3a8a;">${BRAND}</span>
      <span style="display:block;font-size:10px;font-weight:700;letter-spacing:1.6px;color:#64748b;text-transform:uppercase;margin-top:2px;">Virtual Learning</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 26px;">
      ${innerHtml}
    </div>
    <p style="text-align:center;font-size:11px;line-height:1.6;color:#94a3b8;margin:18px 8px 0;">
      You're receiving this because you have an account with ${BRAND}.<br>
      ${APP_URL.replace(/^https?:\/\//, '')}
    </p>
  </div>
</body></html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:10px;">${label}</a>`
}

/** Sent right after a student creates their account. */
export function welcomeEmail(name: string): AdminMail {
  const hi = firstName(name)
  const dash = `${APP_URL}/dashboard`
  const courses = `${APP_URL}/courses`
  return {
    subject: `Welcome to ${BRAND}, ${hi}!`,
    text: [
      `Hi ${hi},`,
      ``,
      `Welcome to ${BRAND} — your account is ready.`,
      `Browse programmes from our partner universities, apply online, and learn from anywhere.`,
      ``,
      `Explore courses: ${courses}`,
      `Your dashboard:  ${dash}`,
      ``,
      `— The ${BRAND} team`,
    ].join('\n'),
    html: shell(
      `Your ${BRAND} account is ready.`,
      `<h1 style="margin:0 0 12px;font-size:20px;font-weight:800;">Welcome aboard, ${hi} 👋</h1>
       <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#334155;">
         Your ${BRAND} account is ready. Browse programmes from our partner universities,
         apply online in minutes, and study from anywhere.
       </p>
       <p style="margin:0 0 22px;">${button(courses, 'Explore courses')}</p>
       <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
         Anything you start is saved to your <a href="${dash}" style="color:#2563eb;text-decoration:none;font-weight:600;">dashboard</a>.
       </p>`,
    ),
  }
}

/** Sent once, when payment is confirmed and the student is enrolled. */
export function enrolmentEmail(opts: {
  name: string
  courseTitle: string
  universityName: string
  amountRupees: number
  paymentId?: string | null
}): AdminMail {
  const hi = firstName(opts.name)
  const paid = opts.amountRupees > 0
  const classroom = `${APP_URL}/dashboard`

  const receiptText = paid
    ? [
        ``,
        `Payment receipt`,
        `  Amount paid: ${inr(opts.amountRupees)}`,
        opts.paymentId ? `  Payment ref: ${opts.paymentId}` : ``,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  const receiptHtml = paid
    ? `<table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:13px;">
         <tr><td style="padding:8px 0;color:#64748b;">Amount paid</td>
             <td style="padding:8px 0;text-align:right;font-weight:800;color:#0f172a;">${inr(opts.amountRupees)}</td></tr>
         ${opts.paymentId ? `<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #eef2f7;">Payment reference</td>
             <td style="padding:8px 0;text-align:right;font-family:monospace;color:#334155;border-top:1px solid #eef2f7;">${opts.paymentId}</td></tr>` : ''}
       </table>`
    : ''

  return {
    subject: `You're enrolled: ${opts.courseTitle}`,
    text: [
      `Hi ${hi},`,
      ``,
      `You're enrolled in ${opts.courseTitle} (${opts.universityName}).`,
      `Your classroom, study material and tests are ready now.`,
      receiptText,
      ``,
      `Open your classroom: ${classroom}`,
      ``,
      `— The ${BRAND} team`,
    ]
      .filter((l) => l !== undefined)
      .join('\n'),
    html: shell(
      `You're enrolled in ${opts.courseTitle}.`,
      `<div style="text-align:center;margin:0 0 14px;">
         <span style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:50%;background:#dcfce7;color:#16a34a;font-size:22px;">✓</span>
       </div>
       <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;text-align:center;">You're enrolled 🎓</h1>
       <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;text-align:center;">
         ${hi}, your seat in <strong>${opts.courseTitle}</strong><br>
         <span style="color:#64748b;">${opts.universityName}</span> is confirmed.
       </p>
       ${receiptHtml}
       <p style="margin:0 0 20px;text-align:center;">${button(classroom, 'Open my classroom')}</p>
       <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
         Your classroom, study material and tests are ready now.
       </p>`,
    ),
  }
}
