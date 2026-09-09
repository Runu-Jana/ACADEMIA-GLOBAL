import { describe, it, expect } from 'vitest'
import { computeStreak, evaluateBadges, dayKeyIST, type EngagementStats } from './gamification'

const TODAY = '2026-09-09' // a Wednesday

describe('computeStreak', () => {
  it('is all zeros with no activity', () => {
    expect(computeStreak(new Set(), TODAY)).toEqual({
      current: 0,
      longest: 0,
      activeToday: false,
      atRisk: false,
    })
  })

  it('counts today as a 1-day streak', () => {
    const s = computeStreak(new Set([TODAY]), TODAY)
    expect(s.current).toBe(1)
    expect(s.longest).toBe(1)
    expect(s.activeToday).toBe(true)
    expect(s.atRisk).toBe(false)
  })

  it('counts consecutive days ending today', () => {
    const s = computeStreak(new Set(['2026-09-07', '2026-09-08', '2026-09-09']), TODAY)
    expect(s.current).toBe(3)
    expect(s.longest).toBe(3)
    expect(s.activeToday).toBe(true)
  })

  it('keeps the streak alive (at risk) when yesterday was active but today is not', () => {
    const s = computeStreak(new Set(['2026-09-07', '2026-09-08']), TODAY)
    expect(s.current).toBe(2) // counted back from yesterday
    expect(s.activeToday).toBe(false)
    expect(s.atRisk).toBe(true)
  })

  it('breaks the current streak once a full day is missed', () => {
    // last activity two days ago — neither today nor yesterday
    const s = computeStreak(new Set(['2026-09-06', '2026-09-07']), TODAY)
    expect(s.current).toBe(0)
    expect(s.atRisk).toBe(false)
    expect(s.longest).toBe(2)
  })

  it('reports the longest historical run independently of the current one', () => {
    const active = new Set([
      // a 4-day run in the past
      '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04',
      // a broken 2-day run near today
      '2026-09-08', '2026-09-09',
    ])
    const s = computeStreak(active, TODAY)
    expect(s.current).toBe(2)
    expect(s.longest).toBe(4)
  })

  it('does not let a gap inflate the current streak', () => {
    // today + yesterday, then a gap, then older days
    const s = computeStreak(new Set(['2026-09-05', '2026-09-08', '2026-09-09']), TODAY)
    expect(s.current).toBe(2)
  })
})

describe('dayKeyIST', () => {
  it('buckets by IST, not UTC (23:59 IST stays the same day)', () => {
    // 2026-09-09 18:29:00Z === 2026-09-09 23:59 IST
    expect(dayKeyIST(new Date('2026-09-09T18:29:00Z'))).toBe('2026-09-09')
  })

  it('rolls over at IST midnight', () => {
    // 2026-09-09 18:30:00Z === 2026-09-10 00:00 IST
    expect(dayKeyIST(new Date('2026-09-09T18:30:00Z'))).toBe('2026-09-10')
  })
})

describe('evaluateBadges', () => {
  const stats: EngagementStats = {
    lessonsCompleted: 10,
    testsPassed: 1,
    coursesEnrolled: 1,
    coursesCompleted: 0,
    certificates: 0,
    currentStreak: 2,
    longestStreak: 3,
    weeklyActiveDays: 2,
  }

  it('marks thresholds met as earned and shows progress toward the rest', () => {
    const byId = Object.fromEntries(evaluateBadges(stats).map((b) => [b.def.id, b]))
    expect(byId['first-step'].earned).toBe(true) // 10 >= 1
    expect(byId['lessons-10'].earned).toBe(true) // 10 >= 10
    expect(byId['lessons-50'].earned).toBe(false) // 10 < 50
    expect(byId['lessons-50'].percent).toBe(20) // 10/50
    expect(byId['streak-3'].earned).toBe(true) // longestStreak 3 >= 3
    expect(byId['certified'].earned).toBe(false) // 0 certificates
  })
})
