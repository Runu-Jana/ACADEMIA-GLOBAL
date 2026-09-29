import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { fetchPageText } from '@/lib/ai/scrape'
import { extractProgrammes, type IngestedProgramme } from '@/lib/ai/ingest'
import { isFeatureConfigured } from '@/lib/ai'
import { slugify } from '@/lib/utils'

/**
 * Automatic directory sync.
 *
 * A daily job re-reads each opted-in university's public programmes page and
 * reconciles our DIRECTORY (display-only) courses against it:
 *   - a NEW programme, or a MINOR edit (description / eligibility / small fee
 *     move) → applied automatically;
 *   - a MATERIAL change (≥20% fee move, a level/duration/mode change, or a
 *     programme dropped from the source) → queued as a CatalogChange for a
 *     human to approve, so one bad scrape can't silently rewrite a live fee.
 *
 * Extraction reuses the same AI pipeline as the manual /admin/directory import,
 * so it no-ops safely until an AI key is configured.
 */

const MATERIAL_FEE_DELTA = 0.2

type ExistingCourse = {
  id: string
  slug: string
  title: string
  level: string
  mode: string
  stream: string
  durationYears: number
  feePerYear: number
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Map an extracted programme onto DIRECTORY course fields. */
function courseData(p: IngestedProgramme, uniName: string) {
  return {
    title: p.title,
    subtitle: (p.about ?? '').slice(0, 160) || `${p.title} at ${uniName}`,
    level: p.level,
    mode: p.mode,
    stream: p.stream,
    durationYears: p.durationYears,
    feePerYear: p.feePerYear ?? 0,
    about: p.about ?? '',
    eligibility: p.eligibility ?? '',
  }
}

/** A human-readable reason if the change is material, else null (minor → auto). */
function materialDiff(ex: ExistingCourse, next: ReturnType<typeof courseData>): string | null {
  if (ex.level !== next.level) return `Level: ${ex.level} → ${next.level}`
  if (ex.mode !== next.mode) return `Mode: ${ex.mode} → ${next.mode}`
  if (Math.abs(ex.durationYears - next.durationYears) >= 0.5)
    return `Duration: ${ex.durationYears}y → ${next.durationYears}y`

  const oldFee = ex.feePerYear
  const newFee = next.feePerYear
  if (oldFee > 0 && newFee === 0) return `Fee removed (was ₹${oldFee.toLocaleString('en-IN')}/yr)`
  if (oldFee > 0 && newFee > 0) {
    const delta = Math.abs(newFee - oldFee) / oldFee
    if (delta >= MATERIAL_FEE_DELTA)
      return `Fee: ₹${oldFee.toLocaleString('en-IN')} → ₹${newFee.toLocaleString('en-IN')}/yr (${Math.round(delta * 100)}%)`
  }
  return null
}

async function uniqueCourseSlug(base: string): Promise<string> {
  const b = slugify(base).slice(0, 90) || 'course'
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? b : `${b}-${n + 1}`
    if (!(await prisma.course.findUnique({ where: { slug }, select: { id: true } }))) return slug
  }
  return `${b}-${Date.now()}`
}

/** One PENDING change per course+kind — refreshed in place so a daily re-run doesn't pile up duplicates. */
async function queueChange(
  universityId: string,
  kind: 'UPDATE' | 'REMOVE',
  courseSlug: string,
  title: string,
  summary: string,
  payload: Prisma.InputJsonValue | null,
) {
  const existing = await prisma.catalogChange.findFirst({
    where: { universityId, courseSlug, kind, status: 'PENDING' },
    select: { id: true },
  })
  const data = { summary, title, payload: payload ?? undefined }
  if (existing) {
    await prisma.catalogChange.update({ where: { id: existing.id }, data })
  } else {
    await prisma.catalogChange.create({ data: { universityId, kind, courseSlug, ...data } })
  }
}

export type SyncResult = { added: number; updated: number; queued: number; found: number }

