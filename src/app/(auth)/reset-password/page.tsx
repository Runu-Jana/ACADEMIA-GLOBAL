import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from './reset-form'

export const metadata: Metadata = { title: 'Reset password' }

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
