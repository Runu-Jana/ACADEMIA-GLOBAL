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

  // The admin bell surfaces prospects a counsellor needs to call back:
  //  1) anyone who asked Saarthi for a live counsellor, and
  //  2) new enquiries from non-partner (directory/brochure) listings — a student
  //     applying to a university we don't partner with becomes a callback lead.
  const [agentLeads, enquiryLeads] = await Promise.all([
    prisma.lead.findMany({
      where: { wantsAgent: true, status: { in: ['NEW', 'CONTACTED'] } },
      orderBy: { agentRequestedAt: 'desc' },
      take: 6,
      select: { id: true, name: true, phone: true, interestedCourseTitle: true },
    }),
    prisma.lead.findMany({
      where: { wantsAgent: false, status: 'NEW', source: { in: ['directory', 'brochure'] } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, interestedCourseTitle: true, interestedUniversityName: true },
    }),
  ])

  const notifications = [
    ...agentLeads.map((l) => ({
      title: `${l.name} wants a callback`,
      body: l.interestedCourseTitle
        ? `Interested in ${l.interestedCourseTitle}`
        : l.phone
          ? `Call ${l.phone}`
          : 'Requested a live counsellor via Saarthi',
      href: '/admin/leads',
    })),
    ...enquiryLeads.map((l) => ({
      title: `New enquiry from ${l.name}`,
      body: l.interestedCourseTitle
        ? `Applied for ${l.interestedCourseTitle}${l.interestedUniversityName ? ` · ${l.interestedUniversityName}` : ''}`
        : l.interestedUniversityName
          ? `Interested in ${l.interestedUniversityName}`
          : 'Requested admission help on a directory listing',
      href: '/admin/leads?source=directory',
    })),
  ].slice(0, 8)

  return (
    <AdminShell user={{ name: user.name, email: user.email }} notifications={notifications}>
      {children}
    </AdminShell>
  )
}
