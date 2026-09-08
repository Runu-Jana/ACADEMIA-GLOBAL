'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Lock, ShoppingBag } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { useCart, clearStoredCart } from '@/lib/use-cart'
import { cn } from '@/lib/utils'
import { formatPaise, INDIAN_STATES, PINCODE_RE, PHONE_RE } from '@/lib/shop'
import { openRazorpayCheckout, CHECKOUT_CANCELLED } from '@/lib/payments/checkout'
import type { PricedCart } from '@/lib/shop-pricing'

type Address = {
  name: string
  email: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
}

const EMPTY: Address = {
  name: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '',
}

/**
 * Delivery details + payment.
 *
 * Validation here is a courtesy to the buyer, not a security boundary — the
 * same rules run again server-side in /api/shop/checkout, which is the copy
 * that actually matters.
 */
export function CheckoutForm({ signedInAs }: { signedInAs?: { name: string; email: string } | null }) {
  const router = useRouter()
  const { lines, ready, count } = useCart()

  const [address, setAddress] = React.useState<Address>({
    ...EMPTY,
    name: signedInAs?.name ?? '',
    email: signedInAs?.email ?? '',
  })
  const [priced, setPriced] = React.useState<PricedCart | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const set = (key: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddress((a) => ({ ...a, [key]: e.target.value }))

  const signature = lines.map((l) => `${l.productId}:${l.qty}`).join('|')

  React.useEffect(() => {
    if (!ready) return
    if (lines.length === 0) {
      setPriced(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    fetch('/api/shop/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })) }),
    })
      .then((r) => r.json())
      .then((data: PricedCart) => !cancelled && setPriced(data))
      .catch(() => !cancelled && setPriced(null))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready])

  function validate(): string | null {
    if (address.name.trim().length < 2) return 'Please enter your full name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address.email.trim())) return 'Please enter a valid email address.'
    if (!PHONE_RE.test(address.phone.trim())) return 'Please enter a valid 10-digit Indian mobile number.'
    if (address.line1.trim().length < 4) return 'Please enter your address.'
    if (address.city.trim().length < 2) return 'Please enter your city.'
    if (!address.state) return 'Please select your state.'
    if (!PINCODE_RE.test(address.pincode.trim())) return 'Please enter a valid 6-digit PIN code.'
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
          address: { ...address, line2: address.line2 || undefined },
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        // 409 means the cart moved under us — show the corrected totals.
        if (data.cart) setPriced(data.cart)
        setError(data.error ?? 'Something went wrong. Please try again.')
        setBusy(false)
        return
      }

      // Dev path with no gateway keys: the order is already open, confirm it.
      if (data.demo) {
        await confirm(data.orderId)
        return
      }

      const result = await openRazorpayCheckout({
        keyId: data.keyId,
        orderId: data.gatewayOrderId,
        amount: data.amount,
        currency: 'INR',
        name: 'Shiksha Sarthi',
        description: `Order ${data.orderNumber}`,
        prefill: { name: address.name, email: address.email, contact: address.phone },
      })

      await confirm(data.orderId, result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed.'
      setError(
        message === CHECKOUT_CANCELLED
          ? 'Payment was cancelled. Your cart is still here whenever you are ready.'
          : message,
      )
      setBusy(false)
    }
  }

  async function confirm(
    orderId: string,
    result?: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    const res = await fetch('/api/shop/checkout/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        ...(result
          ? {
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              signature: result.razorpay_signature,
            }
          : {}),
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'We could not confirm your payment. Please contact support.')
      setBusy(false)
      return
    }

    clearStoredCart()
    router.push(`/shop/order/${encodeURIComponent(data.orderNumber)}?just_paid=1`)
  }

  if (!ready || loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 aria-hidden className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!priced || priced.lines.length === 0) {
    return (
      <div className="card-base grid place-items-center px-6 py-16 text-center">
        <ShoppingBag aria-hidden className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-[15px] font-bold">Nothing to check out</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Your cart is empty.</p>
        <Link href="/shop" className={buttonVariants({ variant: 'primary', size: 'sm', className: 'mt-5' })}>
          Browse the shop
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="card-base p-5">
        <h2 className="text-[15px] font-extrabold tracking-tight">Delivery address</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          We deliver across India. Orders are dispatched within two working days.
        </p>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <Input value={address.name} onChange={set('name')} autoComplete="name" maxLength={80} required />
          </Field>

          <Field label="Email">
            <Input type="email" value={address.email} onChange={set('email')} autoComplete="email" maxLength={120} required />
          </Field>

          <Field label="Mobile number">
            <Input type="tel" value={address.phone} onChange={set('phone')} autoComplete="tel" maxLength={14} placeholder="10-digit mobile" required />
          </Field>

          <Field label="Address" className="sm:col-span-2">
            <Input value={address.line1} onChange={set('line1')} autoComplete="address-line1" maxLength={160} placeholder="House / flat, street" required />
          </Field>

          <Field label="Landmark / area (optional)" className="sm:col-span-2">
            <Input value={address.line2} onChange={set('line2')} autoComplete="address-line2" maxLength={160} />
          </Field>

          <Field label="City">
            <Input value={address.city} onChange={set('city')} autoComplete="address-level2" maxLength={80} required />
          </Field>

          <Field label="State">
            <Select value={address.state} onChange={set('state')} required>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>

          <Field label="PIN code">
            <Input value={address.pincode} onChange={set('pincode')} autoComplete="postal-code" inputMode="numeric" maxLength={6} required />
          </Field>
        </div>

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------ summary */}
      <aside className="card-base p-4 lg:sticky lg:top-24">
        <h2 className="text-[15px] font-extrabold tracking-tight">
          Order summary
          <span className="ml-1.5 font-semibold text-muted-foreground">({count} items)</span>
        </h2>

        <ul className="mt-3 space-y-2 border-b border-border pb-3 text-[12.5px]">
          {priced.lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-3">
              <span className="line-clamp-2 text-muted-foreground">
                {l.title} <span className="whitespace-nowrap">× {l.qty}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums">{formatPaise(l.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-2 text-[13.5px]">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-bold tabular-nums">{formatPaise(priced.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className={cn('font-bold tabular-nums', priced.shipping === 0 && 'text-emerald-600 dark:text-emerald-400')}>
              {priced.shipping === 0 ? 'Free' : formatPaise(priced.shipping)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <dt className="font-extrabold">Total</dt>
            <dd className="text-lg font-extrabold tabular-nums text-primary-700 dark:text-primary-300">
              {formatPaise(priced.total)}
            </dd>
          </div>
        </dl>

        <Button type="submit" variant="holo" size="md" className="mt-4 w-full" loading={busy} disabled={busy}>
          <Lock className="h-4 w-4" />
          Pay {formatPaise(priced.total)}
        </Button>

        <Link href="/shop/cart" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-2 w-full')}>
          Back to cart
        </Link>

        <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
          Payments are processed securely by Razorpay. We never see your card details.
        </p>
      </aside>
    </form>
  )
}
