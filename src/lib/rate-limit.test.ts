import { describe, it, expect } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit', () => {
  it('allows up to the limit, then blocks with a retry-after', () => {
    const key = 'rl-allow'
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true)
    const blocked = rateLimit(key, 3, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('counts down the remaining allowance', () => {
    const key = 'rl-remaining'
    expect(rateLimit(key, 2, 60_000).remaining).toBe(1)
    expect(rateLimit(key, 2, 60_000).remaining).toBe(0)
  })

  it('keys are independent', () => {
    expect(rateLimit('rl-a', 1, 60_000).ok).toBe(true)
    expect(rateLimit('rl-a', 1, 60_000).ok).toBe(false)
    expect(rateLimit('rl-b', 1, 60_000).ok).toBe(true)
  })

  it('resets after the window elapses', async () => {
    const key = 'rl-window'
    expect(rateLimit(key, 1, 40).ok).toBe(true)
    expect(rateLimit(key, 1, 40).ok).toBe(false)
    await new Promise((r) => setTimeout(r, 55))
    expect(rateLimit(key, 1, 40).ok).toBe(true)
  })
})
