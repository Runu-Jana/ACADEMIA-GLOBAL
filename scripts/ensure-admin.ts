/**
 * Create or reset the admin user — without wiping anything.
 *
 * The additive demo scripts (db:demo / db:punjab / db:activity) seed the
 * catalogue but never the admin account; only the DESTRUCTIVE prisma/seed.ts
 * does. So a fresh deploy (e.g. Railway) can have courses yet no admin to log in
 * with. This upserts the admin safely, and doubles as a password reset.
 *
 * Defaults to admin@academiaglobal.in / Admin@123, but PLEASE set a strong
 * password in production via env:
 *
 *   # Railway (runs with the service's DATABASE_URL):
 *   railway run "ADMIN_EMAIL=you@yourdomain.in ADMIN_PASSWORD='<strong>' npm run db:admin"
 *
 *   # Or locally against the remote DB (use Railway's PUBLIC database URL):
 *   DATABASE_URL="<railway public url>" ADMIN_PASSWORD='<strong>' npm run db:admin
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@academiaglobal.in').trim()
  const password = process.env.ADMIN_PASSWORD || 'Admin@123'
  const name = process.env.ADMIN_NAME || 'Shiksha Sarthi Admin'

  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD must be at least 6 characters.')
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN', name },
    create: { email, passwordHash, role: 'ADMIN', name },
    select: { id: true, email: true, role: true },
  })

  console.log(`Admin ready: ${user.email} (role ${user.role})`)
  console.log(
    process.env.ADMIN_PASSWORD
      ? 'Password set from ADMIN_PASSWORD.'
      : 'Using the DEFAULT password Admin@123 — set ADMIN_PASSWORD to a strong value in production.',
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
