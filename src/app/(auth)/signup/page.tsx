import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignupForm } from './signup-form'

export const metadata: Metadata = { title: 'Sign Up' }

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
      <SignupForm />
    </Suspense>
  )
}
