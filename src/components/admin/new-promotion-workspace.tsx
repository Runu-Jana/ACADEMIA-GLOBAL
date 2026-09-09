'use client'

import * as React from 'react'
import { Megaphone, Mail, Check, Copy } from 'lucide-react'
import { PromotionForm, type PromotionFormValues } from './promotion-form'
import { PromotionAiAssist, type CampaignCopy } from './promotion-ai-assist'

/**
 * The "new promotion" screen: the AI assistant on top, then the form. When the
 * assistant returns a draft it pre-fills the form (remounted via `key`) and
 * surfaces the marketing copy for the operator to reuse.
 */
export function NewPromotionWorkspace() {
  const [values, setValues] = React.useState<PromotionFormValues | undefined>(undefined)
  const [copy, setCopy] = React.useState<CampaignCopy | null>(null)
  const [formKey, setFormKey] = React.useState(0)

  return (
    <div className="space-y-6">
      <PromotionAiAssist
        onApply={(v, c) => {
          setValues(v)
          setCopy(c)
          setFormKey((k) => k + 1)
        }}
      />

      {copy && <CampaignCopyPanel copy={copy} />}

      <PromotionForm key={formKey} promotion={values} />
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* clipboard blocked — the operator can still select the text */
        }
      }}
      className="inline-flex items-center gap-1 text-[11.5px] font-bold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-300"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : `Copy ${label}`}
    </button>
  )
}

function CampaignCopyPanel({ copy }: { copy: CampaignCopy }) {
  return (
    <div className="card-base p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Campaign copy</h3>
      {copy.rationale && <p className="mt-2 text-[12.5px] italic text-muted-foreground">{copy.rationale}</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {copy.banner && (
          <div className="rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Megaphone className="h-3.5 w-3.5" /> Banner
              </span>
              <CopyButton text={copy.banner} label="banner" />
            </div>
            <p className="text-[13.5px] font-semibold">{copy.banner}</p>
          </div>
        )}

        {(copy.emailSubject || copy.emailBody) && (
          <div className="rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              <CopyButton text={`Subject: ${copy.emailSubject}\n\n${copy.emailBody}`} label="email" />
            </div>
            {copy.emailSubject && <p className="text-[13px] font-bold">{copy.emailSubject}</p>}
            {copy.emailBody && <p className="mt-1 whitespace-pre-line text-[12.5px] text-muted-foreground">{copy.emailBody}</p>}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11.5px] text-muted-foreground">
        Draft copy — review before sending. Nothing here is published automatically.
      </p>
    </div>
  )
}
