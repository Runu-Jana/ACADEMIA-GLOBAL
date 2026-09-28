import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ForgotPasswordForm } from './forgot-form'

export const metadata: Metadata = { title: 'Forgot password' }

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-muted" />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
