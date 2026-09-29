/**
 * Additive core catalogue: upserts the flagship universities (Amity, Manipal,
 * IGNOU, LPU, Chandigarh, Jain, DY Patil) and their courses from the canonical
 * prisma/seed-catalog.ts — the same data the destructive seed uses — so a fresh
 * deploy (e.g. Railway) shows the full university/course list.
 *
 * Additive and idempotent (upserts by slug); never wipes. Courses are published
 * and their universities set ACTIVE + listed, so they appear on /universities
 * and /courses immediately. (Modules/lessons/tests are NOT created here — this
 * is for the public listing; run the destructive seed for full content locally.)
 *
 *   npm run db:catalog
 *   # against Railway:
 *   $env:DATABASE_URL="<DATABASE_PUBLIC_URL>"; npm run db:catalog   (PowerShell)
 */
import { PrismaClient } from '@prisma/client'
import { UNIVERSITIES, COURSES } from '../prisma/seed-catalog'

const prisma = new PrismaClient()

async function main() {
  const idBySlug: Record<string, string> = {}
  for (const u of UNIVERSITIES) {
    const data = { ...u, approvals: u.approvals, partnerStatus: 'ACTIVE', listed: true, commissionPct: 12 }
    const created = await prisma.university.upsert({
      where: { slug: u.slug },
      update: data,
      create: data,
      select: { id: true, name: true },
    })
    idBySlug[u.slug] = created.id
    console.log('University:', created.name)
  }

  let courses = 0
  for (const c of COURSES) {
    const universityId = idBySlug[c.university]
    if (!universityId) {
      console.log('  skip course (unknown university):', c.slug)
      continue
    }
    const discountPct = c.originalFee
      ? Math.round(((c.originalFee - c.feePerYear) / c.originalFee) * 100)
      : 0
    const { university, ...rest } = c
    const data = {
      ...rest,
      originalFee: c.originalFee ?? null,
      discountPct,
      featured: c.featured ?? false,
      isUgcEntitled: true,
      reviewStatus: 'PUBLISHED',
      universityId,
    }
    await prisma.course.upsert({ where: { slug: c.slug }, update: data, create: data })
    courses++
  }

  const totalUnis = await prisma.university.count()
  const publishedCourses = await prisma.course.count({ where: { reviewStatus: 'PUBLISHED' } })
  console.log(
    `\nUpserted ${UNIVERSITIES.length} universities + ${courses} courses. ` +
      `Totals now — universities: ${totalUnis}, published courses: ${publishedCourses}.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
