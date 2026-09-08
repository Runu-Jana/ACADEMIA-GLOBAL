import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s · Dashboard · Shiksha Sarthi' },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/dashboard')

  // Seeds the bell's badge so it's correct on first paint; the bell keeps itself
  // fresh after that (it reloads on open and on window focus).
  const initialUnread = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  })

  return (
    <DashboardShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      initialUnread={initialUnread}
    >
      {children}
    </DashboardShell>
  )
}
