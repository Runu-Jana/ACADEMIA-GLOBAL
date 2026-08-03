import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  openOrder, markOrderPaid, refundOrder, promoteClaimable, draftPayout, markPayoutPaid, toPaise,
} from '@/lib/commission'
import { resetDb, makeScenario } from './setup/db'

beforeEach(resetDb)
afterAll(() => prisma.$disconnect())

const DAY = 86_400_000
const statusOf = async (orderId: string) =>
  (await prisma.commission.findUniqueOrThrow({ where: { orderId } })).status

describe('markOrderPaid — commission booking', () => {
  it('books commission for an ACTIVE partner and enrols the student', async () => {
    const { student, partnerCourse } = await makeScenario({ commissionPct: 15 })
    const order = await openOrder(student.id, partnerCourse.id)

    const { commission } = await markOrderPaid(order.id, 'pay_1')

    expect(commission).toBeTruthy()
    expect(commission!.amount).toBe(Math.round(toPaise(partnerCourse.feePerYear) * 0.15))
    expect(commission!.commissionPct).toBe(15)
    expect(commission!.status).toBe('PENDING')

    const enrolment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: partnerCourse.id } },
    })
    expect(enrolment).toBeTruthy()
  })

  it('is idempotent — re-confirming never double-books (webhook retries)', async () => {
    const { student, partnerCourse } = await makeScenario()
    const order = await openOrder(student.id, partnerCourse.id)
    await markOrderPaid(order.id, 'p')
    await markOrderPaid(order.id, 'p')
    await markOrderPaid(order.id, 'p')
    expect(await prisma.commission.count({ where: { orderId: order.id } })).toBe(1)
  })

  it('books nothing for a PLATFORM course (100% ours)', async () => {
    const { student, platformCourse } = await makeScenario()
    const order = await openOrder(student.id, platformCourse.id)
    expect((await markOrderPaid(order.id)).commission).toBeNull()
  })

  it('books nothing when the partner is not ACTIVE', async () => {
    const { student, partnerCourse } = await makeScenario({ partnerStatus: 'IN_TALKS' })
    const order = await openOrder(student.id, partnerCourse.id)
    expect((await markOrderPaid(order.id)).commission).toBeNull()
  })

  it('books nothing when no rate has been agreed (0%)', async () => {
    const { student, partnerCourse } = await makeScenario({ commissionPct: 0 })
    const order = await openOrder(student.id, partnerCourse.id)
    expect((await markOrderPaid(order.id)).commission).toBeNull()
  })

  it('snapshots the rate — a later renegotiation must not rewrite history', async () => {
    const { student, partner, partnerCourse } = await makeScenario({ commissionPct: 15 })
    const order = await openOrder(student.id, partnerCourse.id)
    await markOrderPaid(order.id)

    await prisma.university.update({ where: { id: partner.id }, data: { commissionPct: 5 } })

    const c = await prisma.commission.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(c.commissionPct).toBe(15)
    expect(c.amount).toBe(Math.round(toPaise(partnerCourse.feePerYear) * 0.15))
  })
})

describe('openOrder', () => {
  it('is idempotent while an order is still PENDING', async () => {
    const { student, partnerCourse } = await makeScenario()
    const a = await openOrder(student.id, partnerCourse.id)
    const b = await openOrder(student.id, partnerCourse.id)
    expect(b.id).toBe(a.id)
    expect(await prisma.order.count({ where: { userId: student.id, courseId: partnerCourse.id } })).toBe(1)
  })
})

describe('lifecycle: promote → invoice → settle', () => {
  it('promotes past cool-off, drafts a payout, and settles on payment', async () => {
    const { student, partner, partnerCourse } = await makeScenario()
    const order = await openOrder(student.id, partnerCourse.id)
    await markOrderPaid(order.id)

    // Still inside cool-off → not yet claimable.
    expect((await promoteClaimable()).promoted).toBe(0)
    expect(await statusOf(order.id)).toBe('PENDING')

    // Force cool-off elapsed, then promote.
    await prisma.commission.update({
      where: { orderId: order.id },
      data: { claimableAt: new Date(Date.now() - DAY) },
    })
    expect((await promoteClaimable()).promoted).toBe(1)
    expect(await statusOf(order.id)).toBe('CLAIMABLE')

    // Draft a payout → commission becomes INVOICED, payout is DRAFT.
    const draft = await draftPayout(partner.id, new Date(Date.now() - 7 * DAY), new Date(Date.now() + DAY))
    expect(draft?.count).toBe(1)
    expect(await statusOf(order.id)).toBe('INVOICED')

    // Mark the payout paid → its commissions settle to PAID in the same tx.
    await markPayoutPaid(draft!.payout.id)
    expect(await statusOf(order.id)).toBe('PAID')
    const payout = await prisma.payout.findUniqueOrThrow({ where: { id: draft!.payout.id } })
    expect(payout.status).toBe('PAID')
  })
})

describe('refunds', () => {
  it('voids an un-invoiced commission', async () => {
    const { student, partnerCourse } = await makeScenario()
    const order = await openOrder(student.id, partnerCourse.id)
    await markOrderPaid(order.id)

    const res = await refundOrder(order.id)
    expect(res.voided).toBe(true)
    expect(res.needsManualReview).toBe(false)
    expect(await statusOf(order.id)).toBe('VOID')
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('REFUNDED')
  })

  it('does not auto-claw an invoiced commission — flags it for a human', async () => {
    const { student, partner, partnerCourse } = await makeScenario()
    const order = await openOrder(student.id, partnerCourse.id)
    await markOrderPaid(order.id)
    await prisma.commission.update({
      where: { orderId: order.id },
      data: { claimableAt: new Date(Date.now() - DAY) },
    })
    await promoteClaimable()
    await draftPayout(partner.id, new Date(Date.now() - 7 * DAY), new Date(Date.now() + DAY))

    const res = await refundOrder(order.id)
    expect(res.voided).toBe(false)
    expect(res.needsManualReview).toBe(true)
    expect(await statusOf(order.id)).toBe('INVOICED') // untouched
  })
})
