'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { openRazorpayCheckout, CHECKOUT_CANCELLED } from '@/lib/payments/checkout'

/**
 * The "get all-access" button on a membership plan card.
 *
 * Signed-out visitors get a link to sign in first (checkout needs an account to
 * attach the pass to). For a signed-in student it runs the same create → hosted
 * checkout → signed verify flow the course and shop payments use; the dev build
 * with no gateway keys activates immediately via the create endpoint's demo path.
 */
export function MembershipCheckout({
  planId,
  signedIn,
  featured = false,
}: {
  planId: string
  signedIn: boolean
  featured?: boolean
}) {
  const t = useTranslations('membership')
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  if (!signedIn) {
    return (
      <Link
        href="/login?returnTo=/membership"
        className={buttonVariants({ variant: featured ? 'holo' : 'outline', className: 'mt-6 w-full' })}
      >
        {t('signInCta')}
      </Link>
    )
  }

  async function onJoin() {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/membership/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? t('err.generic'))
        setBusy(false)
        return
      }

      // Dev path with no gateway keys: the create endpoint already activated it.
      if (data.joined || data.demo) {
        router.push('/membership?joined=1')
        router.refresh()
        return
      }

      const result = await openRazorpayCheckout({
        keyId: data.razorpay.keyId,
        orderId: data.razorpay.orderId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency ?? 'INR',
        name: data.razorpay.name,
        description: data.razorpay.description,
        prefill: data.razorpay.prefill,
      })

      const vres = await fetch('/api/membership/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          signature: result.razorpay_signature,
        }),
      })
      const vdata = await vres.json()
      if (!vres.ok) {
        setError(vdata.error ?? t('err.verifyFailed'))
        setBusy(false)
        return
      }

      router.push('/membership?joined=1')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('err.payFailed')
      setError(message === CHECKOUT_CANCELLED ? t('err.cancelled') : message)
      setBusy(false)
    }
  }

  return (
    <div className="mt-6">
      <Button
        type="button"
        variant={featured ? 'holo' : 'outline'}
        className="w-full"
        loading={busy}
        disabled={busy}
        onClick={onJoin}
      >
        <Sparkles className="h-4 w-4" />
        {t('cta')}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-center text-[12px] font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
