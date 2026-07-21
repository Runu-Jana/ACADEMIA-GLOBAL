import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'
import { formatINR } from '@/lib/utils'

/**
 * A deterministic, rule-based course recommender.
 *
 * There is no LLM key in this project and no external AI call is made — every
 * reply below is produced by matching keywords against the real course
 * catalogue. The UI is labelled honestly as a guided recommender because of it.
 */

export type Intent = {
  streams: string[]
  levels: string[]
  modes: string[]
  maxFee: number | null
  cheapFirst: boolean
  greeting: boolean
  /** Whether the message carried anything we can actually filter on. */
  hasSignal: boolean
}

/* ------------------------------------------------------------- vocabulary */

const STREAM_WORDS: { stream: string; words: string[]; patterns?: RegExp[] }[] = [
  {
    stream: 'MANAGEMENT',
    words: ['management', 'mba', 'bba', 'pgdm', 'business', 'business administration', 'marketing', 'hr', 'human resource', 'human resources', 'entrepreneur', 'entrepreneurship', 'finance', 'operations', 'supply chain', 'retail'],
  },
  {
    stream: 'IT',
    words: ['computer', 'computers', 'computer science', 'bca', 'mca', 'software', 'coding', 'programming', 'programmer', 'developer', 'data science', 'data analytics', 'analytics', 'artificial intelligence', 'machine learning', 'cyber security', 'cybersecurity', 'web development', 'information technology', 'tech', 'python'],
    // "IT" is the most common way people name this stream, but a lower-case
    // "it" is just the English pronoun — so match the capitalised form, the
    // dotted form, and "it" only when a field-ish noun follows it.
    patterns: [
      /\bIT\b/,
      /\bi\.\s?t\.?\b/i,
      /\bit\s+(course|courses|degree|degrees|field|sector|industry|job|jobs|line|stream|programme|program)\b/i,
    ],
  },
  {
    stream: 'COMMERCE',
    words: ['commerce', 'bcom', 'b com', 'mcom', 'm com', 'accounting', 'accounts', 'accountancy', 'taxation', 'banking', 'ca', 'audit'],
  },
  {
    stream: 'LAW',
    words: ['law', 'llb', 'llm', 'legal', 'advocate', 'lawyer', 'clat', 'judiciary'],
  },
  {
    stream: 'ARTS',
    words: ['arts', 'humanities', 'ba', 'ma', 'english', 'history', 'psychology', 'sociology', 'political science', 'journalism', 'mass communication', 'literature'],
  },
  {
    stream: 'ENGINEERING',
    words: ['engineering', 'engineer', 'btech', 'b tech', 'mtech', 'm tech', 'mechanical', 'civil', 'electrical', 'electronics', 'polytechnic'],
  },
  {
    stream: 'SCIENCE',
    words: ['science', 'bsc', 'b sc', 'msc', 'm sc', 'physics', 'chemistry', 'mathematics', 'maths', 'biology', 'biotechnology'],
  },
  {
    stream: 'MEDICAL',
    words: ['medical', 'mbbs', 'nursing', 'pharmacy', 'paramedical', 'healthcare', 'physiotherapy', 'bpt'],
  },
]

/**
 * Priority order matters: the first rule that matches wins, so an explicit
 * "certificate" beats the generic degree words that may sit alongside it.
 */
const LEVEL_RULES: { levels: string[]; words: string[] }[] = [
  {
    levels: ['CERTIFICATE', 'DIPLOMA'],
    words: ['certificate', 'certification', 'short term', 'short-term', 'short course', 'crash course', 'quick course', 'upskill', 'upskilling'],
  },
  {
    levels: ['PG'],
    words: ['after graduation', 'post graduation', 'post-graduation', 'post graduate', 'postgraduate', 'pg', 'masters', 'master', 'mba', 'mca', 'mcom', 'm com', 'ma', 'msc', 'm sc', 'mtech', 'm tech', 'llm', 'graduated', 'i am a graduate'],
  },
  {
    levels: ['DIPLOMA', 'CERTIFICATE', 'UG'],
    words: ['after 10th', 'after 10', 'after class 10', 'class 10', '10th', 'tenth', 'matric', 'matriculation'],
  },
  {
    levels: ['UG', 'INTEGRATED', 'DIPLOMA'],
    words: ['after 12th', 'after 12', 'after class 12', 'class 12', '12th', 'twelfth', 'intermediate', 'undergraduate', 'under graduate', 'ug', 'bachelor', 'bachelors', 'graduation', 'bba', 'bca', 'bcom', 'b com', 'ba', 'bsc', 'b sc', 'btech', 'b tech', 'llb'],
  },
]

