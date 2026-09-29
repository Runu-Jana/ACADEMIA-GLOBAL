import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/admin/admin-ui'
import { UniversityForm } from '@/components/admin/university-form'

export const metadata: Metadata = { title: 'Add University' }
export const dynamic = 'force-dynamic'

export default async function NewUniversityPage() {
  await requireAdmin()

  return (
    <>
      <Link
        href="/admin/universities"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to universities
      </Link>

      <PageHeader
        title="Add University"
        sub="Create an institution. Add its programmes from the Courses section afterwards."
      />

      <UniversityForm />
    </>
  )
}
