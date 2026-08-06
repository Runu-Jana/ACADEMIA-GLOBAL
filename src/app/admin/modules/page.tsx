import type { Metadata } from 'next'
import Link from 'next/link'
import { Layers3, ArrowRight, Plus } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/fx/reveal'
import { PageHeader } from '@/components/admin/admin-ui'
import { FilterBar } from '@/components/admin/filter-bar'
import { STREAMS } from '@/lib/constants'

export const metadata: Metadata = { title: 'Modules & Lessons' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminModulesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q : ''
  const stream = typeof sp.stream === 'string' ? sp.stream : ''

  const where: Prisma.CourseWhereInput = {
    ...(q && { OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] }),
    ...(stream && { stream }),
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      slug: true,
      stream: true,
      level: true,
      university: { select: { shortName: true } },
      modules: {
        orderBy: [{ order: 'asc' }],
        select: { id: true, title: true, _count: { select: { lessons: true } } },
      },
    },
  })

  return (
    <>
      <PageHeader
        title="Modules & Lessons"
        sub="Pick a course to build out its curriculum."
        actions={
          <Link href="/admin/courses/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Plus className="h-3.5 w-3.5" />
            New Course
          </Link>
        }
      />

      <FilterBar
        basePath="/admin/modules"
        values={{ q, stream }}
        searchPlaceholder="Search courses…"
        selects={[{ name: 'stream', label: 'All streams', options: STREAMS.map((s) => ({ ...s })) }]}
      />

      {courses.length === 0 ? (
        <p className="card-base p-10 text-center text-sm text-muted-foreground">
          No courses match those filters.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c, i) => {
            const lessons = c.modules.reduce((n, m) => n + m._count.lessons, 0)
            return (
              <Reveal key={c.id} delay={Math.min(i * 40, 240)} className="h-full">
                <Link
                  href={`/admin/courses/${c.id}`}
                  className="card-base card-hover holo-ring holo-ring-hover flex h-full flex-col p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-[14px] font-bold leading-snug">{c.title}</h3>
                      <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                        {c.university.shortName} · {c.level}
                      </p>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                      <Layers3 className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={c.modules.length ? 'primary' : 'warning'}>
                      {c.modules.length} module{c.modules.length === 1 ? '' : 's'}
                    </Badge>
                    <Badge tone={lessons ? 'cyan' : 'default'}>
                      {lessons} lesson{lessons === 1 ? '' : 's'}
                    </Badge>
                  </div>

                  {c.modules.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-border pt-3">
                      {c.modules.slice(0, 3).map((m) => (
                        <li key={m.id} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-primary-400" aria-hidden />
                          <span className="truncate">{m.title}</span>
                        </li>
                      ))}
                      {c.modules.length > 3 && (
                        <li className="text-[11.5px] text-muted-foreground">
                          + {c.modules.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}

                  <span className="mt-auto flex items-center gap-1 pt-3 text-[12px] font-bold text-primary-600">
                    Manage curriculum
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </Reveal>
            )
          })}
        </div>
      )}
    </>
  )
}
