import { prisma } from '@/lib/prisma'

/**
 * Test-DB helpers: wipe between tests and build a minimal, valid scenario so each
 * test is isolated and self-describing (no dependence on seed data).
 */

/** Deletes everything the money tests touch, child-first. */
export async function resetDb() {
  await prisma.commission.deleteMany()
  await prisma.payout.deleteMany()
  await prisma.order.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.course.deleteMany()
  await prisma.university.deleteMany()
  await prisma.user.deleteMany()
}

// Monotonic so slugs/emails stay unique across a whole run.
let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`

function courseData(universityId: string, source: string) {
  return {
    slug: uid('course'),
    title: 'Test Course',
    subtitle: 'For tests',
    level: 'UG',
    mode: 'ONLINE',
    stream: 'MANAGEMENT',
    durationYears: 3,
    feePerYear: 50_000,
    about: '.',
    eligibility: '.',
    highlights: [],
    skills: [],
    recruiters: [],
    source,
    universityId,
  }
}

export interface Scenario {
  student: { id: string }
  partner: { id: string }
  partnerCourse: { id: string; feePerYear: number }
  platformCourse: { id: string; feePerYear: number }
}

/**
 * A student, one partner university (ACTIVE @ 15% by default) with a partner
 * course and a PLATFORM course. Override the partner terms per test.
 */
export async function makeScenario(opts?: {
  commissionPct?: number
  cooloffDays?: number
  partnerStatus?: string
}): Promise<Scenario> {
  const student = await prisma.user.create({
    data: { name: 'Test Student', email: `${uid('s')}@test.in`, passwordHash: 'x', role: 'STUDENT' },
    select: { id: true },
  })
  const partner = await prisma.university.create({
    data: {
      slug: uid('partner'),
      name: 'Partner University',
      shortName: 'PU',
      about: '.',
      estYear: 2000,
      approvals: [],
      city: 'City',
      state: 'State',
      partnerStatus: opts?.partnerStatus ?? 'ACTIVE',
      commissionPct: opts?.commissionPct ?? 15,
      cooloffDays: opts?.cooloffDays ?? 15,
    },
    select: { id: true },
  })
  const partnerCourse = await prisma.course.create({
    data: courseData(partner.id, 'UNIVERSITY'),
    select: { id: true, feePerYear: true },
  })
  const platformCourse = await prisma.course.create({
    data: courseData(partner.id, 'PLATFORM'),
    select: { id: true, feePerYear: true },
  })
  return { student, partner, partnerCourse, platformCourse }
}
