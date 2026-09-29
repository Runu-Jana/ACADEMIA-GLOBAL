import { z } from 'zod'

const PARTNER_STATUSES = ['PROSPECT', 'IN_TALKS', 'ACTIVE'] as const

/** Comma-separated short tokens (approvals like "UGC", "NAAC A+"). */
const commaList = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
    if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean)
    return []
  },
  z.array(z.string().min(1).max(120)).max(30, 'That is too many entries (30 max)'),
)

/** Newline-separated full-sentence entries (highlights, rankings). */
const lineList = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
    if (typeof value === 'string') return value.split('\n').map((v) => v.trim()).filter(Boolean)
    return []
  },
  z.array(z.string().min(1).max(240)).max(20, 'That is too many entries (20 max)'),
)

/** Blank string OR absent → null. Keeps optional text/URL fields tolerant. */
const blankToNull = (value: unknown) =>
  value == null || (typeof value === 'string' && value.trim() === '') ? null : value

const optionalUrl = z.preprocess(
  blankToNull,
  z.string().trim().url('Enter a valid URL (including https://)').max(300).nullable(),
)

const nonNegInt = z.coerce.number().int().min(0).max(100_000_000)

export const universitySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug must be at least 3 characters')
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only use lowercase letters, numbers and hyphens'),
  shortName: z.string().trim().min(1, 'Short name is required').max(40),
  about: z.string().trim().min(10, 'Write a short description (at least 10 characters)').max(4000),
  estYear: z.coerce.number().int().min(1800, 'Enter a valid year').max(new Date().getFullYear()),
  naacGrade: z.preprocess(blankToNull, z.string().trim().max(20).nullable()),
  city: z.string().trim().min(1, 'City is required').max(80),
  state: z.string().trim().min(1, 'State is required').max(80),
  website: optionalUrl,
  approvals: commaList,
  highlights: lineList,
  rankings: lineList,
  rating: z.coerce.number().min(0).max(5),
  reviews: nonNegInt,
  students: nonNegInt,
  programs: nonNegInt,
  featured: z.coerce.boolean(),
  listed: z.coerce.boolean(),
  partnerStatus: z.enum(PARTNER_STATUSES),
  commissionPct: z.coerce.number().min(0).max(100),
  // Partner contact — also used to provision the partner login.
  contactName: z.preprocess(blankToNull, z.string().trim().max(80).nullable()),
  contactEmail: z.preprocess(
    blankToNull,
    z.string().trim().toLowerCase().email('Enter a valid contact email').max(160).nullable(),
  ),
  contactPhone: z.preprocess(blankToNull, z.string().trim().max(30).nullable()),
})

export type UniversityInput = z.infer<typeof universitySchema>
