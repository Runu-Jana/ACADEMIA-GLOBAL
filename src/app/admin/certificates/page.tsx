import type { Metadata } from 'next'
import { Award, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { CertificateRevoke } from '@/components/admin/certificate-revoke'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Certificates' }
export const dynamic = 'force-dynamic'

export default async function AdminCertificatesPage() {
  await requireAdmin()

  const [certificates, revokedCount] = await Promise.all([
    prisma.certificate.findMany({
      orderBy: { issuedAt: 'desc' },
      take: 300,
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    }),
    prisma.certificate.count({ where: { revoked: true } }),
  ])

  return (
    <>
      <PageHeader
        title="Certificates"
        sub="Every certificate issued on the platform. Revoke one to make its serial fail public verification (e.g. issued in error or on a disputed result); restore it any time."
      />

      {revokedCount > 0 && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <ShieldCheck className="h-4 w-4" />
          {revokedCount} certificate{revokedCount === 1 ? '' : 's'} currently revoked
        </div>
      )}

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Holder</Th>
              <Th>Course</Th>
              <Th>Serial</Th>
              <Th>Grade</Th>
              <Th>Status</Th>
              <Th>Issued</Th>
              <Th className="text-right">Action</Th>
            </Thead>
            <Tbody>
              {certificates.length === 0 && (
                <TableEmpty colSpan={7}>
                  <span className="inline-flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    No certificates issued yet.
                  </span>
                </TableEmpty>
              )}

              {certificates.map((c) => (
                <tr key={c.id} className="align-top transition-colors hover:bg-muted/40">
                  <Td className="max-w-[13rem]">
                    <span className="block truncate font-semibold">{c.user.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{c.user.email}</span>
                  </Td>
                  <Td className="max-w-[14rem] truncate text-muted-foreground">{c.course.title}</Td>
                  <Td className="font-mono text-[11.5px] text-muted-foreground">{c.serial}</Td>
                  <Td className="font-bold">{c.grade}</Td>
                  <Td>
                    {c.revoked ? (
                      <Badge tone="danger">Revoked</Badge>
                    ) : (
                      <Badge tone="success">Valid</Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDate(c.issuedAt)}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <CertificateRevoke id={c.id} revoked={c.revoked} />
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </DataTable>
        </TableWrap>
      </div>
    </>
  )
}
