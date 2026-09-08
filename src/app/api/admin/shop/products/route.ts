import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { PRODUCT_STATUSES, PRODUCT_KINDS, SHOP_CATEGORIES } from '@/lib/shop'

export const dynamic = 'force-dynamic'

const KINDS = PRODUCT_KINDS.map((k) => k.value) as [string, ...string[]]
const CATEGORIES = SHOP_CATEGORIES.map((c) => c.value) as [string, ...string[]]
const STATUSES = PRODUCT_STATUSES as unknown as [string, ...string[]]

/**
 * Product create/update payload.
 *
 * Prices arrive in PAISE — the admin form converts from the rupees an operator
 * types, so there is exactly one conversion point and the API never has to
 * guess which unit it was handed.
 */
export const productSchema = z.object({
  slug: z.string().trim().max(120).optional(),
  title: z.string().trim().min(3).max(200),
  subtitle: z.string().trim().min(3).max(300),
  kind: z.enum(KINDS),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(10).max(8000),
  highlights: z.array(z.string().trim().min(1).max(200)).max(12),

  price: z.number().int().nonnegative().max(100_000_000),
  mrp: z.number().int().nonnegative().max(100_000_000).nullable().optional(),
  stock: z.number().int().nonnegative().max(1_000_000),
  sku: z.string().trim().max(60).nullable().optional(),

  imageUrl: z.string().trim().url().max(500).nullable().optional().or(z.literal('')),
  images: z.array(z.string().trim().url().max(500)).max(8),

  status: z.enum(STATUSES),
  featured: z.boolean(),

  author: z.string().trim().max(120).nullable().optional(),
  publisher: z.string().trim().max(120).nullable().optional(),
  isbn: z.string().trim().max(20).nullable().optional(),
  edition: z.string().trim().max(60).nullable().optional(),
  language: z.string().trim().max(40).nullable().optional(),
  pages: z.number().int().positive().max(20000).nullable().optional(),
  binding: z.string().trim().max(40).nullable().optional(),
  publishedYear: z.number().int().min(1800).max(2200).nullable().optional(),
  examTags: z.array(z.string().trim().min(1).max(60)).max(20),

  brand: z.string().trim().max(120).nullable().optional(),
  specs: z.array(z.string().trim().min(1).max(200)).max(20),
})
  // MRP is what we strike through. Below the selling price it isn't a discount,
  // it's a false claim — and in India that's a consumer-protection issue.
  .refine((d) => !d.mrp || d.mrp >= d.price, {
    message: 'MRP cannot be lower than the selling price.',
    path: ['mrp'],
  })

/** Empty strings from the form mean "not set", not a literal blank value. */
export function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'ADMIN' ? user : null
}

/** Ensures the slug is unique by suffixing -2, -3 … when it collides. */
export async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || 'product'
  let candidate = root

  for (let n = 2; n < 200; n++) {
    const clash = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!clash || clash.id === exceptId) return candidate
    candidate = `${root}-${n}`
  }
  return `${root}-${Date.now()}`
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the product details.' },
      { status: 400 },
    )
  }
  const d = parsed.data

  const product = await prisma.product.create({
    data: {
      slug: await uniqueSlug(d.slug || d.title),
      title: d.title,
      subtitle: d.subtitle,
      kind: d.kind,
      category: d.category,
      description: d.description,
      highlights: d.highlights,
      price: d.price,
      mrp: d.mrp ?? null,
      stock: d.stock,
      sku: nullIfBlank(d.sku),
      imageUrl: nullIfBlank(d.imageUrl),
      images: d.images,
      status: d.status,
      featured: d.featured,
      author: nullIfBlank(d.author),
      publisher: nullIfBlank(d.publisher),
      isbn: nullIfBlank(d.isbn),
      edition: nullIfBlank(d.edition),
      language: nullIfBlank(d.language),
      pages: d.pages ?? null,
      binding: nullIfBlank(d.binding),
      publishedYear: d.publishedYear ?? null,
      examTags: d.examTags,
      brand: nullIfBlank(d.brand),
      specs: d.specs,
    },
    select: { id: true, slug: true },
  })

  return NextResponse.json({ ok: true, product })
}
