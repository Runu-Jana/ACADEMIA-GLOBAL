import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { PageHeader } from '@/components/admin/admin-ui'
import { DirectoryIngest } from '@/components/admin/directory-ingest'

export const metadata: Metadata = { title: 'Directory Import' }
export const dynamic = 'force-dynamic'

/**
 * The aggregator side of the catalogue: compile directory (non-partner) listings
 * from public course pages. Scraping and extraction happen behind the API guard;
 * this page only picks a target institution and hands the reviewed programmes to
 * the ingest flow. Active partners are excluded — their courses come through the
 * partner portal, not the scraper.
 */
export default async function AdminDirectoryPage() {
  await requireAdmin()

  const universities = await prisma.university.findMany({
    where: { partnerStatus: { not: 'ACTIVE' } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <>
      <PageHeader
        title="Directory Import"
        sub="Build directory listings from a university's public course page. The AI extracts programmes as facts; you review every one before it's published. Listings are display-only — interest becomes a lead you can steer to a partner."
      />
      <DirectoryIngest universities={universities} configured={isFeatureConfigured('notes')} />
    </>
  )
}
