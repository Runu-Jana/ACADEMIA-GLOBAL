import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Aurora } from '@/components/fx/aurora'
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_HOURS,
  HEAD_OFFICE_CITY,
  HEAD_OFFICE_POSTCODE,
} from '@/lib/contact'

/**
 * Legal copy. The Privacy Policy is a production-grade draft written for the
 * Indian market (DPDP Act 2023, IT Act / SPDI grievance-officer duty, Google
 * Play Data Safety alignment) — square-bracketed items still need the real legal
 * entity and grievance-officer details, and it should be confirmed by counsel
 * before launch. Terms / Refund / Disclaimer remain plain-language placeholders.
 */
type LegalDoc = {
  title: string
  intro: string
  /** Shown under the title on reviewed policies. */
  effective?: string
  /** false → the page shows the "demo placeholder" banner. */
  reviewed?: boolean
  sections: { h: string; p: string }[]
}

const OFFICE = `${HEAD_OFFICE_CITY}, ${HEAD_OFFICE_POSTCODE}`

const DOCS: Record<string, LegalDoc> = {
  privacy: {
    title: 'Privacy Policy',
    effective: '[Effective date — set on publish]',
    reviewed: true,
    intro:
      'This policy explains what personal data Shiksha Sarthi collects when you use our website, progressive web app and mobile apps, how we use and share it, and the rights you have under India’s data-protection laws.',
    sections: [
      {
        h: 'Who we are',
        p: `Shiksha Sarthi (“we”, “us”, “our”) is a virtual learning and education-support platform operated by [Legal entity name], with its registered office at [Registered office address], ${OFFICE}. We are an education discovery and delivery platform — not a university — and this policy applies to every learner, visitor and applicant who uses our services.`,
      },
      {
        h: 'Information you give us',
        p: 'Account and profile details (name, email address, mobile number, date of birth, gender, city/address), the programmes, courses and exams you view or apply to, documents you upload for an application, your learning progress and assessment results, course reviews and the questions you ask our counsellor and AI tutor.',
      },
      {
        h: 'Information we collect automatically',
        p: 'Device and browser type, operating system, app version, IP address, approximate location derived from that IP, the pages and lessons you use, watch progress, and diagnostic logs. We use cookies and similar local-storage technologies for sign-in sessions and to remember preferences such as your theme and language.',
      },
      {
        h: 'Payment information',
        p: 'Payments for fees and shop orders are processed by our payment gateway (Razorpay) and, on the mobile app store where applicable, by the store’s billing system. We receive confirmation and limited transaction metadata (amount, status, a reference id). We do not collect or store your full card, UPI or bank-account credentials.',
      },
      {
        h: 'How we use your data',
        p: 'To create and secure your account; to process admission applications with the university you choose; to deliver courses, study material, live classes, tests and certificates; to personalise course recommendations; to power the AI tutor and assistants; to process payments and prevent fraud; to provide support; to meet legal and academic-record obligations; and, only where you have opted in, to send you updates and offers.',
      },
      {
        h: 'Your consent and its withdrawal',
        p: `Under the Digital Personal Data Protection Act, 2023, we process your personal data on the basis of the consent you give when you create an account and use our services, and for purposes reasonably necessary to provide them. You may withdraw consent — for example to marketing contact — at any time by writing to ${SUPPORT_EMAIL}; withdrawing consent does not affect processing already carried out.`,
      },
      {
        h: 'Who we share it with',
        p: 'The university or institution you apply to, so it can process your admission; and service providers who operate the platform for us under confidentiality obligations — our hosting provider, our payment gateway (Razorpay), our transactional-email provider, our error-monitoring/analytics tools, and the AI providers (such as Anthropic and OpenAI) that power the tutor and assistants, which receive only the content needed to answer and do not use it to train their models under their API terms. We disclose data to authorities where the law requires. We do not sell your personal data.',
      },
      {
        h: 'International transfers',
        p: 'Some of our service providers process data on servers outside India. Where that happens we take reasonable steps to ensure your data continues to be protected to the standard described in this policy and permitted by applicable law.',
      },
      {
        h: 'How long we keep it',
        p: 'For as long as your account is active and for as long afterwards as an academic-record, financial or other legal obligation requires. When data is no longer needed we delete it or irreversibly anonymise it.',
      },
      {
        h: 'How we protect it',
        p: 'We use encryption in transit (HTTPS), store passwords only in hashed form, and restrict access to personal data to those who need it. No method of transmission or storage is completely secure, so we cannot guarantee absolute security, but we work continually to protect your information.',
      },
      {
        h: 'Your rights',
        p: `You can access and correct your details from your profile, ask us to delete your account, obtain a summary of the personal data we hold, nominate another person to exercise your rights in the event of death or incapacity, and raise a grievance. To exercise any of these, write to ${SUPPORT_EMAIL} from your registered email address; we may need to verify your identity first.`,
      },
      {
        h: 'Children’s data',
        p: 'A learner under the age of 18 may use Shiksha Sarthi only with the verifiable consent of a parent or legal guardian, who must create and supervise the account. We do not knowingly process a child’s data for tracking or targeted advertising, and we act on any request to remove data collected from a child without valid consent.',
      },
      {
        h: 'Grievance Officer',
        p: `In line with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, you may contact our Grievance Officer, [Grievance Officer name], at ${SUPPORT_EMAIL} (subject: “Privacy grievance”), or by post at [Registered office address], ${OFFICE}. Reachable ${SUPPORT_HOURS} on ${SUPPORT_PHONE}. We will acknowledge your grievance and respond within the timelines required by law.`,
      },
      {
        h: 'Changes to this policy',
        p: 'We may update this policy as our services or the law change. When we make a material change we will update the effective date above and, where appropriate, notify you in the app or by email. Please review it from time to time.',
      },
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
      { h: 'Counselling is free', p: `Shiksha Sarthi does not charge learners for counselling, shortlisting or admission support. If anyone asks you to pay us a fee, report it to ${SUPPORT_EMAIL}.` },
      { h: 'University fees', p: 'Tuition is paid to and refunded by the university. Their published refund schedule — typically tied to how many days have passed since enrolment — applies in full.' },
      { h: 'How to request a refund', p: `Raise the request from your dashboard or email ${SUPPORT_EMAIL} with your enrolment number. We will forward it to the university and track it on your behalf.` },
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
}

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const doc = DOCS[slug]
  return doc ? { title: doc.title, description: doc.intro } : { title: 'Not found' }
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = DOCS[slug]
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
          {doc.effective && (
            <p className="mt-3 text-[12.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Effective: {doc.effective}
            </p>
          )}
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

        {doc.reviewed ? (
          <p className="mt-10 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-[13px] text-muted-foreground">
            <strong className="font-bold text-foreground">Before you publish:</strong> fill in every
            [bracketed] item (legal entity, registered office, grievance officer, effective date) and
            have a qualified legal advisor confirm this policy for your final operating model.
          </p>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-[13px] text-muted-foreground">
            <strong className="font-bold text-foreground">Note:</strong> this is plain-language
            placeholder copy for the demo build. Have a qualified legal advisor review and adapt it
            before you publish.
          </p>
        )}
      </section>
    </>
  )
}
