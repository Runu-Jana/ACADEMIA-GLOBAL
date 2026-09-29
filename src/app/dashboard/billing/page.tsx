import Link from 'next/link'
import { Receipt, FileText } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { formatINR } from '@/lib/utils'
import { invoiceNumber } from '@/lib/invoice'
import { EmptyState, PanelHeading } from '@/components/dashboard/primitives'

export const metadata = { title: 'Payments & invoices' }
export const dynamic = 'force-dynamic'

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)

const STATUS_STYLE: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  REFUNDED: 'bg-slate-200 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
}

export default async function BillingPage() {
  const user = await requireUser('/dashboard/billing')

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      paidAt: true,
      courseId: true,
    },
  })

  // Order has no course relation, so resolve titles in one batched query.
  const courses = await prisma.course.findMany({
    where: { id: { in: orders.map((o) => o.courseId) } },
    select: { id: true, title: true, university: { select: { name: true } } },
  })
  const courseById = new Map(courses.map((c) => [c.id, c]))

  return (
    <div className="mx-auto max-w-4xl">
      <PanelHeading
        title="Payments & invoices"
        sub="Your enrolment payments and downloadable GST invoices."
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments yet"
          body="When you enrol in a paid programme, your payment and invoice will appear here."
          actionHref="/courses"
          actionLabel="Browse programmes"
        />
      ) : (
        <div className="card-base divide-y divide-border overflow-hidden">
          {orders.map((o) => {
            const paid = o.status === 'PAID'
            const course = courseById.get(o.courseId)
            return (
              <div key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{course?.title ?? 'Programme'}</p>
                  <p className="truncate text-[12.5px] text-muted-foreground">
                    {course?.university.name ?? '—'} · {fmtDate(o.paidAt ?? o.createdAt)} · {invoiceNumber(o)}
                  </p>
                </div>
                <p className="font-display text-sm font-extrabold">{formatINR(o.amount / 100)}</p>
                <span
                  className={
                    'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ' +
                    (STATUS_STYLE[o.status] ?? STATUS_STYLE.PENDING)
                  }
                >
                  {o.status}
                </span>
                {paid ? (
                  <Link
                    href={`/invoices/${o.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-muted"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Invoice
                  </Link>
                ) : (
                  <span className="w-[86px] text-right text-[12px] text-muted-foreground">—</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
