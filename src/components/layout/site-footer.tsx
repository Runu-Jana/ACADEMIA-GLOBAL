import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Facebook, Instagram, Linkedin, Twitter, Youtube, Phone, Mail, MapPin } from 'lucide-react'
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF, SUPPORT_HOURS, HEAD_OFFICE_CITY } from '@/lib/contact'
import { Logo } from './logo'

// Labels live in messages (footer.links.*); hrefs stay in code.
const columns = [
  {
    titleKey: 'quickLinks',
    links: [
      { key: 'about', href: '/about' },
      { key: 'courses', href: '/courses' },
      { key: 'universities', href: '/universities' },
      { key: 'pricing', href: '/pricing' },
      { key: 'scholarships', href: '/scholarships' },
      { key: 'exams', href: '/exams' },
      { key: 'shop', href: '/shop' },
      { key: 'blogs', href: '/blog' },
      { key: 'contact', href: '/contact' },
    ],
  },
  {
    titleKey: 'forStudents',
    links: [
      { key: 'askSarthi', href: '/counsellor' },
      { key: 'admission', href: '/courses' },
      { key: 'pricingEmi', href: '/pricing' },
      { key: 'material', href: '/dashboard/materials' },
      { key: 'placement', href: '/about' },
      { key: 'verify', href: '/verify' },
      { key: 'faqs', href: '/about' },
    ],
  },
  {
    titleKey: 'forUniversities',
    links: [
      { key: 'partner', href: '/for-universities' },
      { key: 'listProgrammes', href: '/for-universities' },
      { key: 'partnerLogin', href: '/login' },
      { key: 'marketing', href: '/contact' },
      { key: 'resources', href: '/blog' },
    ],
  },
  {
    titleKey: 'legal',
    links: [
      { key: 'privacy', href: '/legal/privacy' },
      { key: 'terms', href: '/legal/terms' },
      { key: 'refund', href: '/legal/refund' },
      { key: 'disclaimer', href: '/legal/disclaimer' },
    ],
  },
] as const

const socials = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
]

export async function SiteFooter() {
  const t = await getTranslations('footer')
  return (
    // pb-20 clears the fixed mobile tab bar. <main> already reserves that space,
    // but the footer is its sibling, so without this the bar sat on top of the
    // last row — the legal links were visible but not tappable.
    <footer className="relative mt-20 overflow-hidden bg-primary-900 pb-20 text-white lg:pb-0">
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
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{t('tagline')}</p>
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
            <div key={col.titleKey}>
              <h3 className="mb-3.5 text-sm font-bold">{t(col.titleKey)}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.key}>
                    <Link
                      href={l.href}
                      className="inline-block text-[13px] text-white/65 transition-all duration-200 hover:translate-x-0.5 hover:text-white"
                    >
                      {t(`links.${l.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-3.5 text-sm font-bold">{t('experts')}</h3>
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
                <span className="text-white/70">{t('headOffice', { city: HEAD_OFFICE_CITY })}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-11 border-t border-white/12 pt-6 text-center text-xs text-white/55">
          {t('rights', { year: String(new Date().getFullYear()) })}
        </div>
      </div>
    </footer>
  )
}
