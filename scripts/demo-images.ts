/**
 * Attaches (or clears) labelled TEST images on a few shop products so the
 * gallery, carousel and zoom can be exercised before real photography exists.
 *
 *   npx tsx scripts/demo-images.ts        # attach
 *   npx tsx scripts/demo-images.ts clear  # remove
 *
 * These are placeholders. Clear them before launch.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIXTURES: { slug: string; imageUrl: string; images: string[] }[] = [
  {
    slug: 'complete-physics-jee-main-advanced',
    imageUrl: '/demo/physics-1.svg',
    images: ['/demo/physics-2.svg', '/demo/physics-3.svg'],
  },
  { slug: 'gel-pen-blue-pack-of-10', imageUrl: '/demo/pens-1.svg', images: ['/demo/pens-2.svg'] },
  // Single image: the carousel must stay quiet — no arrows, no dots, no thumbs.
  { slug: 'organic-chemistry-mechanisms-neet', imageUrl: '/demo/neet-1.svg', images: [] },
  // Out of stock, so the badge overlay can be checked against a real photo.
  { slug: 'clat-legal-reasoning-complete', imageUrl: '/demo/clat-1.svg', images: [] },
]

async function main() {
  const clear = process.argv[2] === 'clear'

  for (const f of FIXTURES) {
    await prisma.product.update({
      where: { slug: f.slug },
      data: clear
        ? { imageUrl: null, images: [] }
        : { imageUrl: f.imageUrl, images: f.images },
    })
  }

  const withImages = (await prisma.product.findMany({ select: { imageUrl: true } }))
    .filter((p) => p.imageUrl).length

  console.log(clear ? 'Demo images cleared.' : 'Demo images attached.')
  console.log(`Products carrying an image: ${withImages}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
