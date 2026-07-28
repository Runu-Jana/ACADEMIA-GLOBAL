import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Users, Layers3, FolderUp } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/admin/admin-ui'
import { CourseForm, type CourseFormValues } from '@/components/admin/course-form'
import { ModuleEditor } from '@/components/admin/module-editor'
import { ReindexButton } from '@/components/admin/reindex-button'
import { Badge } from '@/components/ui/badge'
import { asList } from '@/lib/utils'

export const metadata: Metadata = { title: 'Edit Course' }
export const dynamic = 'force-dynamic'

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const [course, universities] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        subtitle: true,
        universityId: true,
        level: true,
        mode: true,
        stream: true,
        durationYears: true,
        feePerYear: true,
        originalFee: true,
        discountPct: true,
        about: true,
        eligibility: true,
        examMode: true,
        highlights: true,
        skills: true,
        recruiters: true,
        isUgcEntitled: true,
        hasPlacement: true,
        hasLiveClass: true,
        featured: true,
        university: { select: { name: true } },
        _count: { select: { enrollments: true, materials: true, chunks: true } },
        modules: {
          orderBy: [{ order: 'asc' }, { title: 'asc' }],
          select: {
            id: true,
            title: true,
            description: true,
            lessons: {
              orderBy: [{ order: 'asc' }, { title: 'asc' }],
              select: { id: true, title: true, type: true, durationMin: true },
            },
          },
        },
      },
    }),
    prisma.university.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  if (!course) notFound()

  const initial: CourseFormValues = {
    title: course.title,
    slug: course.slug,
    subtitle: course.subtitle,
    universityId: course.universityId,
    level: course.level,
    mode: course.mode,
    stream: course.stream,
    durationYears: String(course.durationYears),
    feePerYear: String(course.feePerYear),
    originalFee: course.originalFee === null ? '' : String(course.originalFee),
    discountPct: String(course.discountPct),
    about: course.about,
    eligibility: course.eligibility,
    examMode: course.examMode,
    // Json columns arrive as `unknown` — narrow before joining.
    highlights: asList(course.highlights).join(', '),
    skills: asList(course.skills).join(', '),
    recruiters: asList(course.recruiters).join(', '),
    isUgcEntitled: course.isUgcEntitled,
    hasPlacement: course.hasPlacement,
    hasLiveClass: course.hasLiveClass,
    featured: course.featured,
  }

  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0)

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
        title={course.title}
        sub={course.university.name}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="primary">
              <Users className="h-3 w-3" />
              {course._count.enrollments} enrolled
            </Badge>
            <Badge tone="cyan">
              <Layers3 className="h-3 w-3" />
              {course.modules.length} modules · {lessonCount} lessons
            </Badge>
            <Badge tone="violet">
              <FolderUp className="h-3 w-3" />
              {course._count.materials} files
            </Badge>
          </div>
        }
      />

      <div className="space-y-4">
        <ReindexButton courseId={course.id} initialChunks={course._count.chunks} />

        <ModuleEditor
          courseId={course.id}
          modules={course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            lessons: m.lessons,
          }))}
        />

        <CourseForm
          universities={universities}
          initial={initial}
          courseId={course.id}
          viewSlug={course.slug}
        />
      </div>
    </>
  )
}
