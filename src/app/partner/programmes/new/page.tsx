import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { requirePartner } from '@/lib/auth'
import { ProgrammeForm } from '@/components/partner/programme-form'

export const dynamic = 'force-dynamic'

export default async function NewProgrammePage() {
  const user = await requirePartner()
  if (!user.universityId) redirect('/partner')

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
        <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight">New programme</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Saved as a draft you can refine and then submit for review.
        </p>
      </div>

      <ProgrammeForm />
    </div>
  )
}
