import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/admin/admin-ui'
import { MaterialManager } from '@/components/admin/material-manager'
import { requireAdmin } from '@/lib/auth'

export const metadata: Metadata = { title: 'Study Material' }
export const dynamic = 'force-dynamic'

export default async function AdminMaterialsPage() {
  await requireAdmin()

  const [courses, materials] = await Promise.all([
    prisma.course.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
    prisma.material.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
        courseId: true,
        course: { select: { title: true } },
        module: { select: { title: true } },
        uploadedBy: { select: { name: true } },
      },
    }),
  ])

  return (
    <>
      <PageHeader
        title="Study Material"
        sub="Upload notes, question papers, syllabi and recorded classes for your students."
      />

      <MaterialManager
        courses={courses}
        materials={materials.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileSize: m.fileSize,
          createdAt: m.createdAt.toISOString(),
          courseId: m.courseId,
          courseTitle: m.course.title,
          moduleTitle: m.module?.title ?? null,
          uploaderName: m.uploadedBy?.name ?? null,
        }))}
      />
    </>
  )
}
