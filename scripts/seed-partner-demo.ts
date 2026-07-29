/**
 * Adds partner-portal demo data to an existing database, idempotently.
 *
 *   npx tsx scripts/seed-partner-demo.ts
 *
 * Non-destructive: creates the demo partner login and a sample pending request
 * only if they're missing, so you can exercise the whole flow (sign in as a
 * partner, and approve an incoming request) without wiping your dev data. A
 * fresh `npm run db:seed` already includes both.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const uni = await prisma.university.findFirst({
    where: { partnerStatus: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })
  if (!uni) {
    console.log('No active university found — run npm run db:seed first.')
    return
  }

  // Demo partner login attached to that university.
  const email = 'partner@amity.edu'
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: 'PARTNER', universityId: uni.id },
    })
    console.log(`Partner login already existed — ensured it's linked to ${uni.name}.`)
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('Partner@123', 10),
        name: 'Priya Sharma',
        role: 'PARTNER',
        phone: '+91 98111 22334',
        universityId: uni.id,
      },
    })
    console.log(`Created partner login ${email} / Partner@123 for ${uni.name}.`)
  }

  // A pending request so the operator review queue isn't empty.
  const pending = await prisma.partnerApplication.count({ where: { status: 'PENDING' } })
  if (pending === 0) {
    await prisma.partnerApplication.create({
      data: {
        universityName: 'Sunrise Institute of Technology',
        contactName: 'Rakesh Menon',
        contactEmail: 'rakesh@sunrise.edu.in',
        contactPhone: '+91 98200 11223',
        website: 'https://sunrise.edu.in',
        city: 'Pune',
        state: 'Maharashtra',
        message: 'We run online BBA, BCA and MBA programmes and would like to list them.',
      },
    })
    console.log('Created a sample pending partner request.')
  } else {
    console.log(`${pending} partner request(s) already pending — left as is.`)
  }

  console.log('Done.')
}

main()
  .catch((err) => {
    console.error('Failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
