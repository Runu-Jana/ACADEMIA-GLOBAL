import { prisma } from './prisma'
import { sendEmail } from './email'
import { enrolmentEmail } from './emails'

/**
 * Marketplace money.
 *
 * A student pays us for a course. If that course belongs to a partner
 * university, the university owes us commission. This module is the only place
 * that decides how much and when — so the rules live in one auditable file
 * rather than scattered through route handlers.
 *
 * UNITS: course fees are stored in RUPEES (`Course.feePerYear`), but orders are
 * stored in PAISE because that's what payment gateways transact in. Every
 * crossing goes through `toPaise` / `toRupees` — never multiply inline.
 */

export const toPaise = (rupees: number) => Math.round(rupees * 100)
export const toRupees = (paise: number) => paise / 100

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type CommissionStatus = 'PENDING' | 'CLAIMABLE' | 'INVOICED' | 'PAID' | 'VOID'

/**
 * Opens an order for a course the student intends to buy.
 * Idempotent per (user, course) while an order is still PENDING, so a student
 * hammering "Pay now" doesn't spawn duplicates.
 */
export async function openOrder(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, feePerYear: true, source: true },
  })
  if (!course) throw new Error('Course not found')

  const pending = await prisma.order.findFirst({
    where: { userId, courseId, status: 'PENDING' },
  })
  if (pending) return pending

  return prisma.order.create({
    data: {
      userId,
      courseId,
      amount: toPaise(course.feePerYear),
      status: 'PENDING',
    },
  })
}

/**
 * Confirms payment and books the commission we're owed.
 *
 * Called by the payment webhook — NOT by the browser. A client-side "payment
 * succeeded" callback is a claim, not a fact; only the gateway's signed webhook
 * may move an order to PAID.
 *
 * Commission is booked only when ALL of these hold:
 *   - the course came from a partner (source = UNIVERSITY)
 *   - that partner is ACTIVE (we don't bill someone still in negotiation)
 *   - a rate has actually been agreed (commissionPct > 0)
 * Our own PLATFORM programmes book nothing — that revenue is already 100% ours.
 */
export async function markOrderPaid(orderId: string, gatewayPaymentId?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('Order not found')

  // Webhooks retry. Re-confirming an already-paid order must be a no-op, not a
  // second commission row.
  if (order.status === 'PAID') {
    return { order, commission: await prisma.commission.findUnique({ where: { orderId } }) }
  }

  const course = await prisma.course.findUnique({
    where: { id: order.courseId },
    select: {
      id: true,
      title: true,
      source: true,
      feePerYear: true,
      university: {
        select: { id: true, name: true, partnerStatus: true, commissionPct: true, cooloffDays: true },
      },
    },
  })
  if (!course) throw new Error('Course not found')

  const paidAt = new Date()

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PAID', paidAt, gatewayPaymentId: gatewayPaymentId ?? null },
  })

  // Enrol on payment — this is the moment access is earned.
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
    update: {},
    create: { userId: order.userId, courseId: order.courseId, status: 'ACTIVE' },
  })

  // Confirmation + receipt to the student. This runs once (the already-PAID
  // guard above means retries/webhook re-confirms won't re-send). Best-effort:
  // sendEmail no-ops without RESEND_API_KEY and never throws.
  const student = await prisma.user.findUnique({
    where: { id: order.userId },
    select: { name: true, email: true },
  })
  if (student) {
    await sendEmail(
      student.email,
      enrolmentEmail({
        name: student.name,
        courseTitle: course.title,
        universityName: course.university.name,
        amountRupees: toRupees(order.amount),
        paymentId: gatewayPaymentId,
      }),
    )
  }

  const uni = course.university
  const eligible =
    course.source === 'UNIVERSITY' && uni.partnerStatus === 'ACTIVE' && uni.commissionPct > 0

  if (!eligible) return { order: updated, commission: null }

  const claimableAt = new Date(paidAt)
  claimableAt.setDate(claimableAt.getDate() + uni.cooloffDays)

  const commission = await prisma.commission.create({
    data: {
      universityId: uni.id,
      orderId: updated.id,
      // Snapshot both the fee and the rate. If the partner renegotiates next
      // quarter, already-earned commission must not silently change value.
      courseFee: course.feePerYear,
      commissionPct: uni.commissionPct,
      amount: Math.round(toPaise(course.feePerYear) * (uni.commissionPct / 100)),
      status: 'PENDING',
      claimableAt,
    },
  })

  return { order: updated, commission }
}

/**
 * Student refunded. Voids any commission not yet invoiced.
 *
 * If it was already invoiced or paid we leave it alone and flag it — clawing
 * money back from a partner mid-invoice is a relationship problem, not
 * something to automate silently.
 */
export async function refundOrder(orderId: string) {
  const commission = await prisma.commission.findUnique({ where: { orderId } })

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'REFUNDED', refundedAt: new Date() },
  })

  if (!commission) return { voided: false, needsManualReview: false }

  if (commission.status === 'PENDING' || commission.status === 'CLAIMABLE') {
    await prisma.commission.update({ where: { id: commission.id }, data: { status: 'VOID' } })
    return { voided: true, needsManualReview: false }
  }

  return { voided: false, needsManualReview: true }
}

/**
 * Promotes commissions past their cool-off window to CLAIMABLE.
 * Run on a schedule (daily is plenty).
 */
