# Shiksha Sarthi — Virtual Learning Platform

A responsive web app **and installable mobile app (PWA)** for an online/distance education
platform: students browse programmes, apply, enrol, study through an LMS, download material
uploaded by admins, take assessments and earn certificates. Admins manage the catalogue and
upload course material.

One Next.js codebase serves the desktop site, the mobile web experience, and the installable
app — and the same API layer would back a native React Native client later.

---

## Quick start

```bash
cd academia-global
npm install
cp .env.example .env   # then fill in AUTH_SECRET at minimum
docker compose up -d   # local Postgres on 127.0.0.1:5544
npm run setup          # prisma generate + db push + seed
npm run dev            # http://localhost:3000
```

The app runs on **Postgres**. `docker compose up -d` starts one locally; in production
point `DATABASE_URL` at a managed instance (Neon, Supabase, RDS…). `npm run setup` then
pushes the schema, seeds the catalogue, and writes real, downloadable PDF study material
into `public/uploads/seed/`.

Both `npm run dev` and `npm run build` use **Turbopack**. That is deliberate — webpack
cannot build this repo from a path containing an apostrophe (Next's metadata-route loader
interpolates the file path into a single-quoted string unescaped, which breaks on
`robots.ts` and `sitemap.ts`).

To run the test suite you also need the test database, created once with:

```bash
docker exec shiksha-sarthi-db psql -U shiksha -d shiksha_sarthi -c "CREATE DATABASE shiksha_sarthi_test;"
```

### Sign in

| Role | Email | Password |
|---|---|---|
| Admin | `admin@academiaglobal.in` | `Admin@123` |
| Student | `rahul@student.in` | `Student@123` |
| Student | `priya@student.in` | `Student@123` |

The login screen has one-click buttons to fill these in — **in development only**. A
production build drops that panel, and the credentials with it, so the seeded admin is
never advertised to real visitors.

---

## What's in the box

**Public** — homepage, course search with faceted filters, course detail, university profiles,
course comparison, AI-style course counsellor, certificate verification, exams, scholarships,
about/contact/blog, legal pages.

**Student** — dashboard with progress, LMS with module/lesson player and completion tracking,
study-material library with downloads, timed quizzes with server-side scoring, auto-issued
certificates, profile, and a 4-step admission wizard.

**Admin** — dashboard metrics, course/module/lesson CRUD, **study-material upload** (validated
file type + size, sanitised filenames), student and enrolment views, application review.

**Platform** — cookie-session auth (JWT via `jose`, bcrypt hashes), middleware route guards,
role-based access, dark mode, PWA with offline fallback, and a 3D/holographic design system.

---

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3.4 · Prisma 6 + Postgres ·
`jose` · `bcryptjs` · `zod` · `lucide-react` · Vitest

```
src/
  app/
    (site)/      public pages — header, footer, mobile tab bar
    (auth)/      login, signup
    dashboard/   student area (auth-gated)
    admin/       admin panel (role-gated)
    apply/       admission wizard
    api/         route handlers
  components/
    ui/          Button, Badge, Card, Field, Progress, Stars
    fx/          TiltCard, Reveal, Aurora, CountUp
    course/      CourseCard, CourseThumb, UniversityMark
    layout/      header, footer, mobile tab bar, logo, theme toggle
    home/        homepage sections
  lib/           prisma, auth, session, utils, constants
prisma/          schema + seed
docs/            DESIGN-SYSTEM.md — read before adding UI
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Prisma generate + production build |
| `npm run setup` | Generate + push schema + seed |
| `npm run db:reset` | Wipe and re-seed |
| `npm run db:studio` | Prisma Studio |

---

## Design system

See [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) before adding UI. Highlights:

- **Holographic layer** — `holo-ring` (animated conic border), `holo-text`, `holo-sheen`,
  `holo-surface`, `bg-holo-sweep`, `shadow-glow-holo`.
- **3D** — `TiltCard` tracks the pointer and applies perspective rotation plus a specular
  glare, writing transforms straight to the DOM (no re-render per frame). Disabled on touch
  devices and under `prefers-reduced-motion`.
- **Motion discipline** — decorative animation never scales a blurred element (that forces
  the compositor to re-rasterize every frame); blurred layers translate only.
- Full light/dark theming through CSS variables, applied before first paint to avoid a flash.

---

## Before you ship

These are deliberate scope edges in the current build, not oversights:

1. **Replace the seeded content.** University profiles, ratings, recruiter lists and
   testimonials are illustrative sample data. Publishing them as fact would misrepresent real
   institutions.
2. **Swap the PWA icons.** `public/icons/*.svg` are placeholders; generate real PNG icons
   (192/512) for the widest install support.
3. **Set a real `AUTH_SECRET`** in the environment. The committed dev value is not a secret.
4. **Move uploads off local disk.** Files live in `storage/uploads/` and are served only
   through `/api/materials/[id]/download`, which verifies enrolment — but local disk
   doesn't survive most serverless deploys. Move the bytes to S3/R2/UploadThing and keep
   the same authorization check in front (issue short-lived signed URLs rather than
   public ones).
5. **Set the real contact details.** `src/lib/contact.ts` holds the support email, the
   partnerships email and the helpline that appear across the site, the dashboard, the
   legal pages and the printed brochure. The committed values are placeholders.
6. **Wire real email** for the contact form and admission notifications.
7. **The counsellor is a rule-based recommender** over your own course table, not an LLM.
   It's labelled as such in the UI. Swap in a model API if you want open-ended answers.
8. **Payment is a labelled mock.** No card data is collected anywhere. Integrate a PCI-compliant
   gateway (Razorpay/PayU) before taking money.
9. **Have the legal pages reviewed by counsel** — they're plain-language placeholders.

## Known environment note

This project lives inside a OneDrive-synced folder. OneDrive intermittently locks
`.next/cache` files, producing harmless `ENOENT ... rename ... .pack.gz` warnings during dev.
Moving the project outside OneDrive (or excluding `.next` from sync) removes the noise.
