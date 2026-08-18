import type { Metadata } from 'next'
import { Phone, Mail, MapPin, Clock, MessageSquare, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Aurora } from '@/components/fx/aurora'
import { Reveal } from '@/components/fx/reveal'
import {
  SUPPORT_EMAIL,
  PARTNERSHIPS_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_HREF,
  SUPPORT_HOURS,
  HEAD_OFFICE_CITY,
  HEAD_OFFICE_POSTCODE,
} from '@/lib/contact'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Talk to the Shiksha Sarthi team about admissions, partnerships or support.',
}

const channels = [
  { icon: Phone, title: 'Call us', lines: [SUPPORT_PHONE, SUPPORT_HOURS], href: SUPPORT_PHONE_HREF },
  { icon: Mail, title: 'Email us', lines: [SUPPORT_EMAIL, 'We reply within one working day'], href: `mailto:${SUPPORT_EMAIL}` },
  { icon: MapPin, title: 'Head office', lines: [HEAD_OFFICE_CITY, HEAD_OFFICE_POSTCODE] },
  { icon: Building2, title: 'Partnerships', lines: [PARTNERSHIPS_EMAIL, 'For universities and institutions'], href: `mailto:${PARTNERSHIPS_EMAIL}` },
]

export default function ContactPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="cool" density={2} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">Get in touch</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            We&apos;re here to <span className="holo-text">help you decide</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-[15px] text-muted-foreground">
            Admissions questions, fee structures, document requirements — ask away.
          </p>
        </div>
      </section>

      <section className="container grid gap-6 py-12 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-3">
          {channels.map((c, i) => {
            const inner = (
              <div className="card-base card-hover flex gap-3.5 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold">{c.title}</p>
                  {c.lines.map((l, j) => (
                    <p
                      key={l}
                      className={j === 0 ? 'mt-0.5 break-all text-[13px] font-semibold' : 'text-[12px] text-muted-foreground'}
                    >
                      {l}
                    </p>
                  ))}
                </div>
              </div>
            )
            return (
              <Reveal key={c.title} delay={i * 60}>
                {c.href ? (
                  <a href={c.href} className="block">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </Reveal>
            )
          })}

          <Reveal delay={260}>
            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Counselling calls are free and there&apos;s no obligation to enrol. We never ask for
                payment over the phone — always pay the university through the official admission flow.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="card-base holo-ring p-6">
            <div className="mb-5 flex items-center gap-2.5">
              <MessageSquare className="h-5 w-5 text-primary-600" />
              <h2 className="font-display text-lg font-extrabold">Send us a message</h2>
            </div>
            <ContactForm />
          </div>
        </Reveal>
      </section>
    </>
  )
}
