import { PrismaClient } from '@prisma/client'
import {
  openOrder, markOrderPaid, refundOrder, promoteClaimable, draftPayout, toPaise,
} from '../src/lib/commission'

const prisma = new PrismaClient()
let pass = 0
let fail = 0

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}

async function main() {
  const student = await prisma.user.findUniqueOrThrow({ where: { email: 'rahul@student.in' } })

  // An ACTIVE partner at 15%, and one still in talks.
  const partner = await prisma.university.findFirstOrThrow({ where: { slug: 'amity-university-online' } })
  await prisma.university.update({
    where: { id: partner.id },
    data: { partnerStatus: 'ACTIVE', commissionPct: 15, cooloffDays: 15 },
  })
  const prospect = await prisma.university.findFirstOrThrow({ where: { slug: 'ignou' } })
  await prisma.university.update({
    where: { id: prospect.id },
    data: { partnerStatus: 'IN_TALKS', commissionPct: 12 },
  })

  const partnerCourse = await prisma.course.findFirstOrThrow({
    where: { universityId: partner.id, source: 'UNIVERSITY' },
  })
  const prospectCourse = await prisma.course.findFirstOrThrow({ where: { universityId: prospect.id } })

  // Our own programme — 100% ours, owes nobody.
  const platformCourse = await prisma.course.findFirstOrThrow({
    where: { universityId: partner.id, NOT: { id: partnerCourse.id } },
  })
  await prisma.course.update({ where: { id: platformCourse.id }, data: { source: 'PLATFORM' } })

  const created: string[] = []
  const fresh = async (courseId: string) => {
    await prisma.enrollment.deleteMany({ where: { userId: student.id, courseId } })
    const o = await openOrder(student.id, courseId)
    created.push(o.id)
    return o
  }

  console.log('\n== commission booking ==')
  const o1 = await fresh(partnerCourse.id)
  const r1 = await markOrderPaid(o1.id, 'pay_test_1')
  check('booked for ACTIVE partner', Boolean(r1.commission), true)
  check(
    'amount = fee x 15%, in paise',
    r1.commission?.amount,
    Math.round(toPaise(partnerCourse.feePerYear) * 0.15),
  )
  check('rate snapshotted', r1.commission?.commissionPct, 15)
  check('starts PENDING (cool-off)', r1.commission?.status, 'PENDING')
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: student.id, courseId: partnerCourse.id } },
  })
  check('payment enrols the student', Boolean(enrolled), true)

  console.log('\n== webhook retry is idempotent ==')
  await markOrderPaid(o1.id, 'pay_test_1')
  await markOrderPaid(o1.id, 'pay_test_1')
  check('still exactly one commission', await prisma.commission.count({ where: { orderId: o1.id } }), 1)

  console.log('\n== cases that must book nothing ==')
  const o2 = await fresh(platformCourse.id)
  check('PLATFORM course owes no one', Boolean((await markOrderPaid(o2.id)).commission), false)
  const o3 = await fresh(prospectCourse.id)
  check('partner still IN_TALKS', Boolean((await markOrderPaid(o3.id)).commission), false)

  console.log('\n== rate change does not rewrite history ==')
  await prisma.university.update({ where: { id: partner.id }, data: { commissionPct: 5 } })
  const after = await prisma.commission.findUniqueOrThrow({ where: { orderId: o1.id } })
  check('historical rate unchanged', after.commissionPct, 15)
  await prisma.university.update({ where: { id: partner.id }, data: { commissionPct: 15 } })

  console.log('\n== cool-off then invoice ==')
  await prisma.commission.update({
    where: { orderId: o1.id },
    data: { claimableAt: new Date(Date.now() - 86400_000) },
  })
  await promoteClaimable()
  check(
    'past cool-off becomes CLAIMABLE',
    (await prisma.commission.findUniqueOrThrow({ where: { orderId: o1.id } })).status,
    'CLAIMABLE',
  )
  const payout = await draftPayout(partner.id, new Date(Date.now() - 7 * 86400_000), new Date(Date.now() + 86400_000))
  check('draft payout batches it', payout?.count, 1)
  check(
    'commission now INVOICED',
    (await prisma.commission.findUniqueOrThrow({ where: { orderId: o1.id } })).status,
    'INVOICED',
  )

  console.log('\n== refunds ==')
  const o4 = await fresh(partnerCourse.id)
  // openOrder is idempotent per pending order, so force a distinct one.
  const o4b = await prisma.order.create({
    data: { userId: student.id, courseId: partnerCourse.id, amount: toPaise(partnerCourse.feePerYear), status: 'PENDING' },
  })
  created.push(o4b.id)
  await markOrderPaid(o4b.id, 'pay_test_refund')
  const ref = await refundOrder(o4b.id)
  check('un-invoiced commission voided', ref.voided, true)
  check('no manual review needed', ref.needsManualReview, false)

  const invoicedRefund = await refundOrder(o1.id) // already INVOICED
  check('invoiced commission NOT auto-clawed', invoicedRefund.voided, false)
  check('flagged for a human instead', invoicedRefund.needsManualReview, true)

  // ---- cleanup ----
  await prisma.commission.deleteMany({ where: { orderId: { in: created } } })
  await prisma.payout.deleteMany({ where: { universityId: partner.id } })
  await prisma.order.deleteMany({ where: { id: { in: created } } })
  await prisma.enrollment.deleteMany({
    where: { userId: student.id, courseId: { in: [platformCourse.id, prospectCourse.id] } },
  })
  await prisma.course.update({ where: { id: platformCourse.id }, data: { source: 'UNIVERSITY' } })
  await prisma.university.update({
    where: { id: prospect.id },
    data: { partnerStatus: 'PROSPECT', commissionPct: 0 },
  })

  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail) process.exit(1)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
