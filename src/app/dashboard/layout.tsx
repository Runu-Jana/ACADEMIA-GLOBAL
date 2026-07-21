import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { DashboardShell, type ShellNotification } from '@/components/dashboard/dashboard-shell'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s · Dashboard · Academia Global' },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/dashboard')

  // Cheap counts only — this runs on every dashboard page render.
  const [activeCourses, certificates, pendingTests] = await Promise.all([
    prisma.enrollment.count({ where: { userId: user.id, status: 'ACTIVE' } }),
    prisma.certificate.count({ where: { userId: user.id } }),
    prisma.test.count({
      where: {
        module: { course: { enrollments: { some: { userId: user.id } } } },
        attempts: { none: { userId: user.id } },
      },
    }),
  ])

  const notifications: ShellNotification[] = []
  if (activeCourses > 0) {
    notifications.push({
      title: `${activeCourses} course${activeCourses > 1 ? 's' : ''} in progress`,
      body: 'Pick up from your last lesson and keep your streak going.',
      href: '/dashboard/learn',
    })
  }
  if (pendingTests > 0) {
    notifications.push({
      title: `${pendingTests} test${pendingTests > 1 ? 's' : ''} not attempted`,
      body: 'Module quizzes are open — attempt them any time.',
      href: '/dashboard/tests',
    })
  }
  if (certificates > 0) {
    notifications.push({
      title: `${certificates} certificate${certificates > 1 ? 's' : ''} issued`,
      body: 'Download, print or share the verification link.',
      href: '/dashboard/certificates',
    })
  }

  return (
    <DashboardShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  )
}
