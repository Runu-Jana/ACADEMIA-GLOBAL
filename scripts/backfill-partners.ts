/**
 * Backfills the partner review gate onto an existing database.
 *
 *   npx tsx scripts/backfill-partners.ts
 *
 * The gate introduced with the partner portal hides any course whose university
 * isn't an ACTIVE partner. Every institution that predates the gate represents a
 * live, already-onboarded partner, so this marks them ACTIVE (and their courses
 * PUBLISHED) — otherwise the whole catalogue would vanish the moment the gate
 * lands. New public sign-ups still start as PROSPECT and go live only on
 * operator approval. Safe to run repeatedly.
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const uni = await prisma.university.updateMany({
    where: { partnerStatus: { not: 'ACTIVE' } },
    data: { partnerStatus: 'ACTIVE' },
  })

  const courses = await prisma.course.updateMany({
    where: { reviewStatus: { not: 'PUBLISHED' } },
    data: { reviewStatus: 'PUBLISHED' },
  })

  console.log(`Universities activated : ${uni.count}`)
  console.log(`Courses published      : ${courses.count}`)
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
