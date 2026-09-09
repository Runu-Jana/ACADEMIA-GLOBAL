'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'

export type PromotionFormValues = {
  id?: string
  code: string
  title: string
  description: string | null
  type: string
  value: number
  scope: string
  minSubtotal: number | null
  maxDiscount: number | null
  usageLimit: number | null
  perUserLimit: number | null
  startsAt: string | null // ISO
  endsAt: string | null // ISO
  status: string
  usedCount?: number
}

const rupees = (paise: number | null) => (paise == null ? '' : String(paise / 100))
const toPaise = (r: string) => {
  const t = r.trim()
  if (t === '') return null
  const n = Math.round(parseFloat(t) * 100)
  return Number.isFinite(n) ? n : null
}
const numOrNull = (s: string) => {
  const t = s.trim()
  if (t === '') return null
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}
const pad = (n: number) => String(n).padStart(2, '0')
function isoToLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const localToIso = (local: string) => (local.trim() === '' ? null : new Date(local).toISOString())

export function PromotionForm({ promotion }: { promotion?: PromotionFormValues }) {
  const router = useRouter()
  const editing = Boolean(promotion?.id)

  const [code, setCode] = React.useState(promotion?.code ?? '')
  const [title, setTitle] = React.useState(promotion?.title ?? '')
  const [description, setDescription] = React.useState(promotion?.description ?? '')
  const [type, setType] = React.useState(promotion?.type ?? 'PERCENT')
  const [value, setValue] = React.useState(
    promotion ? (promotion.type === 'FLAT' ? rupees(promotion.value) : String(promotion.value)) : '',
  )
  const [scope, setScope] = React.useState(promotion?.scope ?? 'SHOP')
  const [minSubtotal, setMinSubtotal] = React.useState(rupees(promotion?.minSubtotal ?? null))
  const [maxDiscount, setMaxDiscount] = React.useState(rupees(promotion?.maxDiscount ?? null))
  const [usageLimit, setUsageLimit] = React.useState(promotion?.usageLimit != null ? String(promotion.usageLimit) : '')
  const [perUserLimit, setPerUserLimit] = React.useState(promotion?.perUserLimit != null ? String(promotion.perUserLimit) : '')
  const [startsAt, setStartsAt] = React.useState(isoToLocal(promotion?.startsAt ?? null))
  const [endsAt, setEndsAt] = React.useState(isoToLocal(promotion?.endsAt ?? null))
  const [status, setStatus] = React.useState(promotion?.status ?? 'DRAFT')

  const [busy, setBusy] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState('')

  const isPercent = type === 'PERCENT'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const payload = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim() || null,
      type,
      value: isPercent ? numOrNull(value) ?? 0 : toPaise(value) ?? 0,
      scope,
      minSubtotal: toPaise(minSubtotal),
      maxDiscount: isPercent ? toPaise(maxDiscount) : null,
      usageLimit: numOrNull(usageLimit),
      perUserLimit: numOrNull(perUserLimit),
      startsAt: localToIso(startsAt),
      endsAt: localToIso(endsAt),
      status,
    }

    try {
      const res = await fetch(
        editing ? `/api/admin/promotions/${promotion!.id}` : '/api/admin/promotions',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not save the promotion.')
        setBusy(false)
        return
      }
      router.push('/admin/promotions')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!promotion?.id) return
    if (!confirm(`Delete ${promotion.code}? This can’t be undone.`)) return
    setError('')
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/promotions/${promotion.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not delete this promotion.')
        setDeleting(false)
        return
      }
      router.push('/admin/promotions')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div className="card-base p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required hint="Shown to buyers; entered case-insensitively.">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DIWALI25" maxLength={40} required />
          </Field>
          <Field label="Status" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="DRAFT">Draft (not redeemable)</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
            </Select>
          </Field>
          <Field label="Title" required className="sm:col-span-2" hint="Short line shown at checkout.">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="10% off your order" maxLength={120} required />
          </Field>
          <Field label="Description (optional)" className="sm:col-span-2">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Internal note or buyer-facing detail." maxLength={500} />
          </Field>
        </div>
      </div>

      <div className="card-base p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Discount</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="PERCENT">Percentage off</option>
              <option value="FLAT">Flat amount off</option>
            </Select>
          </Field>
          <Field label={isPercent ? 'Percent (1–100)' : 'Amount (₹)'} required>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={isPercent ? 1 : 0}
              max={isPercent ? 100 : undefined}
              step={isPercent ? 1 : '0.01'}
              required
            />
          </Field>
          {isPercent && (
            <Field label="Max discount (₹, optional)" hint="Caps a percentage discount.">
              <Input type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} min={0} step="0.01" />
            </Field>
          )}
          <Field label="Applies to" required>
            <Select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="SHOP">Shop products</option>
              <option value="COURSE">Course fees</option>
              <option value="ALL">Everything</option>
            </Select>
          </Field>
        </div>
      </div>

      <div className="card-base p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Limits & window</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum order (₹, optional)">
            <Input type="number" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} min={0} step="0.01" />
          </Field>
          <Field label="Total uses (optional)" hint="Across all shoppers.">
            <Input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} min={1} step={1} />
          </Field>
          <Field label="Per-user uses (optional)" hint="Signed-in shoppers only.">
            <Input type="number" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} min={1} step={1} />
          </Field>
          <div className="hidden sm:block" />
          <Field label="Starts (optional)">
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Ends (optional)">
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={busy} disabled={busy || deleting}>
          {editing ? 'Save changes' : 'Create promotion'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/promotions')} disabled={busy || deleting}>
          Cancel
        </Button>
        {editing && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy || deleting}
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-600 transition-colors hover:text-red-700 disabled:opacity-50 dark:text-red-400"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
