'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Check, ChevronLeft, ChevronRight, AlertCircle, GraduationCap, User as UserIcon,
  BookOpen, Wallet, ShieldCheck, Sparkles, Info, ArrowRight, Percent, CalendarDays,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input, Select, Checkbox } from '@/components/ui/field'
import { CourseThumb, UniversityMark } from '@/components/course/course-thumb'
import { cn, formatINR } from '@/lib/utils'
import { openRazorpayCheckout, CHECKOUT_CANCELLED } from '@/lib/payments/checkout'

export type WizardCourse = {
  id: string
  slug: string
  title: string
  subtitle: string
  level: string
  mode: string
  stream: string
  durationYears: number
  feePerYear: number
  originalFee: number | null
  discountPct: number
  examMode: string
  eligibility: string
  universityName: string
  skills: string[]
}

type Personal = {
  fullName: string
  email: string
  mobile: string
  dob: string
  gender: string
  address: string
  city: string
  state: string
  pincode: string
}

type Education = {
  qualification: string
  board: string
  institute: string
  yearOfPassing: string
  percentage: string
}

type Program = {
  intake: string
  specialisation: string
  emi: boolean
}

const STEPS = [
  { n: 1, key: 'personal', icon: UserIcon },
  { n: 2, key: 'education', icon: BookOpen },
  { n: 3, key: 'program', icon: GraduationCap },
  { n: 4, key: 'review', icon: Wallet },
] as const

// Value stays English (it's persisted and shown in admin); only the label is
// translated for display.
const QUALIFICATIONS = [
  { value: 'Class 10', key: 'class10' },
  { value: 'Class 12', key: 'class12' },
  { value: 'Diploma', key: 'diploma' },
  { value: 'Undergraduate (UG)', key: 'ug' },
  { value: 'Postgraduate (PG)', key: 'pg' },
  { value: 'Other', key: 'other' },
] as const

const GENDERS = [
  { value: 'Male', key: 'male' },
  { value: 'Female', key: 'female' },
  { value: 'Other', key: 'other' },
  { value: 'Prefer not to say', key: 'na' },
] as const

const INTAKES = [
  { value: 'January 2026', key: 'jan' },
  { value: 'April 2026', key: 'apr' },
  { value: 'July 2026', key: 'jul' },
  { value: 'October 2026', key: 'oct' },
] as const

