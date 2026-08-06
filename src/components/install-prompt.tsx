'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'ag_install_dismissed'

/**
 * Surfaces the browser's own install prompt as an in-app banner.
 * Only Chromium fires `beforeinstallprompt`; elsewhere this renders nothing
 * and users install via the browser menu (mentioned on the homepage).
 */
export function InstallPrompt() {
  const pathname = usePathname()
  // Installing the student PWA is irrelevant inside the admin panel.
  const onAdmin = pathname?.startsWith('/admin') ?? false
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (onAdmin) return
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch {
      // Storage blocked — just show the banner this session.
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [onAdmin])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* non-fatal */
    }
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  if (onAdmin || !visible) return null

  return (
    <div className="fixed inset-x-3 bottom-[76px] z-50 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
      <div className="holo-ring glass-strong flex items-center gap-3 rounded-2xl p-3.5 shadow-lift animate-fade-up">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-fade shadow-glow">
          <Download className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight">Install Shiksha Sarthi</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Add to your home screen for offline study material.
          </p>
        </div>
        <Button size="sm" onClick={install}>
          Install
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
