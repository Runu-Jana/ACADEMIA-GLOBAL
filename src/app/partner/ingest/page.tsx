import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, Sparkles } from 'lucide-react'
import { requirePartner } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { PartnerIngest } from '@/components/partner/partner-ingest'

export const dynamic = 'force-dynamic'

export default async function PartnerIngestPage() {
  const user = await requirePartner()
  if (!user.universityId) redirect('/partner')

  // Ingestion runs on the 'notes' model tier — reflect whether it's configured.
  const configured = isFeatureConfigured('notes')

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/partner/programmes"
          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary-600"
        >
          <ChevronLeft className="h-3 w-3" />
          Programmes
        </Link>
        <h1 className="mt-1.5 flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary-500" />
          Add programmes with AI
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Upload your prospectus and let AI draft your programmes, semesters and subjects — you review
          everything before it&rsquo;s saved.
        </p>
      </div>

      <PartnerIngest configured={configured} />
    </div>
  )
}
