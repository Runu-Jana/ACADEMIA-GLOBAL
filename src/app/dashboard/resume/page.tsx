import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { PanelHeading } from '@/components/dashboard/primitives'
import { ResumeBuilder } from '@/components/dashboard/resume-builder'

export const metadata: Metadata = { title: 'AI Resume Builder' }
export const dynamic = 'force-dynamic'

export default async function ResumePage() {
  const user = await requireUser('/dashboard/resume')

  const [certCount, courseCount] = await Promise.all([
    prisma.certificate.count({ where: { userId: user.id } }),
    prisma.enrollment.count({ where: { userId: user.id } }),
  ])

  return (
    <div>
      <PanelHeading
        title="AI Resume Builder"
        sub="Turn rough notes and your Shiksha Sarthi record into a polished, ATS-friendly resume you can download as a PDF."
      />
      <ResumeBuilder
        contact={{
          name: user.name,
          email: user.email,
          phone: user.phone ?? '',
          location: [user.city, user.state].filter(Boolean).join(', '),
        }}
        certCount={certCount}
        courseCount={courseCount}
        aiConfigured={isFeatureConfigured('resume')}
      />
    </div>
  )
}
