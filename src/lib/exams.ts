import type { BadgeTone } from '@/components/ui/badge'

/**
 * Entrance & competitive exams shown on /exams. Deliberately static, hand-kept
 * reference content — there is no Exam table, and dates change every cycle, so
 * treating these as orientation (not DB records) keeps the promise on the page.
 *
 * Lives here rather than inside the page component so universal search can match
 * against the same list and deep-link back to each card via its `slug` anchor.
 */
export type Exam = {
  /** Stable anchor id used by `/exams#exam-<slug>` from search results. */
  slug: string
  name: string
  category: string
  /** Eligibility, e.g. "After 12th" | "Graduation". */
  level: string
  /** Indicative application/exam window. */
  window: string
  tone: BadgeTone
  blurb: string
}

export const EXAMS: Exam[] = [
  { slug: 'upsc-cse', name: 'UPSC Civil Services', category: 'Government', level: 'Graduation', window: 'Feb – Sep', tone: 'primary', blurb: 'India’s premier civil services examination for IAS, IPS and allied services.' },
  { slug: 'neet-ug', name: 'NEET UG', category: 'Medical', level: 'After 12th', window: 'May', tone: 'danger', blurb: 'Single entrance test for MBBS, BDS and AYUSH admissions across India.' },
  { slug: 'jee-main', name: 'JEE Main', category: 'Engineering', level: 'After 12th', window: 'Jan & Apr', tone: 'violet', blurb: 'Gateway to NITs, IIITs and the JEE Advanced qualifier for the IITs.' },
  { slug: 'cat', name: 'CAT', category: 'Management', level: 'Graduation', window: 'Nov', tone: 'cyan', blurb: 'The common admission test for IIMs and top B-schools nationwide.' },
  { slug: 'clat', name: 'CLAT', category: 'Law', level: 'After 12th', window: 'Dec', tone: 'warning', blurb: 'Common law admission test for the National Law Universities.' },
  { slug: 'cuet-ug', name: 'CUET UG', category: 'Central Universities', level: 'After 12th', window: 'May – Jun', tone: 'success', blurb: 'Common entrance for undergraduate admissions to central universities.' },
  { slug: 'ssc-cgl', name: 'SSC CGL', category: 'Government', level: 'Graduation', window: 'Jun – Sep', tone: 'primary', blurb: 'Combined graduate level exam for Group B and C posts in central ministries.' },
  { slug: 'ibps-po', name: 'IBPS PO (Banking)', category: 'Banking', level: 'Graduation', window: 'Aug – Nov', tone: 'orange', blurb: 'Probationary officer recruitment across public sector banks.' },
  { slug: 'rrb-ntpc', name: 'RRB NTPC (Railway)', category: 'Government', level: '12th / Graduation', window: 'Varies', tone: 'default', blurb: 'Non-technical popular categories recruitment for Indian Railways.' },
  { slug: 'haryana-cet', name: 'Haryana CET', category: 'State', level: '12th / Graduation', window: 'Varies', tone: 'success', blurb: 'Common eligibility test for Group C and D posts in Haryana.' },
]

/**
 * Ranked substring match over an exam's name, category and eligibility. A name
 * hit outranks a category hit, which outranks an eligibility hit, so "medical"
 * surfaces NEET ahead of a course whose level merely mentions it.
 */
export function searchExams(q: string, limit = 6): Exam[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return []
  const scored: { exam: Exam; score: number }[] = []
  for (const exam of EXAMS) {
    const name = exam.name.toLowerCase()
    let score = 0
    if (name.includes(needle)) score = name.startsWith(needle) ? 3 : 2
    else if (exam.category.toLowerCase().includes(needle)) score = 1
    else if (exam.level.toLowerCase().includes(needle)) score = 0.5
    if (score > 0) scored.push({ exam, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.exam.name.localeCompare(b.exam.name))
    .slice(0, limit)
    .map((s) => s.exam)
}
