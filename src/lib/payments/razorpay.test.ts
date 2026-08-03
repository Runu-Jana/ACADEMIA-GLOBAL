import { describe, it, expect, beforeEach } from 'vitest'
import crypto from 'node:crypto'
import { verifyCheckoutSignature, verifyWebhookSignature } from './razorpay'

const KEY_SECRET = 'rzp_test_key_secret'
const WEBHOOK_SECRET = 'rzp_test_webhook_secret'

const hmac = (secret: string, data: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex')

beforeEach(() => {
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
})

describe('verifyCheckoutSignature', () => {
  it('accepts a correctly-signed order|payment pair', () => {
    const sig = hmac(KEY_SECRET, 'order_1|pay_1')
    expect(verifyCheckoutSignature('order_1', 'pay_1', sig)).toBe(true)
  })

  it('rejects a tampered payment id', () => {
    const sig = hmac(KEY_SECRET, 'order_1|pay_1')
    expect(verifyCheckoutSignature('order_1', 'pay_2', sig)).toBe(false)
  })

  it('rejects a signature made with the wrong secret', () => {
    const sig = hmac('not_the_secret', 'order_1|pay_1')
    expect(verifyCheckoutSignature('order_1', 'pay_1', sig)).toBe(false)
  })

  it('rejects empty / non-hex signatures', () => {
    expect(verifyCheckoutSignature('order_1', 'pay_1', '')).toBe(false)
    expect(verifyCheckoutSignature('order_1', 'pay_1', 'not-hex!!')).toBe(false)
  })

  it('rejects when the secret is not configured', () => {
    const sig = hmac(KEY_SECRET, 'order_1|pay_1')
    delete process.env.RAZORPAY_KEY_SECRET
    expect(verifyCheckoutSignature('order_1', 'pay_1', sig)).toBe(false)
  })
})

describe('verifyWebhookSignature', () => {
  it('accepts a correct raw-body signature', () => {
    const body = '{"event":"payment.captured","payload":{}}'
    expect(verifyWebhookSignature(body, hmac(WEBHOOK_SECRET, body))).toBe(true)
  })

  it('rejects if the body was modified after signing', () => {
    const body = '{"event":"payment.captured"}'
    const sig = hmac(WEBHOOK_SECRET, body)
    expect(verifyWebhookSignature(`${body} `, sig)).toBe(false)
  })

  it('rejects a checkout-style signature (different secret/domain)', () => {
    const body = '{"event":"payment.captured"}'
    expect(verifyWebhookSignature(body, hmac(KEY_SECRET, body))).toBe(false)
  })
})
