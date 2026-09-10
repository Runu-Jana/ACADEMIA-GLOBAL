import { describe, it, expect } from 'vitest'
import {
  categoryForType,
  resolvePrefs,
  wants,
  sanitizeChannels,
  DEFAULT_PREFS,
} from './notification-prefs'

describe('categoryForType', () => {
  it('maps notification types to categories', () => {
    expect(categoryForType('ENROLMENT')).toBe('course')
    expect(categoryForType('CERTIFICATE')).toBe('course')
    expect(categoryForType('TEST')).toBe('tests')
    expect(categoryForType('MATERIAL')).toBe('content')
    expect(categoryForType('REMINDER')).toBe('reminders')
    expect(categoryForType('ACHIEVEMENT')).toBe('achievements')
  })
  it('returns null for uncategorised or unknown types', () => {
    expect(categoryForType('GENERAL')).toBeNull()
    expect(categoryForType('WHATEVER')).toBeNull()
  })
})

describe('resolvePrefs', () => {
  it('returns the defaults for an absent preference', () => {
    expect(resolvePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(resolvePrefs(undefined)).toEqual(DEFAULT_PREFS)
  })
  it('merges a partial override over the defaults', () => {
    const r = resolvePrefs({ reminders: { email: false } })
    expect(r.reminders.email).toBe(false)
    expect(r.reminders.inApp).toBe(true) // untouched default
    expect(r.course).toEqual(DEFAULT_PREFS.course) // other categories untouched
  })
  it('ignores unknown keys and non-boolean values', () => {
    const r = resolvePrefs({ bogus: { inApp: false }, tests: { inApp: 'nope' } })
    expect(r).toEqual(DEFAULT_PREFS)
  })
})

describe('wants', () => {
  const prefs = resolvePrefs({ tests: { email: true }, reminders: { inApp: false } })
  it('reads the resolved channel for a type', () => {
    expect(wants(prefs, 'TEST', 'email')).toBe(true) // overridden on
    expect(wants(prefs, 'REMINDER', 'inApp')).toBe(false) // overridden off
    expect(wants(prefs, 'ACHIEVEMENT', 'email')).toBe(false) // default off
  })
  it('always allows in-app and never email for uncategorised types', () => {
    expect(wants(prefs, 'GENERAL', 'inApp')).toBe(true)
    expect(wants(prefs, 'GENERAL', 'email')).toBe(false)
  })
})

describe('sanitizeChannels', () => {
  it('keeps recognised categories and drops the rest', () => {
    const clean = sanitizeChannels({
      course: { inApp: false, email: false },
      bogus: { inApp: true },
      tests: 'nope',
    })
    expect(clean.course).toEqual({ inApp: false, email: false })
    expect('bogus' in clean).toBe(false)
    expect('tests' in clean).toBe(false)
  })
  it('returns an empty object for junk input', () => {
    expect(sanitizeChannels(null)).toEqual({})
    expect(sanitizeChannels('x')).toEqual({})
  })
})
