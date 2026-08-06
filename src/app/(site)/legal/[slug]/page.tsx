import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Aurora } from '@/components/fx/aurora'

/**
 * Placeholder legal copy. These are plain-language summaries written for the
 * demo — have them reviewed by counsel before you launch.
 */
const DOCS = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This policy explains what Shiksha Sarthi collects when you use the platform, why we collect it, and the choices you have.',
    sections: [
      { h: 'What we collect', p: 'Account details you give us (name, email, mobile, date of birth, city), the programmes you view or apply to, your learning progress and assessment results, and standard technical logs such as browser type and IP address.' },
      { h: 'Why we collect it', p: 'To create and secure your account, process admission applications with the university you choose, deliver course material and track your progress, and respond to support requests.' },
      { h: 'Who we share it with', p: 'Only the university you apply to, and service providers who host or operate the platform on our behalf. We do not sell your personal data.' },
      { h: 'How long we keep it', p: 'For as long as your account is active, and afterwards only where a legal or academic-record obligation requires it.' },
      { h: 'Your choices', p: 'You can view and correct your details from your profile, ask us to delete your account, or withdraw consent to marketing contact at any time by writing to support@academiaglobal.in.' },
      { h: 'Children', p: 'Accounts are intended for learners aged 16 and above. Where a learner is younger, a parent or guardian must create and supervise the account.' },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'By creating an account you agree to these terms. Please read them before enrolling in any programme.',
    sections: [
      { h: 'What Shiksha Sarthi is', p: 'We are an education discovery and support platform. We are not a university and we do not award degrees. Degrees are awarded solely by the partner institution you enrol with.' },
      { h: 'Your account', p: 'Keep your password confidential and your details accurate. You are responsible for activity under your account. Tell us immediately if you suspect unauthorised access.' },
      { h: 'Admissions and eligibility', p: 'Final admission, eligibility and fee decisions rest with the university. Information shown here is indicative and may change without notice.' },
      { h: 'Course material', p: 'Material in your dashboard is licensed to you for personal study only. Redistributing, reselling or publicly posting it is not permitted.' },
      { h: 'Acceptable use', p: 'Do not attempt to disrupt the platform, access other learners’ data, or use automated tools to scrape content.' },
      { h: 'Limitation of liability', p: 'We work to keep information accurate but cannot guarantee outcomes such as admission, employment or examination results.' },
    ],
  },
  refund: {
    title: 'Refund Policy',
    intro: 'Refunds for tuition are governed by the awarding university’s policy. This page explains how the process works in practice.',
    sections: [
      { h: 'Counselling is free', p: 'Shiksha Sarthi does not charge learners for counselling, shortlisting or admission support. If anyone asks you to pay us a fee, report it to support@academiaglobal.in.' },
      { h: 'University fees', p: 'Tuition is paid to and refunded by the university. Their published refund schedule — typically tied to how many days have passed since enrolment — applies in full.' },
      { h: 'How to request a refund', p: 'Raise the request from your dashboard or email support@academiaglobal.in with your enrolment number. We will forward it to the university and track it on your behalf.' },
      { h: 'Timelines', p: 'Universities generally process approved refunds within 21–45 working days to the original payment method.' },
      { h: 'Non-refundable items', p: 'Registration and examination fees are usually non-refundable once the session has started. Check your offer letter for specifics.' },
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    intro: 'Read this alongside our Terms & Conditions.',
    sections: [
      { h: 'Information accuracy', p: 'Course fees, durations, eligibility criteria and approval statuses change. We update listings regularly but you must verify details with the university before paying anything.' },
      { h: 'No guarantee of outcomes', p: 'Nothing on this platform is a promise of admission, placement, salary or examination success. Placement support means assistance, not a guaranteed job.' },
      { h: 'Third-party content', p: 'University names, logos and accreditation marks belong to their respective owners and are used for identification only.' },
      { h: 'Demo content', p: 'This deployment contains seeded sample data for demonstration. Institution profiles, ratings and testimonials shown here are illustrative and must be replaced with verified information before public launch.' },
    ],
  },
} as const

type Slug = keyof typeof DOCS

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS[slug as Slug]
  return doc ? { title: doc.title, description: doc.intro } : { title: 'Not found' }
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = DOCS[slug as Slug]
  if (!doc) notFound()

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="cool" density={2} />
        <div className="container relative py-12">
          <Badge tone="primary" className="mb-3">
            <ShieldCheck className="h-3 w-3" />
            Legal
          </Badge>
          <h1 className="font-display text-3xl font-extrabold">{doc.title}</h1>
          <p className="mt-2.5 max-w-2xl text-pretty text-[15px] text-muted-foreground">{doc.intro}</p>
        </div>
      </section>

      <section className="container max-w-3xl py-12">
        <div className="space-y-7">
          {doc.sections.map((s, i) => (
            <section key={s.h}>
              <h2 className="flex items-baseline gap-2.5 text-[17px] font-extrabold">
                <span className="text-sm font-bold text-primary-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.h}
              </h2>
              <p className="mt-2 text-pretty text-[14px] leading-relaxed text-muted-foreground">
                {s.p}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-[13px] text-muted-foreground">
          <strong className="font-bold text-foreground">Note:</strong> this is plain-language
          placeholder copy for the demo build. Have a qualified legal advisor review and adapt it
          before you publish.
        </p>
      </section>
    </>
  )
}
