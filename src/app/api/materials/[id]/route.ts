import { NextResponse } from 'next/server'
import { unlink } from 'node:fs/promises'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, notFound } from '@/app/api/admin/_lib/guard'
import { resolveUploadPath } from '../_lib/upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params

  const material = await prisma.material.findUnique({
    where: { id },
    select: { id: true, fileUrl: true },
  })
  if (!material) return notFound('That material has already been removed.')

  // Remove the row first: an orphaned file on disk is a smaller problem than a
  // row pointing at a file students can no longer download.
  await prisma.material.delete({ where: { id } })

  const abs = resolveUploadPath(material.fileUrl)
  if (abs) {
    try {
      await unlink(abs)
    } catch (err) {
      // ENOENT just means the file was already gone — anything else is worth
      // knowing about but must not fail the request.
      const code = (err as NodeJS.ErrnoException)?.code
      if (code !== 'ENOENT') {
        console.error('[materials] could not unlink', abs, err)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
