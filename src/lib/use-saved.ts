'use client'

import * as React from 'react'

/**
 * The student's saved-course set, shared across every SaveButton on the page.
 *
 * Unlike the cart (which lives in localStorage), the wishlist's source of truth
 * is the database — so this hydrates once from /api/saved, then every heart on
 * the page reads and writes the same in-memory set through a tiny external
 * store. Toggling on the saved page instantly un-fills the heart on a card
 * elsewhere, with no prop threading.
 */

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
    const res = await fetch('/api/saved')
    if (res.ok) {
      const data = await res.json()
      saved = new Set<string>(Array.isArray(data.courseIds) ? data.courseIds : [])
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

async function toggle(courseId: string) {
  const was = saved.has(courseId)
  const next = new Set(saved)
  if (was) next.delete(courseId)
  else next.add(courseId)
  saved = next
  emit()

  try {
    const res = await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    })
    if (res.status === 401) {
      // Not signed in — revert the optimistic flip and send them to log in.
      const revert = new Set(saved)
      if (was) revert.add(courseId)
      else revert.delete(courseId)
      saved = revert
      emit()
      toLogin()
      return
    }
    if (res.ok) {
      const data = await res.json()
      const reconciled = new Set(saved)
      if (data.saved) reconciled.add(courseId)
      else reconciled.delete(courseId)
      saved = reconciled
      emit()
    }
  } catch {
    // Revert on a network failure so the heart reflects reality.
    const revert = new Set(saved)
    if (was) revert.add(courseId)
    else revert.delete(courseId)
    saved = revert
    emit()
  }
}

export function useSaved() {
  React.useEffect(() => {
    hydrate()
  }, [])

  React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => version,
    () => version,
  )

  return {
    ready,
    count: saved.size,
    isSaved: (courseId: string) => saved.has(courseId),
    toggle,
  }
}