export async function syncUniversity(universityId: string): Promise<SyncResult> {
  const uni = await prisma.university.findUniqueOrThrow({
    where: { id: universityId },
    select: { id: true, name: true, slug: true, sourceUrl: true },
  })
  if (!uni.sourceUrl) throw new Error('No source URL set for this university.')

  const text = await fetchPageText(uni.sourceUrl)
  const { result } = await extractProgrammes(text, { userId: null })
  const programmes = result.programmes

  const existing = await prisma.course.findMany({
    where: { universityId, source: 'DIRECTORY' },
    select: { id: true, slug: true, title: true, level: true, mode: true, stream: true, durationYears: true, feePerYear: true },
  })
  const byKey = new Map(existing.map((c) => [norm(c.title), c]))

  let added = 0
  let updated = 0
  let queued = 0

  for (const p of programmes) {
    const next = courseData(p, uni.name)
    const key = norm(p.title)
    const ex = byKey.get(key)
    if (ex) byKey.delete(key)

    if (!ex) {
      const slug = await uniqueCourseSlug(`${uni.slug}-${p.title}`)
      await prisma.course.create({
        data: {
          slug,
          ...next,
          highlights: [],
          skills: [],
          recruiters: [],
          source: 'DIRECTORY',
          universityId,
          reviewStatus: 'PUBLISHED',
          featured: false,
        },
      })
      added++
      continue
    }

    const material = materialDiff(ex, next)
    if (material) {
      await queueChange(universityId, 'UPDATE', ex.slug, p.title, material, next as Prisma.InputJsonValue)
      queued++
    } else {
      await prisma.course.update({
        where: { id: ex.id },
        data: {
          subtitle: next.subtitle,
          about: next.about,
          eligibility: next.eligibility,
          feePerYear: next.feePerYear,
        },
      })
      updated++
    }
  }

  // Anything still mapped was live but absent from the source → queue a removal.
  for (const ex of byKey.values()) {
    await queueChange(universityId, 'REMOVE', ex.slug, ex.title, 'No longer listed on the official site', null)
    queued++
  }

  const status = `${added} added · ${updated} updated · ${queued} queued`
  await prisma.university.update({
    where: { id: universityId },
    data: { lastSyncedAt: new Date(), syncStatus: status },
  })
  return { added, updated, queued, found: programmes.length }
}

/** Daily job: sync every university that has sync enabled + a source URL. */
export async function syncListedUniversities() {
  if (!isFeatureConfigured('notes')) return { skipped: 'ai_unconfigured' as const }

  const unis = await prisma.university.findMany({
    where: { syncEnabled: true, sourceUrl: { not: null } },
    select: { id: true, name: true },
  })

  const results: Record<string, unknown> = {}
  let ok = 0
  let failed = 0
  for (const u of unis) {
    try {
      results[u.name] = await syncUniversity(u.id)
      ok++
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : 'sync failed'
      results[u.name] = { error: msg }
      await prisma.university
        .update({ where: { id: u.id }, data: { lastSyncedAt: new Date(), syncStatus: `Failed: ${msg}`.slice(0, 200) } })
        .catch(() => {})
    }
  }
  return { universities: unis.length, ok, failed, results }
}

/** Approve (apply) or reject (dismiss) a queued change. */
export async function resolveCatalogChange(id: string, action: 'approve' | 'reject') {
  const change = await prisma.catalogChange.findUnique({ where: { id } })
  if (!change || change.status !== 'PENDING') return { ok: false as const, reason: 'not_pending' }

  if (action === 'approve' && change.courseSlug) {
    if (change.kind === 'REMOVE') {
      await prisma.course.deleteMany({ where: { slug: change.courseSlug, source: 'DIRECTORY' } })
    } else if (change.kind === 'UPDATE' && change.payload) {
      const p = change.payload as Record<string, unknown>
      await prisma.course.updateMany({
        where: { slug: change.courseSlug, source: 'DIRECTORY' },
        data: {
          title: String(p.title ?? ''),
          subtitle: String(p.subtitle ?? ''),
          level: String(p.level ?? 'UG'),
          mode: String(p.mode ?? 'ONLINE'),
          stream: String(p.stream ?? 'MANAGEMENT'),
          durationYears: Number(p.durationYears ?? 1),
          feePerYear: Number(p.feePerYear ?? 0),
          about: String(p.about ?? ''),
          eligibility: String(p.eligibility ?? ''),
        },
      })
    }
  }

  await prisma.catalogChange.update({
    where: { id },
    data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', resolvedAt: new Date() },
  })
  return { ok: true as const }
}
