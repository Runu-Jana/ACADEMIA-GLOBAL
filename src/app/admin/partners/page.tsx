import type { Metadata } from 'next'
import { ExternalLink, Inbox } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import {
  PageHeader,
  TableWrap,
  DataTable,
  Thead,
  Tbody,
  Th,
  Td,
  TableEmpty,
  StatusBadge,
} from '@/components/admin/admin-ui'
import { PartnerReviewControl } from '@/components/admin/partner-review'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Partner Requests' }
export const dynamic = 'force-dynamic'

export default async function AdminPartnersPage() {
  await requireAdmin()

  const applications = await prisma.partnerApplication.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // Pending requests float to the top — they're the ones needing a decision.
  const rank = (s: string) => (s === 'PENDING' ? 0 : 1)
  applications.sort((a, b) => rank(a.status) - rank(b.status))

  const pending = applications.filter((a) => a.status === 'PENDING').length

  return (
    <>
      <PageHeader
        title="Partner Requests"
        sub="Institutions applying to list their programmes. Approving one creates its university profile and activates its partner login."
      />

      {pending > 0 && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-[12.5px] font-semibold text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200">
          <Inbox className="h-4 w-4" />
          {pending} request{pending === 1 ? '' : 's'} awaiting your review
        </div>
      )}

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Institution</Th>
              <Th>Contact</Th>
              <Th>Location</Th>
              <Th>Applied</Th>
              <Th>Status</Th>
              <Th className="text-right">Decision</Th>
            </Thead>
            <Tbody>
              {applications.length === 0 && (
                <TableEmpty colSpan={6}>No partner requests yet.</TableEmpty>
              )}

              {applications.map((a) => (
                <tr key={a.id} className="align-top transition-colors hover:bg-muted/40">
                  <Td className="max-w-[18rem]">
                    <span className="block font-semibold">{a.universityName}</span>
                    {a.website && (
                      <a
                        href={a.website.startsWith('http') ? a.website : `https://${a.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {a.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {a.message && (
                      <span className="mt-1 line-clamp-2 block max-w-[17rem] text-[11.5px] text-muted-foreground">
                        “{a.message}”
                      </span>
                    )}
                  </Td>
                  <Td className="max-w-[13rem]">
                    <span className="block truncate font-medium">{a.contactName}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {a.contactEmail}
                    </span>
                    {a.contactPhone && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {a.contactPhone}
                      </span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {[a.city, a.state].filter(Boolean).join(', ') || '—'}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(a.createdAt)}</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                    {a.status === 'REJECTED' && a.reviewNote && (
                      <span className="mt-1 block max-w-[12rem] text-[11px] text-muted-foreground">
                        {a.reviewNote}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {a.status === 'PENDING' ? (
                      <PartnerReviewControl applicationId={a.id} name={a.universityName} />
                    ) : (
                      <span className="block text-right text-[11px] text-muted-foreground">
                        {a.reviewedAt ? formatDate(a.reviewedAt) : '—'}
                      </span>
                    )}
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
