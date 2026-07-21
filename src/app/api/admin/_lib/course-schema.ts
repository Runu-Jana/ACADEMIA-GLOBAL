import { z } from 'zod'
import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'

const LEVELS = COURSE_LEVELS.map((l) => l.value) as [string, ...string[]]
const MODES = COURSE_MODES.map((m) => m.value) as [string, ...string[]]
const STREAM_VALUES = STREAMS.map((s) => s.value) as [string, ...string[]]

/**
 * Highlights / skills / recruiters are `Json` string[] columns fed by
 * comma-separated inputs. The split happens here so the server — not the
 * browser — decides what actually lands in the column.
 */
const listField = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim()).filter(Boolean)
    }
    return []
  },
  z.array(z.string().min(1).max(160)).max(30, 'That is too many entries (30 max)'),
)

/** Empty string from a number input means "not set", not zero. */
const optionalInt = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z.coerce.number().int().min(0).max(100_000_000).nullable(),
)

export const courseSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug must be at least 3 characters')
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only use lowercase letters, numbers and hyphens'),
  subtitle: z.string().trim().min(3, 'Add a short subtitle').max(300),
  universityId: z.string().trim().min(1, 'Choose a university'),

  level: z.enum(LEVELS, { errorMap: () => ({ message: 'Choose a level' }) }),
  mode: z.enum(MODES, { errorMap: () => ({ message: 'Choose a mode' }) }),
  stream: z.enum(STREAM_VALUES, { errorMap: () => ({ message: 'Choose a stream' }) }),

  durationYears: z.coerce
    .number()
    .min(0.25, 'Duration must be at least 0.25 years')
    .max(10, 'Duration cannot exceed 10 years'),
  feePerYear: z.coerce.number().int().min(0, 'Fee cannot be negative').max(100_000_000),
  originalFee: optionalInt,
  discountPct: z.coerce.number().int().min(0).max(100).default(0),

  about: z.string().trim().min(10, 'Add a description of at least 10 characters').max(8000),
  eligibility: z.string().trim().min(3, 'Add the eligibility criteria').max(2000),
  examMode: z.string().trim().max(120).default('Online Proctored'),

  highlights: listField,
  skills: listField,
  recruiters: listField,

  isUgcEntitled: z.boolean().default(true),
  hasPlacement: z.boolean().default(true),
  hasLiveClass: z.boolean().default(true),
  featured: z.boolean().default(false),
})

export const courseUpdateSchema = courseSchema.partial()

export type CourseInput = z.infer<typeof courseSchema>
