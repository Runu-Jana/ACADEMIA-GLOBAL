'use client'

import * as React from 'react'

/**
 * The student's saved sets — one for courses, one for shop products — each
 * shared across every heart on the page.
 *
 * Unlike the cart (which lives in localStorage), a wishlist's source of truth is
 * the database, so each store hydrates once from its API route, then every heart
 * reads and writes the same in-memory set through a tiny external store.
 * Toggling on the Saved page instantly un-fills the matching heart on a card
 * elsewhere, with no prop threading.
 *
 * `createSavedStore` builds one such store; the two exports below are the
 * instances. They are independent — mounting a product heart never touches the
 * courses endpoint, and vice versa.
 */
type SavedStore = {
  ready: boolean
  count: number
  isSaved: (id: string) => boolean
  toggle: (id: string) => void
}

function createSavedStore(config: {
  /** The API route: GET returns `{ [listKey]: string[] }`, POST toggles `{ [idKey]: id }`. */
  endpoint: string
  idKey: string
  listKey: string
}): () => SavedStore {
  let saved = new Set<string>()
  let ready = false
  let fetched = false
  let version = 0
  const listeners = new Set<() => void>()

  function emit() {
    version += 1
    for (const l of listeners) l()
  }

  async function hydrate() {
    if (fetched) return
    fetched = true
    try {
      const res = await fetch(config.endpoint)
      if (res.ok) {
        const data = await res.json()
        saved = new Set<string>(Array.isArray(data[config.listKey]) ? data[config.listKey] : [])
      }
      // A 401 (signed out) just leaves the set empty — clicking a heart then
      // sends the visitor to sign in.
    } catch {
      // Offline — hearts stay empty until the next load.
    } finally {
      ready = true
      emit()
    }
  }

  function toLogin() {
    if (typeof window === 'undefined') return
    const here = window.location.pathname + window.location.search
    window.location.href = `/login?redirect=${encodeURIComponent(here)}`
  }

  async function toggle(id: string) {
    const was = saved.has(id)
    const next = new Set(saved)
    if (was) next.delete(id)
    else next.add(id)
    saved = next
    emit()

    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [config.idKey]: id }),
      })
      if (res.status === 401) {
        // Not signed in — revert the optimistic flip and send them to log in.
        const revert = new Set(saved)
        if (was) revert.add(id)
        else revert.delete(id)
        saved = revert
        emit()
        toLogin()
        return
      }
      if (res.ok) {
        const data = await res.json()
        const reconciled = new Set(saved)
        if (data.saved) reconciled.add(id)
        else reconciled.delete(id)
        saved = reconciled
        emit()
      }
    } catch {
      // Revert on a network failure so the heart reflects reality.
      const revert = new Set(saved)
      if (was) revert.add(id)
      else revert.delete(id)
      saved = revert
      emit()
    }
  }

  function subscribe(cb: () => void) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }

  return function useStore(): SavedStore {
    React.useEffect(() => {
      hydrate()
    }, [])

    React.useSyncExternalStore(
      subscribe,
      () => version,
      () => version,
    )

    return {
      ready,
      count: saved.size,
      isSaved: (id: string) => saved.has(id),
      toggle,
    }
  }
}

export const useSaved = createSavedStore({
  endpoint: '/api/saved',
  idKey: 'courseId',
  listKey: 'courseIds',
})

export const useSavedProducts = createSavedStore({
  endpoint: '/api/saved/products',
  idKey: 'productId',
  listKey: 'productIds',
})
