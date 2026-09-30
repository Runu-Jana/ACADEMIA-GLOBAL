/**
 * Additive demo EXTRAS for the remaining admin screens: certificates
 * (/admin/certificates + /dashboard/certificates + public /verify), live classes
 * (/admin/live), and shop orders (/admin/shop/orders).
 *
 * Additive and idempotent (upserts by enrollment / roomName / a deterministic
 * order number); never touches prisma/seed.ts. Run after db:demo, db:punjab and
 * db:activity so the students, enrolments and products it references exist.
 *
 *   npm run db:extras
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DAY = 24 * 60 * 60 * 1000

/** Certificates for these (student, course) pairs — the enrolment is completed first. */
const CERTS = [
  { email: 'priya@demo.in', slug: 'pu-online-mba', grade: 'A+' },
  { email: 'aisha@demo.in', slug: 'jamia-online-bsc-datascience', grade: 'A' },
]

const LIVE_CLASSES = [
  { room: 'demo-mba-analytics-kickoff', slug: 'sym-online-mba-analytics', title: 'Business Analytics — Live Kickoff', inDays: 2, status: 'SCHEDULED', durationMin: 90 },
  { room: 'demo-mba-analytics-sql', slug: 'sym-online-mba-analytics', title: 'Hands-on: Writing Your First SQL', inDays: 5, status: 'SCHEDULED', durationMin: 60 },
  { room: 'demo-datascience-python-live', slug: 'jamia-online-bsc-datascience', title: 'Python Live Doubt-Solving', inDays: 0, status: 'LIVE', durationMin: 60 },
  { room: 'demo-bcom-taxation-recap', slug: 'nmims-distance-bcom', title: 'Taxation & GST — Recorded Recap', inDays: -3, status: 'ENDED', durationMin: 75, recording: true },
  { room: 'demo-mba-guest-lecture', slug: 'pu-online-mba', title: 'Guest Lecture (rescheduled)', inDays: 1, status: 'CANCELLED', durationMin: 60 },
]

// Deterministic order numbers keep this idempotent (a real checkout uses a random one).
const SHOP_ORDERS = [
  { number: 'SS-DEMOA1', email: 'aisha@demo.in', status: 'DELIVERED', items: [{ slug: 'complete-physics-jee-main-advanced', qty: 1 }, { slug: 'organic-chemistry-mechanisms-neet', qty: 1 }] },
  { number: 'SS-DEMOB2', email: 'rohan@demo.in', status: 'SHIPPED', courier: 'Delhivery', tracking: 'DLV1234567890', items: [{ slug: 'quantitative-aptitude-banking-ssc', qty: 1 }] },
  { number: 'SS-DEMOC3', email: 'priya@demo.in', status: 'PACKED', items: [{ slug: 'ncert-mathematics-class-12-companion', qty: 2 }] },
  { number: 'SS-DEMOD4', email: 'vikram@demo.in', status: 'PAID', items: [{ slug: 'indian-polity-governance-upsc', qty: 1 }] },
  { number: 'SS-DEMOE5', email: null, status: 'CANCELLED', guest: 'Rohit Sharma', items: [{ slug: 'cat-verbal-ability-reading-comprehension', qty: 1 }] },
]

function serialFor(title: string) {
  const code = (title.replace(/[^a-zA-Z ]/g, '').trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').join('') + 'XXX').slice(0, 3)
  const n = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  return `AG-${new Date().getFullYear()}-${code}-${n}`
}

async function studentId(email: string) {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, phone: true } })
  return u
}
async function courseId(slug: string) {
  return prisma.course.findUnique({ where: { slug }, select: { id: true, title: true } })
}

