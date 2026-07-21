import type { Metadata } from 'next'
import Link from 'next/link'
import { Bot, Database, ShieldCheck, Compass } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Aurora } from '@/components/fx/aurora'
import { Reveal } from '@/components/fx/reveal'
import { buttonVariants } from '@/components/ui/button'
import { CounsellorChat, type ChatTurn } from './counsellor-chat'

export const metadata: Metadata = {
  title: 'Career Counsellor',
  description:
    'Answer a few questions and get course recommendations matched against Academia Global’s live catalogue — by subject, level, study mode and budget.',
}

export const dynamic = 'force-dynamic'

export default async function CounsellorPage() {
  const user = await getCurrentUser()

  // Signed-in visitors get their thread back; anonymous ones start fresh.
  const saved = user
    ? await prisma.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 60,
        select: { id: true, role: true, content: true },
      })
    : []

  const initialMessages: ChatTurn[] = saved.map((m) => ({
    id: m.id,
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }))

  return (
    <div className="relative">
      <Aurora palette="holo" density={2} />

      <section className="container relative z-10 py-8 sm:py-10">
        <Reveal>
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-600 shadow-soft dark:text-primary-300">
              <Bot className="h-3.5 w-3.5" />
              Course Recommender
            </span>
            <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Find the course that <span className="holo-text">fits your life</span>
            </h1>
            <p className="mt-3 text-pretty text-[14.5px] text-muted-foreground">
              Tell us what you have studied, what interests you, how much time you have and what you
              can spend. We match it against every programme on Academia Global and suggest the ones
              that fit.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <Reveal delay={60}>
            <CounsellorChat
              initialMessages={initialMessages}
              signedIn={Boolean(user)}
              userName={user?.name ?? ''}
            />
          </Reveal>

          {/* ------------------------------------------------------- sidebar */}
          <Reveal delay={140}>
            <aside className="space-y-3 lg:sticky lg:top-24">
              <div className="card-base p-4">
                <h2 className="mb-3 text-[14px] font-bold">How this works</h2>
                <ul className="space-y-3">
                  {[
                    {
                      icon: Compass,
                      title: 'You describe your situation',
                      body: 'Subject, level, how flexible you need it to be, and your budget.',
                    },
                    {
                      icon: Database,
                      title: 'We search the real catalogue',
                      body: 'Every suggestion is a live programme with a real fee and rating — nothing invented.',
                    },
                    {
                      icon: ShieldCheck,
                      title: 'You compare and decide',
                      body: 'Add any recommendation to the comparison tray and weigh them side by side.',
                    },
                  ].map(({ icon: Icon, title, body }) => (
                    <li key={title} className="flex gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-bold">{title}</span>
                        <span className="block text-[11.5px] leading-relaxed text-muted-foreground">
                          {body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-base holo-surface p-4">
                <h2 className="text-[14px] font-bold">Want a human?</h2>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  This tool narrows the field. For admission paperwork, eligibility edge cases and
                  fee structures, talk to an admission counsellor.
                </p>
                <Link
                  href="/courses"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-3 w-full' })}
                >
                  Browse all courses
                </Link>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