export async function promoteClaimable(now = new Date()) {
  const { count } = await prisma.commission.updateMany({
    where: { status: 'PENDING', claimableAt: { lte: now } },
    data: { status: 'CLAIMABLE' },
  })
  return { promoted: count }
}

/**
 * Batches every claimable commission for one university into a draft invoice.
 * Nothing is sent here — a human reviews the draft before it goes out.
 */
export async function draftPayout(universityId: string, periodStart: Date, periodEnd: Date) {
  const claimable = await prisma.commission.findMany({
    where: {
      universityId,
      status: 'CLAIMABLE',
      payoutId: null,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true, amount: true },
  })

  if (!claimable.length) return null

  const totalAmount = claimable.reduce((sum, c) => sum + c.amount, 0)

  const payout = await prisma.payout.create({
    data: { universityId, periodStart, periodEnd, totalAmount, status: 'DRAFT' },
  })

  await prisma.commission.updateMany({
    where: { id: { in: claimable.map((c) => c.id) } },
    data: { payoutId: payout.id, status: 'INVOICED' },
  })

  return { payout, count: claimable.length, totalAmount }
}

/** Revenue snapshot for the admin dashboard. */
export async function commissionSummary() {
  const [pending, claimable, invoiced, paid] = await Promise.all(
    (['PENDING', 'CLAIMABLE', 'INVOICED', 'PAID'] as const).map((status) =>
      prisma.commission.aggregate({ where: { status }, _sum: { amount: true }, _count: true }),
    ),
  )

  const box = (a: { _sum: { amount: number | null }; _count: number }) => ({
    amount: a._sum.amount ?? 0,
    count: a._count,
  })

  return {
    pending: box(pending),
    claimable: box(claimable),
    invoiced: box(invoiced),
    paid: box(paid),
    /** Everything booked and not voided — what the business has actually earned. */
    lifetimeEarned:
      (pending._sum.amount ?? 0) +
      (claimable._sum.amount ?? 0) +
      (invoiced._sum.amount ?? 0) +
      (paid._sum.amount ?? 0),
  }
}

// --------------------------------------------------------------- settlements

export interface PartnerLedger {
  universityId: string
  name: string
  shortName: string
  commissionPct: number
  pending: number
  claimable: number
  invoiced: number
  paid: number
  void: number
}

/**
 * Per-partner receivables: how much each university's commissions add up to in
 * each state. Drives the settlement table — pending is accruing, claimable is
 * ready to invoice, invoiced is out the door, paid is collected.
 */
export async function partnerLedgers(): Promise<PartnerLedger[]> {
  const grouped = await prisma.commission.groupBy({
    by: ['universityId', 'status'],
    _sum: { amount: true },
  })
  if (!grouped.length) return []

  const ids = [...new Set(grouped.map((g) => g.universityId))]
  const unis = await prisma.university.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, shortName: true, commissionPct: true },
  })
  const byId = new Map(unis.map((u) => [u.id, u]))

  const ledgers = new Map<string, PartnerLedger>()
  for (const g of grouped) {
    const uni = byId.get(g.universityId)
    if (!uni) continue
    const led =
      ledgers.get(g.universityId) ??
      ({
        universityId: uni.id,
        name: uni.name,
        shortName: uni.shortName,
        commissionPct: uni.commissionPct,
        pending: 0,
        claimable: 0,
        invoiced: 0,
        paid: 0,
        void: 0,
      } satisfies PartnerLedger)

    const amount = g._sum.amount ?? 0
    if (g.status === 'PENDING') led.pending += amount
    else if (g.status === 'CLAIMABLE') led.claimable += amount
    else if (g.status === 'INVOICED') led.invoiced += amount
    else if (g.status === 'PAID') led.paid += amount
    else if (g.status === 'VOID') led.void += amount

    ledgers.set(g.universityId, led)
  }

  // Biggest outstanding balance first — that's where attention should go.
  return [...ledgers.values()].sort(
    (a, b) => b.claimable + b.invoiced - (a.claimable + a.invoiced),
  )
}

/** How many PENDING commissions have cleared their cool-off and could promote. */
export async function claimableReadyCount(now = new Date()): Promise<number> {
  return prisma.commission.count({
    where: { status: 'PENDING', claimableAt: { lte: now } },
  })
}

/** Marks a payout invoiced. Its commissions are already INVOICED from drafting. */
export async function markPayoutInvoiced(payoutId: string, invoiceNo?: string) {
  return prisma.payout.update({
    where: { id: payoutId },
    data: { status: 'INVOICED', invoiceNo: invoiceNo?.trim() || null },
  })
}

/**
 * Marks a payout collected. Settles its commissions in the same transaction —
 * a paid invoice whose commissions still read INVOICED is a reconciliation bug.
 */
export async function markPayoutPaid(payoutId: string) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    select: { id: true, status: true },
  })
  if (!payout) throw new Error('Payout not found')

  const [updated] = await prisma.$transaction([
    prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'PAID', paidAt: new Date() },
    }),
    prisma.commission.updateMany({ where: { payoutId }, data: { status: 'PAID' } }),
  ])
  return updated
}

/** Flags a payout disputed for manual follow-up; leaves its commissions as-is. */
export async function disputePayout(payoutId: string) {
  return prisma.payout.update({ where: { id: payoutId }, data: { status: 'DISPUTED' } })
}
