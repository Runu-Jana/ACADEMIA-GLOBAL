import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/admin/admin-ui'
import { ProductForm } from '@/components/admin/product-form'

export const metadata: Metadata = { title: 'Add Product' }
export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  await requireAdmin()

  return (
    <>
      <PageHeader
        title="Add Product"
        sub="Books and stationery share one form — pick the type and the relevant fields appear."
      />
      <ProductForm />
    </>
  )
}
