'use client'

import Link from 'next/link'
import { Printer, ChevronLeft } from 'lucide-react'

/**
 * Sticky action bar for the brochure page. Hidden in the printed output
 * (`print:hidden`) so the PDF is just the brochure itself. "Download" is the
 * browser's own print-to-PDF, which every device has — no PDF library, and the
 * output always matches what's on screen.
 */
export function BrochureActions({ backHref, title }: { backHref: string; title: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur print:hidden">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-slate-600 transition-colors hover:text-blue-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to course
      </Link>

      <div className="flex items-center gap-2">
        <span className="hidden max-w-[40ch] truncate text-[12px] text-slate-400 sm:block">{title}</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-blue-800"
        >
          <Printer className="h-4 w-4" />
          Download PDF
        </button>
      </div>
    </div>
  )
}
