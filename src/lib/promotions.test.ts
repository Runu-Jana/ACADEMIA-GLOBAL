import { describe, it, expect } from 'vitest'
import { computeDiscount, normalizeCode } from './promotions'

describe('normalizeCode', () => {
  it('trims, upper-cases and strips inner spaces', () => {
    expect(normalizeCode('  save20 ')).toBe('SAVE20')
    expect(normalizeCode('new user')).toBe('NEWUSER')
    expect(normalizeCode('Diwali-25')).toBe('DIWALI-25')
  })
})

describe('computeDiscount', () => {
  it('takes a percentage of the subtotal', () => {
    // 10% of ₹1000.00 (100000 paise) = ₹100.00
    expect(computeDiscount({ type: 'PERCENT', value: 10, maxDiscount: null }, 100000)).toBe(10000)
  })

  it('caps a percentage discount at maxDiscount', () => {
    // 50% of ₹1000 = ₹500, but capped at ₹300
    expect(computeDiscount({ type: 'PERCENT', value: 50, maxDiscount: 30000 }, 100000)).toBe(30000)
  })

  it('rounds a percentage to the nearest paise', () => {
    // 33% of ₹100.00 (10000 paise) = 3300
    expect(computeDiscount({ type: 'PERCENT', value: 33, maxDiscount: null }, 10000)).toBe(3300)
  })

  it('takes a flat amount off', () => {
    expect(computeDiscount({ type: 'FLAT', value: 15000, maxDiscount: null }, 100000)).toBe(15000)
  })

  it('never discounts more than the subtotal', () => {
    // flat ₹150 on a ₹100 cart → capped at ₹100
    expect(computeDiscount({ type: 'FLAT', value: 15000, maxDiscount: null }, 10000)).toBe(10000)
  })

  it('is zero on an empty cart', () => {
    expect(computeDiscount({ type: 'PERCENT', value: 20, maxDiscount: null }, 0)).toBe(0)
    expect(computeDiscount({ type: 'FLAT', value: 5000, maxDiscount: null }, 0)).toBe(0)
  })
})
