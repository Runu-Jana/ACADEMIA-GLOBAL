import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'

/** Seeds a live-class timetable for courses that advertise live sessions. */
const prisma = new PrismaClient()

const HOUR = 3_600_000

async function main() {
  await prisma.liveAttendance.deleteMany()
  await prisma.liveClass.deleteMany()

  const courses = await prisma.course.findMany({
    where: { hasLiveClass: true },
    include: { subjects: { orderBy: { code: 'asc' }, take: 6 } },
  })

  const now = Date.now()
  let made = 0

  for (const course of courses) {
    const subjects: Array<{ id: string; title: string } | null> = course.subjects.length
      ? course.subjects
      : [null]

    // Two finished, one running now, three upcoming — so every UI state is
    // reachable without waiting on the clock.
    const offsets = [-72 * HOUR, -26 * HOUR, -0.4 * HOUR, 20 * HOUR, 72 * HOUR, 168 * HOUR]

    for (const [i, offset] of offsets.entries()) {
      const subject = subjects[i % subjects.length]
      const ended = offset < -HOUR

      await prisma.liveClass.create({
        data: {
          title: subject ? `${subject.title} — live session` : `${course.title} — live session`,
          description: 'Interactive session with Q&A. Recording published afterwards.',
          provider: 'JITSI',
          // Random suffix: the room name IS the access control on the video
          // side, so it must not be derivable from the course or the title.
          roomName: `ag-${course.slug.slice(0, 20)}-${randomBytes(6).toString('hex')}`,
          startsAt: new Date(now + offset),
          durationMin: 60,
          status: ended ? 'ENDED' : offset < 0 ? 'LIVE' : 'SCHEDULED',
          recordingUrl: ended ? `/uploads/seed/${course.slug}-syllabus.pdf` : null,
          courseId: course.id,
          subjectId: subject?.id ?? null,
        },
      })
      made++
    }
  }

  console.log(`  live classes  ${made} across ${courses.length} courses`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
