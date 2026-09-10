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

/**
 * Re-engagement nudge — the email half of the "come back" loop. Three shapes:
 * a streak-save, a continue-where-you-left-off, and a start-your-course prompt.
 */
export function reminderEmail(opts: {
  name: string
  kind: 'streak' | 'continue' | 'comeback'
  courseTitle?: string
  /** App-relative path the CTA opens, e.g. /dashboard/learn/<id>. */
  path: string
  streakDays?: number
  progressPct?: number
}): AdminMail {
  const hi = firstName(opts.name)
  const link = `${APP_URL}${opts.path}`

  let subject: string
  let heading: string
  let body: string
  let cta: string
  if (opts.kind === 'streak') {
    subject = `Keep your ${opts.streakDays}-day streak alive 🔥`
    heading = `Don't break the chain, ${hi}`
    body = `You've learned ${opts.streakDays} days in a row. Do one lesson today to keep your streak going.`
    cta = 'Continue learning'
  } else if (opts.kind === 'continue') {
    subject = `Pick up ${opts.courseTitle} where you left off`
    heading = `You're ${opts.progressPct}% of the way there, ${hi}`
    body = `Your progress in ${opts.courseTitle} is saved. A few minutes today keeps the momentum going.`
    cta = 'Resume course'
  } else {
    subject = `Your classroom is waiting, ${hi}`
    heading = `Ready to begin, ${hi}?`
    body = `You enrolled in ${opts.courseTitle} but haven't started yet — your first lesson takes only a few minutes.`
    cta = 'Start learning'
  }

  return {
    subject,
    text: [`Hi ${hi},`, ``, body, ``, `${cta}: ${link}`, ``, `— The ${BRAND} team`].join('\n'),
    html: shell(
      subject,
      `<h1 style="margin:0 0 12px;font-size:20px;font-weight:800;">${heading}</h1>
       <p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:#334155;">${body}</p>
       <p style="margin:0;">${button(link, cta)}</p>`,
    ),
  }
}

/** Order confirmation sent to the buyer once payment clears. */
export function shopOrderEmail(order: {
  orderNumber: string
  name: string
  subtotal: number
  shipping: number
  total: number
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  items: { title: string; price: number; qty: number }[]
}): AdminMail {
  const hi = firstName(order.name)
  // Money is stored in paise in the shop; emails talk rupees.
  const rs = (paise: number) => inr(Math.round(paise / 100))
  const track = `${APP_URL}/shop/order/${encodeURIComponent(order.orderNumber)}`

  const address = [order.line1, order.line2, `${order.city}, ${order.state} ${order.pincode}`]
    .filter(Boolean)
    .join('\n  ')

  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;color:#334155;">${i.title} <span style="color:#94a3b8;">× ${i.qty}</span></td>
             <td style="padding:8px 0;text-align:right;font-weight:700;color:#0f172a;">${rs(i.price * i.qty)}</td></tr>`,
    )
    .join('')

  return {
    subject: `Order confirmed — ${order.orderNumber}`,
    text: [
      `Hi ${hi},`,
      ``,
      `Thanks for your order. We've received your payment and are getting it ready to ship.`,
      ``,
      `Order ${order.orderNumber}`,
      ...order.items.map((i) => `  ${i.title} × ${i.qty} — ${rs(i.price * i.qty)}`),
      ``,
      `  Subtotal: ${rs(order.subtotal)}`,
      `  Delivery: ${order.shipping === 0 ? 'Free' : rs(order.shipping)}`,
      `  Total paid: ${rs(order.total)}`,
      ``,
      `Delivering to:`,
      `  ${address}`,
      ``,
      `Track your order: ${track}`,
      ``,
      `— The ${BRAND} team`,
    ].join('\n'),
    html: shell(
      `Order ${order.orderNumber} confirmed.`,
      `<div style="text-align:center;margin:0 0 14px;">
         <span style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:50%;background:#dcfce7;color:#16a34a;font-size:22px;">✓</span>
       </div>
       <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;text-align:center;">Order confirmed</h1>
       <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;text-align:center;">
         Thanks ${hi} — we're getting order
         <strong style="font-family:monospace;">${order.orderNumber}</strong> ready to ship.
       </p>
       <table style="width:100%;border-collapse:collapse;margin:0 0 8px;font-size:13px;">
         ${rows}
       </table>
       <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:13px;border-top:1px solid #eef2f7;">
         <tr><td style="padding:8px 0;color:#64748b;">Subtotal</td>
             <td style="padding:8px 0;text-align:right;color:#334155;">${rs(order.subtotal)}</td></tr>
         <tr><td style="padding:4px 0;color:#64748b;">Delivery</td>
             <td style="padding:4px 0;text-align:right;color:#334155;">${order.shipping === 0 ? 'Free' : rs(order.shipping)}</td></tr>
         <tr><td style="padding:8px 0;color:#0f172a;font-weight:800;border-top:1px solid #eef2f7;">Total paid</td>
             <td style="padding:8px 0;text-align:right;font-weight:800;color:#0f172a;border-top:1px solid #eef2f7;">${rs(order.total)}</td></tr>
       </table>
       <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#64748b;">DELIVERING TO</p>
       <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#334155;">
         ${[order.line1, order.line2, `${order.city}, ${order.state} ${order.pincode}`].filter(Boolean).join('<br>')}
       </p>
       <p style="margin:0 0 20px;text-align:center;">${button(track, 'Track my order')}</p>`,
    ),
  }
}

/** Operator ping so someone actually packs the parcel. */
export function shopOrderAdminEmail(order: {
  orderNumber: string
  name: string
  phone: string
  city: string
  state: string
  total: number
  items: { title: string; qty: number }[]
}): AdminMail {
  const rs = (paise: number) => inr(Math.round(paise / 100))
  const link = `${APP_URL}/admin/shop/orders`

  return {
    subject: `New shop order ${order.orderNumber} — ${rs(order.total)}`,
    text: [
      `A shop order has been paid and needs packing.`,
      ``,
      `Order:  ${order.orderNumber}`,
      `Buyer:  ${order.name} (${order.phone})`,
      `Ship to: ${order.city}, ${order.state}`,
      `Total:  ${rs(order.total)}`,
      ``,
      ...order.items.map((i) => `  ${i.title} × ${i.qty}`),
      ``,
      `Fulfil it: ${link}`,
    ].join('\n'),
    html: shell(
      `New shop order ${order.orderNumber}.`,
      `<h1 style="margin:0 0 12px;font-size:18px;font-weight:800;">New shop order</h1>
       <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13px;">
         <tr><td style="padding:6px 0;color:#64748b;">Order</td>
             <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:700;">${order.orderNumber}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;">Buyer</td>
             <td style="padding:6px 0;text-align:right;">${order.name} · ${order.phone}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;">Ship to</td>
             <td style="padding:6px 0;text-align:right;">${order.city}, ${order.state}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;">Total</td>
             <td style="padding:6px 0;text-align:right;font-weight:800;">${rs(order.total)}</td></tr>
       </table>
       <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;">ITEMS</p>
       <p style="margin:0 0 20px;font-size:13px;line-height:1.7;color:#334155;">
         ${order.items.map((i) => `${i.title} × ${i.qty}`).join('<br>')}
       </p>
       <p style="margin:0;text-align:center;">${button(link, 'Fulfil this order')}</p>`,
    ),
  }
}
