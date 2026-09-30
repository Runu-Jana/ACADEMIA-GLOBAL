/**
 * Issues a realistic demo Certificate of Completion so the admin Certificates
 * panel isn't empty in a client demo.
 *
 * Mirrors the real issuance (serial format, grade, links) but is idempotent: a
 * fixed demo student + course keeps re-runs from piling up duplicates. Run
 * locally, or against Railway with DATABASE_URL set to DATABASE_PUBLIC_URL:
 *
 *   npm run db:cert
 *   # Railway:
 *   DATABASE_URL="postgresql://…proxy.rlwy.net:PORT/railway" npm run db:cert
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma.demo@example.com',
  grade: 'A+',
  dob: '2000-05-15', // used for the public /verify demo
}

function courseCode(title: string) {
  const letters = title
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return `${letters}XXX`.slice(0, 3)
}

async function uniqueSerial(courseTitle: string) {
  const year = new Date().getFullYear()
  const code = courseCode(courseTitle)
  for (let i = 0; i < 8; i++) {
    const n = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
    const serial = `AG-${year}-${code}-${n}`
    const clash = await prisma.certificate.findUnique({ where: { serial }, select: { id: true } })
    if (!clash) return serial
  }
  return `AG-${year}-${code}-${String(Date.now()).slice(-6)}`
}

async function main() {
  // Pick a real, published course to anchor the certificate to.
  const course = await prisma.course.findFirst({
    where: { reviewStatus: 'PUBLISHED' },
    orderBy: { featured: 'desc' },
    select: { id: true, title: true },
  })
  if (!course) throw new Error('No published course found to issue a demo certificate against.')

  // A dedicated demo graduate so this never touches real accounts.
  const user = await prisma.user.upsert({
    where: { email: DEMO.email },
    update: { name: DEMO.name, dob: DEMO.dob },
    create: {
      email: DEMO.email,
      name: DEMO.name,
      dob: DEMO.dob,
      role: 'STUDENT',
      passwordHash: await bcrypt.hash('demo-only-not-usable', 10),
    },
    select: { id: true, name: true },
  })

  // A completed enrolment (the thing a certificate is issued against).
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    update: { status: 'COMPLETED', progressPct: 100, completedAt: new Date() },
    create: {
      userId: user.id,
      courseId: course.id,
      status: 'COMPLETED',
      progressPct: 100,
      completedAt: new Date(),
    },
    select: { id: true },
  })

  const existing = await prisma.certificate.findUnique({
    where: { enrollmentId: enrollment.id },
    select: { serial: true },
  })
  if (existing) {
    console.log(`Demo certificate already exists: ${existing.serial} (${DEMO.name} · ${course.title})`)
    return
  }

  const serial = await uniqueSerial(course.title)
  await prisma.certificate.create({
    data: {
      serial,
      grade: DEMO.grade,
      userId: user.id,
      courseId: course.id,
      enrollmentId: enrollment.id,
    },
  })

  console.log(`Issued demo certificate: ${serial}`)
  console.log(`  Holder : ${DEMO.name}`)
  console.log(`  Course : ${course.title}`)
  console.log(`  Grade  : ${DEMO.grade}`)
  console.log('Verify it at /verify with the serial above.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