const MODE_RULES: { modes: string[]; words: string[]; working?: boolean }[] = [
  {
    modes: ['PART_TIME', 'ONLINE', 'DISTANCE', 'HYBRID'],
    working: true,
    words: ['working professional', 'working professionals', 'while working', 'with a job', 'doing a job', 'full time job', 'weekend', 'weekends', 'evening', 'evenings', 'part time', 'part-time', 'after office', 'office hours', 'flexible timing', 'flexible schedule', 'i work'],
  },
  { modes: ['ONLINE'], words: ['online', 'virtual', 'from home', 'remote'] },
  { modes: ['DISTANCE'], words: ['distance', 'correspondence', 'deb'] },
  { modes: ['HYBRID'], words: ['hybrid', 'blended'] },
  { modes: ['REGULAR'], words: ['regular', 'campus', 'on campus', 'on-campus', 'full time college', 'classroom'] },
]

const CHEAP_WORDS = ['affordable', 'affordability', 'cheap', 'cheapest', 'low fee', 'low fees', 'low-cost', 'low cost', 'lowest fee', 'budget', 'economical', 'inexpensive', 'pocket friendly', 'least expensive', 'value for money', 'minimum fee']

const GREETING_RE = /^\s*(hi|hey|hello|hola|yo|namaste|good\s+(morning|afternoon|evening))\b/i

/* ---------------------------------------------------------------- matching */

function escape(word: string) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Word-boundary match so "ba" never fires inside "bba" or "database". */
function hit(text: string, words: string[]) {
  return words.some((w) => new RegExp(`\\b${escape(w)}\\b`, 'i').test(text))
}

function parseBudget(text: string): number | null {
  const scale = (raw: string, unit?: string) => {
    const n = Number(raw.replace(/,/g, ''))
    if (!Number.isFinite(n) || n <= 0) return null
    const u = (unit ?? '').toLowerCase()
    if (u === 'k' || u === 'thousand') return Math.round(n * 1000)
    if (u.startsWith('lakh') || u.startsWith('lac') || u === 'l') return Math.round(n * 100000)
    return Math.round(n)
  }

  // "under 30000", "below ₹50k", "up to 1.5 lakh", "budget of 40,000"
  const explicit = text.match(
    /(?:under|below|less than|lesser than|upto|up to|within|max(?:imum)?|budget(?:\s+of)?|around|about)\s*(?:rs\.?|₹|inr)?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|l)?/i,
  )
  if (explicit) return scale(explicit[1], explicit[2])

  // "₹30000", "rs 45,000"
  const currency = text.match(/(?:rs\.?|₹|inr)\s*([\d][\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?)?/i)
  if (currency) return scale(currency[1], currency[2])

  // bare "30k"
  const shorthand = text.match(/\b([\d][\d,]*(?:\.\d+)?)\s*(k|lakhs?|lacs?)\b/i)
  if (shorthand) return scale(shorthand[1], shorthand[2])

  return null
}

export function parseIntent(message: string): Intent {
  const text = message.toLowerCase()
  // An all-caps message would make every case-sensitive pattern fire, so those
  // are only trusted when the writer used mixed case.
  const mixedCase = message !== message.toUpperCase()

  const streams = STREAM_WORDS.filter(
    ({ words, patterns }) =>
      hit(text, words) || (mixedCase && (patterns?.some((p) => p.test(message)) ?? false)),
  ).map(({ stream }) => stream)

  const levelRule = LEVEL_RULES.find((r) => hit(text, r.words))
  const modeRule = MODE_RULES.find((r) => hit(text, r.words))

  const maxFee = parseBudget(text)
  const cheapFirst = hit(text, CHEAP_WORDS)
  const greeting = GREETING_RE.test(message) && message.trim().length <= 30

  const levels = levelRule?.levels ?? []
  const modes = modeRule?.modes ?? []

  return {
    streams,
    levels,
    modes,
    maxFee,
    cheapFirst,
    greeting,
    hasSignal:
      streams.length > 0 || levels.length > 0 || modes.length > 0 || maxFee !== null || cheapFirst,
  }
}

