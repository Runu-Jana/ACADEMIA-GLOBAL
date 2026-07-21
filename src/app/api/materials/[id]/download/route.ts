import { NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { resolveUploadPath } from '../../_lib/upload'

/**
 * The only way to read uploaded course material.
 *
 * Files are stored outside public/ precisely so this check can't be bypassed:
 * a student must be enrolled in the owning course (admins see everything).
 * Unauthorised requests get 404 rather than 403 — a 403 would confirm that a
 * given material id exists, which is itself a small leak.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const material = await prisma.material.findUnique({
    where: { id },
    select: { fileUrl: true, fileName: true, mimeType: true, courseId: true, type: true },
  })

  const notFound = () => new NextResponse('Not found', { status: 404 })
  if (!material) return notFound()

  // Syllabus documents are the public "Download Brochure" asset — they exist to
  // win enrolments, so gating them behind a login would cost conversions.
  // Everything else (notes, test papers, recordings) is for enrolled students.
  if (material.type !== 'SYLLABUS') {
    const user = await getCurrentUser()
    if (!user) return new NextResponse('Sign in to download study material.', { status: 401 })

    if (user.role !== 'ADMIN') {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: material.courseId } },
        select: { id: true },
      })
      if (!enrollment) return notFound()
    }
  }

  const abs = resolveUploadPath(material.fileUrl)
  if (!abs) return notFound()

  let size: number
  try {
    const info = await stat(abs)
    if (!info.isFile()) return notFound()
    size = info.size
  } catch {
    // Row exists but the file is gone (manual deletion, failed deploy copy).
    return notFound()
  }

  const body = await readFile(abs)
  const asciiName = material.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '')

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': material.mimeType || 'application/octet-stream',
      'Content-Length': String(size),
      // Both forms: the quoted one for older clients, the RFC 5987 one so
      // non-ASCII names survive.
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(material.fileName)}`,
      // Per-user authorised content must never land in a shared/CDN cache.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
