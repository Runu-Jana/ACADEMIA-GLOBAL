import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { loadRecordSummary } from '@/lib/ai/student-context'
import { PanelHeading } from './primitives'
import { CareerKitTool } from './career-kit'
import { TOOL_CONFIGS } from '@/lib/career-kit-tools'

/**
 * Server shell shared by all four Career Kit tool routes: auth, load the record
 * grounding line, and render the generic panel for the given tool. Each route
 * file only supplies its config key and metadata.
 */
export async function CareerToolPage({
  configKey,
}: {
  configKey: keyof typeof TOOL_CONFIGS
}) {
  const config = TOOL_CONFIGS[configKey]
  const user = await requireUser(config.href)
  const recordSummary = await loadRecordSummary(user.id)

  return (
    <div>
      <Link
        href="/dashboard/career"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        AI Career Kit
      </Link>
      <PanelHeading title={config.title} sub={config.blurb} />
      <CareerKitTool
        configKey={configKey}
        aiConfigured={isFeatureConfigured(config.feature)}
        recordSummary={recordSummary}
      />
    </div>
  )
}
