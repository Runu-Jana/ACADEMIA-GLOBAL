'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Bell, Mail } from 'lucide-react'
import { Checkbox } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { PanelHeading } from '@/components/dashboard/primitives'
import {
  NOTIFICATION_CATEGORIES,
  type ResolvedPrefs,
  type NotifCategoryKey,
  type NotifChannel,
} from '@/lib/notification-prefs'

/**
 * Per-category channel toggles. In-app controls whether the bell shows it; email
 * whether we also send it to their inbox. Saved to /api/notifications/preferences.
 */
export function NotificationSettings({ initial }: { initial: ResolvedPrefs }) {
  const router = useRouter()
  const [prefs, setPrefs] = React.useState<ResolvedPrefs>(initial)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState('')

  const dirty = JSON.stringify(prefs) !== JSON.stringify(initial)

  function toggle(cat: NotifCategoryKey, channel: NotifChannel) {
    setSaved(false)
    setPrefs((p) => ({ ...p, [cat]: { ...p[cat], [channel]: !p[cat][channel] } }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: prefs }),
      })
      if (!res.ok) throw new Error('save failed')
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Could not save your preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8">
      <PanelHeading
        title="Notifications"
        sub="Choose how you'd like to hear from us. In-app shows in the bell; email lands in your inbox."
      />

      <div className="card-base overflow-hidden">
        {/* header row */}
        <div className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:grid-cols-[1fr_5.5rem_5.5rem]">
          <span>Category</span>
          <span className="flex items-center justify-center gap-1"><Bell className="h-3.5 w-3.5" /> In-app</span>
          <span className="flex items-center justify-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
        </div>

        <ul className="divide-y divide-border">
          {NOTIFICATION_CATEGORIES.map((c) => (
            <li
              key={c.key}
              className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2 px-4 py-3.5 sm:grid-cols-[1fr_5.5rem_5.5rem]"
            >
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold">{c.label}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{c.description}</p>
              </div>
              <label className="flex cursor-pointer justify-center" aria-label={`${c.label} in-app`}>
                <Checkbox checked={prefs[c.key].inApp} onChange={() => toggle(c.key, 'inApp')} />
              </label>
              <label className="flex cursor-pointer justify-center" aria-label={`${c.label} email`}>
                <Checkbox checked={prefs[c.key].email} onChange={() => toggle(c.key, 'email')} />
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="button" variant="primary" onClick={save} loading={saving} disabled={saving || !dirty}>
          Save preferences
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
        {error && <span className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</span>}
      </div>

      <p className="mt-3 text-[11.5px] text-muted-foreground">
        Account and payment receipts are always sent. Email delivery is best-effort where configured.
      </p>
    </section>
  )
}
