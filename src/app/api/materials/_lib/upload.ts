import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { slugify } from '@/lib/utils'

/** 25 MB — mirrors `experimental.serverActions.bodySizeLimit` in next.config.mjs. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export const MAX_UPLOAD_LABEL = '25 MB'

/**
 * Extension allowlist -> the MIME types a browser legitimately reports for it.
 *
 * The extension check is the load-bearing one: whatever the client claims, the
 * file is re-named to `<slug>-<random>.<ext>` using an extension from this map,
 * so nothing outside it can ever land in public/uploads.
 */
const ALLOWED: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  txt: ['text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed', 'application/x-compressed', 'multipart/x-zip'],
  mp4: ['video/mp4'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
}

/**
 * Office suites and archivers are notoriously inconsistent about the MIME type
 * they hand the file picker, so these two generic values are tolerated. They
 * are not an escape hatch: the extension must still be in ALLOWED.
 */
const GENERIC_MIMES = new Set(['', 'application/octet-stream', 'binary/octet-stream'])

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED)

export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')

export type SafeName = { ext: string; stored: string; display: string }

/**
 * Turns a client-supplied filename into something safe to write to disk.
 * Directory components are discarded outright — the client's path is never
 * trusted — and the stem is slugified, so no traversal, NUL bytes, unicode
 * tricks or double extensions survive.
 */
export function safeFileName(originalName: string): SafeName {
  const base = (originalName || 'file').split(/[\\/]/).pop() ?? 'file'
  const dot = base.lastIndexOf('.')

  const ext = (dot > 0 ? base.slice(dot + 1) : '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const stem = (slugify(dot > 0 ? base.slice(0, dot) : base) || 'file').slice(0, 60)
  const suffix = randomBytes(4).toString('hex')

  return {
    ext,
    stored: `${stem}-${suffix}.${ext}`,
    display: `${stem}.${ext}`,
  }
}

export type FileCheck = { ok: true; name: SafeName } | { ok: false; error: string }

export function checkFile(file: { name: string; size: number; type: string }): FileCheck {
  if (!file.size) return { ok: false, error: 'That file is empty.' }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File is too large. The limit is ${MAX_UPLOAD_LABEL}.` }
  }

  const name = safeFileName(file.name)
  const allowedMimes = ALLOWED[name.ext]

  if (!allowedMimes) {
    return {
      ok: false,
      error: `“.${name.ext || 'unknown'}” files are not allowed. Accepted types: ${ALLOWED_EXTENSIONS.join(', ')}.`,
    }
  }

  const mime = (file.type || '').toLowerCase().split(';')[0].trim()
  if (!allowedMimes.includes(mime) && !GENERIC_MIMES.has(mime)) {
    return { ok: false, error: `The file's content type (${mime}) does not match a .${name.ext} file.` }
  }

  return { ok: true, name }
}

/**
 * Uploads live under storage/, NOT public/.
 *
 * Anything in public/ is served statically by Next with no auth — course
 * material sitting there is downloadable by anyone who guesses or is passed the
 * URL, enrolled or not. Files here are readable only through
 * `/api/materials/[id]/download`, which checks enrolment first.
 */
export function uploadsDir() {
  return path.join(process.cwd(), 'storage', 'uploads')
}

/**
 * Maps a stored `fileUrl` back to an absolute path, refusing anything that
 * resolves outside storage/uploads (so a tampered row can't read or delete
 * arbitrary files on disk).
 */
export function resolveUploadPath(fileUrl: string): string | null {
  if (!fileUrl.startsWith('/uploads/')) return null

  const root = path.resolve(uploadsDir())
  const abs = path.resolve(path.join(process.cwd(), 'storage', fileUrl))

  if (abs !== root && !abs.startsWith(root + path.sep)) return null
  return abs
}