/* ------------------------------------------------------- relaxation ladder */

export type Constraint = {
  streams: string[]
  levels: string[]
  modes: string[]
  maxFee: number | null
}

/**
 * Progressively drops the least important filter so a very specific question
 * still returns something useful instead of an empty list.
 */
export function relaxationLadder(intent: Intent): { constraint: Constraint; dropped: string[] }[] {
  let current: Constraint = {
    streams: intent.streams,
    levels: intent.levels,
    modes: intent.modes,
    maxFee: intent.maxFee,
  }

  const steps: { constraint: Constraint; dropped: string[] }[] = [{ constraint: current, dropped: [] }]
  const dropped: string[] = []

  const order: { key: keyof Constraint; label: string }[] = [
    { key: 'modes', label: 'mode' },
    { key: 'maxFee', label: 'budget' },
    { key: 'levels', label: 'level' },
    { key: 'streams', label: 'subject' },
  ]

  for (const { key, label } of order) {
    const value = current[key]
    const isSet = key === 'maxFee' ? value !== null : Array.isArray(value) && value.length > 0
    if (!isSet) continue

    current = { ...current, [key]: key === 'maxFee' ? null : [] }
    dropped.push(label)
    steps.push({ constraint: current, dropped: [...dropped] })
  }

  return steps
}

/* -------------------------------------------------------------- narration */

const label = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((x) => x.value === value)?.label ?? value

function joinWords(items: string[]) {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Human summary of what we understood — keeps the bot honest about its filters. */
export function describeIntent(intent: Intent): string[] {
  const bits: string[] = []

  if (intent.streams.length) {
    bits.push(joinWords(intent.streams.map((s) => label(STREAMS, s))))
  }
  if (intent.levels.length) {
    bits.push(`${joinWords(intent.levels.slice(0, 2).map((l) => label(COURSE_LEVELS, l)))} level`)
  }
  if (intent.modes.length) {
    bits.push(
      intent.modes.length > 2
        ? 'flexible enough to fit around a job'
        : joinWords(intent.modes.map((m) => label(COURSE_MODES, m).toLowerCase())),
    )
  }
  if (intent.maxFee !== null) {
    bits.push(`under ${formatINR(intent.maxFee)} a year`)
  } else if (intent.cheapFirst) {
    bits.push('the most affordable first')
  }

  return bits
}

export const INTRO_REPLY =
  'Hi! I am the Academia Global course recommender — a guided tool that searches our real course catalogue, not a general-purpose AI. ' +
  'Tell me what you have studied so far, the subject you enjoy, how much time you have, or a budget, and I will suggest programmes that fit.'

export const CLARIFY_REPLY =
  'I want to point you at the right programmes, but I need a little more to go on. ' +
  'Could you tell me one of these — the subject you are interested in (management, IT, commerce, law, arts…), ' +
  'what you have completed (Class 10, Class 12, or a degree), or roughly what you can spend per year?'

export function composeReply({
  intent,
  count,
  dropped,
}: {
  intent: Intent
  count: number
  dropped: string[]
}): string {
  const bits = describeIntent(intent)
  const summary = bits.length ? bits.join(', ') : 'what you are looking for'

  if (count === 0) return CLARIFY_REPLY

  const plural = count === 1 ? 'programme' : 'programmes'

  if (dropped.length === 0) {
    return `Based on ${summary}, here ${count === 1 ? 'is' : 'are'} ${count} ${plural} from our catalogue that ${count === 1 ? 'fits' : 'fit'} well.`
  }

  return (
    `Nothing matched every detail, so I widened the search on ${joinWords(dropped)}. ` +
    `${count === 1 ? 'This is the closest programme' : `These ${count} come closest`} to ${summary}.`
  )
}
