import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  GraduationCap, Clock, Monitor, ShieldCheck, Wallet, Award, Briefcase, CheckCircle2,
  BookOpen, Calendar, MapPin, Sparkles,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isCourseLive } from '@/lib/visibility'
import { asList, formatINR } from '@/lib/utils'
import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'
import { BrochureActions } from '@/components/course/brochure-actions'

export const dynamic = 'force-dynamic'

const labelOf = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((o) => o.value === v)?.label ?? v

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const course = await prisma.course.findUnique({ where: { slug }, select: { title: true } })
  return {
    title: course ? `${course.title} — Brochure` : 'Brochure',
    robots: { index: false, follow: false },
  }
}

export default async function BrochurePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      university: true,
      modules: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true, _count: { select: { lessons: true } } },
      },
    },
  })
  if (!course) notFound()

  // Same gate as the course page, with an operator/owner preview bypass.
  if (!isCourseLive(course)) {
    const viewer = await getCurrentUser()
    const canPreview =
      viewer?.role === 'ADMIN' ||
      (viewer?.role === 'PARTNER' && viewer.universityId === course.universityId)
    if (!canPreview) notFound()
  }

  const highlights = asList(course.highlights)
  const skills = asList(course.skills)
  const recruiters = asList(course.recruiters)
  const approvals = asList(course.university.approvals)

  const years = course.durationYears
  const durationLabel = `${years} ${years === 1 ? 'Year' : 'Years'}`
  const totalFee = Math.round(course.feePerYear * years)
  const emi = Math.round(totalFee / Math.max(1, Math.round(years * 12)))

  const facts = [
    { icon: GraduationCap, label: 'Level', value: labelOf(COURSE_LEVELS, course.level) },
    { icon: Monitor, label: 'Mode', value: labelOf(COURSE_MODES, course.mode) },
    { icon: Clock, label: 'Duration', value: durationLabel },
    { icon: ShieldCheck, label: 'Exam', value: course.examMode },
  ]

  return (
    <div className="brochure min-h-dvh bg-slate-100 text-slate-900">
      {/* @page + print rules. Kept inline so the brochure route needs no global CSS. */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .brochure { background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; }
          .avoid-break { break-inside: avoid; }
        }
      `}</style>

      <BrochureActions backHref={`/courses/${course.slug}`} title={course.title} />

      {/* -------------------------------------------------------------- sheet */}
      <div className="sheet mx-auto my-6 w-[210mm] max-w-full bg-white shadow-xl print:my-0">
        {/* masthead */}
        <header className="flex items-start justify-between gap-4 bg-gradient-to-br from-blue-800 to-indigo-700 px-8 py-6 text-white">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-white/80">
              <GraduationCap className="h-4 w-4" />
              Academia Global
            </div>
            <h1 className="mt-3 text-[26px] font-extrabold leading-tight">{course.title}</h1>
            <p className="mt-1 max-w-xl text-[13px] text-white/85">{course.subtitle}</p>
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold">
              <Award className="h-4 w-4 text-cyan-300" />
              {course.university.name}
              <span className="mx-1 opacity-50">·</span>
              <MapPin className="h-3.5 w-3.5" />
              {course.university.city}, {course.university.state}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Programme fee</p>
            <p className="text-2xl font-extrabold leading-none">{formatINR(course.feePerYear)}</p>
            <p className="text-[11px] text-white/70">per year</p>
          </div>
        </header>

        {/* fact strip */}
        <div className="grid grid-cols-4 border-b border-slate-200">
          {facts.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="border-r border-slate-200 px-4 py-3 last:border-r-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Icon className="h-3 w-3" />
                  {f.label}
                </p>
                <p className="mt-0.5 text-[13.5px] font-extrabold">{f.value}</p>
              </div>
            )
          })}
        </div>

        <div className="space-y-6 px-8 py-6">
          {/* about */}
          <section className="avoid-break">
            <SectionTitle icon={BookOpen}>Programme Overview</SectionTitle>
            <p className="text-[12.5px] leading-relaxed text-slate-700">{course.about}</p>
          </section>

          {/* fee breakdown */}
          <section className="avoid-break grid grid-cols-3 gap-3">
            <FeeCard label="Fee / year" value={formatINR(course.feePerYear)} />
            <FeeCard label={`Total (${durationLabel})`} value={formatINR(totalFee)} />
            <FeeCard label="EMI from" value={`${formatINR(emi)}/mo`} accent />
          </section>

          {/* highlights */}
          {highlights.length > 0 && (
            <section className="avoid-break">
              <SectionTitle icon={Sparkles}>Key Highlights</SectionTitle>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-[12.5px] text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* curriculum */}
          {course.modules.length > 0 && (
            <section className="avoid-break">
              <SectionTitle icon={Calendar}>Curriculum ({course.modules.length} modules)</SectionTitle>
              <ol className="space-y-1.5">
                {course.modules.map((m, i) => (
                  <li key={m.id} className="flex items-baseline gap-3 text-[12.5px]">
                    <span className="w-6 shrink-0 font-bold text-blue-700">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1 font-semibold text-slate-800">{m.title}</span>
                    <span className="shrink-0 text-[11px] text-slate-500">{m._count.lessons} lessons</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* two-up: eligibility + skills */}
          <section className="avoid-break grid grid-cols-2 gap-6">
            <div>
              <SectionTitle icon={ShieldCheck}>Eligibility</SectionTitle>
              <p className="text-[12.5px] leading-relaxed text-slate-700">{course.eligibility}</p>
            </div>
            {skills.length > 0 && (
              <div>
                <SectionTitle icon={Sparkles}>Skills You&rsquo;ll Gain</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span key={s} className="rounded-md bg-blue-50 px-2 py-1 text-[11.5px] font-semibold text-blue-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* placements */}
          {(course.hasPlacement || recruiters.length > 0) && (
            <section className="avoid-break">
              <SectionTitle icon={Briefcase}>Placements</SectionTitle>
              <p className="text-[12.5px] text-slate-700">
                {course.hasPlacement ? 'Dedicated placement assistance is included with this programme.' : ''}
              </p>
              {recruiters.length > 0 && (
                <p className="mt-1.5 text-[12.5px] text-slate-700">
                  <span className="font-semibold">Hiring partners include:</span> {recruiters.join(', ')}.
                </p>
              )}
            </section>
          )}

          {/* approvals */}
          {approvals.length > 0 && (
            <section className="avoid-break">
              <SectionTitle icon={Award}>Recognitions &amp; Approvals</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {approvals.map((a) => (
                  <span key={a} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-semibold text-slate-700">
                    {a}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* CTA footer */}
        <footer className="avoid-break flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-8 py-5">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-900">
              <Wallet className="h-4 w-4 text-blue-700" />
              Ready to apply?
            </p>
            <p className="text-[12px] text-slate-600">
              Apply online at academiaglobal.in/apply/{course.slug} · No-cost EMI available
            </p>
          </div>
          <div className="text-right text-[11.5px] text-slate-500">
            <p className="font-semibold text-slate-700">Academia Global</p>
            <p>support@academiaglobal.in · 1800-123-4567</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-1 text-[13px] font-extrabold uppercase tracking-wide text-blue-800">
      <Icon className="h-4 w-4" />
      {children}
    </h2>
  )
}

function FeeCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-extrabold ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
