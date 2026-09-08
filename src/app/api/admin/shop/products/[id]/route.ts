import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { productSchema, nullIfBlank, uniqueSlug } from '../route'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'ADMIN' ? user : null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

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

  // Keep the existing slug unless the operator deliberately changed it — a live
  // product URL that shifts silently breaks inbound links and search rankings.
  const slug =
    d.slug && d.slug !== existing.slug ? await uniqueSlug(d.slug, existing.id) : existing.slug

  const product = await prisma.product.update({
    where: { id },
    data: {
      slug,
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

/**
 * Archive rather than delete.
 *
 * A product that appears on a past order must keep existing — its order lines
 * reference it, and an operator looking at last month's invoice should still be
 * able to open the item. ARCHIVED drops it from the storefront and the sitemap
 * without breaking history.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED', featured: false } })
  return NextResponse.json({ ok: true, archived: true })
}
