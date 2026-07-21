import Link from 'next/link'
import { ShieldCheck, GraduationCap, Users, Award } from 'lucide-react'
import { Logo } from '@/components/layout/logo'
import { Aurora, GridPattern } from '@/components/fx/aurora'

const proof = [
  { icon: GraduationCap, label: '1,00,000+ Courses' },
  { icon: Users, label: '10 Lakh+ Students' },
  { icon: ShieldCheck, label: 'UGC Entitled Degrees' },
  { icon: Award, label: '1000+ Universities' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* ------------------------------------------------- brand/marketing side */}
      <aside className="relative hidden overflow-hidden bg-primary-900 p-10 text-white lg:flex lg:flex-col">
        <Aurora palette="holo" className="opacity-70" />
        <GridPattern className="opacity-20" />
        <div className="grain absolute inset-0" aria-hidden />

        <div className="relative">
          <Logo invert />
        </div>

        <div className="relative my-auto max-w-md">
          <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.12]">
            Continue your{' '}
            <span className="holo-text">education journey</span>
          </h1>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-white/75">
            Left school or college? It&apos;s never too late. Restart, continue and complete your
            education from Class 10 to PG — with UGC-entitled degrees recognised across India.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {proof.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/[.07] px-3.5 py-3 text-[13px] font-semibold backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-holo-cyan" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} Academia Global Virtual Learning
        </p>
      </aside>

      {/* ------------------------------------------------------------ form side */}
      <main className="relative flex flex-col justify-center overflow-hidden px-5 py-10 sm:px-8">
        <Aurora palette="brand" className="opacity-30 lg:hidden" />
        <div className="relative mx-auto w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our{' '}
            <Link href="/legal/terms" className="font-semibold text-primary-600 hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="font-semibold text-primary-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
