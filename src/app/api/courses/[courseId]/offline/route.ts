import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { resolveLessonVideo, isDownloadable, downloadUrlOf } from '@/lib/video'

/**
 * Offline download manifest for a course. A native (Capacitor) client calls this
 * to learn which lessons and materials it may store for offline viewing, and
 * where to fetch each file. Enrollment-gated. Only genuinely downloadable
 * sources are listed — YouTube/Vimeo embeds are excluded because they can't be
 * downloaded.
 *
 * URLs are returned as stored; relative ones resolve against the app's server
 * origin. When a managed provider is wired in, this is where you would mint a
 * short-lived SIGNED download URL per file instead of returning a static one.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.userId, courseId } },
    select: { id: true },
  })
  if (!enrollment) {
    return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 })
  }

  const [course, materials] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        modules: {
          orderBy: { order: 'asc' },
          select: {
            title: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                durationMin: true,
                type: true,
                contentUrl: true,
                streamUrl: true,
                downloadUrl: true,
                posterUrl: true,
                videoProvider: true,
              },
            },
          },
        },
      },
    }),
    prisma.material.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, type: true, fileName: true, fileSize: true },
    }),
  ])

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const lessons = course.modules.flatMap((m) =>
    m.lessons.flatMap((l) => {
      const source = resolveLessonVideo(l)
      if (!isDownloadable(source)) return []
      return [
        {
          id: l.id,
          title: l.title,
          moduleTitle: m.title,
          durationMin: l.durationMin,
          url: downloadUrlOf(source),
          poster: source.kind === 'hls' || source.kind === 'file' ? source.poster : null,
          provider: source.kind === 'hls' ? source.provider : null,
        },
      ]
    }),
  )

  const files = materials.map((mt) => ({
    id: mt.id,
    title: mt.title,
    type: mt.type,
    fileName: mt.fileName,
    fileSize: mt.fileSize,
    url: `/api/materials/${mt.id}/download`,
  }))

  return NextResponse.json({
    courseId: course.id,
    title: course.title,
    generatedAt: new Date().toISOString(),
    lessonCount: lessons.length,
    lessons,
    materials: files,
  })
}
