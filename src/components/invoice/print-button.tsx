'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Triggers the browser's print dialog, from which the student can save the
 * invoice as a PDF. Print CSS on the page hides everything except the invoice.
 */
export function PrintInvoiceButton({ label }: { label: string }) {
  return (
    <Button type="button" variant="primary" onClick={() => window.print()} className="no-print">
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  )
}
