/**
 * Additive demo ACTIVITY: student accounts, enrolments (via the real payment +
 * commission flow, so /admin/finance and /admin/enrolments both populate),
 * admission applications, and CRM leads — reference rows for the admin panel.
 *
 * Additive and idempotent (guards on existence), like the other add-* scripts;
 * it never touches the destructive prisma/seed.ts. Needs the catalogue demo data
 * — run `npm run db:demo` (and optionally `npm run db:punjab`) first.
 *
 *   npm run db:activity
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { openOrder, markOrderPaid, promoteClaimable } from '../src/lib/commission'

const prisma = new PrismaClient()

const STUDENTS = [
  { email: 'aisha@demo.in', name: 'Aisha Khan', phone: '+91 98100 11001' },
  { email: 'rohan@demo.in', name: 'Rohan Mehta', phone: '+91 98100 11002' },
  { email: 'priya@demo.in', name: 'Priya Nair', phone: '+91 98100 11003' },
  { email: 'vikram@demo.in', name: 'Vikram Singh', phone: '+91 98100 11004' },
]

// (studentEmail, courseSlug, progressPct, status). Courses must be partner
// courses from db:demo / db:punjab so a commission books.
const ENROLMENTS: { email: string; slug: string; progress: number; status: string; claimable?: boolean }[] = [
  { email: 'aisha@demo.in', slug: 'sym-online-mba-analytics', progress: 68, status: 'ACTIVE' },
  { email: 'rohan@demo.in', slug: 'jamia-online-bsc-datascience', progress: 35, status: 'ACTIVE' },
  { email: 'priya@demo.in', slug: 'pu-online-mba', progress: 100, status: 'COMPLETED', claimable: true },
  { email: 'vikram@demo.in', slug: 'nmims-distance-bcom', progress: 12, status: 'ACTIVE', claimable: true },
  { email: 'aisha@demo.in', slug: 'jamia-online-bsc-datascience', progress: 5, status: 'ACTIVE' },
]

const APPLICATIONS: { email: string; slug: string; step: number; status: string }[] = [
  { email: 'rohan@demo.in', slug: 'sym-online-pgdba', step: 4, status: 'SUBMITTED' },
  { email: 'priya@demo.in', slug: 'jamia-online-ma-history', step: 4, status: 'UNDER_REVIEW' },
  { email: 'vikram@demo.in', slug: 'nmims-online-bba-fintech', step: 4, status: 'APPROVED' },
  { email: 'aisha@demo.in', slug: 'jamia-online-ba-psychology', step: 2, status: 'DRAFT' },
]

const LEADS = [
  { name: 'Sanya Gupta', email: 'sanya.gupta@example.com', phone: '+91 90000 20001', status: 'NEW', source: 'callback', message: 'Interested in an online MBA, please call back after 6 PM.', uni: 'symbiosis-online', course: 'sym-online-mba-analytics' },
  { name: 'Arjun Rao', email: 'arjun.rao@example.com', phone: '+91 90000 20002', status: 'CONTACTED', source: 'directory', message: 'Wants fee details for BCA.', uni: 'punjab-university', course: 'pu-online-bca' },
  { name: 'Meera Iyer', email: 'meera.iyer@example.com', phone: '+91 90000 20003', status: 'QUALIFIED', source: 'counsellor', message: 'Comparing NMIMS and Symbiosis for distance B.Com.', uni: 'nmims-distance', course: 'nmims-distance-bcom', wantsAgent: true, note: 'Spoke on call — strong intent, sending fee breakup. Follow up Friday.' },
  { name: 'Karan Malhotra', email: 'karan.m@example.com', phone: '+91 90000 20004', status: 'CONVERTED', source: 'callback', message: 'Enrolled after counselling.', uni: 'jamia-online', course: 'jamia-online-bsc-datascience', note: 'Converted — enrolled in B.Sc Data Science.' },
  { name: 'Divya Menon', email: 'divya.menon@example.com', phone: '+91 90000 20005', status: 'NEW', source: 'counsellor', message: 'Asked to speak to a human counsellor about scholarships.', uni: 'symbiosis-online', wantsAgent: true },
  { name: 'Farhan Ali', email: 'farhan.ali@example.com', phone: '+91 90000 20006', status: 'LOST', source: 'directory', message: 'Chose an offline college instead.' },
  { name: 'Neha Verma', email: 'neha.verma@example.com', phone: '+91 90000 20007', status: 'CONTACTED', source: 'callback', message: 'Wants EMI options for MCA.', uni: 'symbiosis-online', course: 'sym-online-mca' },
  { name: 'Aditya Kulkarni', email: 'aditya.k@example.com', phone: '+91 90000 20008', status: 'QUALIFIED', source: 'directory', message: 'Working professional, weekend classes only.', uni: 'nmims-distance', course: 'nmims-online-bba-fintech' },
  { name: 'Pooja Shetty', email: 'pooja.shetty@example.com', phone: '+91 90000 20009', status: 'NEW', source: 'callback', message: 'Interested in MA Psychology, first-generation learner.', uni: 'jamia-online', course: 'jamia-online-ba-psychology' },
  { name: 'Rahul Desai', email: 'rahul.desai@example.com', phone: '+91 90000 20010', status: 'CONTACTED', source: 'counsellor', message: 'Needs documents checklist for admission.', uni: 'punjab-university', course: 'pu-online-mba' },
]

async function uniIdBySlug(slug?: string) {
  if (!slug) return null
  const u = await prisma.university.findUnique({ where: { slug }, select: { id: true } })
  return u?.id ?? null
}
async function courseBySlug(slug?: string) {
  if (!slug) return null
  return prisma.course.findUnique({ where: { slug }, select: { id: true, title: true } })
}

async function main() {
  const passwordHash = await bcrypt.hash('Student@123', 10)

  // ---- students -------------------------------------------------------------
  const students: Record<string, string> = {}
  for (const s of STUDENTS) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, phone: s.phone },
      create: { email: s.email, name: s.name, phone: s.phone, role: 'STUDENT', passwordHash },
      select: { id: true, email: true },
    })
    students[s.email] = u.id
  }
  console.log(`Students: ${STUDENTS.length}`)

  // ---- enrolments + finance (real order -> paid -> commission) ---------------
  let enrolled = 0
  for (const e of ENROLMENTS) {
    const userId = students[e.email]
    const course = await prisma.course.findUnique({ where: { slug: e.slug }, select: { id: true } })
    if (!userId || !course) {
      console.log(`  skip enrolment (missing user/course): ${e.email} / ${e.slug}`)
      continue
    }
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
      select: { id: true },
    })
    if (existing) {
      console.log(`  enrolment already exists: ${e.email} / ${e.slug}`)
      continue
    }

    const order = await openOrder(userId, course.id)
    const { commission } = await markOrderPaid(order.id, `demo_pay_${order.id.slice(-6)}`)

    await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId: course.id } },
      data: {
        progressPct: e.progress,
        status: e.status,
        completedAt: e.status === 'COMPLETED' ? new Date() : null,
      },
    })

    // Backdate a couple of commissions so /admin/finance shows a claimable
    // pipeline, not just pending receivables.
    if (e.claimable && commission) {
      await prisma.commission.update({
        where: { id: commission.id },
        data: { claimableAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      })
    }
    enrolled++
    console.log(`  enrolled: ${e.email} -> ${e.slug} (${e.progress}%, ${e.status})`)
  }

  const { promoted } = await promoteClaimable()
  console.log(`Enrolments created: ${enrolled}; commissions promoted to CLAIMABLE: ${promoted}`)

  // ---- applications ---------------------------------------------------------
  let apps = 0
  for (const a of APPLICATIONS) {
    const userId = students[a.email]
    const course = await courseBySlug(a.slug)
    if (!userId || !course) continue
    const existing = await prisma.application.findFirst({
      where: { userId, courseId: course.id },
      select: { id: true },
    })
    if (existing) {
      console.log(`  application already exists: ${a.email} / ${a.slug}`)
      continue
    }
    const student = STUDENTS.find((s) => s.email === a.email)!
    await prisma.application.create({
      data: {
        userId,
        courseId: course.id,
        step: a.step,
        status: a.status,
        personal: {
          fullName: student.name,
          email: student.email,
          phone: student.phone,
          dob: '2001-06-15',
          gender: 'Prefer not to say',
          address: '12, MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
        education: {
          qualification: a.slug.includes('mba') || a.slug.includes('pg') || a.slug.includes('ma-') ? 'Bachelor’s Degree' : '10+2',
          board: 'CBSE',
          yearOfPassing: 2020,
          percentage: 72,
        },
      },
    })
    apps++
    console.log(`  application: ${a.email} -> ${a.slug} (${a.status})`)
  }
  console.log(`Applications created: ${apps}`)

  // ---- CRM leads ------------------------------------------------------------
  let leads = 0
  for (const l of LEADS) {
    const existing = await prisma.lead.findFirst({ where: { email: l.email }, select: { id: true } })
    if (existing) {
      console.log(`  lead already exists: ${l.email}`)
      continue
    }
    const uni = await uniIdBySlug(l.uni)
    const uniRow = l.uni ? await prisma.university.findUnique({ where: { slug: l.uni }, select: { name: true } }) : null
    const course = await courseBySlug(l.course)
    const lead = await prisma.lead.create({
      data: {
        name: l.name,
        email: l.email,
        phone: l.phone,
        message: l.message,
        status: l.status,
        source: l.source,
        wantsAgent: Boolean(l.wantsAgent),
        agentRequestedAt: l.wantsAgent ? new Date() : null,
        interestedUniversityId: uni,
        interestedUniversityName: uniRow?.name ?? null,
        interestedCourseId: course?.id ?? null,
        interestedCourseTitle: course?.title ?? null,
      },
      select: { id: true },
    })
    if (l.note) {
      await prisma.leadNote.create({
        data: { leadId: lead.id, body: l.note, authorName: 'Counsellor (demo)' },
      })
    }
    leads++
    console.log(`  lead: ${l.name} (${l.status}${l.wantsAgent ? ', wants agent' : ''})`)
  }
  console.log(`Leads created: ${leads}`)

  console.log('\nDone — demo activity added for the admin panel.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
