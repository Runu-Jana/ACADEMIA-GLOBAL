'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  Check,
  RefreshCw,
  AlertTriangle,
  Search,
  GraduationCap,
  Building2,
  Award,
  CalendarDays,
  Hash,
  User as UserIcon,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { verifyCertificate, type VerifyResult } from './actions'

type Captcha = { a: number; b: number }

function makeCaptcha(): Captcha {
  return { a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 9) }
}

export function VerifyForm({ initialSerial }: { initialSerial: string }) {
  const [serial, setSerial] = React.useState(initialSerial)
  const [dob, setDob] = React.useState('')
  const [answer, setAnswer] = React.useState('')

  // Generated after mount: Math.random() during render would break hydration.
  const [captcha, setCaptcha] = React.useState<Captcha | null>(null)
  const [pending, startTransition] = React.useTransition()
  const [result, setResult] = React.useState<VerifyResult | null>(null)
  const [formError, setFormError] = React.useState('')

  React.useEffect(() => setCaptcha(makeCaptcha()), [])

  function refreshCaptcha() {
    setCaptcha(makeCaptcha())
    setAnswer('')
  }

  /**
   * A verification result only ever describes the values that produced it —
   * the moment either field changes, the panel beside the form is stale and
   * must go, or someone could read a "genuine" verdict next to a serial it
   * was never checked against.
   */
  function editField(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setResult(null)
      setFormError('')
    }
  }

  const onSerialChange = editField(setSerial)
  const onDobChange = editField(setDob)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setResult(null)

    if (!serial.trim()) {
      setFormError('Enter the enrollment or serial number.')
      return
    }
    if (!dob) {
      setFormError("Enter the certificate holder's date of birth.")
      return
    }
    if (!captcha) return

    if (Number(answer) !== captcha.a + captcha.b) {
      setFormError('That security answer is not correct. Please try again.')
      refreshCaptcha()
      return
    }

    startTransition(async () => {
      const res = await verifyCertificate({ serial, dob })
      setResult(res)
      refreshCaptcha()
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr] lg:items-start">
      {/* ------------------------------------------------------------- form */}
      <form onSubmit={onSubmit} className="card-base holo-ring p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-holo-sweep">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </span>
          <div>
            <h2 className="text-[15px] font-bold leading-tight">Verify a Certificate</h2>
            <p className="text-[12px] text-muted-foreground">Both fields must match our records.</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <Field
            label="Enrollment / Serial Number"
            required
            hint="Printed at the bottom of the certificate."
          >
            <Input
              value={serial}
              onChange={(e) => onSerialChange(e.target.value)}
              placeholder="AG-2026-DDM-004821"
              autoComplete="off"
              spellCheck={false}
              maxLength={64}
              className="font-mono uppercase placeholder:normal-case placeholder:font-sans"
              required
            />
          </Field>

          <Field label="Date of Birth" required>
            <Input
              type="date"
              value={dob}
              onChange={(e) => onDobChange(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>

          {/* ------------------------------------------------------ captcha */}
          <Field label="Security check" required>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-11 select-none items-center gap-1.5 rounded-xl border border-border bg-muted px-3.5 font-mono text-[15px] font-bold tracking-wide"
                aria-hidden
              >
                {captcha ? `${captcha.a} + ${captcha.b} =` : '· · ·'}
              </span>
              <Input
                type="number"
                inputMode="numeric"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="?"
                aria-label={
                  captcha
                    ? `What is ${captcha.a} plus ${captcha.b}?`
                    : 'Loading security question'
                }
                className="w-20 shrink-0 text-center"
                required
              />
              <button
                type="button"
                onClick={refreshCaptcha}
                aria-label="New security question"
                title="New security question"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </Field>

          {formError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </p>
          )}

          <Button
            type="submit"
            variant="holo"
            size="lg"
            loading={pending}
            disabled={pending || !captcha}
            className="w-full"
          >
            {pending ? 'Verifying…' : 'Verify Certificate'}
          </Button>
        </div>
      </form>

      {/* ------------------------------------------------------------ result */}
      <div aria-live="polite" className="min-w-0">
        {!result && <IdlePanel />}
        {result?.ok === true && <VerifiedPanel certificate={result.certificate} />}
        {result?.ok === false && <FailedPanel message={result.error} />}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- idle state */

function IdlePanel() {
  return (
    <div className="card-base flex h-full min-h-[20rem] flex-col items-center justify-center p-8 text-center">
      <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Search className="h-7 w-7" />
      </span>
      <h2 className="text-[17px] font-bold">Awaiting certificate details</h2>
      <p className="mt-1.5 max-w-sm text-pretty text-[13.5px] text-muted-foreground">
        Enter the serial number and the holder&apos;s date of birth, solve the security check, and
        the verified record will appear here.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------- verified state */

function VerifiedPanel({
  certificate,
}: {
  certificate: {
    serial: string
    name: string
    course: string
    university: string
    grade: string
    issuedAt: string
  }
}) {
  const rows = [
    { icon: UserIcon, label: 'Certificate holder', value: certificate.name },
    { icon: GraduationCap, label: 'Programme', value: certificate.course },
    { icon: Building2, label: 'University', value: certificate.university },
    { icon: Award, label: 'Grade awarded', value: certificate.grade },
    { icon: CalendarDays, label: 'Issued on', value: formatDate(certificate.issuedAt) },
    { icon: Hash, label: 'Serial number', value: certificate.serial, mono: true },
  ]

  return (
    <div className="card-base holo-ring holo-surface animate-scale-in overflow-hidden">
      <div className="relative flex flex-col items-center border-b border-border p-6 text-center">
        {/* Holographic seal */}
        <span className="holo-ring mb-3 grid h-20 w-20 place-items-center rounded-full bg-card shadow-glow">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-holo-sweep">
            <Check className="h-7 w-7 text-white" strokeWidth={3} />
          </span>
        </span>

        <Badge tone="success" className="mb-2">
          <ShieldCheck className="h-3 w-3" />
          Verified
        </Badge>
        <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          This certificate is genuine
        </h2>
        <p className="mt-1.5 max-w-md text-pretty text-[13px] text-muted-foreground">
          The serial number and date of birth match a certificate issued through Shiksha Sarthi.
        </p>
      </div>

      <dl className="divide-y divide-border">
        {rows.map(({ icon: Icon, label, value, mono }) => (
          <div key={label} className="flex items-start gap-3 px-4 py-3 sm:px-5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </dt>
              <dd className={`mt-0.5 break-words text-[14px] font-bold ${mono ? 'font-mono' : ''}`}>
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------ failed state */

function FailedPanel({ message }: { message: string }) {
  return (
    <div className="card-base animate-scale-in flex h-full min-h-[20rem] flex-col items-center justify-center p-8 text-center">
      <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <Badge tone="danger" className="mb-2">
        No match
      </Badge>
      <h2 className="text-[17px] font-bold">No matching certificate found</h2>
      <p className="mt-1.5 max-w-sm text-pretty text-[13.5px] text-muted-foreground">{message}</p>
      <Link
        href="/courses"
        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}
      >
        Explore our programmes
      </Link>
    </div>
  )
}
