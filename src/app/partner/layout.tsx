import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requirePartner } from '@/lib/auth'
import { PartnerShell } from '@/components/partner/partner-shell'

export const metadata: Metadata = {
  title: 'Partner Portal',
  robots: { index: false, follow: false },
}

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts gates /partner/* to the PARTNER role; this resolves the typed
  // user and their institution for the portal chrome.
  const user = await requirePartner()

  const university = user.universityId
    ? await prisma.university.findUnique({
        where: { id: user.universityId },
        select: { name: true, partnerStatus: true },
      })
    : null

  const pending = !university

  return (
    <PartnerShell
      user={{ name: user.name, email: user.email }}
      universityName={university?.name ?? 'Your institution'}
      partnerStatus={university?.partnerStatus ?? 'PENDING'}
      pending={pending}
    >
      {children}
    </PartnerShell>
  )
}
