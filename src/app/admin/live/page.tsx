import type { Metadata } from 'next'
import { Radio, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { LiveClassForm } from '@/components/admin/live-class-form'
import { LiveClassControls } from '@/components/admin/live-class-controls'

export const metadata: Metadata = { title: 'Live Classes' }
export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'default' | 'danger'> = {
  LIVE: 'success',
  SCHEDULED: 'warning',
  ENDED: 'default',
  CANCELLED: 'danger',
}

function whenLabel(d: Date) {
  return d.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default async function AdminLivePage() {
  await requireAdmin()

  const [courses, classes] = await Promise.all([
    prisma.course.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
    prisma.liveClass.findMany({
      orderBy: { startsAt: 'desc' },
      include: {
        course: { select: { title: true } },
        subject: { select: { title: true } },
        _count: { select: { attendance: true } },
      },
    }),
  ])

  const upcoming = classes.filter((c) => c.status === 'SCHEDULED' || c.status === 'LIVE').length

  return (
    <>
      <PageHeader
        title="Live Classes"
        sub="Schedule online sessions for a course, run them live, and publish recordings. Students see these on their dashboard once enrolled."
      />

      {upcoming > 0 && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-[12.5px] font-semibold text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200">
          <Radio className="h-4 w-4" />
          {upcoming} upcoming / live session{upcoming === 1 ? '' : 's'}
        </div>
      )}

      <div className="mb-6">
        <LiveClassForm courses={courses} />
      </div>

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Class</Th>
              <Th>When</Th>
              <Th>Provider</Th>
              <Th>Status</Th>
              <Th>Attendance</Th>
              <Th className="text-right">Manage</Th>
            </Thead>
            <Tbody>
              {classes.length === 0 && (
                <TableEmpty colSpan={6}>No live classes scheduled yet.</TableEmpty>
              )}

              {classes.map((c) => (
                <tr key={c.id} className="align-top transition-colors hover:bg-muted/40">
                  <Td className="max-w-[18rem]">
                    <span className="block font-semibold">{c.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {c.course.title}
                      {c.subject ? ` · ${c.subject.title}` : ''}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {whenLabel(c.startsAt)}
                    <span className="block text-[11px]">{c.durationMin} min</span>
                  </Td>
                  <Td className="text-muted-foreground">
                    {c.provider}
                    {c.recordingUrl && <span className="block text-[11px] text-emerald-600">recording ✓</span>}
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[c.status] ?? 'default'}>{c.status}</Badge>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {c._count.attendance}
                    </span>
                  </Td>
                  <Td>
                    <LiveClassControls id={c.id} status={c.status} recordingUrl={c.recordingUrl} />
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
