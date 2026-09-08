import type { Metadata } from 'next'
import { Sparkles, Coins, Activity, CalendarDays, Timer } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty } from '@/components/admin/admin-ui'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'AI Usage' }
export const dynamic = 'force-dynamic'

/** paise → "₹1,234.56" */
function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const FEATURE_LABELS: Record<string, string> = {
  tutor: 'Course Tutor', chatbot: 'Chatbot', resume: 'Resume', sop: 'SOP',
  career: 'Career Paths', interview: 'Interview Prep', roadmap: 'Skill Roadmap',
  notes: 'Ingest / Notes', embed: 'Embeddings', assessment: 'Assessment Generator',
}

export default async function AdminAiUsagePage() {
  await requireAdmin()

  const monthAgo = new Date(Date.now() - 30 * 86_400_000)

  const [allTime, month, byFeature, recent] = await Promise.all([
    prisma.aiUsageLog.aggregate({ _sum: { costPaise: true, inputTokens: true, outputTokens: true }, _avg: { latencyMs: true }, _count: true }),
    prisma.aiUsageLog.aggregate({ where: { createdAt: { gte: monthAgo } }, _sum: { costPaise: true }, _count: true }),
    prisma.aiUsageLog.groupBy({
      by: ['feature'],
      _sum: { costPaise: true, inputTokens: true, outputTokens: true },
      _count: true,
    }),
    prisma.aiUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true, feature: true, model: true, provider: true, userId: true,
        inputTokens: true, outputTokens: true, costPaise: true, latencyMs: true, createdAt: true,
      },
    }),
  ])

  // userId is a soft reference (no relation), so resolve names in one extra query.
  const userIds = [...new Set(recent.map((r) => r.userId).filter((v): v is string => Boolean(v)))]
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : []
  const nameById = new Map(users.map((u) => [u.id, u.name]))

  const features = [...byFeature].sort((a, b) => (b._sum.costPaise ?? 0) - (a._sum.costPaise ?? 0))
  const label = (f: string) => FEATURE_LABELS[f] ?? f

  const tiles = [
    { label: 'Total AI spend', value: rupees(allTime._sum.costPaise ?? 0), icon: Coins, tone: 'text-emerald-600' },
    { label: 'Spend (30 days)', value: rupees(month._sum.costPaise ?? 0), icon: CalendarDays, tone: 'text-primary-600' },
    { label: 'Total calls', value: allTime._count.toLocaleString('en-IN'), icon: Activity, tone: 'text-violet-600' },
    { label: 'Avg latency', value: `${Math.round(allTime._avg.latencyMs ?? 0)} ms`, icon: Timer, tone: 'text-cyan-600' },
  ]

  return (
    <>
      <PageHeader
        title="AI Usage"
        sub="Every AI call is metered — this is what the tutor, career tools and ingest features actually cost, so spend is attributable and never invisible."
      />

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card-base holo-ring p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t.label}</p>
              <t.icon className={`h-4 w-4 ${t.tone}`} />
            </div>
            <p className="mt-2 text-xl font-extrabold tracking-tight">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------ by feature */}
        <div className="card-base overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-[13px] font-bold">
              <Sparkles className="h-4 w-4 text-primary-500" />
              Spend by feature
            </h2>
          </div>
          <TableWrap>
            <DataTable>
              <Thead>
                <Th>Feature</Th>
                <Th>Calls</Th>
                <Th>Tokens</Th>
                <Th className="text-right">Cost</Th>
              </Thead>
              <Tbody>
                {features.length === 0 && <TableEmpty colSpan={4}>No AI calls recorded yet.</TableEmpty>}
                {features.map((f) => (
                  <tr key={f.feature} className="transition-colors hover:bg-muted/40">
                    <Td className="font-semibold">{label(f.feature)}</Td>
                    <Td className="text-muted-foreground">{f._count.toLocaleString('en-IN')}</Td>
                    <Td className="text-muted-foreground">
                      {((f._sum.inputTokens ?? 0) + (f._sum.outputTokens ?? 0)).toLocaleString('en-IN')}
                    </Td>
                    <Td className="text-right font-semibold tabular-nums">{rupees(f._sum.costPaise ?? 0)}</Td>
                  </tr>
                ))}
              </Tbody>
            </DataTable>
          </TableWrap>
        </div>

        {/* -------------------------------------------------- recent */}
        <div className="card-base overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[13px] font-bold">Recent calls</h2>
          </div>
          <TableWrap>
            <DataTable>
              <Thead>
                <Th>Feature</Th>
                <Th>Model</Th>
                <Th>Cost</Th>
                <Th className="text-right">When</Th>
              </Thead>
              <Tbody>
                {recent.length === 0 && <TableEmpty colSpan={4}>Nothing yet.</TableEmpty>}
                {recent.map((r) => (
                  <tr key={r.id} className="align-top transition-colors hover:bg-muted/40">
                    <Td className="font-semibold">
                      {label(r.feature)}
                      {r.userId && nameById.get(r.userId) && (
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          {nameById.get(r.userId)}
                        </span>
                      )}
                    </Td>
                    <Td className="text-[11px] text-muted-foreground">
                      {r.model}
                      <span className="block">{(r.inputTokens + r.outputTokens).toLocaleString('en-IN')} tok</span>
                    </Td>
                    <Td className="tabular-nums text-muted-foreground">{rupees(r.costPaise)}</Td>
                    <Td className="whitespace-nowrap text-right text-[11px] text-muted-foreground">{formatDate(r.createdAt)}</Td>
                  </tr>
                ))}
              </Tbody>
            </DataTable>
          </TableWrap>
        </div>
      </div>
    </>
  )
}
