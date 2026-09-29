import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/admin/admin-ui'
import { UniversityForm, type UniversityFormValues } from '@/components/admin/university-form'

const joinLines = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').join('\n') : '')
const joinCommas = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(', ') : '')

export const metadata: Metadata = { title: 'Edit University' }
export const dynamic = 'force-dynamic'

export default async function EditUniversityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const u = await prisma.university.findUnique({ where: { id } })
  if (!u) notFound()

  const initial: UniversityFormValues = {
    name: u.name,
    slug: u.slug,
    shortName: u.shortName,
    about: u.about,
    estYear: String(u.estYear),
    naacGrade: u.naacGrade ?? '',
    city: u.city,
    state: u.state,
    website: u.website ?? '',
    approvals: joinCommas(u.approvals),
    highlights: joinLines(u.highlights),
    rankings: joinLines(u.rankings),
    rating: String(u.rating),
    reviews: String(u.reviews),
    students: String(u.students),
    programs: String(u.programs),
    featured: u.featured,
    listed: u.listed,
    partnerStatus: u.partnerStatus,
    commissionPct: String(u.commissionPct),
  }

  return (
    <>
      <Link
        href="/admin/universities"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to universities
      </Link>

      <PageHeader title={u.name} sub="Edit this institution's profile, accreditation and visibility." />

      <UniversityForm initial={initial} universityId={u.id} viewSlug={u.slug} />
    </>
  )
}
