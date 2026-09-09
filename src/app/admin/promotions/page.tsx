import Link from 'next/link'
import { Plus, Ticket } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty,
} from '@/components/admin/admin-ui'
import { formatPaise } from '@/lib/shop'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  PAUSED: 'warning',
}

const SCOPE_LABEL: Record<string, string> = { SHOP: 'Shop', COURSE: 'Courses', ALL: 'Everything' }

function discountLabel(p: { type: string; value: number; maxDiscount: number | null }) {
  if (p.type === 'PERCENT') {
    return `${p.value}% off${p.maxDiscount ? ` · max ${formatPaise(p.maxDiscount)}` : ''}`
  }
  return `${formatPaise(p.value)} off`
}

export default async function AdminPromotionsPage() {
  const promotions = await prisma.promotion.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return (
    <div>
      <PageHeader
        title="Promotions"
        sub="Coupon codes and campaign discounts for the shop and course fees."
        actions={
          <Link href="/admin/promotions/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            <Plus className="h-4 w-4" />
            New promotion
          </Link>
        }
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Applies to</Th>
              <Th>Uses</Th>
              <Th>Window</Th>
              <Th>Status</Th>
            </Thead>
            <Tbody>
              {promotions.length === 0 ? (
                <TableEmpty colSpan={6}>
                  No promotions yet. Create your first coupon code to get started.
                </TableEmpty>
              ) : (
                promotions.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/40">
                    <Td>
                      <Link href={`/admin/promotions/${p.id}`} className="group flex items-center gap-2 font-bold">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                          <Ticket className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-[13px] tracking-wide group-hover:text-primary-600">{p.code}</span>
                          <span className="block truncate text-[11px] font-normal text-muted-foreground">{p.title}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap font-semibold">{discountLabel(p)}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{SCOPE_LABEL[p.scope] ?? p.scope}</Td>
                    <Td className="whitespace-nowrap tabular-nums">
                      {p.usedCount}
                      {p.usageLimit != null && <span className="text-muted-foreground"> / {p.usageLimit}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-[12px] text-muted-foreground">
                      {p.startsAt || p.endsAt ? (
                        <>
                          {p.startsAt ? formatDate(p.startsAt) : '—'} → {p.endsAt ? formatDate(p.endsAt) : '—'}
                        </>
                      ) : (
                        'Always'
                      )}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[p.status] ?? 'default'}>{p.status.toLowerCase()}</Badge>
                    </Td>
                  </tr>
                ))
              )}
            </Tbody>
          </DataTable>
        </TableWrap>
      </div>
    </div>
  )
}
