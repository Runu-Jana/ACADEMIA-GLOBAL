import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../../_lib/guard'
import { generateCourseStructure } from '@/lib/academics'

export const dynamic = 'force-dynamic'

const schema = z.object({ courseId: z.string().trim().min(1) })

/** One-click: derive semesters + subjects + a batch + calendar from the course's modules. */
export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const result = await generateCourseStructure(parsed.data.courseId)
  if (!result.ok) {
    return badRequest(
      result.reason === 'exists'
        ? 'This course already has an academic structure. Edit it below instead.'
        : 'That course no longer exists.',
    )
  }
  return NextResponse.json(result)
}
