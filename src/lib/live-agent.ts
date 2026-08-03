import { prisma } from '@/lib/prisma'
import { sendAdminEmail } from '@/lib/email'

/**
 * The "connect me with a live counsellor" handoff, shared by the explicit button
 * (/api/counsellor/handoff) and the intent detector in the chat route.
 *
 * It resolves the prospect to a Lead (the anonymous chat creates one up front
 * when it collects contact details; a signed-in visitor gets one created lazily
 * here), flags it so it floats to the top of /admin/leads, logs a note, and
 * fires the admin email. The DB flag is the durable notification; the email is a
 * best-effort nudge that no-ops cleanly when unconfigured.
 */

export interface AgentRequestInput {
  leadId?: string | null
  /** Signed-in visitor, if any — used to create/attach a lead. */
  user?: { id: string; name: string; email: string; phone?: string | null } | null
  /** Anonymous contact details, when no lead exists yet. */
  name?: string
  email?: string
  phone?: string
  message?: string
}

export type AgentRequestResult =
  | { ok: true; leadId: string; email: string; phone: string | null; alreadyRequested: boolean }
  | { ok: false; reason: 'no_contact' | 'not_found' }

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
}

async function notifyAdmin(lead: {
  name: string
  email: string
  phone: string | null
  interestedCourseTitle: string | null
  interestedUniversityName: string | null
  message: string | null
}) {
  const interest = lead.interestedCourseTitle || lead.interestedUniversityName || 'Not specified'
  const link = `${siteUrl()}/admin/leads`
  await sendAdminEmail({
    subject: `Live counsellor requested — ${lead.name}`,
    text: [
      `${lead.name} has asked to speak with a counsellor through Saarthi.`,
      '',
      `Phone:        ${lead.phone ?? '—'}`,
      `Email:        ${lead.email}`,
      `Interested in: ${interest}`,
      lead.message ? `Their message: "${lead.message}"` : '',
      '',
      link ? `Work this lead: ${link}` : 'Open the Leads console in the admin panel to follow up.',
    ]
      .filter(Boolean)
      .join('\n'),
  })
}

/** Flags an existing lead and notifies the admin. No-ops loudly if already flagged. */
async function flagAndNotify(leadId: string): Promise<AgentRequestResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true, name: true, email: true, phone: true, wantsAgent: true, message: true,
      interestedCourseTitle: true, interestedUniversityName: true,
    },
  })
  if (!lead) return { ok: false, reason: 'not_found' }

  // Already requested — don't re-note or re-email (avoids spamming on repeat clicks).
  if (lead.wantsAgent) {
    return { ok: true, leadId: lead.id, email: lead.email, phone: lead.phone, alreadyRequested: true }
  }

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: lead.id },
      data: { wantsAgent: true, agentRequestedAt: new Date() },
    }),
    prisma.leadNote.create({
      data: { leadId: lead.id, body: 'Requested a live counsellor from the Saarthi chat.', authorName: 'Saarthi' },
    }),
  ])

  await notifyAdmin(lead)
  return { ok: true, leadId: lead.id, email: lead.email, phone: lead.phone, alreadyRequested: false }
}

export async function requestLiveAgent(input: AgentRequestInput): Promise<AgentRequestResult> {
  // 1. Use the lead the chat already created, if we have it.
  if (input.leadId) return flagAndNotify(input.leadId)

  // 2. Signed-in visitor with no lead yet — create one from their account.
  if (input.user) {
    const lead = await prisma.lead.create({
      data: {
        name: input.user.name,
        email: input.user.email,
        phone: input.user.phone ?? null,
        message: input.message?.trim() || null,
        source: 'counsellor',
        userId: input.user.id,
      },
      select: { id: true },
    })
    return flagAndNotify(lead.id)
  }

  // 3. Anonymous with contact details supplied inline.
  if (input.name && input.email) {
    const lead = await prisma.lead.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        message: input.message?.trim() || null,
        source: 'counsellor',
      },
      select: { id: true },
    })
    return flagAndNotify(lead.id)
  }

  return { ok: false, reason: 'no_contact' }
}
