/**
 * Watched-segment tracking for video lessons.
 *
 * A lesson counts as watched only for the seconds a learner has actually
 * *played* — so dragging the scrubber to the end can't fake completion. We keep
 * the set of watched integer-seconds and, to survive reloads and hop between
 * devices, persist it as a compact run-length string of ranges ("0-83,90-94").
 *
 * Completion fires once the watched fraction reaches WATCH_COMPLETE_THRESHOLD.
 * Kept provider-agnostic and dependency-free so both the player (client) and the
 * save endpoint (server) share one definition.
 */

/** Fraction of a video that must be genuinely watched to auto-complete it. */
export const WATCH_COMPLETE_THRESHOLD = 0.85

/** Encode watched integer-seconds into compact ranges, e.g. "0-83,90-94". */
export function encodeSegments(seconds: Iterable<number>): string {
  const arr = [...new Set(seconds)]
    .filter((n) => Number.isInteger(n) && n >= 0)
    .sort((a, b) => a - b)
  if (arr.length === 0) return ''

  const ranges: string[] = []
  let start = arr[0]
  let prev = arr[0]
  for (let i = 1; i < arr.length; i++) {
    const n = arr[i]
    if (n === prev + 1) {
      prev = n
      continue
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = prev = n
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
  return ranges.join(',')
}

/** Rehydrate the set of watched integer-seconds from an encoded range string. */
export function decodeSegments(s: string | null | undefined): Set<number> {
  const out = new Set<number>()
  if (!s) return out
  for (const part of s.split(',')) {
    const seg = part.trim()
    if (!seg) continue
    const [a, b] = seg.split('-')
    const lo = Number.parseInt(a, 10)
    const hi = b === undefined ? lo : Number.parseInt(b, 10)
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < 0 || hi < lo) continue
    // Guard against a pathological range blowing up memory.
    if (hi - lo > 100_000) continue
    for (let n = lo; n <= hi; n++) out.add(n)
  }
  return out
}

/** Whole-percent watched, clamped to 0–100. */
export function watchedPct(watchedSeconds: number, durationSec: number): number {
  if (!durationSec || durationSec <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((watchedSeconds / Math.floor(durationSec)) * 100)))
}