export function ApplyWizard({
  course,
  initialStep,
  initialPersonal,
  initialEducation,
  initialProgram,
  alreadyEnrolled,
  alreadySubmitted,
  paymentsLive,
}: {
  course: WizardCourse
  initialStep: number
  initialPersonal: Partial<Personal>
  initialEducation: Partial<Education>
  initialProgram: Partial<Program>
  alreadyEnrolled: boolean
  alreadySubmitted: boolean
  /** Whether a real payment gateway is configured; drives copy and CTA. */
  paymentsLive: boolean
}) {
  const router = useRouter()
  const t = useTranslations('apply')
  const tc = useTranslations('courses')

  const [step, setStep] = React.useState(Math.min(Math.max(initialStep, 1), 4))
  const [done, setDone] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [consent, setConsent] = React.useState(false)

  const [personal, setPersonal] = React.useState<Personal>({
    fullName: initialPersonal.fullName ?? '',
    email: initialPersonal.email ?? '',
    mobile: initialPersonal.mobile ?? '',
    dob: initialPersonal.dob ?? '',
    gender: initialPersonal.gender ?? '',
    address: initialPersonal.address ?? '',
    city: initialPersonal.city ?? '',
    state: initialPersonal.state ?? '',
    pincode: initialPersonal.pincode ?? '',
  })

  const [education, setEducation] = React.useState<Education>({
    qualification: initialEducation.qualification ?? '',
    board: initialEducation.board ?? '',
    institute: initialEducation.institute ?? '',
    yearOfPassing: initialEducation.yearOfPassing ?? '',
    percentage: initialEducation.percentage ?? '',
  })

  const [program, setProgram] = React.useState<Program>({
    intake: initialProgram.intake ?? INTAKES[0].value,
    specialisation: initialProgram.specialisation ?? (course.skills[0] ?? 'Core specialisation'),
    emi: initialProgram.emi ?? false,
  })

  /* ------------------------------------------------------------- money */
  const totalFee = Math.round(course.feePerYear * course.durationYears)
  const originalTotal = Math.round((course.originalFee ?? course.feePerYear) * course.durationYears)
  const savings = Math.max(0, originalTotal - totalFee)
  const emiMonthly = Math.round(course.feePerYear / 12)
  // A real payment is collected only when the gateway is live and there's a fee.
  const paidCheckout = paymentsLive && course.feePerYear > 0

  const levelLabel = tc(`level.${course.level}`)
  const modeLabel = tc(`mode.${course.mode}`)

  // Selects persist English values; these map a stored value back to its label.
  const genderLabel = (v: string) => GENDERS.find((x) => x.value === v) ? t(`gen.${GENDERS.find((x) => x.value === v)!.key}`) : v
  const qualLabel = (v: string) => QUALIFICATIONS.find((x) => x.value === v) ? t(`qual.${QUALIFICATIONS.find((x) => x.value === v)!.key}`) : v
  const intakeLabel = (v: string) => INTAKES.find((x) => x.value === v) ? t(`intake.${INTAKES.find((x) => x.value === v)!.key}`) : v

  const setP =
    (key: keyof Personal) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setPersonal((f) => ({ ...f, [key]: e.target.value }))
      setError('')
    }

  const setE =
    (key: keyof Education) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setEducation((f) => ({ ...f, [key]: e.target.value }))
      setError('')
    }

  function validate(target: number) {
    if (target === 1) {
      if (personal.fullName.trim().length < 2) return t('err.name')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(personal.email.trim())) return t('err.email')
      if (!/^[+\d][\d\s-]{7,17}$/.test(personal.mobile.trim())) return t('err.mobile')
    }
    if (target === 2) {
      if (!education.qualification) return t('err.qualification')
      if (education.institute.trim().length < 2) return t('err.institute')
      if (!/^\d{4}$/.test(education.yearOfPassing.trim())) return t('err.year')
    }
    return ''
  }

  /** Saves the current step's slice of the draft, then advances. */
  async function saveAndGo(nextStep: number) {
    if (nextStep > step) {
      const message = validate(step)
      if (message) {
        setError(message)
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          step: nextStep,
          personal,
          education: { ...education, program },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('err.save'))

      setStep(nextStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err.save'))
    } finally {
      setLoading(false)
    }
  }

  async function finalSubmit() {
    if (!consent) {
      setError(t('err.consent'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const appRes = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          step: 4,
          submit: true,
          personal,
          education: { ...education, program },
        }),
      })
      const appData = await appRes.json()
      if (!appRes.ok) throw new Error(appData.error ?? t('err.submit'))

      const payRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) throw new Error(payData.error ?? t('err.start'))

      // Paid course with a live gateway: collect payment, then confirm it
      // server-side before we treat the student as enrolled.
      if (payData.requiresPayment) {
        try {
          const result = await openRazorpayCheckout(payData.razorpay)
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              signature: result.razorpay_signature,
            }),
          })
          const verifyData = await verifyRes.json()
          if (!verifyRes.ok) throw new Error(verifyData.error ?? t('err.verify'))
        } catch (payErr) {
          if (payErr instanceof Error && payErr.message === CHECKOUT_CANCELLED) {
            setError(t('err.cancelled'))
            return
          }
          throw payErr
        }
      }

      setDone(true)
      router.refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err.submit'))
    } finally {
      setLoading(false)
    }
  }

  /* ----------------------------------------------------------- success */
  if (done) {
    return (
      <div className="mx-auto max-w-xl py-6">
        <div className="card-base holo-ring overflow-hidden text-center">
          <div className="border-b border-border bg-emerald-50/70 p-8 dark:bg-emerald-500/10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lift">
              <Check className="h-8 w-8" strokeWidth={3} />
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
              {t('submittedTitle')}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
              {t.rich('submittedBody', {
                course: course.title,
                b: (chunks) => <span className="font-bold text-foreground">{chunks}</span>,
              })}
            </p>
          </div>

          <div className="p-5">
            <dl className="grid grid-cols-2 gap-4 text-left">
              <SummaryRow label={t('sumProgramme')} value={course.title} />
              <SummaryRow label={t('sumUniversity')} value={course.universityName} />
              <SummaryRow label={t('sumIntake')} value={intakeLabel(program.intake)} />
              <SummaryRow label={t('sumStatus')} value={t('statusValue')} />
            </dl>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href={`/dashboard/learn/${course.id}`}
                className={buttonVariants({ variant: 'holo', className: 'w-full sm:flex-1' })}
              >
                {t('goClassroom')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: 'outline', className: 'w-full sm:flex-1' })}
              >
                {t('myDashboard')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* ------------------------------------------------------- header */}
      <div className="card-base holo-ring mb-5 overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <CourseThumb
            stream={course.stream}
            title={course.title}
            compact
            className="h-20 w-full shrink-0 rounded-xl sm:h-16 sm:w-24"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-300">
              {t('heading')}
            </p>
            <h2 className="mt-1 text-balance font-display text-lg font-extrabold tracking-tight sm:text-xl">
              {course.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-2">
              <UniversityMark name={course.universityName} size={20} />
              <span className="truncate text-[12px] font-semibold text-muted-foreground">
                {course.universityName}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="font-display text-lg font-extrabold text-primary-700 dark:text-primary-300">
              {formatINR(course.feePerYear)}
            </p>
            <p className="text-[11px] text-muted-foreground">{t('perYear')}</p>
          </div>
        </div>
      </div>

      {(alreadyEnrolled || alreadySubmitted) && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50 p-3.5 text-[13px] text-primary-800 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {alreadyEnrolled ? t('alreadyEnrolled') : t('alreadySubmitted')}{' '}
            <Link href={`/dashboard/learn/${course.id}`} className="font-bold underline">
              {t('openClassroom')}
            </Link>
            {' '}{t('orContinue')}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------ stepper */}
      <Stepper step={step} />

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="card-base p-4 sm:p-5">
        {/* ------------------------------------------------ step 1 */}
        {step === 1 && (
          <section aria-labelledby="step1-heading">
            <StepHeading
              id="step1-heading"
              title={t('step.personal')}
              sub={t('s1sub')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('fullName')} required className="sm:col-span-2">
                <Input value={personal.fullName} onChange={setP('fullName')} placeholder={t('fullNamePlaceholder')} autoComplete="name" />
              </Field>
              <Field label={t('email')} required>
                <Input type="email" value={personal.email} onChange={setP('email')} placeholder="you@example.com" autoComplete="email" />
              </Field>
              <Field label={t('mobile')} required>
                <Input type="tel" value={personal.mobile} onChange={setP('mobile')} placeholder="+91 98765 43210" autoComplete="tel" />
              </Field>
              <Field label={t('dob')}>
                <Input type="date" value={personal.dob} onChange={setP('dob')} autoComplete="bday" />
              </Field>
              <Field label={t('gender')}>
                <Select value={personal.gender} onChange={setP('gender')}>
                  <option value="">{t('genderNotSpecified')}</option>
                  {GENDERS.map((g) => <option key={g.value} value={g.value}>{t(`gen.${g.key}`)}</option>)}
                </Select>
              </Field>
              <Field label={t('address')} className="sm:col-span-2">
                <Input value={personal.address} onChange={setP('address')} placeholder={t('addressPlaceholder')} autoComplete="street-address" />
              </Field>
              <Field label={t('city')}>
                <Input value={personal.city} onChange={setP('city')} placeholder={t('cityPlaceholder')} autoComplete="address-level2" />
              </Field>
              <Field label={t('state')}>
                <Input value={personal.state} onChange={setP('state')} placeholder={t('statePlaceholder')} autoComplete="address-level1" />
              </Field>
              <Field label={t('pincode')}>
                <Input value={personal.pincode} onChange={setP('pincode')} placeholder="141001" inputMode="numeric" maxLength={6} autoComplete="postal-code" />
              </Field>
            </div>
          </section>
        )}

        {/* ------------------------------------------------ step 2 */}
        {step === 2 && (
          <section aria-labelledby="step2-heading">
            <StepHeading
              id="step2-heading"
              title={t('step.education')}
              sub={t('s2sub')}
            />

            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-muted/50 p-3.5 text-[12.5px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
              <p><span className="font-semibold text-foreground">{t('eligibility')}</span> {course.eligibility}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('qualification')} required>
                <Select value={education.qualification} onChange={setE('qualification')}>
                  <option value="">{t('selectQualification')}</option>
                  {QUALIFICATIONS.map((q) => <option key={q.value} value={q.value}>{t(`qual.${q.key}`)}</option>)}
                </Select>
              </Field>
              <Field label={t('board')}>
                <Input value={education.board} onChange={setE('board')} placeholder={t('boardPlaceholder')} />
              </Field>
              <Field label={t('institute')} required className="sm:col-span-2">
                <Input value={education.institute} onChange={setE('institute')} placeholder={t('institutePlaceholder')} />
              </Field>
              <Field label={t('yearOfPassing')} required>
                <Input value={education.yearOfPassing} onChange={setE('yearOfPassing')} placeholder="2023" inputMode="numeric" maxLength={4} />
              </Field>
              <Field label={t('percentage')} hint={t('percentageHint')}>
                <Input value={education.percentage} onChange={setE('percentage')} placeholder={t('percentagePlaceholder')} maxLength={10} />
              </Field>
            </div>
          </section>
        )}

        {/* ------------------------------------------------ step 3 */}
        {step === 3 && (
          <section aria-labelledby="step3-heading">
            <StepHeading
              id="step3-heading"
              title={t('step.program')}
              sub={t('s3sub')}
            />

            <div className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-balance text-[15px] font-bold">{course.title}</h4>
                  <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{course.subtitle}</p>
                </div>
                {course.discountPct > 0 && (
                  <Badge tone="success">{t('off', { pct: String(course.discountPct) })}</Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="chip">{levelLabel}</span>
                <span className="chip">{modeLabel}</span>
                <span className="chip">{t('years', { n: course.durationYears })}</span>
                <span className="chip">{course.examMode}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('preferredIntake')} required>
                <Select
                  value={program.intake}
                  onChange={(e) => setProgram((p) => ({ ...p, intake: e.target.value }))}
                >
                  {INTAKES.map((i) => <option key={i.value} value={i.value}>{t(`intake.${i.key}`)}</option>)}
                </Select>
              </Field>

              <Field label={t('specialisation')} hint={t('specialisationHint')}>
                <Select
                  value={program.specialisation}
                  onChange={(e) => setProgram((p) => ({ ...p, specialisation: e.target.value }))}
                >
                  {(course.skills.length ? course.skills : ['Core specialisation'])
                    .slice(0, 8)
                    .map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40">
              <Checkbox
                checked={program.emi}
                onChange={(e) => setProgram((p) => ({ ...p, emi: e.target.checked }))}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold">{t('emiLabel')}</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">
                  {t('emiSub', { emi: formatINR(emiMonthly) })}
                </span>
              </span>
            </label>
          </section>
        )}

        {/* ------------------------------------------------ step 4 */}
        {step === 4 && (
          <section aria-labelledby="step4-heading">
            <StepHeading
              id="step4-heading"
              title={t('step.review')}
              sub={t('s4sub')}
            />

            <div className="space-y-4">
              <ReviewBlock
                title={t('reviewPersonal')}
                editLabel={t('edit')}
                onEdit={() => setStep(1)}
                rows={[
                  [t('rowFullName'), personal.fullName],
                  [t('rowEmail'), personal.email],
                  [t('rowMobile'), personal.mobile],
                  [t('rowDob'), personal.dob],
                  [t('rowGender'), genderLabel(personal.gender)],
                  [t('rowCity'), [personal.city, personal.state].filter(Boolean).join(', ')],
                ]}
              />

              <ReviewBlock
                title={t('reviewEducation')}
                editLabel={t('edit')}
                onEdit={() => setStep(2)}
                rows={[
                  [t('rowQualification'), qualLabel(education.qualification)],
                  [t('rowBoard'), education.board],
                  [t('rowInstitution'), education.institute],
                  [t('rowYear'), education.yearOfPassing],
                  [t('rowPercentage'), education.percentage],
                ]}
              />

              <ReviewBlock
                title={t('reviewProgramme')}
                editLabel={t('edit')}
                onEdit={() => setStep(3)}
                rows={[
                  [t('rowCourse'), course.title],
                  [t('rowUniversity'), course.universityName],
                  [t('rowMode'), modeLabel],
                  [t('rowDuration'), t('yearsLower', { n: course.durationYears })],
                  [t('rowIntake'), intakeLabel(program.intake)],
                  [t('rowSpecialisation'), program.specialisation],
                ]}
              />

              {/* ------------------------------------------- fee panel */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                  <Wallet className="h-4 w-4 text-primary-600" />
                  <h4 className="text-[13.5px] font-bold">{t('feeBreakdown')}</h4>
                </div>

                <dl className="divide-y divide-border">
                  <FeeRow label={t('feePerYear')} value={formatINR(course.feePerYear)} />
                  <FeeRow
                    label={t('feeDuration')}
                    value={t('yearsLower', { n: course.durationYears })}
                  />
                  <FeeRow label={t('feeTotal')} value={formatINR(totalFee)} />
                  {savings > 0 && (
                    <FeeRow
                      label={t('feeScholarship')}
                      value={`– ${formatINR(savings)}`}
                      tone="success"
                    />
                  )}
                  <FeeRow label={t('feePayableNow')} value={formatINR(course.feePerYear)} strong />
                </dl>

                <div className="border-t border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-2.5">
                    <Percent className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold">
                        {program.emi ? t('emiSelected') : t('emiAvailable')}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                        {t('emiNote', { emi: formatINR(emiMonthly) })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------ checkout notice */}
              {paidCheckout ? (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-emerald-900 dark:text-emerald-200">
                        {t('securePayTitle')}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-emerald-800 dark:text-emerald-200/90">
                        {t('securePayBody')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
                  <div className="flex items-start gap-2.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-amber-900 dark:text-amber-200">
                        {t('demoPayTitle')}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-amber-800 dark:text-amber-200/90">
                        {t('demoPayBody')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40">
                <Checkbox
                  checked={consent}
                  onChange={(e) => { setConsent(e.target.checked); setError('') }}
                  className="mt-0.5"
                />
                <span className="text-[12.5px] leading-relaxed">
                  {t('consent')}
                </span>
              </label>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------- nav bar */}
        <div className="mt-6 flex flex-col gap-2.5 border-t border-border pt-5 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveAndGo(step - 1)}
            disabled={step === 1 || loading}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('back')}
          </Button>

          <p className="order-last text-center text-[11.5px] text-muted-foreground sm:order-none sm:mx-auto">
            {t('progress', { step })}
          </p>

          {step < 4 ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => saveAndGo(step + 1)}
              loading={loading}
              className="w-full sm:w-auto"
            >
              {t('saveContinue')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="holo"
              onClick={finalSubmit}
              loading={loading}
              className="w-full sm:w-auto"
            >
              {paidCheckout ? <Wallet className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {paidCheckout
                ? t('payEnrol', { fee: formatINR(course.feePerYear) })
                : course.feePerYear > 0
                  ? t('confirmDemo')
                  : t('confirmEnrol')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ bits */

function Stepper({ step }: { step: number }) {
  const t = useTranslations('apply')
  return (
    <ol className="mb-5 flex items-center gap-1.5 sm:gap-2" aria-label={t('heading')}>
      {STEPS.map((s, i) => {
        const state = step > s.n ? 'done' : step === s.n ? 'current' : 'todo'
        const Icon = s.icon
        return (
          <li key={s.n} className={cn('flex min-w-0 items-center gap-1.5 sm:gap-2', i < STEPS.length - 1 && 'flex-1')}>
            <div
              className={cn(
                'flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 transition-all duration-300 sm:px-3',
                state === 'current' && 'border-primary-400 bg-primary-50 dark:bg-primary-500/10',
                state === 'done' && 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10',
                state === 'todo' && 'border-border bg-card',
              )}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold',
                  state === 'current' && 'bg-primary-600 text-white',
                  state === 'done' && 'bg-emerald-500 text-white',
                  state === 'todo' && 'bg-muted text-muted-foreground',
                )}
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span
                className={cn(
                  'truncate text-[12px] font-bold',
                  state === 'current' && 'text-primary-700 dark:text-primary-200',
                  state === 'done' && 'text-emerald-700 dark:text-emerald-300',
                  state === 'todo' && 'text-muted-foreground',
                  // Only the active step keeps its label on small screens.
                  state !== 'current' && 'hidden lg:inline',
                )}
              >
                {t(`step.${s.key}`)}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'h-0.5 flex-1 rounded-full transition-colors duration-500',
                  step > s.n ? 'bg-emerald-400' : 'bg-border',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function StepHeading({ id, title, sub }: { id: string; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h3 id={id} className="font-display text-lg font-extrabold tracking-tight">{title}</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function ReviewBlock({
  title,
  editLabel,
  rows,
  onEdit,
}: {
  title: string
  editLabel: string
  rows: [string, string][]
  onEdit: () => void
}) {
  return (
    <div className="rounded-2xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <h4 className="text-[13.5px] font-bold">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-[12px] font-bold text-primary-600 transition-colors hover:underline"
        >
          {editLabel}
        </button>
      </div>
      <dl className="grid gap-3 p-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 truncate text-[13px] font-semibold">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function FeeRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'success'
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3', strong && 'bg-muted/40')}>
      <dt className={cn('text-[13px]', strong ? 'font-bold' : 'text-muted-foreground')}>{label}</dt>
      <dd
        className={cn(
          'shrink-0 text-[13px] font-bold tabular-nums',
          strong && 'text-base text-primary-700 dark:text-primary-300',
          tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-semibold">{value}</dd>
    </div>
  )
}
