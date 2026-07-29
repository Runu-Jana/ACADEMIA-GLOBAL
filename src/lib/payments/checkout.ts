/**
 * Client-side Razorpay Checkout launcher.
 *
 * Loads Razorpay's hosted checkout script on demand and opens the modal,
 * resolving with the signed result the server then verifies. The `CANCELLED`
 * sentinel lets callers tell "user closed the modal" apart from a real failure.
 */

export interface CheckoutOptions {
  keyId: string
  orderId: string
  amount: number
  currency: string
  name: string
  description: string
  prefill: { name: string; email: string; contact: string }
}

export interface CheckoutResult {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

/** Thrown-message sentinel when the shopper dismisses the modal. */
export const CHECKOUT_CANCELLED = 'CHECKOUT_CANCELLED'

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

/* eslint-disable @typescript-eslint/no-explicit-any */
function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Checkout is unavailable here.'))
    if ((window as any).Razorpay) return resolve()

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Could not load the payment gateway.')))
      return
    }
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load the payment gateway.'))
    document.body.appendChild(s)
  })
}

export async function openRazorpayCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
  await loadScript()
  return new Promise<CheckoutResult>((resolve, reject) => {
    const Razorpay = (window as any).Razorpay
    if (!Razorpay) return reject(new Error('Could not load the payment gateway.'))

    const rzp = new Razorpay({
      key: opts.keyId,
      order_id: opts.orderId,
      amount: opts.amount,
      currency: opts.currency,
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: '#1d4ed8' },
      handler: (resp: CheckoutResult) => resolve(resp),
      modal: { ondismiss: () => reject(new Error(CHECKOUT_CANCELLED)) },
    })
    rzp.on('payment.failed', (resp: any) =>
      reject(new Error(resp?.error?.description ?? 'Your payment could not be completed.')),
    )
    rzp.open()
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */
