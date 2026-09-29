import { prisma } from '@/lib/prisma'

/**
 * Seller identity printed on GST invoices.
 *
 * These are legal identifiers, so they come from environment variables — set
 * them in production. Nothing here is invented: an unset GSTIN/PAN simply omits
 * that line rather than showing a placeholder. Update the env vars (or these
 * fallbacks) with your registered details before issuing invoices for real.
 */
export const SELLER = {
  legalName: process.env.COMPANY_LEGAL_NAME || 'Shiksha Sarthi',
  // Pipe-separated so a multi-line address can live in one env var.
  addressLines: (process.env.COMPANY_ADDRESS || 'Chandigarh, India').split('|').map((s) => s.trim()),
  gstin: (process.env.COMPANY_GSTIN || '').trim(),
  pan: (process.env.COMPANY_PAN || '').trim(),
  stateName: process.env.COMPANY_STATE || 'Chandigarh',
  email: process.env.COMPANY_EMAIL || 'support@shikshasarthi.in',
}

/** GST rate as a percentage. Education fees are treated as tax-inclusive. */
export const GST_RATE = Number(process.env.GST_RATE ?? 18)

export type GstBreakdown = {
  ratePct: number
  taxable: number // rupees
  cgst: number
  sgst: number
  tax: number
  total: number
}

/**
 * Splits a tax-inclusive total into taxable value + CGST/SGST.
 *
 * The fee the student paid is the gross, so we back out the tax rather than add
 * it on top — the invoice total always equals what was charged. Intra-state
 * supply → CGST + SGST, each half the rate.
 */
export function gstBreakdown(totalRupees: number, ratePct = GST_RATE): GstBreakdown {
  const r2 = (n: number) => Math.round(n * 100) / 100
  const taxable = r2(totalRupees / (1 + ratePct / 100))
  const tax = r2(totalRupees - taxable)
  const cgst = r2(tax / 2)
  const sgst = r2(tax - cgst)
  return { ratePct, taxable, cgst, sgst, tax, total: totalRupees }
}

/** Stable, human-readable invoice number derived from the order. */
export function invoiceNumber(order: { id: string; paidAt?: Date | null; createdAt: Date }) {
  const d = order.paidAt ?? order.createdAt
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  return `INV-${ym}-${order.id.slice(-6).toUpperCase()}`
}

export type InvoiceData = Awaited<ReturnType<typeof getInvoiceData>>

/**
 * Loads an order for invoicing, scoped to its owner. Returns null when the order
 * doesn't exist or belongs to someone else, so callers can 404 uniformly.
 */
export async function getInvoiceData(orderId: string, userId: string) {
  // Order has no user/course relation in the schema (scalar FKs only), so the
  // buyer and course are fetched separately.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      amount: true, // paise
      currency: true,
      status: true,
      method: true,
      gatewayPaymentId: true,
      createdAt: true,
      paidAt: true,
      userId: true,
      courseId: true,
    },
  })
  if (!order || order.userId !== userId) return null

  const [buyer, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } }),
    prisma.course.findUnique({
      where: { id: order.courseId },
      select: { title: true, university: { select: { name: true } } },
    }),
  ])
  if (!buyer || !course) return null

  const totalRupees = order.amount / 100
  return {
    order,
    buyer,
    course,
    number: invoiceNumber(order),
    totalRupees,
    gst: gstBreakdown(totalRupees),
    seller: SELLER,
    isPaid: order.status === 'PAID',
  }
}
