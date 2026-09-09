import { PageHeader } from '@/components/admin/admin-ui'
import { PromotionForm } from '@/components/admin/promotion-form'

export const dynamic = 'force-dynamic'

export default function NewPromotionPage() {
  return (
    <div>
      <PageHeader title="New promotion" sub="Create a coupon code buyers can apply at checkout." />
      <PromotionForm />
    </div>
  )
}
