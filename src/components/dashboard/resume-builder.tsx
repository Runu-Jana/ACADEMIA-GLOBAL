'use client'

import * as React from 'react'
import { Sparkles, Printer, AlertCircle, FileText, Info, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import type { ResumeContent } from '@/lib/ai/resume'

type Contact = { name: string; email: string; phone: string; location: string }

/** Print only the resume sheet — hide the app shell, the form and the controls. */
const printCss = `
@media print {
  @page { size: A4 portrait; margin: 13mm; }
  body * { visibility: hidden !important; }
  .resume-sheet, .resume-sheet * { visibility: visible !important; }
  .resume-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: 0 !important; padding: 0 !important; }
}
`

const EMPTY = {
  targetRole: '',
  about: '',
  education: '',
  experience: '',
  projects: '',
  skills: '',
  achievements: '',
}

export function ResumeBuilder({
  contact,
  certCount,
  courseCount,
  aiConfigured,
}: {
  contact: Contact
  certCount: number
  courseCount: number
  aiConfigured: boolean
}) {
  const [form, setForm] = React.useState(EMPTY)
  const [links, setLinks] = React.useState('')
  const [resume, setResume] = React.useState<ResumeContent | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.targetRole.trim()) {
      setError('Tell us the role you are targeting first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not generate your resume.')
        return
      }
      setResume(data.resume as ResumeContent)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        {/* --------------------------------------------------------- form */}
        <form onSubmit={generate} className="card-base h-max p-4 print:hidden sm:p-5 lg:sticky lg:top-[84px]">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-holo-sweep">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold leading-tight">Your details</h2>
              <p className="text-[12px] text-muted-foreground">Rough notes are fine — the AI polishes them.</p>
            </div>
          </div>

          {!aiConfigured && (
            <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[12px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The AI resume builder isn&rsquo;t configured on this environment yet. An administrator
              needs to add an API key.
            </p>
          )}

          {error && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="space-y-3.5">
            <Field label="Target role" required hint="The job you're applying for">
              <Input value={form.targetRole} onChange={set('targetRole')} placeholder="e.g. Digital Marketing Executive" maxLength={120} />
            </Field>
            <Field label="About you" hint="A line or two on who you are and what you want">
              <Textarea value={form.about} onChange={set('about')} placeholder="Commerce graduate moving into digital marketing…" maxLength={1500} />
            </Field>
            <Field label="Education">
              <Textarea value={form.education} onChange={set('education')} placeholder="B.Com, Delhi University, 2020–2023, 72%" maxLength={2500} />
            </Field>
            <Field label="Experience / internships">
              <Textarea value={form.experience} onChange={set('experience')} placeholder="Marketing intern at ABC, ran Instagram campaigns, 3 months…" maxLength={3000} />
            </Field>
            <Field label="Projects" hint="Optional">
              <Textarea value={form.projects} onChange={set('projects')} placeholder="Built a Shopify store, ran ₹10k ad budget…" maxLength={2500} />
            </Field>
            <Field label="Skills">
              <Textarea value={form.skills} onChange={set('skills')} placeholder="Google Ads, SEO, Excel, Canva, copywriting" maxLength={1200} />
            </Field>
            <Field label="Achievements" hint="Optional">
              <Textarea value={form.achievements} onChange={set('achievements')} placeholder="Topped class, won a hackathon…" maxLength={1500} />
            </Field>
            <Field label="Links" hint="Optional — LinkedIn, portfolio">
              <Input value={links} onChange={(e) => setLinks(e.target.value)} placeholder="linkedin.com/in/you, myportfolio.com" maxLength={200} />
            </Field>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
            Your {certCount} verified certificate{certCount === 1 ? '' : 's'} and {courseCount} programme
            {courseCount === 1 ? '' : 's'} from Shiksha Sarthi are added automatically. The AI never
            invents experience it wasn&rsquo;t given.
          </p>

          <Button type="submit" variant="holo" size="lg" loading={loading} disabled={loading || !aiConfigured} className="mt-4 w-full">
            {loading ? 'Writing your resume…' : resume ? 'Regenerate resume' : 'Generate with AI'}
          </Button>
        </form>

        {/* ------------------------------------------------------ preview */}
        <div className="min-w-0">
          {resume ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3 print:hidden">
                <p className="text-[12.5px] text-muted-foreground">
                  Review it, tweak your notes and regenerate, or download as PDF.
                </p>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </div>
              <ResumeSheet resume={resume} contact={contact} links={links} />
            </>
          ) : (
            <div className="card-base flex min-h-[24rem] flex-col items-center justify-center p-8 text-center print:hidden">
              <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <FileText className="h-7 w-7" />
              </span>
              <h2 className="text-[17px] font-bold">Your resume will appear here</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-pretty text-[13.5px] text-muted-foreground">
                Fill in whatever you have on the left — even rough notes — and the AI turns it into a
                clean, ATS-friendly resume you can download.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- resume */

function ResumeSheet({
  resume,
  contact,
  links,
}: {
  resume: ResumeContent
  contact: Contact
  links: string
}) {
  const contactBits = [
    contact.email,
    contact.phone,
    contact.location,
    ...links.split(',').map((l) => l.trim()).filter(Boolean),
  ].filter(Boolean)

  return (
    <article className="resume-sheet mx-auto w-full max-w-[210mm] rounded-2xl border border-border bg-white p-6 text-slate-900 shadow-card sm:p-9 print:rounded-none">
      <header className="border-b-2 border-slate-900 pb-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">{contact.name}</h1>
        {resume.headline && (
          <p className="mt-0.5 text-[13px] font-bold uppercase tracking-wide text-blue-700">
            {resume.headline}
          </p>
        )}
        {contactBits.length > 0 && (
          <p className="mt-1.5 text-[11px] text-slate-600">{contactBits.join('  ·  ')}</p>
        )}
      </header>

      {resume.summary && (
        <Section title="Summary">
          <p className="text-[12px] leading-relaxed text-slate-700">{resume.summary}</p>
        </Section>
      )}

      {resume.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.map((s) => (
              <span key={s} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {resume.experience.length > 0 && (
        <Section title="Experience">
          {resume.experience.map((x, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-[12.5px] font-bold">
                  {x.role}
                  {x.organisation && <span className="font-semibold text-slate-600"> · {x.organisation}</span>}
                </p>
                {x.period && <p className="text-[11px] text-slate-500">{x.period}</p>}
              </div>
              {x.bullets.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11.5px] leading-relaxed text-slate-700">
                  {x.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </Section>
      )}

      {resume.projects.length > 0 && (
        <Section title="Projects">
          {resume.projects.map((p, i) => (
            <p key={i} className="mb-1.5 text-[11.5px] leading-relaxed text-slate-700 last:mb-0">
              <span className="font-bold text-slate-900">{p.name}. </span>
              {p.detail}
            </p>
          ))}
        </Section>
      )}

      {resume.education.length > 0 && (
        <Section title="Education">
          {resume.education.map((e, i) => (
            <div key={i} className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 last:mb-0">
              <p className="text-[12px]">
                <span className="font-bold">{e.qualification}</span>
                <span className="text-slate-600"> — {e.institution}</span>
                {e.detail && <span className="text-slate-500"> · {e.detail}</span>}
              </p>
              {e.period && <p className="text-[11px] text-slate-500">{e.period}</p>}
            </div>
          ))}
        </Section>
      )}

      {resume.certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="space-y-0.5 text-[11.5px] text-slate-700">
            {resume.certifications.map((c, i) => (
              <li key={i}>
                <span className="font-semibold text-slate-900">{c.name}</span>
                {c.issuer && <span> — {c.issuer}</span>}
                {c.detail && <span className="text-slate-500"> · {c.detail}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {resume.achievements.length > 0 && (
        <Section title="Achievements">
          <ul className="list-disc space-y-0.5 pl-4 text-[11.5px] leading-relaxed text-slate-700">
            {resume.achievements.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h2 className="mb-1.5 border-b border-slate-300 pb-0.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  )
}
