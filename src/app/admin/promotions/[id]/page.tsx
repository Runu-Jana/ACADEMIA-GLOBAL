import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/admin/admin-ui'
import { PromotionForm, type PromotionFormValues } from '@/components/admin/promotion-form'

export const dynamic = 'force-dynamic'

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await prisma.promotion.findUnique({ where: { id } })
  if (!p) notFound()

  const values: PromotionFormValues = {
    id: p.id,
    code: p.code,
    title: p.title,
    description: p.description,
    type: p.type,
    value: p.value,
    scope: p.scope,
    minSubtotal: p.minSubtotal,
    maxDiscount: p.maxDiscount,
    usageLimit: p.usageLimit,
    perUserLimit: p.perUserLimit,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    status: p.status,
    usedCount: p.usedCount,
  }

  return (
    <div>
      <PageHeader title={`Edit ${p.code}`} sub={`Redeemed ${p.usedCount} time${p.usedCount === 1 ? '' : 's'}.`} />
      <PromotionForm promotion={values} />
    </div>
  )
}
