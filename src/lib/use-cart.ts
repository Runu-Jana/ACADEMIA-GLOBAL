'use client'

import * as React from 'react'
import { MAX_QTY } from '@/lib/shop'

const KEY = 'ss_cart'
const EVENT = 'ss_cart_change'

export { MAX_QTY }

/**
 * What the browser remembers about a cart.
 *
 * Note what is NOT here: the price. The cart stores product ids and quantities
 * only, and the server re-prices every line from the database at checkout. A
 * cart that carried its own prices would let anyone edit localStorage and buy a
 * ₹899 book for ₹1 — the single most common storefront vulnerability.
 *
 * The title and price fields below are a display cache, refreshed from the
 * server whenever the cart page loads. They are never trusted for money.
 */
export type CartLine = {
  productId: string
  qty: number
  /** Display cache only — the server is authoritative. */
  title?: string
  slug?: string
  price?: number
}

function read(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((l): l is CartLine => Boolean(l) && typeof l.productId === 'string')
      .map((l) => ({ ...l, qty: Math.min(MAX_QTY, Math.max(1, Math.floor(Number(l.qty) || 1))) }))
  } catch {
    return []
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    // Storage unavailable (private mode, quota) — the cart just won't persist.
  }
  window.dispatchEvent(new CustomEvent(EVENT))
}

/**
 * The shop cart, persisted to localStorage and shared across components via a
 * custom event — same approach as useCompare, so the header badge, the product
 * page button and the cart page all stay in sync without a global store.
 *
 * `ready` exists to avoid a hydration flash: the server renders an empty cart,
 * so components should wait for `ready` before showing a count.
 */
export function useCart() {
  const [lines, setLines] = React.useState<CartLine[]>([])
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    setLines(read())
    setReady(true)

    const sync = () => setLines(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const add = React.useCallback((line: CartLine) => {
    const current = read()
    const existing = current.find((l) => l.productId === line.productId)

    if (existing) {
      const next = Math.min(MAX_QTY, existing.qty + (line.qty || 1))
      const capped = next === existing.qty
      write(current.map((l) => (l.productId === line.productId ? { ...l, ...line, qty: next } : l)))
      return { added: !capped, capped }
    }

    write([...current, { ...line, qty: Math.min(MAX_QTY, Math.max(1, line.qty || 1)) }])
    return { added: true, capped: false }
  }, [])

  const setQty = React.useCallback((productId: string, qty: number) => {
    const clamped = Math.min(MAX_QTY, Math.max(0, Math.floor(qty)))
    const current = read()
    if (clamped <= 0) {
      write(current.filter((l) => l.productId !== productId))
      return
    }
    write(current.map((l) => (l.productId === productId ? { ...l, qty: clamped } : l)))
  }, [])

  const remove = React.useCallback((productId: string) => {
    write(read().filter((l) => l.productId !== productId))
  }, [])

  const clear = React.useCallback(() => write([]), [])

  const count = lines.reduce((n, l) => n + l.qty, 0)

  return {
    lines, ready, count, add, setQty, remove, clear,
    has: (productId: string) => lines.some((l) => l.productId === productId),
    qtyOf: (productId: string) => lines.find((l) => l.productId === productId)?.qty ?? 0,
  }
}

/** Clears the stored cart from outside React (used after a successful payment). */
export function clearStoredCart() {
  write([])
}
