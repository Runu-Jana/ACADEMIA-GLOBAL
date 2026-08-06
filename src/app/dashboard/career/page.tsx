import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { PanelHeading } from '@/components/dashboard/primitives'
import { TOOL_CONFIGS, TOOL_ORDER } from '@/lib/career-kit-tools'

export const metadata: Metadata = { title: 'AI Career Kit' }
export const dynamic = 'force-dynamic'

export default async function CareerKitHubPage() {
  await requireUser('/dashboard/career')

  return (
    <div>
      <PanelHeading
        title="AI Career Kit"
        sub="Four AI tools that turn your Shiksha Sarthi record into a plan — find your direction, map the skills, write your SOP and prep for the interview."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOL_ORDER.map((key) => {
          const t = TOOL_CONFIGS[key]
          const Icon = t.icon
          const ready = isFeatureConfigured(t.feature)
          return (
            <Link
              key={key}
              href={t.href}
              className="card-base holo-ring group relative flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${t.accent} text-white shadow-glow`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-[15.5px] font-bold">{t.title}</h2>
              </div>

              <p className="mt-3 flex-1 text-pretty text-[13px] leading-relaxed text-muted-foreground">
                {t.blurb}
              </p>

              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600 transition-transform group-hover:translate-x-0.5 dark:text-primary-300">
                {ready ? 'Open tool' : 'Preview'}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )
        })}
      </div>

      <p className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
        Every tool grounds its output in your real enrolments and certificates and never invents facts
        you didn&rsquo;t give it. Treat what it produces as a strong first draft to make your own.
      </p>
    </div>
  )
}
