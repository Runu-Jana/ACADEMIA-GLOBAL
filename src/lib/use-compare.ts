'use client'

import * as React from 'react'

const KEY = 'ag_compare'
const EVENT = 'ag_compare_change'
export const MAX_COMPARE = 4

function read(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // Storage unavailable — compare simply won't persist across reloads.
  }
  window.dispatchEvent(new CustomEvent(EVENT))
}

/**
 * Client-side course comparison tray, persisted to localStorage and shared
 * across components via a custom event (so the header badge and every card
 * stay in sync without a global store).
 */
export function useCompare() {
  const [ids, setIds] = React.useState<string[]>([])
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    setIds(read())
    setReady(true)

    const sync = () => setIds(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = React.useCallback((id: string) => {
    const current = read()
    if (current.includes(id)) {
      write(current.filter((x) => x !== id))
      return { added: false, full: false }
    }
    if (current.length >= MAX_COMPARE) return { added: false, full: true }
    write([...current, id])
    return { added: true, full: false }
  }, [])

  const remove = React.useCallback((id: string) => {
    write(read().filter((x) => x !== id))
  }, [])

  const clear = React.useCallback(() => write([]), [])

  return { ids, ready, count: ids.length, toggle, remove, clear, has: (id: string) => ids.includes(id) }
}
