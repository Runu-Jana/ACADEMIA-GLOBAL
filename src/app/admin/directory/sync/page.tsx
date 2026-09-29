import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { PageHeader } from '@/components/admin/admin-ui'
import { CatalogSyncManager } from '@/components/admin/catalog-sync-manager'

export const metadata: Metadata = { title: 'Catalogue Sync' }
export const dynamic = 'force-dynamic'

export default async function CatalogSyncPage() {
  await requireAdmin()

  const [universities, changes] = await Promise.all([
    prisma.university.findMany({
      where: { listed: true },
      orderBy: [{ syncEnabled: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        sourceUrl: true,
        syncEnabled: true,
        lastSyncedAt: true,
        syncStatus: true,
        _count: { select: { courses: { where: { source: 'DIRECTORY' } } } },
      },
    }),
    prisma.catalogChange.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        kind: true,
        title: true,
        summary: true,
        courseSlug: true,
        createdAt: true,
        university: { select: { name: true } },
      },
    }),
  ])

  return (
    <div>
      <PageHeader
        title="Catalogue Sync"
        sub="Keep directory listings in step with each university's official site — automatically, every day."
      />
      <CatalogSyncManager
        aiConfigured={isFeatureConfigured('notes')}
        universities={universities.map((u) => ({
          id: u.id,
          name: u.name,
          sourceUrl: u.sourceUrl,
          syncEnabled: u.syncEnabled,
          syncStatus: u.syncStatus,
          directoryCourses: u._count.courses,
          lastSyncedAt: u.lastSyncedAt?.toISOString() ?? null,
        }))}
        changes={changes.map((c) => ({
          id: c.id,
          kind: c.kind,
          title: c.title,
          summary: c.summary,
          courseSlug: c.courseSlug,
          university: c.university.name,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
