/**
 * Seeds (or clears) a spread of notifications for the demo student so the bell,
 * the unread badge and the inbox can be seen before real events pile up.
 *
 *   npx tsx scripts/demo-notifications.ts        # seed (replaces existing)
 *   npx tsx scripts/demo-notifications.ts clear  # remove all for the student
 *
 * These are placeholders. Real notifications are written by lib/notifications.ts
 * at enrolment, certificate issue and test grading.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const STUDENT_EMAIL = 'rahul@student.in'

async function main() {
  const clear = process.argv.includes('clear')

  const user = await prisma.user.findUnique({ where: { email: STUDENT_EMAIL }, select: { id: true } })
  if (!user) {
    console.log(`No user ${STUDENT_EMAIL} — run the seed first.`)
    return
  }

  // Replace-on-seed keeps the fixture idempotent.
  const removed = await prisma.notification.deleteMany({ where: { userId: user.id } })
  if (clear) {
    console.log(`Cleared ${removed.count} notification(s) for ${STUDENT_EMAIL}.`)
    return
  }

  const now = Date.now()
  const ago = (mins: number) => new Date(now - mins * 60_000)

  const items = [
    { type: 'TEST', title: 'Passed: Marketing Fundamentals Quiz', body: 'You scored 9/10.', url: '/dashboard/tests', readAt: null, createdAt: ago(8) },
    { type: 'MATERIAL', title: 'New study material added', body: '“Segmentation cheat-sheet (PDF)” is now in Study Material.', url: '/dashboard/materials', readAt: null, createdAt: ago(150) },
    { type: 'LIVE', title: 'Live class scheduled', body: '“Doubt-clearing: the 4Ps” is set for this week.', url: '/dashboard/live', readAt: null, createdAt: ago(420) },
    { type: 'ENROLMENT', title: "You're enrolled in Online BBA in Digital Marketing", body: 'Your programme is active — pick up from your dashboard.', url: '/dashboard/learn', readAt: ago(2800), createdAt: ago(2900) },
    { type: 'CERTIFICATE', title: 'Your certificate is ready', body: 'Download or share it any time.', url: '/dashboard/certificates', readAt: ago(4300), createdAt: ago(4400) },
  ]

  await prisma.notification.createMany({ data: items.map((i) => ({ ...i, userId: user.id })) })
  const unread = items.filter((i) => i.readAt === null).length
  console.log(`Seeded ${items.length} notifications for ${STUDENT_EMAIL} (${unread} unread).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
