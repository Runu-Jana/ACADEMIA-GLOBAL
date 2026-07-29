'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check, ChevronLeft, ChevronRight, AlertCircle, GraduationCap, User as UserIcon,
  BookOpen, Wallet, ShieldCheck, Sparkles, Info, ArrowRight, Percent, CalendarDays,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input, Select, Checkbox } from '@/components/ui/field'
import { CourseThumb, UniversityMark } from '@/components/course/course-thumb'
import { COURSE_LEVELS, COURSE_MODES } from '@/lib/constants'
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
  { n: 1, label: 'Personal Details', icon: UserIcon },
  { n: 2, label: 'Education Details', icon: BookOpen },
  { n: 3, label: 'Program Selection', icon: GraduationCap },
  { n: 4, label: 'Review & Payment', icon: Wallet },
]

const QUALIFICATIONS = [
  'Class 10', 'Class 12', 'Diploma', 'Undergraduate (UG)',
  'Postgraduate (PG)', 'Other',
]

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']

const INTAKES = ['January 2026', 'April 2026', 'July 2026', 'October 2026']

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
    intake: initialProgram.intake ?? INTAKES[0],
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

  const levelLabel = COURSE_LEVELS.find((l) => l.value === course.level)?.label ?? course.level
  const modeLabel = COURSE_MODES.find((m) => m.value === course.mode)?.label ?? course.mode

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
      if (personal.fullName.trim().length < 2) return 'Please enter your full name.'
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(personal.email.trim())) return 'Enter a valid email address.'
      if (!/^[+\d][\d\s-]{7,17}$/.test(personal.mobile.trim())) return 'Enter a valid mobile number.'
    }
    if (target === 2) {
      if (!education.qualification) return 'Select your highest qualification.'
      if (education.institute.trim().length < 2) return 'Enter your school or college name.'
      if (!/^\d{4}$/.test(education.yearOfPassing.trim())) return 'Enter the year of passing as 4 digits.'
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
      if (!res.ok) throw new Error(data.error ?? 'Could not save your application')

      setStep(nextStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your application')
    } finally {
      setLoading(false)
    }
  }

  async function finalSubmit() {
    if (!consent) {
      setError('Please confirm the declaration before submitting.')
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
      if (!appRes.ok) throw new Error(appData.error ?? 'Could not submit your application')

      const payRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) throw new Error(payData.error ?? 'Could not start your enrolment')

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
          if (!verifyRes.ok) throw new Error(verifyData.error ?? 'We could not confirm your payment')
        } catch (payErr) {
          if (payErr instanceof Error && payErr.message === CHECKOUT_CANCELLED) {
            setError('Payment was cancelled. Your application is saved — you can pay to enrol any time.')
            return
          }
          throw payErr
        }
      }

      setDone(true)
      router.refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your application')
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
              Application submitted
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
              You&rsquo;re enrolled in <span className="font-bold text-foreground">{course.title}</span>.
              Your classroom, study material and tests are ready now.
            </p>
          </div>

          <div className="p-5">
            <dl className="grid grid-cols-2 gap-4 text-left">
              <SummaryRow label="Programme" value={course.title} />
              <SummaryRow label="University" value={course.universityName} />
              <SummaryRow label="Intake" value={program.intake} />
              <SummaryRow label="Status" value="Submitted · Under review" />
            </dl>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href={`/dashboard/learn/${course.id}`}
                className={buttonVariants({ variant: 'holo', className: 'w-full sm:flex-1' })}
              >
                Go to Classroom
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: 'outline', className: 'w-full sm:flex-1' })}
              >
                My Dashboard
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
              Admission Application
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
            <p className="text-[11px] text-muted-foreground">per year</p>
          </div>
        </div>
      </div>

      {(alreadyEnrolled || alreadySubmitted) && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50 p-3.5 text-[13px] text-primary-800 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {alreadyEnrolled
              ? 'You are already enrolled in this programme. '
              : 'You have already submitted an application for this programme. '}
            <Link href={`/dashboard/learn/${course.id}`} className="font-bold underline">
              Open the classroom
            </Link>
            {' '}or continue reviewing your details below.
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
              title="Personal Details"
              sub="Prefilled from your account — correct anything that has changed."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required className="sm:col-span-2">
                <Input value={personal.fullName} onChange={setP('fullName')} placeholder="As per your Class 10 certificate" autoComplete="name" />
              </Field>
              <Field label="Email address" required>
                <Input type="email" value={personal.email} onChange={setP('email')} placeholder="you@example.com" autoComplete="email" />
              </Field>
              <Field label="Mobile number" required>
                <Input type="tel" value={personal.mobile} onChange={setP('mobile')} placeholder="+91 98765 43210" autoComplete="tel" />
              </Field>
              <Field label="Date of birth">
                <Input type="date" value={personal.dob} onChange={setP('dob')} autoComplete="bday" />
              </Field>
              <Field label="Gender">
                <Select value={personal.gender} onChange={setP('gender')}>
                  <option value="">Not specified</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={personal.address} onChange={setP('address')} placeholder="House / street / locality" autoComplete="street-address" />
              </Field>
              <Field label="City">
                <Input value={personal.city} onChange={setP('city')} placeholder="e.g. Ludhiana" autoComplete="address-level2" />
              </Field>
              <Field label="State">
                <Input value={personal.state} onChange={setP('state')} placeholder="e.g. Punjab" autoComplete="address-level1" />
              </Field>
              <Field label="PIN code">
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
              title="Education Details"
              sub="Tell us what you have completed so far. Documents are verified later by the university."
            />

            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-muted/50 p-3.5 text-[12.5px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
              <p><span className="font-semibold text-foreground">Eligibility:</span> {course.eligibility}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Highest qualification" required>
                <Select value={education.qualification} onChange={setE('qualification')}>
                  <option value="">Select qualification</option>
                  {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                </Select>
              </Field>
              <Field label="Board / University">
                <Input value={education.board} onChange={setE('board')} placeholder="e.g. CBSE, PSEB, Panjab University" />
              </Field>
              <Field label="School / College name" required className="sm:col-span-2">
                <Input value={education.institute} onChange={setE('institute')} placeholder="Name of your last institution" />
              </Field>
              <Field label="Year of passing" required>
                <Input value={education.yearOfPassing} onChange={setE('yearOfPassing')} placeholder="2023" inputMode="numeric" maxLength={4} />
              </Field>
              <Field label="Percentage / CGPA" hint="Optional — helps with scholarship eligibility">
                <Input value={education.percentage} onChange={setE('percentage')} placeholder="e.g. 78%" maxLength={10} />
              </Field>
            </div>
          </section>
        )}

        {/* ------------------------------------------------ step 3 */}
        {step === 3 && (
          <section aria-labelledby="step3-heading">
            <StepHeading
              id="step3-heading"
              title="Program Selection"
              sub="Confirm the programme, your preferred intake and how you'd like to pay."
            />

            <div className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-balance text-[15px] font-bold">{course.title}</h4>
                  <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{course.subtitle}</p>
                </div>
                {course.discountPct > 0 && (
                  <Badge tone="success">{course.discountPct}% OFF</Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="chip">{levelLabel}</span>
                <span className="chip">{modeLabel}</span>
                <span className="chip">{course.durationYears} {course.durationYears === 1 ? 'Year' : 'Years'}</span>
                <span className="chip">{course.examMode}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Preferred intake" required>
                <Select
                  value={program.intake}
                  onChange={(e) => setProgram((p) => ({ ...p, intake: e.target.value }))}
                >
                  {INTAKES.map((i) => <option key={i} value={i}>{i}</option>)}
                </Select>
              </Field>

              <Field label="Specialisation interest" hint="Used to plan your electives">
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
                <span className="block text-[13.5px] font-bold">I&rsquo;d like to pay in monthly instalments</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">
                  Approximately {formatINR(emiMonthly)}/month for 12 months at 0% interest, subject to approval.
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
              title="Review & Payment"
              sub="Check your details, then confirm your enrolment."
            />

            <div className="space-y-4">
              <ReviewBlock
                title="Personal details"
                onEdit={() => setStep(1)}
                rows={[
                  ['Full name', personal.fullName],
                  ['Email', personal.email],
                  ['Mobile', personal.mobile],
                  ['Date of birth', personal.dob],
                  ['Gender', personal.gender],
                  ['City', [personal.city, personal.state].filter(Boolean).join(', ')],
                ]}
              />

              <ReviewBlock
                title="Education details"
                onEdit={() => setStep(2)}
                rows={[
                  ['Qualification', education.qualification],
                  ['Board / University', education.board],
                  ['Institution', education.institute],
                  ['Year of passing', education.yearOfPassing],
                  ['Percentage / CGPA', education.percentage],
                ]}
              />

              <ReviewBlock
                title="Programme"
                onEdit={() => setStep(3)}
                rows={[
                  ['Course', course.title],
                  ['University', course.universityName],
                  ['Mode', modeLabel],
                  ['Duration', `${course.durationYears} ${course.durationYears === 1 ? 'year' : 'years'}`],
                  ['Intake', program.intake],
                  ['Specialisation', program.specialisation],
                ]}
              />

              {/* ------------------------------------------- fee panel */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                  <Wallet className="h-4 w-4 text-primary-600" />
                  <h4 className="text-[13.5px] font-bold">Fee breakdown</h4>
                </div>

                <dl className="divide-y divide-border">
                  <FeeRow label="Programme fee (per year)" value={formatINR(course.feePerYear)} />
                  <FeeRow
                    label={`Duration`}
                    value={`${course.durationYears} ${course.durationYears === 1 ? 'year' : 'years'}`}
                  />
                  <FeeRow label="Total programme fee" value={formatINR(totalFee)} />
                  {savings > 0 && (
                    <FeeRow
                      label="Scholarship / discount applied"
                      value={`– ${formatINR(savings)}`}
                      tone="success"
                    />
                  )}
                  <FeeRow label="Payable now (Year 1)" value={formatINR(course.feePerYear)} strong />
                </dl>

                <div className="border-t border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-2.5">
                    <Percent className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold">
                        EMI option {program.emi ? '(selected)' : '(available)'}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                        {formatINR(emiMonthly)} × 12 months at 0% interest on the Year 1 fee.
                        Instalment plans are confirmed by the university finance team after admission.
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
                        Secure payment · powered by Razorpay
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-emerald-800 dark:text-emerald-200/90">
                        Confirming opens a secure Razorpay window to pay the Year 1 fee by card, UPI,
                        net-banking or EMI. Your classroom unlocks the moment payment is confirmed. You
                        won&rsquo;t be charged until you complete the payment.
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
                        Demonstration checkout — no payment is taken
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-amber-800 dark:text-amber-200/90">
                        No card, UPI or bank details are collected and no money changes hands.
                        Confirming records your application and opens your classroom so you can explore
                        the programme.
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
                  I declare that the information provided is accurate to the best of my knowledge and
                  agree to Academia Global&rsquo;s admission terms.
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
            Back
          </Button>

          <p className="order-last text-center text-[11.5px] text-muted-foreground sm:order-none sm:mx-auto">
            Step {step} of 4 · your progress is saved automatically
          </p>

          {step < 4 ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => saveAndGo(step + 1)}
              loading={loading}
              className="w-full sm:w-auto"
            >
              Save & Continue
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
                ? `Pay ${formatINR(course.feePerYear)} & Enrol`
                : course.feePerYear > 0
                  ? 'Confirm Enrolment (demo)'
                  : 'Confirm Enrolment'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ bits */

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-5 flex items-center gap-1.5 sm:gap-2" aria-label="Application progress">
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
                {s.label}
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
  rows,
  onEdit,
}: {
  title: string
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
          Edit
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
