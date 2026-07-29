import crypto from 'node:crypto'

/**
 * Razorpay integration — talked to over its REST API with fetch, and verified
 * with Node's crypto. No SDK: order creation is one authenticated POST and
 * every "did this really happen?" question is an HMAC check, so a dependency
 * buys nothing and this stays auditable in one file.
 *
 * Two independent signatures matter, and both are verified server-side because
 * the browser can lie:
 *   - checkout signature — HMAC(order_id|payment_id, key_secret), returned to
 *     the client on a successful checkout and posted back for immediate confirm;
 *   - webhook signature — HMAC(rawBody, webhook_secret), the reliable backstop
 *     when the browser closes before the callback fires.
 * Both funnel into the same idempotent markOrderPaid, so confirming twice is safe.
 */

const API_BASE = 'https://api.razorpay.com/v1'

export function paymentsConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

/** The publishable key id — safe to hand to the browser for Checkout. */
export function razorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID ?? null
}

function basicAuth(): string {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) throw new Error('Razorpay keys are not configured')
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`
}

export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  status: string
}

/** Creates a Razorpay order (amount in paise). Auto-captures on payment. */
export async function createRazorpayOrder(params: {
  amount: number
  currency?: string
  receipt: string
  notes?: Record<string, string>
}): Promise<RazorpayOrder> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency ?? 'INR',
      receipt: params.receipt,
      notes: params.notes ?? {},
      payment_capture: 1,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Razorpay order creation failed (${res.status}): ${detail.slice(0, 200)}`)
  }
  return (await res.json()) as RazorpayOrder
}

/** Constant-time compare of two hex digests. */
function safeEqualHex(a: string, b: string): boolean {
  let ab: Buffer
  let bb: Buffer
  try {
    ab = Buffer.from(a, 'hex')
    bb = Buffer.from(b, 'hex')
  } catch {
    return false
  }
  if (ab.length === 0 || ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/** Verifies the signature Checkout returns: HMAC(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  return safeEqualHex(expected, signature)
}

/** Verifies a webhook: HMAC(rawBody, webhook_secret). Pass the UNPARSED body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeEqualHex(expected, signature)
}
