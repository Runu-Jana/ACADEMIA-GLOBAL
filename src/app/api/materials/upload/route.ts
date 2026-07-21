import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { MATERIAL_TYPES } from '@/lib/constants'
import { requireAdminApi, zodMessage, badRequest } from '@/app/api/admin/_lib/guard'
import { checkFile, uploadsDir, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '../_lib/upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPE_VALUES = MATERIAL_TYPES.map((t) => t.value) as [string, ...string[]]

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Give the material a title of at least 2 characters')
    .max(140, 'Title is too long (140 characters max)'),
  courseId: z.string().trim().min(1, 'Choose the course this material belongs to'),
  moduleId: z.string().trim().optional(),
  type: z.enum(TYPE_VALUES, { errorMap: () => ({ message: 'Choose a material type' }) }),
  note: z.string().trim().max(500, 'Note is too long (500 characters max)').optional(),
})

export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return badRequest('Could not read the upload. Please try again.')
  }

  const parsed = schema.safeParse({
    title: form.get('title') ?? '',
    courseId: form.get('courseId') ?? '',
    moduleId: form.get('moduleId') ?? '',
    type: form.get('type') ?? '',
    note: form.get('note') ?? '',
  })
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const { title, courseId, type } = parsed.data
  const moduleId = parsed.data.moduleId || null
  const note = parsed.data.note || null

  // ---------------------------------------------------------------- the file
  const file = form.get('file')
  if (!(file instanceof File)) return badRequest('Choose a file to upload.')

  // Cheap pre-check before we ever buffer the body into memory.
  if (file.size > MAX_UPLOAD_BYTES) {
    return badRequest(`File is too large. The limit is ${MAX_UPLOAD_LABEL}.`)
  }

  const check = checkFile({ name: file.name, size: file.size, type: file.type })
  if (!check.ok) return badRequest(check.error)

  // ------------------------------------------------------------- references
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  })
  if (!course) return badRequest('That course no longer exists.')

  if (moduleId) {
    // A module from a *different* course would silently corrupt the library.
    const mod = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
      select: { id: true },
    })
    if (!mod) return badRequest('That module does not belong to the selected course.')
  }

  // ------------------------------------------------------------ write to disk
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return badRequest(`File is too large. The limit is ${MAX_UPLOAD_LABEL}.`)
  }

  const dir = uploadsDir()
  try {
    await mkdir(dir, { recursive: true })
    // `wx` fails instead of overwriting — the random suffix makes a clash
    // vanishingly unlikely, but never silently clobber someone else's file.
    await writeFile(path.join(dir, check.name.stored), bytes, { flag: 'wx' })
  } catch {
    return NextResponse.json(
      { error: 'Could not save the file to disk. Please try again.' },
      { status: 500 },
    )
  }

  const material = await prisma.material.create({
    data: {
      title,
      type,
      note,
      courseId,
      moduleId,
      uploadedById: user.id,
      fileUrl: `/uploads/${check.name.stored}`,
      fileName: check.name.display,
      fileSize: bytes.byteLength,
      mimeType: file.type || 'application/octet-stream',
    },
    select: { id: true, title: true, fileUrl: true, fileName: true, fileSize: true },
  })

  return NextResponse.json({ ok: true, material }, { status: 201 })
}
