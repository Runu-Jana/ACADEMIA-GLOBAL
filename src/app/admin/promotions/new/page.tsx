import { PageHeader } from '@/components/admin/admin-ui'
import { NewPromotionWorkspace } from '@/components/admin/new-promotion-workspace'

export const dynamic = 'force-dynamic'

export default function NewPromotionPage() {
  return (
    <div>
      <PageHeader title="New promotion" sub="Draft one with AI or fill it in yourself. Buyers apply the code at checkout." />
      <NewPromotionWorkspace />
    </div>
  )
}
