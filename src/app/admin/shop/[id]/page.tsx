import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/admin/admin-ui'
import { ProductForm, toFormValues } from '@/components/admin/product-form'

export const metadata: Metadata = { title: 'Edit Product' }
export const dynamic = 'force-dynamic'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()

  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) notFound()

  return (
    <>
      <PageHeader
        title={product.title}
        sub={`/shop/${product.slug}`}
        actions={
          product.status === 'PUBLISHED' && (
            <Link
              href={`/shop/${product.slug}`}
              target="_blank"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on storefront
            </Link>
          )
        }
      />
      <ProductForm initial={toFormValues(product)} />
    </>
  )
}
