import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Pencil, ExternalLink, AlertTriangle } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductCover } from '@/components/shop/product-cover'
import {
  PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty,
} from '@/components/admin/admin-ui'
import { FilterBar } from '@/components/admin/filter-bar'
import {
  PRODUCT_KINDS, PRODUCT_STATUSES, SHOP_CATEGORIES, formatPaise, categoryLabel, LOW_STOCK_AT,
} from '@/lib/shop'

export const metadata: Metadata = { title: 'Shop Products' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key]
  return typeof v === 'string' ? v : ''
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'default'> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'default',
}

export default async function AdminShopPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const values = {
    q: one(sp, 'q'),
    kind: one(sp, 'kind'),
    category: one(sp, 'category'),
    status: one(sp, 'status'),
  }

  const where: Prisma.ProductWhereInput = {
    ...(values.q && {
      OR: [
        { title: { contains: values.q, mode: 'insensitive' } },
        { slug: { contains: values.q, mode: 'insensitive' } },
        { author: { contains: values.q, mode: 'insensitive' } },
        { isbn: { contains: values.q, mode: 'insensitive' } },
        { sku: { contains: values.q, mode: 'insensitive' } },
      ],
    }),
    ...(values.kind && { kind: values.kind }),
    ...(values.category && { category: values.category }),
    ...(values.status && { status: values.status }),
  }

  const [products, total, lowStock] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true, slug: true, title: true, kind: true, category: true, price: true,
        mrp: true, stock: true, status: true, featured: true, author: true, brand: true,
        imageUrl: true, _count: { select: { orderItems: true } },
      },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { status: 'PUBLISHED', stock: { lte: LOW_STOCK_AT } } }),
  ])

  return (
    <>
      <PageHeader
        title="Shop Products"
        sub={`${products.length} of ${total} product${total === 1 ? '' : 's'}`}
        actions={
          <Link href="/admin/shop/new" className={buttonVariants({ variant: 'holo', size: 'sm' })}>
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Link>
        }
      />

      {lowStock > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] dark:border-amber-500/25 dark:bg-amber-500/10">
          <AlertTriangle aria-hidden className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-amber-800 dark:text-amber-200">
            {lowStock} published {lowStock === 1 ? 'product is' : 'products are'} at or below{' '}
            {LOW_STOCK_AT} units.
          </span>
        </div>
      )}

      <FilterBar
        basePath="/admin/shop"
        values={values}
        searchPlaceholder="Search by title, slug, author, ISBN or SKU…"
        selects={[
          { name: 'kind', label: 'All types', options: PRODUCT_KINDS.map((k) => ({ ...k })) },
          {
            name: 'category',
            label: 'All categories',
            options: SHOP_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
          },
          {
            name: 'status',
            label: 'All statuses',
            options: PRODUCT_STATUSES.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Price</Th>
              <Th className="text-center">Stock</Th>
              <Th className="text-center">Sold</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
              {products.length === 0 && (
                <TableEmpty colSpan={7}>
                  No products match those filters.{' '}
                  <Link href="/admin/shop" className="font-semibold text-primary-600 hover:underline">
                    Reset
                  </Link>
                </TableEmpty>
              )}

              {products.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-muted/40">
                  <Td className="max-w-[20rem]">
                    <Link href={`/admin/shop/${p.id}`} className="group flex min-w-0 items-center gap-2.5">
                      <ProductCover
                        kind={p.kind}
                        category={p.category}
                        title={p.title}
                        author={p.author}
                        imageUrl={p.imageUrl}
                        compact
                        className="h-11 w-9 shrink-0 rounded-md"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-semibold transition-colors group-hover:text-primary-600">
                            {p.title}
                          </span>
                          {p.featured && <Badge tone="holo">★</Badge>}
                        </span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          {p.author ?? p.brand ?? p.slug}
                        </span>
                      </span>
                    </Link>
                  </Td>

                  <Td className="whitespace-nowrap text-muted-foreground">
                    {categoryLabel(p.category)}
                  </Td>

                  <Td className="whitespace-nowrap">
                    <span className="font-bold tabular-nums">{formatPaise(p.price)}</span>
                    {p.mrp && p.mrp > p.price && (
                      <span className="ml-1.5 text-[11.5px] text-muted-foreground line-through">
                        {formatPaise(p.mrp)}
                      </span>
                    )}
                  </Td>

                  <Td className="text-center">
                    <span
                      className={
                        p.stock <= 0
                          ? 'font-bold text-red-600 dark:text-red-400'
                          : p.stock <= LOW_STOCK_AT
                            ? 'font-bold text-amber-600 dark:text-amber-400'
                            : 'tabular-nums'
                      }
                    >
                      {p.stock}
                    </span>
                  </Td>

                  <Td className="text-center tabular-nums text-muted-foreground">
                    {p._count.orderItems}
                  </Td>

                  <Td>
                    <Badge tone={STATUS_TONE[p.status] ?? 'default'}>{p.status}</Badge>
                  </Td>

                  <Td className="text-right">
                    <span className="inline-flex gap-1">
                      <Link
                        href={`/admin/shop/${p.id}`}
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        aria-label={`Edit ${p.title}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      {p.status === 'PUBLISHED' && (
                        <Link
                          href={`/shop/${p.slug}`}
                          target="_blank"
                          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          aria-label={`View ${p.title} on the storefront`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </span>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </DataTable>
        </TableWrap>
      </div>
    </>
  )
}
