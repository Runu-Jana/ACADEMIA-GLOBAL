import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(''))

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,17}$/, 'Enter a valid mobile number')
    .optional()
    .or(z.literal('')),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth as YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  gender: z
    .enum(['Male', 'Female', 'Other', 'Prefer not to say'], {
      errorMap: () => ({ message: 'Choose a valid option' }),
    })
    .optional()
    .or(z.literal('')),
  city: optionalText(60, 'City name is too long'),
  state: optionalText(60, 'State name is too long'),
})

/** Updates the signed-in user's own profile. There is no user id in the body — it
 *  always comes from the session, so one account can never edit another. */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid details' },
      { status: 400 },
    )
  }

  const { name, phone, dob, gender, city, state } = parsed.data

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      name,
      phone: phone || null,
      dob: dob || null,
      gender: gender || null,
      city: city || null,
      state: state || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dob: true,
      gender: true,
      city: true,
      state: true,
    },
  })

  return NextResponse.json({ ok: true, user })
}
