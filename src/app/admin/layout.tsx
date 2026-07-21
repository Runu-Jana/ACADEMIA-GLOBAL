import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata: Metadata = {
  title: 'Admin Panel',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts already gates /admin/*; this gives us the typed user record
  // and is the single source of truth for the panel's identity chrome.
  const user = await requireAdmin()

  return (
    <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>
  )
}