async function main() {
  // ---- certificates ---------------------------------------------------------
  let certs = 0
  for (const c of CERTS) {
    const user = await studentId(c.email)
    const course = await courseId(c.slug)
    if (!user || !course) {
      console.log(`  skip cert (missing user/course): ${c.email} / ${c.slug}`)
      continue
    }
    const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId: course.id },
    orderBy: { enrolledAt: 'desc' },
      select: { id: true },
    })
    if (!enrollment) {
      console.log(`  skip cert (not enrolled): ${c.email} / ${c.slug}`)
      continue
    }
    // A certificate implies a finished course.
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'COMPLETED', progressPct: 100, completedAt: new Date() },
    })
    await prisma.certificate.upsert({
      where: { enrollmentId: enrollment.id },
      update: { grade: c.grade, revoked: false, revokedAt: null },
      create: {
        serial: serialFor(course.title),
        grade: c.grade,
        userId: user.id,
        courseId: course.id,
        enrollmentId: enrollment.id,
      },
    })
    certs++
    console.log(`  certificate: ${c.email} -> ${course.title} (${c.grade})`)
  }
  console.log(`Certificates: ${certs}`)

  // ---- live classes ---------------------------------------------------------
  let classes = 0
  for (const lc of LIVE_CLASSES) {
    const course = await courseId(lc.slug)
    if (!course) {
      console.log(`  skip live class (missing course): ${lc.slug}`)
      continue
    }
    const startsAt = new Date(Date.now() + lc.inDays * DAY - (lc.status === 'LIVE' ? 10 * 60 * 1000 : 0))
    await prisma.liveClass.upsert({
      where: { roomName: lc.room },
      update: { status: lc.status, startsAt, title: lc.title, courseId: course.id },
      create: {
        roomName: lc.room,
        title: lc.title,
        description: `${lc.title} — a demo session for ${course.title}.`,
        provider: 'JITSI',
        startsAt,
        durationMin: lc.durationMin,
        status: lc.status,
        recordingUrl: lc.recording ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' : null,
        courseId: course.id,
      },
    })
    classes++
    console.log(`  live class: ${lc.title} (${lc.status})`)
  }
  console.log(`Live classes: ${classes}`)

  // ---- shop orders ----------------------------------------------------------
  let orders = 0
  for (const o of SHOP_ORDERS) {
    const existing = await prisma.shopOrder.findUnique({ where: { orderNumber: o.number }, select: { id: true } })
    if (existing) {
      console.log(`  shop order already exists: ${o.number}`)
      continue
    }

    const lineItems: { title: string; price: number; qty: number; productId: string }[] = []
    for (const it of o.items) {
      const product = await prisma.product.findUnique({ where: { slug: it.slug }, select: { id: true, title: true, price: true } })
      if (product) lineItems.push({ title: product.title, price: product.price, qty: it.qty, productId: product.id })
    }
    if (lineItems.length === 0) {
      console.log(`  skip shop order (no products): ${o.number}`)
      continue
    }

    const subtotal = lineItems.reduce((n, i) => n + i.price * i.qty, 0)
    const shipping = subtotal >= 49900 ? 0 : 4900 // free over ₹499, else flat ₹49
    const total = subtotal + shipping

    const user = o.email ? await studentId(o.email) : null
    const now = new Date()
    await prisma.shopOrder.create({
      data: {
        orderNumber: o.number,
        status: o.status,
        subtotal,
        discount: 0,
        shipping,
        total,
        userId: user?.id ?? null,
        name: user?.name ?? o.guest ?? 'Guest Buyer',
        email: o.email ?? 'guest@example.com',
        phone: user?.phone ?? '+91 90000 30000',
        line1: '12, MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        courier: o.courier ?? null,
        trackingNumber: o.tracking ?? null,
        paidAt: ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(o.status) ? now : null,
        shippedAt: ['SHIPPED', 'DELIVERED'].includes(o.status) ? now : null,
        deliveredAt: o.status === 'DELIVERED' ? now : null,
        cancelledAt: o.status === 'CANCELLED' ? now : null,
        items: { create: lineItems },
      },
    })
    orders++
    console.log(`  shop order: ${o.number} (${o.status}, ${lineItems.length} item(s), ₹${(total / 100).toLocaleString('en-IN')})`)
  }
  console.log(`Shop orders: ${orders}`)

  console.log('\nDone — demo certificates, live classes and shop orders added.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
