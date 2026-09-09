import type { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Compass } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { type CourseCardData } from '@/components/course/course-card'
import { type ProductCardData } from '@/components/shop/product-card'
import { SavedTabs } from '@/components/dashboard/saved-tabs'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Saved' }
export const dynamic = 'force-dynamic'

const courseSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  university: { select: { name: true, shortName: true, slug: true } },
} as const

const productSelect = {
  id: true, slug: true, title: true, subtitle: true, kind: true, category: true,
  price: true, mrp: true, stock: true, rating: true, reviews: true,
  author: true, brand: true, imageUrl: true,
} as const

export default async function SavedPage() {
  const user = await requireUser('/dashboard/saved')

  const [courseRows, productRows] = await Promise.all([
    prisma.savedCourse.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { course: { select: courseSelect } },
    }),
    prisma.savedProduct.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { product: { select: productSelect } },
    }),
  ])

  const courses: CourseCardData[] = courseRows.map((r) => r.course)
  const products: ProductCardData[] = productRows.map((r) => r.product)

  // One combined empty state reads better than an empty tab strip when the
  // student has saved nothing at all yet.
  if (courses.length === 0 && products.length === 0) {
    return (
      <div className="card-base grid place-items-center px-6 py-16 text-center">
        <Heart aria-hidden className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-[15px] font-bold">Nothing saved yet</p>
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
          Tap the heart on any course or shop item to save it here and come back to it later.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/courses" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            <Compass className="h-4 w-4" />
            Browse courses
          </Link>
          <Link href="/shop" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Browse the shop
          </Link>
        </div>
      </div>
    )
  }

  return <SavedTabs courses={courses} products={products} />
}
