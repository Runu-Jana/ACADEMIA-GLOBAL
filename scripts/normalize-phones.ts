/**
 * One-time backfill: rewrite existing User.phone values to the canonical
 * "+91XXXXXXXXXX" form so returning-student matching works for accounts created
 * before phones were normalized on write.
 *
 * Idempotent — already-canonical numbers are left untouched, so it's safe to
 * re-run. Invalid/unparseable numbers are left as-is and reported, never nulled.
 *
 *   npm run db:normalize-phones
 *   # Railway:
 *   DATABASE_URL="postgresql://…proxy.rlwy.net:PORT/railway" npm run db:normalize-phones
 */
import { PrismaClient } from '@prisma/client'
import { normalizePhone } from '../src/lib/phone'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  })

  let updated = 0
  let unchanged = 0
  const invalid: string[] = []

  for (const u of users) {
    const canonical = normalizePhone(u.phone)
    if (!canonical) {
      invalid.push(u.phone ?? '')
      continue
    }
    if (canonical === u.phone) {
      unchanged++
      continue
    }
    await prisma.user.update({ where: { id: u.id }, data: { phone: canonical } })
    updated++
  }

  console.log(`Phones scanned : ${users.length}`)
  console.log(`  normalized   : ${updated}`)
  console.log(`  already OK   : ${unchanged}`)
  console.log(`  left as-is   : ${invalid.length}${invalid.length ? ` (couldn't parse: ${invalid.slice(0, 10).join(', ')}${invalid.length > 10 ? '…' : ''})` : ''}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
