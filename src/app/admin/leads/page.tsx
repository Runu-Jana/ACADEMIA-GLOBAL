import type { Metadata } from 'next'
import Link from 'next/link'
import {
  GraduationCap,
  Sparkles,
  PhoneCall,
  ArrowRight,
  FolderTree,
  Headphones,
  FileDown,
  MessageCircle,
} from 'lucide-react'
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

// How each capture channel reads in the funnel view.
const SOURCE_META: Record<string, { label: string; hint: string; icon: typeof FolderTree }> = {
  directory: { label: 'Directory listing', hint: 'Enquired from a university in the directory', icon: FolderTree },
  callback: { label: 'Callback request', hint: 'Asked us to call back', icon: PhoneCall },
  counsellor: { label: 'Sarthi live chat', hint: 'Requested a human counsellor in chat', icon: MessageCircle },
  brochure: { label: 'Brochure download', hint: 'Downloaded a course brochure', icon: FileDown },
}
const sourceMeta = (s: string) =>
  SOURCE_META[s] ?? { label: s || 'Other', hint: 'Uncategorised capture', icon: Headphones }

export default async function AdminLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const status =
    typeof sp.status === 'string' && (LEAD_STATUS as readonly string[]).includes(sp.status)
      ? sp.status
      : ''
  const source = typeof sp.source === 'string' ? sp.source : ''
  const grouped = sp.view === 'source'

  const [counts, wantsAgentCount] = await Promise.all([
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lead.count({ where: { wantsAgent: true, status: { in: ['NEW', 'CONTACTED'] } } }),
  ])
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0
  const total = counts.reduce((n, c) => n + c._count._all, 0)

  const header = (
    <>
      <PageHeader
        title="Leads"
        sub="Prospects captured from directory listings and callback requests — work them toward an enrolment at a partner university."
      />

      {wantsAgentCount > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <PhoneCall className="h-4 w-4 shrink-0" />
          {wantsAgentCount} prospect{wantsAgentCount === 1 ? '' : 's'} asked Sarthi for a live counsellor — call them back.
        </div>
      )}

      {/* List ↔ funnel toggle */}
      <div className="mb-3 inline-flex rounded-xl border border-border bg-muted/50 p-0.5">
        <Link
          href={status ? `/admin/leads?status=${status}` : '/admin/leads'}
          aria-pressed={!grouped}
          className={
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors ' +
            (!grouped ? 'bg-card text-primary-700 shadow-soft dark:text-primary-300' : 'text-muted-foreground hover:text-foreground')
          }
        >
          <PhoneCall className="h-3.5 w-3.5" />
          List
        </Link>
        <Link
          href="/admin/leads?view=source"
          aria-pressed={grouped}
          className={
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors ' +
            (grouped ? 'bg-card text-primary-700 shadow-soft dark:text-primary-300' : 'text-muted-foreground hover:text-foreground')
          }
        >
          <FolderTree className="h-3.5 w-3.5" />
          Group by source
        </Link>
      </div>
    </>
  )

  // ------------------------------------------------------- grouped by source
  if (grouped) {
    const [bySource, bySourceStatus, bySourceAgent] = await Promise.all([
      prisma.lead.groupBy({ by: ['source'], _count: { _all: true } }),
      prisma.lead.groupBy({ by: ['source', 'status'], _count: { _all: true } }),
      prisma.lead.groupBy({ by: ['source'], where: { wantsAgent: true }, _count: { _all: true } }),
    ])

    const statusBySource = new Map<string, Record<string, number>>()
    for (const g of bySourceStatus) {
      const m = statusBySource.get(g.source) ?? {}
      m[g.status] = g._count._all
      statusBySource.set(g.source, m)
    }
    const agentBySource = new Map(bySourceAgent.map((g) => [g.source, g._count._all]))

    const groups = bySource
      .map((g) => ({
        source: g.source,
        total: g._count._all,
        wantsAgent: agentBySource.get(g.source) ?? 0,
        statuses: statusBySource.get(g.source) ?? {},
      }))
      .sort((a, b) => b.total - a.total)

    return (
      <>
        {header}

        <div className="card-base overflow-hidden">
          <TableWrap>
            <DataTable>
              <Thead>
                <Th>Source</Th>
                <Th>Leads</Th>
                <Th>Pipeline</Th>
                <Th>Wants call</Th>
                <Th className="text-right">View</Th>
              </Thead>
              <Tbody>
                {groups.length === 0 && <TableEmpty colSpan={5}>No leads captured yet.</TableEmpty>}
                {groups.map((g) => {
                  const meta = sourceMeta(g.source)
                  const Icon = meta.icon
                  return (
                    <tr key={g.source} className="align-top transition-colors hover:bg-muted/40">
                      <Td className="max-w-[18rem]">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-fade text-white">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          {meta.label}
                        </span>
                        <span className="mt-0.5 block pl-9 text-[11px] text-muted-foreground">{meta.hint}</span>
                      </Td>
                      <Td>
                        <span className="text-[15px] font-bold tabular-nums">{g.total}</span>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          {LEAD_STATUS.filter((s) => g.statuses[s]).map((s) => (
                            <span key={s} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              {g.statuses[s]} {s.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </Td>
                      <Td>
                        {g.wantsAgent > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            <PhoneCall className="h-3 w-3" />
                            {g.wantsAgent}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/70">—</span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex justify-end">
                          <Link
                            href={`/admin/leads?source=${encodeURIComponent(g.source)}`}
                            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-600 hover:underline"
                          >
                            Open
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
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

  // -------------------------------------------------------------- list view
  const leads = await prisma.lead.findMany({
    where: {
      ...(status && { status }),
      ...(source && { source }),
    },
    // Prospects waiting on a live counsellor float to the top of the queue.
    orderBy: [{ wantsAgent: 'desc' }, { createdAt: 'desc' }],
    include: {
      notes: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { notes: true } },
    },
  })

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
      {header}

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <StatusChip
          href={source ? `/admin/leads?source=${encodeURIComponent(source)}` : '/admin/leads'}
          label="All"
          count={total}
          active={!status}
        />
        {LEAD_STATUS.map((s) => (
          <StatusChip
            key={s}
            href={`/admin/leads?status=${s}${source ? `&source=${encodeURIComponent(source)}` : ''}`}
            label={s.toLowerCase()}
            count={countFor(s)}
            active={status === s}
          />
        ))}
      </div>

      {source && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-[12px] font-semibold text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300">
          <FolderTree className="h-3.5 w-3.5" />
          Source: {sourceMeta(source).label}
          <Link href={status ? `/admin/leads?status=${status}` : '/admin/leads'} className="text-muted-foreground hover:text-primary-700 hover:underline">
            clear
          </Link>
        </div>
      )}

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
