import type { Metadata } from 'next'
import { ShieldCheck, Lock, FileSearch, BadgeCheck } from 'lucide-react'
import { Aurora } from '@/components/fx/aurora'
import { Reveal } from '@/components/fx/reveal'
import { VerifyForm } from './verify-form'

export const metadata: Metadata = {
  title: 'Verify Certificate',
  description:
    'Confirm that an Shiksha Sarthi certificate is genuine using its serial number and the holder’s date of birth.',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const initialSerial = typeof sp.serial === 'string' ? sp.serial.slice(0, 64) : ''

  return (
    <div className="relative">
      <Aurora palette="cool" density={2} />

      <section className="container relative z-10 py-8 sm:py-10">
        <Reveal>
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-600 shadow-soft dark:text-primary-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Certificate Verification
            </span>
            <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Verify an <span className="holo-text">Shiksha Sarthi</span> certificate
            </h1>
            <p className="mt-3 text-pretty text-[14.5px] text-muted-foreground">
              Employers and institutions can confirm any certificate issued through our platform.
              You will need the serial number printed on the certificate and the holder&apos;s date
              of birth.
            </p>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <VerifyForm initialSerial={initialSerial} />
        </Reveal>

        {/* ------------------------------------------------------ assurances */}
        <Reveal delay={140}>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Lock,
                title: 'Two-factor lookup',
                body: 'A serial number alone reveals nothing — the date of birth must match too.',
              },
              {
                icon: FileSearch,
                title: 'Minimal disclosure',
                body: 'We show the name, programme, grade and issue date. Nothing else is exposed.',
              },
              {
                icon: BadgeCheck,
                title: 'Earned, not just attended',
                body: 'A certificate is issued only after the student finishes every lesson and passes the course assessments.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="card-base flex gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold">{title}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>
    </div>
  )
}
