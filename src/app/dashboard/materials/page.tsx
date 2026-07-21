import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { PanelHeading } from '@/components/dashboard/primitives'
import { MaterialsBrowser, type BrowserMaterial } from '@/components/dashboard/materials-browser'

export const metadata = { title: 'Study Material' }

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>
}

export default async function MaterialsPage({ searchParams }: PageProps) {
  const { q, type } = await searchParams
  const user = await requireUser('/dashboard/materials')

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    select: { course: { select: { id: true, title: true } } },
    orderBy: { enrolledAt: 'desc' },
  })

  const courses = enrollments.map((e) => e.course)
  const courseIds = courses.map((c) => c.id)

  const materials = await prisma.material.findMany({
    where: { courseId: { in: courseIds } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      note: true,
      createdAt: true,
      course: { select: { id: true, title: true } },
      module: { select: { title: true } },
    },
  })

  const items: BrowserMaterial[] = materials.map((m) => ({
    id: m.id,
    title: m.title,
    type: m.type,
    fileUrl: m.fileUrl,
    fileName: m.fileName,
    fileSize: m.fileSize,
    createdAt: m.createdAt.toISOString(),
    courseId: m.course.id,
    courseTitle: m.course.title,
    moduleTitle: m.module?.title ?? null,
    note: m.note,
  }))

  const initialQuery = Array.isArray(q) ? (q[0] ?? '') : (q ?? '')
  const initialType = Array.isArray(type) ? (type[0] ?? 'ALL') : (type ?? 'ALL')

  return (
    <div>
      <PanelHeading
        title="Study Material"
        sub={`${items.length} file${items.length === 1 ? '' : 's'} across ${courses.length} course${
          courses.length === 1 ? '' : 's'
        } — notes, PDFs, syllabi, question papers and recordings.`}
      />
      <MaterialsBrowser
        materials={items}
        courses={courses}
        initialQuery={initialQuery}
        initialType={initialType}
      />
    </div>
  )
}
