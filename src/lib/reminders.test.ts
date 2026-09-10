import { describe, it, expect } from 'vitest'
import { daysSince, pickResumeCourse } from './reminders'

const course = (id: string) => ({ id, title: `Course ${id}`, slug: id })
const enrol = (id: string, progressPct: number, status: string, enrolledAt: string) => ({
  progressPct,
  status,
  enrolledAt: new Date(enrolledAt),
  course: course(id),
})

describe('daysSince', () => {
  const now = new Date('2026-09-10T12:00:00Z')
  it('is zero for the same moment', () => {
    expect(daysSince(now, now)).toBe(0)
  })
  it('floors whole days', () => {
    expect(daysSince(new Date('2026-09-07T12:00:00Z'), now)).toBe(3)
    expect(daysSince(new Date('2026-09-07T18:00:00Z'), now)).toBe(2) // <3 full days
  })
  it('never goes negative for a future date', () => {
    expect(daysSince(new Date('2026-09-20T12:00:00Z'), now)).toBe(0)
  })
})

describe('pickResumeCourse', () => {
  it('prefers the course furthest along but not finished', () => {
    const r = pickResumeCourse([
      enrol('a', 20, 'ACTIVE', '2026-01-01'),
      enrol('b', 80, 'ACTIVE', '2026-01-02'),
      enrol('c', 100, 'COMPLETED', '2026-01-03'),
    ])
    expect(r?.course.id).toBe('b')
    expect(r?.progressPct).toBe(80)
  })

  it('falls back to the newest not-started course', () => {
    const r = pickResumeCourse([
      enrol('old', 0, 'ACTIVE', '2026-01-01'),
      enrol('new', 0, 'ACTIVE', '2026-03-01'),
    ])
    expect(r?.course.id).toBe('new')
    expect(r?.progressPct).toBe(0)
  })

  it('prefers an in-progress course over a not-started one', () => {
    const r = pickResumeCourse([
      enrol('started', 15, 'ACTIVE', '2026-01-01'),
      enrol('fresh', 0, 'ACTIVE', '2026-05-01'),
    ])
    expect(r?.course.id).toBe('started')
  })

  it('returns null when everything is complete', () => {
    expect(
      pickResumeCourse([
        enrol('a', 100, 'COMPLETED', '2026-01-01'),
        enrol('b', 100, 'COMPLETED', '2026-01-02'),
      ]),
    ).toBeNull()
  })
})
