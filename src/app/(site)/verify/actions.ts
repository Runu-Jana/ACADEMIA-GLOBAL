'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  serial: z
    .string()
    .trim()
    .min(4, 'Enter the enrollment or serial number printed on the certificate')
    .max(64, 'That serial number is too long'),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the certificate holder's date of birth"),
})

export type VerifiedCertificate = {
  serial: string
  name: string
  course: string
  university: string
  grade: string
  issuedAt: string
}

export type VerifyResult =
  | { ok: true; certificate: VerifiedCertificate }
  | { ok: false; error: string }

/**
 * Looks up a certificate by serial and confirms the holder's date of birth.
 *
 * Unknown serial and wrong date of birth return the *same* message on purpose:
 * a differentiated response would let anyone probe which serials exist. Nothing
 * beyond name / course / university / grade / issue date is ever returned, and
 * nothing at all is returned unless both factors match.
 */
export async function verifyCertificate(input: {
  serial: string
  dob: string
}): Promise<VerifyResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Please check the details entered.' }
  }

  const serial = parsed.data.serial.toUpperCase().replace(/\s+/g, '')

  const certificate = await prisma.certificate.findUnique({
    where: { serial },
    select: {
      serial: true,
      grade: true,
      issuedAt: true,
      user: { select: { name: true, dob: true } },
      course: { select: { title: true, university: { select: { name: true } } } },
    },
  })

  const noMatch = {
    ok: false as const,
    error:
      'No certificate matches that serial number and date of birth. Check both against the printed certificate and try again.',
  }

  if (!certificate) return noMatch
  if (!certificate.user.dob || certificate.user.dob !== parsed.data.dob) return noMatch

  return {
    ok: true,
    certificate: {
      serial: certificate.serial,
      name: certificate.user.name,
      course: certificate.course.title,
      university: certificate.course.university.name,
      grade: certificate.grade,
      issuedAt: certificate.issuedAt.toISOString(),
    },
  }
}
