# Academia Global — Design System & Conventions

Read this before writing any page. Everything below already exists — **import it, do not
re-implement it, and do not add new dependencies.**

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3.4 · Prisma 6 + SQLite ·
lucide-react icons. Path alias `@/*` → `src/*`.

## Hard rules

1. **Never pass a function as a prop from a server component to a client component.**
   React can't serialise it and the page 500s. Use string/enum props instead.
2. Tailwind opacity modifiers must use the default scale (`/5 /10 /20 /25 /30 /40 /50
   /60 /70 /75 /80 /90 /95`). For anything else use bracket syntax: `bg-white/[.07]`.
   A non-scale value inside `@apply` is a **build error**.
3. Spacing scale additions available: `4.5`, `5.5`, `13`, `18`, `112`.
4. Server components do data access via `prisma` directly. Only reach for an API route
   when the browser needs to mutate.
5. `Json` columns come back as `unknown` — narrow with `asList()` from `@/lib/utils`.
6. Every page must work at 360px wide. Test mentally: no horizontal scroll, tap targets
   ≥ 40px, tables scroll inside `overflow-x-auto`.
7. Pages under `/dashboard`, `/admin`, `/apply` are already auth-gated by `middleware.ts`.
   Still call `requireUser()` / `requireAdmin()` in the page for the typed user object.

## Components

### UI primitives

```tsx
import { Button, buttonVariants } from '@/components/ui/button'
// variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'holo' | 'glass' | 'danger'
// size: 'sm' | 'md' | 'lg' | 'icon'   props: loading?: boolean
<Button variant="holo" size="lg" loading={busy}>Save</Button>
// For links, use the class helper — there is no `asChild`:
<Link href="/x" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Go</Link>

import { Badge } from '@/components/ui/badge'
// tone: 'default'|'primary'|'success'|'warning'|'danger'|'violet'|'cyan'|'orange'|'holo'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
         SectionTitle } from '@/components/ui/card'
<Card holo hover className="p-5">…</Card>
<SectionTitle eyebrow="Programs" title="Explore" sub="…" center action={<Link .../>} />

import { Input, Textarea, Select, Label, Field, Checkbox } from '@/components/ui/field'
<Field label="Full name" required error={err} hint="…"><Input … /></Field>

import { Progress, ProgressRing } from '@/components/ui/progress'
<Progress value={68} holo />
<ProgressRing value={68} size={72} />

import { Stars } from '@/components/ui/stars'
<Stars rating={4.5} count={2345} size={13} />
```

### Effects (all client components — safe to use inside server pages)

```tsx
import { TiltCard } from '@/components/fx/tilt-card'      // 3D pointer tilt + glare
<TiltCard className="group h-full" intensity={8}>…</TiltCard>

import { Reveal } from '@/components/fx/reveal'           // scroll-in animation
<Reveal delay={80}>…</Reveal>

import { Aurora, GridPattern } from '@/components/fx/aurora'
<Aurora palette="brand|holo|warm|cool" density={3} />     // decorative, absolute, z-0

import { CountUp } from '@/components/fx/count-up'
<CountUp to={1000} suffix="+" format="number|compact" />  // format is a STRING
```

### Domain

```tsx
import { CourseCard, type CourseCardData } from '@/components/course/course-card'
<CourseCard course={c} tilt />
// Required select shape (see `courseSelect` in src/app/(site)/page.tsx):
// id, slug, title, mode, stream, level, durationYears, feePerYear, originalFee,
// discountPct, rating, reviews, isUgcEntitled, hasPlacement, hasLiveClass,
// university: { name, shortName, slug }

import { CourseThumb, UniversityMark } from '@/components/course/course-thumb'
<CourseThumb stream={c.stream} title={c.title} className="h-36" />
<UniversityMark name={u.name} size={28} />

import { useCompare } from '@/lib/use-compare'   // client only
const { ids, count, has, toggle, remove, clear } = useCompare()
```

### Helpers

```ts
import { cn, formatINR, formatCount, formatDate, formatBytes, initials, asList, pct }
  from '@/lib/utils'
import { COURSE_LEVELS, COURSE_MODES, STREAMS, MATERIAL_TYPES, DURATION_BUCKETS,
         FEE_BUCKETS, POPULAR_EXAMS } from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireUser, requireAdmin, getSession } from '@/lib/auth'
```

## Visual language

- **Surfaces**: `card-base` (+ `card-hover`), `glass`, `glass-strong`, `chip`.
- **Holographic**: `holo-ring` (animated conic border), `holo-ring-hover` (only on hover),
  `holo-text` (gradient wordmark), `holo-surface` (iridescent wash), `holo-sheen`
  (light sweep on hover), `bg-holo-sweep`, `shadow-glow-holo`.
- **Depth**: `shadow-soft` → `shadow-card` → `shadow-lift`; `shadow-glow` for primary CTAs.
- **Motion**: `animate-fade-up`, `animate-scale-in`, `animate-float`, `animate-gradient-x`,
  `animate-pulse-glow`, `animate-shimmer`, `ease-spring`.
  Keep continuous animation to *decorative* layers only, and never animate
  `transform: scale` on a blurred element (forces a re-rasterize every frame).
- **Colour**: brand `primary-*` (600 is the action blue); holographic accents
  `holo-cyan/sky/indigo/violet/fuchsia/mint`; semantic `accent-orange/green/pink/amber`.
- Dark mode is class-based and already wired — use `dark:` variants on custom colours.
  Theme tokens (`bg-card`, `text-muted-foreground`, `border-border`) adapt automatically,
  so prefer those over hard-coded slate/white values.

## Data model quick reference

`User(role STUDENT|ADMIN)` · `University` · `Course` → `Module` → `Lesson`
`Material(type PDF|NOTES|TEST_PAPER|SYLLABUS|ASSIGNMENT|RECORDING)` attaches to a Course
and optionally a Module. `Test` → `Question` → `TestAttempt`.
`Enrollment(userId, courseId, progressPct, status)` · `LessonProgress(userId, lessonId)`
· `Application` · `Certificate(serial)` · `Review` · `ChatMessage`.

Uploaded files live in `public/uploads/` and are served at `/uploads/...`.

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@academiaglobal.in` | `Admin@123` |
| Student | `rahul@student.in` | `Student@123` |
| Student | `priya@student.in` | `Student@123` |
