import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, Sparkles, PhoneCall } from 'lucide-react'
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
import { LeadControl } from '@/components/admin/lead-control'
import { LEAD_STATUS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const status =
    typeof sp.status === 'string' && (LEAD_STATUS as readonly string[]).includes(sp.status)
      ? sp.status
      : ''

  const [leads, counts, wantsAgentCount] = await Promise.all([
    prisma.lead.findMany({
      where: status ? { status } : {},
      // Prospects waiting on a live counsellor float to the top of the queue.
      orderBy: [{ wantsAgent: 'desc' }, { createdAt: 'desc' }],
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { notes: true } },
      },
    }),
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lead.count({ where: { wantsAgent: true, status: { in: ['NEW', 'CONTACTED'] } } }),
  ])

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0
  const total = counts.reduce((n, c) => n + c._count._all, 0)

  // Resolve the partner universities we're steering leads toward.
  const suggestedIds = [
    ...new Set(leads.map((l) => l.suggestedUniversityId).filter((v): v is string => Boolean(v))),
  ]
  const suggested = suggestedIds.length
    ? await prisma.university.findMany({
        where: { id: { in: suggestedIds } },
        select: { id: true, name: true, slug: true },
      })
    : []
  const suggestedById = new Map(suggested.map((u) => [u.id, u]))

  return (
    <>
      <PageHeader
        title="Leads"
        sub="Prospects captured from directory listings and callback requests — work them toward an enrolment at a partner university."
      />

      {wantsAgentCount > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <PhoneCall className="h-4 w-4 shrink-0" />
          {wantsAgentCount} prospect{wantsAgentCount === 1 ? '' : 's'} asked Saarthi for a live counsellor — call them back.
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        <StatusChip href="/admin/leads" label="All" count={total} active={!status} />
        {LEAD_STATUS.map((s) => (
          <StatusChip
            key={s}
            href={`/admin/leads?status=${s}`}
            label={s.toLowerCase()}
            count={countFor(s)}
            active={status === s}
          />
        ))}
      </div>

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Prospect</Th>
              <Th>Interested in</Th>
              <Th>Steer to partner</Th>
              <Th>Status</Th>
              <Th>Latest note</Th>
              <Th className="text-right">Work it</Th>
            </Thead>
            <Tbody>
              {leads.length === 0 && (
                <TableEmpty colSpan={6}>
                  No leads yet. They appear here when a student requests help on a directory listing.
                </TableEmpty>
              )}

              {leads.map((l) => {
                const alt = l.suggestedUniversityId ? suggestedById.get(l.suggestedUniversityId) : null
                return (
                  <tr key={l.id} className="align-top transition-colors hover:bg-muted/40">
                    <Td className="max-w-[15rem]">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {l.name}
                        {l.wantsAgent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            <PhoneCall className="h-2.5 w-2.5" />
                            Wants call
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">{l.email}</span>
                      {l.phone && (
                        <a href={`tel:${l.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:underline">
                          <PhoneCall className="h-3 w-3" />
                          {l.phone}
                        </a>
                      )}
                    </Td>
                    <Td className="max-w-[15rem]">
                      {l.interestedCourseTitle ? (
                        <span className="block text-[12.5px] font-medium">{l.interestedCourseTitle}</span>
                      ) : null}
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <GraduationCap className="h-3 w-3 shrink-0" />
                        {l.interestedUniversityName ?? '—'}
                      </span>
                      {l.message && (
                        <span className="mt-1 line-clamp-2 block max-w-[14rem] text-[11px] text-muted-foreground">
                          “{l.message}”
                        </span>
                      )}
                    </Td>
                    <Td className="max-w-[12rem]">
                      {alt ? (
                        <Link
                          href={`/universities/${alt.slug}`}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary-600 hover:underline"
                        >
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span className="truncate">{alt.name}</span>
                        </Link>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No match found</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={l.status} />
                    </Td>
                    <Td className="max-w-[13rem]">
                      {l.notes[0] ? (
                        <>
                          <span className="line-clamp-2 block text-[11.5px] text-muted-foreground">
                            {l.notes[0].body}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                            {l._count.notes} note{l._count.notes === 1 ? '' : 's'} ·{' '}
                            {formatDate(l.createdAt)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/70">
                          {formatDate(l.createdAt)}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <LeadControl leadId={l.id} status={l.status} />
                    </Td>
                  </tr>
                )
              })}
            </Tbody>
          </DataTable>
        </TableWrap>
      </div>
    </>
  )
}

function StatusChip({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-50 px-3 py-1.5 text-[12px] font-bold capitalize text-primary-700 dark:border-primary-500/40 dark:bg-primary-500/15 dark:text-primary-200'
          : 'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold capitalize text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600'
      }
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </Link>
  )
}
