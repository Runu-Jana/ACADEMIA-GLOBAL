import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Twitter, Youtube, Phone, Mail, MapPin } from 'lucide-react'
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF, SUPPORT_HOURS, HEAD_OFFICE_CITY } from '@/lib/contact'
import { Logo } from './logo'

const columns = [
  {
    title: 'Quick Links',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'All Courses', href: '/courses' },
      { label: 'Universities', href: '/universities' },
      { label: 'Scholarships', href: '/scholarships' },
      { label: 'Exams', href: '/exams' },
      { label: 'Blogs', href: '/blog' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'For Students',
    links: [
      { label: 'Ask Saarthi', href: '/counsellor' },
      { label: 'Admission Process', href: '/courses' },
      { label: 'EMI Options', href: '/scholarships' },
      { label: 'Study Material', href: '/dashboard/materials' },
      { label: 'Placement Support', href: '/about' },
      { label: 'Verify Certificate', href: '/verify' },
      { label: 'FAQs', href: '/about' },
    ],
  },
  {
    title: 'For Universities',
    links: [
      { label: 'Partner With Us', href: '/for-universities' },
      { label: 'List Your Programmes', href: '/for-universities' },
      { label: 'Partner Login', href: '/login' },
      { label: 'Marketing Solutions', href: '/contact' },
      { label: 'Resources', href: '/blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms & Conditions', href: '/legal/terms' },
      { label: 'Refund Policy', href: '/legal/refund' },
      { label: 'Disclaimer', href: '/legal/disclaimer' },
    ],
  },
]

const socials = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
]

export function SiteFooter() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-primary-900 text-white">
      {/* Ambient colour wash + grain so the flat navy doesn't band. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-primary-500/25 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-holo-violet/20 blur-3xl" />
      </div>
      <div className="grain absolute inset-0" aria-hidden />

      <div className="container relative py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)_1.3fr]">
          <div>
            <Logo invert />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              India&apos;s most trusted platform to continue your education journey from school to
              university and achieve your dreams.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3.5 text-sm font-bold">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="inline-block text-[13px] text-white/65 transition-all duration-200 hover:translate-x-0.5 hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-3.5 text-sm font-bold">Talk to Our Experts</h3>
            <ul className="space-y-3.5 text-[13px]">
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-holo-cyan" />
                <span>
                  <a href={SUPPORT_PHONE_HREF} className="font-semibold hover:underline">
                    {SUPPORT_PHONE}
                  </a>
                  <br />
                  <span className="text-white/55">({SUPPORT_HOURS})</span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-holo-cyan" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all hover:underline">
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-holo-cyan" />
                <span className="text-white/70">Head Office: {HEAD_OFFICE_CITY}, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-11 border-t border-white/12 pt-6 text-center text-xs text-white/55">
          © {new Date().getFullYear()} Shiksha Sarthi Virtual Learning. All Rights Reserved.
        </div>
      </div>
    </footer>
  )
}
