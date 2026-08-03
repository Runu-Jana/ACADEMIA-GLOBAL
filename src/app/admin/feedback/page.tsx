import type { Metadata } from 'next'
import { Star, MessageSquare } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty } from '@/components/admin/admin-ui'
import { ReviewDelete } from '@/components/admin/review-delete'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Learner Reviews' }
export const dynamic = 'force-dynamic'

export default async function AdminFeedbackPage() {
  await requireAdmin()

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
    },
  })

  return (
    <>
      <PageHeader
        title="Learner Reviews"
        sub="Ratings and comments students left on courses. Remove anything abusive or off-topic — it disappears from the course page immediately."
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Student</Th>
              <Th>Course</Th>
              <Th>Rating</Th>
              <Th>Review</Th>
              <Th>Date</Th>
              <Th className="text-right">Moderate</Th>
            </Thead>
            <Tbody>
              {reviews.length === 0 && (
                <TableEmpty colSpan={6}>
                  <span className="inline-flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    No learner reviews yet.
                  </span>
                </TableEmpty>
              )}

              {reviews.map((r) => (
                <tr key={r.id} className="align-top transition-colors hover:bg-muted/40">
                  <Td className="font-semibold">{r.user.name}</Td>
                  <Td className="max-w-[13rem] truncate text-muted-foreground">{r.course.title}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      <Star className="h-3 w-3 fill-current" />
                      {r.rating}/5
                    </span>
                  </Td>
                  <Td className="max-w-[22rem]">
                    <span className="line-clamp-3 text-[12.5px] text-muted-foreground">{r.body}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDate(r.createdAt)}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <ReviewDelete id={r.id} />
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
