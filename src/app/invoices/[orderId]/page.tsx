import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getInvoiceData } from '@/lib/invoice'
import { PrintInvoiceButton } from '@/components/invoice/print-button'

export const dynamic = 'force-dynamic'

const inr2 = (rupees: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(rupees)

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)

export default async function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/invoices/${orderId}`)

  const data = await getInvoiceData(orderId, user.id)
  if (!data) notFound()

  const { order, buyer, course, number, gst, seller, isPaid } = data
  const issued = order.paidAt ?? order.createdAt

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 print:bg-white print:p-0">
      <style>{`@media print { .no-print{display:none!important} @page{size:A4 portrait;margin:14mm} }`}</style>
      {/* action bar — hidden when printing */}
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3">
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Payments &amp; invoices
        </Link>
        <PrintInvoiceButton label="Download / Print" />
      </div>

      {/* the invoice sheet */}
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none sm:p-10">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight">{seller.legalName}</p>
            {seller.addressLines.map((l) => (
              <p key={l} className="text-[12.5px] text-muted-foreground">{l}</p>
            ))}
            {seller.gstin && <p className="mt-1 text-[12.5px] text-muted-foreground">GSTIN: {seller.gstin}</p>}
            {seller.pan && <p className="text-[12.5px] text-muted-foreground">PAN: {seller.pan}</p>}
            <p className="text-[12.5px] text-muted-foreground">{seller.email}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold tracking-tight">TAX INVOICE</p>
            <p className="mt-1 text-[13px] font-semibold">{number}</p>
            <p className="text-[12.5px] text-muted-foreground">Date: {fmtDate(issued)}</p>
            <span
              className={
                'mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ' +
                (isPaid
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300')
              }
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* bill-to + payment */}
        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Billed to</p>
            <p className="mt-1 text-sm font-bold">{buyer.name}</p>
            <p className="text-[12.5px] text-muted-foreground">{buyer.email}</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Place of supply: {seller.stateName}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payment</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Method: <span className="font-semibold text-foreground">{order.method ?? 'Online'}</span>
            </p>
            {order.gatewayPaymentId && (
              <p className="text-[12.5px] text-muted-foreground">
                Reference: <span className="font-mono text-foreground">{order.gatewayPaymentId}</span>
              </p>
            )}
            {order.paidAt && (
              <p className="text-[12.5px] text-muted-foreground">Paid on: {fmtDate(order.paidAt)}</p>
            )}
          </div>
        </div>

        {/* line items */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 font-bold">Description</th>
              <th className="py-2.5 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3">
                <p className="font-semibold">{course.title}</p>
                <p className="text-[12.5px] text-muted-foreground">
                  {course.university.name} · Year 1 programme fee
                </p>
              </td>
              <td className="py-3 text-right font-semibold">{inr2(gst.taxable)}</td>
            </tr>
          </tbody>
        </table>

        {/* totals */}
        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <Row label="Taxable value" value={inr2(gst.taxable)} />
            <Row label={`CGST @ ${gst.ratePct / 2}%`} value={inr2(gst.cgst)} />
            <Row label={`SGST @ ${gst.ratePct / 2}%`} value={inr2(gst.sgst)} />
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
              <dt className="font-display text-base font-extrabold">Total paid</dt>
              <dd className="font-display text-base font-extrabold">{inr2(gst.total)}</dd>
            </div>
          </dl>
        </div>

        {/* footer */}
        <div className="mt-8 border-t border-border pt-5 text-[11.5px] leading-relaxed text-muted-foreground">
          <p>
            Amounts are inclusive of GST at {gst.ratePct}% (CGST {gst.ratePct / 2}% + SGST {gst.ratePct / 2}%).
            This is a computer-generated invoice and does not require a signature.
          </p>
          {!seller.gstin && (
            <p className="no-print mt-2 text-amber-600 dark:text-amber-400">
              Note: set COMPANY_GSTIN (and COMPANY_PAN / COMPANY_ADDRESS) in your environment to print your
              registered GST details on this invoice.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
