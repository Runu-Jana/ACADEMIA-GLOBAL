import { headers } from 'next/headers'
import QRCode from 'qrcode'
import { Award } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { EmptyState, PanelHeading } from '@/components/dashboard/primitives'
import { CertificateList, type CertificateItem } from '@/components/dashboard/certificate-list'

export const metadata = { title: 'Certificates' }

/** Keeps the printed sheet to the certificate itself. */
const printCss = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  .ag-cert { break-inside: avoid; page-break-inside: avoid; }
  .ag-cert + .ag-cert { break-before: page; page-break-before: always; }
}
`

export default async function CertificatesPage() {
  const user = await requireUser('/dashboard/certificates')

  const certificates = await prisma.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: 'desc' },
    select: {
      id: true,
      serial: true,
      grade: true,
      issuedAt: true,
      user: { select: { name: true } },
      course: {
        select: {
          title: true,
          level: true,
          university: { select: { name: true, shortName: true } },
        },
      },
      enrollment: { select: { completedAt: true } },
    },
  })

  // Absolute base URL so a QR scanned from a printed certificate resolves.
  // NEXT_PUBLIC_SITE_URL wins in production; otherwise derive from the request.
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? `${proto}://${host}`

  const items: CertificateItem[] = await Promise.all(
    certificates.map(async (c) => {
      const verifyUrl = `${base}/verify?serial=${encodeURIComponent(c.serial)}`
      const qrSvg = await QRCode.toString(verifyUrl, {
        type: 'svg',
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f1729', light: '#ffffff' },
      })
      return {
        id: c.id,
        serial: c.serial,
        grade: c.grade,
        issuedAt: c.issuedAt.toISOString(),
        studentName: c.user.name,
        courseTitle: c.course.title,
        courseLevel: c.course.level,
        universityName: c.course.university.name,
        universityShortName: c.course.university.shortName,
        completedAt: c.enrollment.completedAt?.toISOString() ?? null,
        verifyUrl,
        qrSvg,
      }
    }),
  )

  if (!items.length) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={Award}
          title="No certificates yet"
          body="Finish every lesson and pass the course assessments — your certificate is then issued automatically, with a verifiable serial number and QR code you can share with employers."
          actionHref="/dashboard/learn"
          actionLabel="Continue Learning"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      <div className="print:hidden">
        <PanelHeading
          title="My Certificates"
          sub={`${items.length} certificate${items.length === 1 ? '' : 's'} issued. Print, save as PDF or share the verification link.`}
        />
      </div>

      <CertificateList certificates={items} />
    </div>
  )
}
