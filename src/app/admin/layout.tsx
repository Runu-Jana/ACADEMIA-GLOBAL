import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata: Metadata = {
  title: 'Admin Panel',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts already gates /admin/*; this gives us the typed user record
  // and is the single source of truth for the panel's identity chrome.
  const user = await requireAdmin()

  // Prospects who asked Saarthi for a live counsellor and haven't been worked yet
  // — surfaced as the admin bell so a callback isn't missed.
  const agentLeads = await prisma.lead.findMany({
    where: { wantsAgent: true, status: { in: ['NEW', 'CONTACTED'] } },
    orderBy: { agentRequestedAt: 'desc' },
    take: 8,
    select: { id: true, name: true, phone: true, interestedCourseTitle: true },
  })
  const notifications = agentLeads.map((l) => ({
    title: `${l.name} wants a callback`,
    body: l.interestedCourseTitle
      ? `Interested in ${l.interestedCourseTitle}`
      : l.phone
        ? `Call ${l.phone}`
        : 'Requested a live counsellor via Saarthi',
    href: '/admin/leads',
  }))

  return (
    <AdminShell user={{ name: user.name, email: user.email }} notifications={notifications}>
      {children}
    </AdminShell>
  )
}
