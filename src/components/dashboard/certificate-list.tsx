'use client'

import * as React from 'react'
import Link from 'next/link'
import { Printer, BadgeCheck, ShieldCheck, Award } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { UniversityMark } from '@/components/course/course-thumb'
import { cn, formatDate } from '@/lib/utils'

export type CertificateItem = {
  id: string
  serial: string
  grade: string
  issuedAt: string
  studentName: string
  courseTitle: string
  courseLevel: string
  universityName: string
  universityShortName: string
  completedAt: string | null
  /** Absolute /verify?serial=… link, and a pre-rendered QR SVG that encodes it. */
  verifyUrl: string
  qrSvg: string
}

export function CertificateList({ certificates }: { certificates: CertificateItem[] }) {
  const [printingId, setPrintingId] = React.useState<string | null>(null)

  // Let the "print only this one" classes land before opening the dialog.
  React.useEffect(() => {
    if (!printingId) return
    const t = window.setTimeout(() => {
      window.print()
      setPrintingId(null)
    }, 60)
    return () => window.clearTimeout(t)
  }, [printingId])

  return (
    <ul className="space-y-6">
      {certificates.map((c) => (
        <li
          key={c.id}
          className={cn('ag-cert', printingId && printingId !== c.id && 'print:hidden')}
        >
          <CertificateCard certificate={c} onPrint={() => setPrintingId(c.id)} />
        </li>
      ))}
    </ul>
  )
}

function CertificateCard({
  certificate: c,
  onPrint,
}: {
  certificate: CertificateItem
  onPrint: () => void
}) {
  return (
    <div>
      <article className="holo-ring relative overflow-hidden rounded-2xl border border-border bg-card shadow-card print:shadow-none">
        {/* iridescent wash + fine grain keep the flat gradient from banding */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(90%_70%_at_10%_0%,rgba(34,211,238,.16),transparent_55%),radial-gradient(80%_60%_at_90%_5%,rgba(232,121,249,.14),transparent_55%),radial-gradient(100%_100%_at_50%_120%,rgba(129,140,248,.18),transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[.04] [background-image:repeating-linear-gradient(45deg,currentColor_0,currentColor_1px,transparent_1px,transparent_14px)]"
        />

        <div className="relative p-5 sm:p-8">
          {/* -------------------------------------------------- masthead */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-[13px] font-extrabold uppercase tracking-[.24em] text-primary-700 dark:text-primary-300">
                Shiksha Sarthi
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                Virtual Learning · India
              </p>
            </div>

            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-holo-sweep text-white shadow-glow print:animate-none">
              <Award className="h-6 w-6" />
            </span>
          </div>

          {/* ------------------------------------------------------ body */}
          <div className="mt-7 text-center">
            <h3 className="font-display text-xl font-extrabold tracking-tight sm:text-[26px]">
              Certificate of Completion
            </h3>
            <div
              aria-hidden
              className="mx-auto mt-2.5 h-px w-24 bg-gradient-to-r from-transparent via-primary-400 to-transparent"
            />

            <p className="mt-6 text-[12px] uppercase tracking-[.14em] text-muted-foreground">
              This is to certify that
            </p>
            <p className="mt-2 text-balance font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {c.studentName}
            </p>

            <p className="mt-5 text-[12px] uppercase tracking-[.14em] text-muted-foreground">
              has successfully completed
            </p>
            <p className="mt-2 text-balance font-display text-lg font-extrabold sm:text-xl">
              {c.courseTitle}
            </p>

            <div className="mt-3.5 flex items-center justify-center gap-2">
              <UniversityMark name={c.universityName} size={24} />
              <span className="text-[13px] font-semibold text-muted-foreground">
                {c.universityName}
              </span>
            </div>
          </div>

          {/* ---------------------------------------------------- footer */}
          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
            <Meta label="Serial Number" value={c.serial} mono />
            <Meta label="Grade Awarded" value={c.grade} />
            <Meta label="Issued On" value={formatDate(c.issuedAt)} />
            <Meta
              label="Verification"
              value="Online verifiable"
              icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
            />
          </dl>

          {/* ------------------------------------------- scan-to-verify */}
          <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
            <div
              aria-hidden
              className="h-[70px] w-[70px] shrink-0 rounded-lg border border-border bg-white p-1 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: c.qrSvg }}
            />
            <div className="min-w-0 text-left">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Scan to verify authenticity
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                Or visit{' '}
                <span className="font-semibold text-foreground">
                  {c.verifyUrl.replace(/^https?:\/\//, '').replace(/\?.*$/, '')}
                </span>{' '}
                and enter serial{' '}
                <span className="font-mono font-semibold text-foreground">{c.serial}</span> with the
                holder&rsquo;s date of birth. Issued electronically — no physical signature required.
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* --------------------------------------------------------- actions */}
      <div className="mt-3 flex flex-wrap gap-2.5 print:hidden">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="h-3.5 w-3.5" />
          Print / Save PDF
        </Button>
        <Link
          href={`/verify?serial=${encodeURIComponent(c.serial)}`}
          className={buttonVariants({ variant: 'holo', size: 'sm' })}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          Verify Certificate
        </Link>
        <span className="ml-auto self-center text-[11px] text-muted-foreground">
          {c.completedAt ? `Course completed ${formatDate(c.completedAt)}` : null}
        </span>
      </div>
    </div>
  )
}

function Meta({
  label,
  value,
  mono,
  icon,
}: {
  label: string
  value: string
  mono?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 flex items-center gap-1.5 truncate text-[12.5px] font-bold',
          mono && 'font-mono tracking-tight',
        )}
      >
        {icon}
        {value}
      </dd>
    </div>
  )
}
