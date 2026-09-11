import { prisma } from './prisma'
import { notify } from './notifications'

/**
 * All-access membership — a fixed-term pass, not an auto-debit subscription.
 *
 * A student buys a block of months up front and renews by buying again. The
 * pass waives the per-course fee on our own PLATFORM programmes; partner-
 * university degrees stay per-course (they carry a commission per enrolment, so
 * bundling them into a flat pass would mean paying a partner for a "free" join).
 *
 * Plans are config, not rows — prices and durations change rarely and belong in
 * one reviewable place. Money is in PAISE, matching Order/ShopOrder and what the
 * gateway transacts in.
 */

export interface MembershipPlan {
  id: string
  months: number
  /** Price in paise. */
  price: number
  /** The middle, highlighted card. */
  popular?: boolean
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: 'monthly', months: 1, price: 49900 },
  { id: 'quarterly', months: 3, price: 119900, popular: true },
  { id: 'annual', months: 12, price: 349900 },
]

/** The plan every comparison is measured against (per-month savings). */
export const BASE_PLAN_ID = 'monthly'

export function getMembershipPlan(id: string): MembershipPlan | null {
  return MEMBERSHIP_PLANS.find((p) => p.id === id) ?? null
}

/** Per-month price in paise — drives the "save X%" copy on longer plans. */
export function perMonthPaise(plan: MembershipPlan): number {
  return Math.round(plan.price / plan.months)
}

/** Whole-percent saving of a plan's per-month price against the monthly plan. */
export function savingsPct(plan: MembershipPlan): number {
  const base = MEMBERSHIP_PLANS.find((p) => p.id === BASE_PLAN_ID)
  if (!base || plan.id === BASE_PLAN_ID) return 0
  const pct = 1 - perMonthPaise(plan) / perMonthPaise(base)
  return Math.max(0, Math.round(pct * 100))
}

/** Add whole months to a date (JS month-overflow is fine for a billing term). */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() + months)
  return d
}

/**
 * Which courses a membership covers. Our own platform programmes only — see the
 * model comment for why partner degrees are excluded.
 */
export function membershipCoversSource(source: string): boolean {
  return source === 'PLATFORM'
}

/**
 * The student's current pass, or null. "Active" is status ACTIVE *and* not yet
 * expired, so a lapsed pass falls out here without any cron flipping its status.
 */
export async function getActiveMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
  })
}

export async function hasActiveMembership(userId: string): Promise<boolean> {
  return Boolean(await getActiveMembership(userId))
}

/**
 * Confirms a membership payment and activates (or extends) the pass.
 *
 * Called by the signed verify endpoint and the webhook — both idempotent via the
 * already-paid guard. A renewal bought while a pass is still live stacks onto the
 * unused time rather than throwing it away.
 */
export async function markMembershipPaid(membershipId: string, gatewayPaymentId?: string) {
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } })
  if (!membership) throw new Error('Membership not found')

  // Webhook + verify can both fire for one payment; the second is a no-op.
  if (membership.status === 'ACTIVE' && membership.paidAt) return membership

  const plan = getMembershipPlan(membership.planId)
  if (!plan) throw new Error(`Unknown membership plan: ${membership.planId}`)

  const now = new Date()
  // Stack a renewal onto the latest still-valid pass (excluding this row).
  const current = await prisma.membership.findFirst({
    where: { userId: membership.userId, status: 'ACTIVE', expiresAt: { gt: now }, id: { not: membership.id } },
    orderBy: { expiresAt: 'desc' },
    select: { expiresAt: true },
  })
  const base = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now
  const expiresAt = addMonths(base, plan.months)

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: 'ACTIVE',
      paidAt: now,
      startedAt: now,
      expiresAt,
      gatewayPaymentId: gatewayPaymentId ?? null,
    },
  })

  await notify(
    membership.userId,
    {
      type: 'GENERAL',
      title: 'Your all-access membership is active',
      body: 'Enrol in any platform course at no extra cost — start from your dashboard.',
      url: '/membership',
    },
    { email: false },
  )

  return updated
}

/**
 * Enrols a member into a covered course at no charge — no Order, no commission,
 * no receipt claiming a payment that never happened. The membership's own
 * payment is the money event; this is just the access grant it unlocks.
 */
export async function grantMembershipEnrolment(userId: string, courseId: string) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  })
  if (existing) return

  await prisma.enrollment.create({ data: { userId, courseId, status: 'ACTIVE' } })

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } })
  await notify(
    userId,
    {
      type: 'ENROLMENT',
      title: `You're enrolled in ${course?.title ?? 'your course'}`,
      body: 'Included in your membership — pick up from your dashboard whenever you like.',
      url: '/dashboard/learn',
    },
    { email: false },
  )
}

/** Student refunded a membership — revoke access immediately. */
export async function refundMembership(membershipId: string) {
  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: 'REFUNDED', expiresAt: new Date() },
  })
}
