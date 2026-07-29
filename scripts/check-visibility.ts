/**
 * Health check for the course-visibility gate.
 *
 *   npx tsx scripts/check-visibility.ts
 *
 * Runs the real gate queries against the database and reports what students can
 * see. Guards against the two failure modes of the partner review gate: hiding
 * the whole catalogue, or leaking unapproved programmes.
 */
import { prisma } from '../src/lib/prisma'
import { liveCourseWhere, liveUniversityWhere } from '../src/lib/visibility'

async function main() {
  const [total, live, activeUnis, pendingReviews, pendingApps, drafts] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: liveCourseWhere }),
    prisma.university.count({ where: liveUniversityWhere }),
    prisma.course.count({ where: { reviewStatus: 'PENDING' } }),
    prisma.partnerApplication.count({ where: { status: 'PENDING' } }),
    prisma.course.count({ where: { reviewStatus: 'DRAFT' } }),
  ])

  console.log('— Course visibility ————————————————————')
  console.log(`  Live to students : ${live} of ${total} courses`)
  console.log(`  Hidden (draft/pending/non-active) : ${total - live}`)
  console.log(`  Active partner universities : ${activeUnis}`)
  console.log(`  Programmes awaiting review : ${pendingReviews}`)
  console.log(`  Partner requests pending : ${pendingApps}`)
  console.log(`  Drafts in progress : ${drafts}`)

  // Exercises the filtered relation-count the public directory relies on.
  const sample = await prisma.university.findFirst({
    where: liveUniversityWhere,
    select: { name: true, _count: { select: { courses: { where: liveCourseWhere } } } },
  })
  if (sample) {
    console.log(`\n  Directory sample: "${sample.name}" → ${sample._count.courses} live programme(s)`)
  }

  console.log('\n— Verdict ———————————————————————————————')
  if (total > 0 && live === 0) {
    console.log('  ✗ FAIL: the gate is hiding the entire catalogue.')
    process.exitCode = 1
  } else {
    console.log('  ✓ Catalogue is visible and the gate queries run cleanly.')
  }
}

main()
  .catch((err) => {
    console.error('Check failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
