'use client'

import * as React from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Textarea, Select } from '@/components/ui/field'
import type { PromotionFormValues } from './promotion-form'

export type CampaignCopy = { banner: string; emailSubject: string; emailBody: string; rationale: string }

type Suggestion = {
  code: string
  title: string
  description: string
  type: 'PERCENT' | 'FLAT'
  value: number
  minSubtotalRupees: number | null
  maxDiscountRupees: number | null
  banner: string
  emailSubject: string
  emailBody: string
  rationale: string
}

/**
 * The AI campaign assistant. An operator describes a campaign; the assistant
 * proposes a code, discount and marketing copy, which pre-fills the form below.
 * Nothing is saved until the operator reviews and submits — AI drafts, the human
 * approves, and the deterministic engine still enforces the discount.
 */
export function PromotionAiAssist({
  onApply,
}: {
  onApply: (values: PromotionFormValues, copy: CampaignCopy) => void
}) {
  const [brief, setBrief] = React.useState('')
  const [scope, setScope] = React.useState<'SHOP' | 'COURSE' | 'ALL'>('SHOP')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function generate() {
    if (brief.trim().length < 6 || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/promotions/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, scope }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not draft the promotion.')
        setBusy(false)
        return
      }
      const s: Suggestion = data.suggestion
      const values: PromotionFormValues = {
        code: s.code,
        title: s.title,
        description: s.description,
        type: s.type,
        // The form stores FLAT amounts in paise; percentages as the number.
        value: s.type === 'FLAT' ? s.value * 100 : s.value,
        scope,
        minSubtotal: s.minSubtotalRupees != null ? s.minSubtotalRupees * 100 : null,
        maxDiscount: s.maxDiscountRupees != null ? s.maxDiscountRupees * 100 : null,
        usageLimit: null,
        perUserLimit: null,
        startsAt: null,
        endsAt: null,
        status: 'DRAFT',
      }
      onApply(values, {
        banner: s.banner,
        emailSubject: s.emailSubject,
        emailBody: s.emailBody,
        rationale: s.rationale,
      })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-base holo-ring p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-holo-sweep text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[14px] font-extrabold">Draft with AI</h3>
          <p className="text-[12px] text-muted-foreground">
            Describe the campaign — the assistant proposes a code, discount and copy. You review before saving.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <Field label="Campaign brief">
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. Diwali sale on exam books, around 15% off, this week only."
            maxLength={600}
          />
        </Field>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Applies to" className="w-44">
            <Select value={scope} onChange={(e) => setScope(e.target.value as 'SHOP' | 'COURSE' | 'ALL')}>
              <option value="SHOP">Shop products</option>
              <option value="COURSE">Course fees</option>
              <option value="ALL">Everything</option>
            </Select>
          </Field>
          <Button type="button" variant="holo" onClick={generate} loading={busy} disabled={busy || brief.trim().length < 6}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate draft
          </Button>
        </div>
        {error && (
          <p role="alert" className="flex items-start gap-2 text-[13px] font-semibold text-red-600 dark:text-red-400">
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
