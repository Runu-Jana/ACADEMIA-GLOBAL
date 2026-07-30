import type { Metadata } from 'next'
import { Wallet, Clock, FileCheck2, Send, CheckCircle2, Building2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import {
  commissionSummary,
  claimableReadyCount,
  partnerLedgers,
  toRupees,
} from '@/lib/commission'
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
import { PromoteButton, CreatePayoutButton, PayoutStatusControl } from '@/components/admin/finance-controls'
import { cn, formatINR, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Finance' }
export const dynamic = 'force-dynamic'

const inr = (paise: number) => formatINR(toRupees(paise))

export default async function AdminFinancePage() {
  await requireAdmin()

  const [summary, ready, ledgers, payouts] = await Promise.all([
    commissionSummary(),
    claimableReadyCount(),
    partnerLedgers(),
    prisma.payout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        university: { select: { name: true, shortName: true } },
        _count: { select: { commissions: true } },
      },
    }),
  ])

  const tiles = [
    { label: 'Lifetime earned', amount: summary.lifetimeEarned, count: null, icon: Wallet, ring: 'from-primary-500/20 to-primary-600/5', tone: 'text-primary-600 dark:text-primary-300' },
    { label: 'Accruing (cool-off)', amount: summary.pending.amount, count: summary.pending.count, icon: Clock, ring: 'from-amber-500/20 to-amber-600/5', tone: 'text-amber-600 dark:text-amber-300' },
    { label: 'Ready to invoice', amount: summary.claimable.amount, count: summary.claimable.count, icon: FileCheck2, ring: 'from-cyan-500/20 to-cyan-600/5', tone: 'text-cyan-600 dark:text-cyan-300' },
    { label: 'Invoiced', amount: summary.invoiced.amount, count: summary.invoiced.count, icon: Send, ring: 'from-violet-500/20 to-violet-600/5', tone: 'text-violet-600 dark:text-violet-300' },
    { label: 'Collected', amount: summary.paid.amount, count: summary.paid.count, icon: CheckCircle2, ring: 'from-emerald-500/20 to-emerald-600/5', tone: 'text-emerald-600 dark:text-emerald-300' },
  ]

  return (
    <>
      <PageHeader
        title="Finance"
        sub="Commission owed by partner universities on the enrolments we send them — from accrual through invoice to collection."
        actions={<PromoteButton ready={ready} />}
      />

      {/* ------------------------------------------------------- summary tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((t) => {
          const Icon = t.icon
          return (
            <div key={t.label} className="card-base p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t.label}
                </p>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br', t.ring, t.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1.5 font-display text-xl font-extrabold leading-none tracking-tight tabular-nums">
                {inr(t.amount)}
              </p>
              {t.count !== null && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.count} commission{t.count === 1 ? '' : 's'}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* --------------------------------------------------- partner ledgers */}
      <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
        Partner receivables
      </h2>
      <div className="card-base mb-6 overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Partner</Th>
              <Th className="text-right">Accruing</Th>
              <Th className="text-right">Ready</Th>
              <Th className="text-right">Invoiced</Th>
              <Th className="text-right">Collected</Th>
              <Th className="text-right">Action</Th>
            </Thead>
            <Tbody>
              {ledgers.length === 0 && (
                <TableEmpty colSpan={6}>
                  No commissions booked yet. They appear here once students pay for partner courses.
                </TableEmpty>
              )}
              {ledgers.map((l) => (
                <tr key={l.universityId} className="transition-colors hover:bg-muted/40">
                  <Td className="max-w-[16rem]">
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{l.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{l.commissionPct}% commission</span>
                      </span>
                    </span>
                  </Td>
                  <Td className="text-right tabular-nums text-muted-foreground">{inr(l.pending)}</Td>
                  <Td className="text-right font-bold tabular-nums text-cyan-700 dark:text-cyan-300">{inr(l.claimable)}</Td>
                  <Td className="text-right tabular-nums text-muted-foreground">{inr(l.invoiced)}</Td>
                  <Td className="text-right tabular-nums text-emerald-700 dark:text-emerald-300">{inr(l.paid)}</Td>
                  <Td>
                    <CreatePayoutButton universityId={l.universityId} claimable={l.claimable} />
                  </Td>
                </tr>
              ))}
            </Tbody>
          </DataTable>
        </TableWrap>
      </div>

      {/* --------------------------------------------------------- payouts */}
      <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
        Payouts &amp; invoices
      </h2>
      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Partner</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-center">Lines</Th>
              <Th>Invoice #</Th>
              <Th>Raised</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
              {payouts.length === 0 && (
                <TableEmpty colSpan={7}>
                  No payouts yet. Create one from a partner&rsquo;s claimable balance above.
                </TableEmpty>
              )}
              {payouts.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-muted/40">
                  <Td className="max-w-[14rem]">
                    <span className="block truncate font-semibold">{p.university.name}</span>
                  </Td>
                  <Td className="text-right font-extrabold tabular-nums">{inr(p.totalAmount)}</Td>
                  <Td className="text-center tabular-nums text-muted-foreground">{p._count.commissions}</Td>
                  <Td className="font-mono text-[12px] text-muted-foreground">{p.invoiceNo ?? '—'}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(p.createdAt)}</Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td>
                    <PayoutStatusControl payoutId={p.id} status={p.status} />
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
