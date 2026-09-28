/**
 * Additive shop products: upserts the book + stationery catalogue so the Student
 * Shop has stock on a fresh deploy (e.g. Railway). Reads the same source of truth
 * as prisma/seed.ts (prisma/shop-catalog.ts), upserts by slug, and never wipes —
 * safe to run against a populated database and safe to re-run.
 *
 *   npm run db:shop
 *   # against Railway:
 *   $env:DATABASE_URL="<DATABASE_PUBLIC_URL>"; npm run db:shop   (PowerShell)
 */
import { PrismaClient } from '@prisma/client'
import { BOOKS, STATIONERY } from '../prisma/shop-catalog'

const prisma = new PrismaClient()

async function main() {
  let books = 0
  for (const b of BOOKS) {
    const { examTags, highlights, ...rest } = b
    const data = { ...rest, kind: 'BOOK', status: 'PUBLISHED', examTags, highlights, specs: [], images: [] }
    await prisma.product.upsert({ where: { slug: b.slug }, update: data, create: data })
    books++
  }

  let stationery = 0
  for (const s of STATIONERY) {
    const { specs, highlights, ...rest } = s
    const data = { ...rest, kind: 'STATIONERY', status: 'PUBLISHED', specs, highlights, examTags: [], images: [] }
    await prisma.product.upsert({ where: { slug: s.slug }, update: data, create: data })
    stationery++
  }

  const total = await prisma.product.count({ where: { status: 'PUBLISHED' } })
  console.log(`Upserted ${books} books + ${stationery} stationery. Published products now: ${total}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
