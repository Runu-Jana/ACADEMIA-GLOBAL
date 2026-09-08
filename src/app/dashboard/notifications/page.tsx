import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { NotificationInbox } from '@/components/dashboard/notification-inbox'

export const metadata: Metadata = { title: 'Notifications' }
export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await requireUser('/dashboard/notifications')

  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, type: true, title: true, body: true, url: true, readAt: true, createdAt: true },
  })

  const initial = rows.map((n) => ({
    ...n,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-2xl">
      <NotificationInbox initial={initial} />
    </div>
  )
}
