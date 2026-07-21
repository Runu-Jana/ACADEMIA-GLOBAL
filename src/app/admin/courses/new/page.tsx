import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/admin/admin-ui'
import { CourseForm } from '@/components/admin/course-form'

export const metadata: Metadata = { title: 'Create Course' }
export const dynamic = 'force-dynamic'

export default async function NewCoursePage() {
  await requireAdmin()

  const universities = await prisma.university.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <>
      <Link
        href="/admin/courses"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to courses
      </Link>

      <PageHeader
        title="Create Course"
        sub="Add the programme first — modules and lessons come next."
      />

      <CourseForm universities={universities} />
    </>
  )
}
