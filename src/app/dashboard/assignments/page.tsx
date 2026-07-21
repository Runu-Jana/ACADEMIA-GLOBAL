import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { PanelHeading } from '@/components/dashboard/primitives'
import { MaterialsBrowser, type BrowserMaterial } from '@/components/dashboard/materials-browser'

export const metadata = { title: 'Assignments' }

export default async function AssignmentsPage() {
  const user = await requireUser('/dashboard/assignments')

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    select: { course: { select: { id: true, title: true } } },
    orderBy: { enrolledAt: 'desc' },
  })

  const courses = enrollments.map((e) => e.course)
  const courseIds = courses.map((c) => c.id)

  const materials = await prisma.material.findMany({
    where: { courseId: { in: courseIds }, type: 'ASSIGNMENT' },
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

  return (
    <div>
      <PanelHeading
        title="Assignments"
        sub="Download the brief, complete it offline and submit it to your faculty through your course coordinator."
      />
      <MaterialsBrowser
        materials={items}
        courses={courses}
        initialType="ASSIGNMENT"
        lockType
        emptyTitle="No assignments yet"
        emptyBody="Assignment briefs uploaded to your enrolled courses will show up here with the file and its due details."
      />
    </div>
  )
}
