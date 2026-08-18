import Link from 'next/link'
import { Mail, Phone, Bot, ChevronDown, LifeBuoy, BookOpen, Award, CreditCard } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF } from '@/lib/contact'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { PanelHeading } from '@/components/dashboard/primitives'

export const metadata = { title: 'Support' }

const CHANNELS = [
  {
    icon: Bot,
    title: 'Ask Saarthi',
    body: 'Instant answers on courses, eligibility and fees — any time of day.',
    action: 'Start a chat',
    href: '/counsellor',
    tone: 'bg-holo-sweep text-white',
  },
  {
    icon: Mail,
    title: 'Email us',
    body: 'Detailed queries about admissions, exams or documents.',
    action: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    tone: 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
  },
  {
    icon: Phone,
    title: 'Call the helpdesk',
    body: 'Monday to Saturday, 9:00 AM – 7:00 PM IST.',
    action: SUPPORT_PHONE,
    href: SUPPORT_PHONE_HREF,
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
]

const FAQS = [
  {
    icon: BookOpen,
    q: 'How is my course progress calculated?',
    a: 'Progress is the share of lessons you have marked complete across every module in the course. Tick a lesson off in the classroom and the percentage updates immediately — you can untick it if you want to revisit it later.',
  },
  {
    icon: Award,
    q: 'When do I get my certificate?',
    a: 'The moment you reach 100% of the lessons in a course, a certificate is issued automatically with a unique serial number. You will find it under Certificates, where you can print it, save it as a PDF or share the public verification link.',
  },
  {
    icon: CreditCard,
    q: 'Can I retake a test?',
    a: 'Yes. Every module quiz can be attempted as many times as you like, and your best score is what shows against the test. Each attempt is marked on the server against the official answer key.',
  },
  {
    icon: LifeBuoy,
    q: 'Where do I submit assignments?',
    a: 'Download the assignment brief from the Assignments page, complete it offline, and send it to your course coordinator. Submission windows and formats are listed inside each brief.',
  },
]

export default async function SupportPage() {
  const user = await requireUser('/dashboard/support')
  const firstName = user.name.split(' ')[0] || user.name

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <PanelHeading
        title="Support"
        sub={`Hi ${firstName} — here's how to reach us and the answers students ask for most.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {CHANNELS.map((c, i) => {
          const Icon = c.icon
          const external = c.href.startsWith('mailto:') || c.href.startsWith('tel:')
          const body = (
            <article className="card-base holo-ring-hover flex h-full flex-col p-4.5">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-3.5 font-display text-base font-extrabold">{c.title}</h2>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted-foreground">{c.body}</p>
              <p className="mt-3.5 break-all text-[12.5px] font-bold text-primary-600 dark:text-primary-300">
                {c.action}
              </p>
            </article>
          )

          return (
            <Reveal key={c.title} delay={i * 70}>
              <TiltCard className="group h-full" intensity={6} scale={1.012}>
                {external ? (
                  <a href={c.href} className="block h-full">{body}</a>
                ) : (
                  <Link href={c.href} className="block h-full">{body}</Link>
                )}
              </TiltCard>
            </Reveal>
          )
        })}
      </div>

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-4 font-display text-lg font-extrabold tracking-tight">
          Frequently asked
        </h2>

        <ul className="space-y-2.5">
          {FAQS.map((f) => {
            const Icon = f.icon
            return (
              <li key={f.q}>
                <details className="group card-base overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:hidden">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-bold">{f.q}</span>
                    <ChevronDown
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
                    />
                  </summary>
                  <p className="border-t border-border px-4 py-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                </details>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="card-base holo-ring flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-holo-sweep text-white shadow-glow">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-extrabold">Still stuck?</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Our counsellors can walk you through admissions, fees and exam scheduling.
          </p>
        </div>
        <Link href="/counsellor" className={buttonVariants({ variant: 'holo', size: 'sm' })}>
          Talk to a counsellor
        </Link>
      </div>
    </div>
  )
}
