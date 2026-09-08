import {
  Atom, Stethoscope, Landmark, Briefcase, GraduationCap, Globe2,
  NotebookPen, PenLine, Ruler, ClipboardCheck, Archive, Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Designed cover art for a product, in the same spirit as CourseThumb: no stock
 * photography, but nothing that reads as an empty placeholder either.
 *
 * Books get a spine and a title block so the tile reads unmistakably as a book
 * at thumbnail size. Stationery gets an oversized icon on a tinted field. Both
 * are keyed off the category, so a shelf looks coherent without anyone
 * uploading a single image — and a real `imageUrl`, once uploaded, takes over.
 */

const categoryStyle: Record<string, { grad: string; icon: React.ElementType }> = {
  ENGINEERING_ENTRANCE: { grad: 'from-slate-700 via-primary-600 to-cyan-500', icon: Atom },
  MEDICAL_ENTRANCE: { grad: 'from-rose-500 via-pink-500 to-fuchsia-500', icon: Stethoscope },
  GOVERNMENT_EXAMS: { grad: 'from-amber-500 via-orange-500 to-rose-500', icon: Landmark },
  MANAGEMENT_ENTRANCE: { grad: 'from-primary-600 via-primary-500 to-holo-indigo', icon: Briefcase },
  SCHOOL_BOARDS: { grad: 'from-emerald-500 via-teal-500 to-cyan-500', icon: GraduationCap },
  GENERAL_STUDIES: { grad: 'from-violet-500 via-fuchsia-500 to-pink-500', icon: Globe2 },
  NOTEBOOKS: { grad: 'from-sky-500 via-blue-500 to-indigo-500', icon: NotebookPen },
  WRITING: { grad: 'from-teal-500 via-cyan-500 to-sky-500', icon: PenLine },
  GEOMETRY: { grad: 'from-indigo-500 via-violet-500 to-purple-500', icon: Ruler },
  EXAM_ESSENTIALS: { grad: 'from-orange-500 via-amber-500 to-yellow-500', icon: ClipboardCheck },
  DESK: { grad: 'from-slate-600 via-slate-500 to-zinc-500', icon: Archive },
}

const fallback = { grad: 'from-primary-600 via-primary-500 to-indigo-500', icon: Package }

export function ProductCover({
  kind,
  category,
  title,
  author,
  imageUrl,
  className,
  compact,
}: {
  kind: string
  category: string
  title: string
  author?: string | null
  imageUrl?: string | null
  className?: string
  compact?: boolean
}) {
  // A real uploaded image always wins over the generated art.
  if (imageUrl) {
    return (
      <div className={cn('relative overflow-hidden bg-muted', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }

  const { grad, icon: Icon } = categoryStyle[category] ?? fallback

  if (kind === 'BOOK') {
    return (
      <div className={cn('relative grid place-items-center overflow-hidden bg-muted/60 p-3', className)}>
        {/* The book itself, standing slightly proud of the shelf background. */}
        <div
          className={cn(
            'relative flex h-full w-full max-w-[8.5rem] flex-col justify-between overflow-hidden rounded-r-md rounded-l-sm bg-gradient-to-br shadow-lift',
            grad,
          )}
        >
          {/* Spine: a darker strip plus a hairline, which is what sells "book". */}
          <div aria-hidden className="absolute inset-y-0 left-0 w-[9px] bg-black/25" />
          <div aria-hidden className="absolute inset-y-0 left-[9px] w-px bg-white/25" />
          <div aria-hidden className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />

          <div className="relative pl-4 pr-2.5 pt-3">
            <Icon aria-hidden className="h-5 w-5 text-white/70" strokeWidth={1.5} />
          </div>

          <div className="relative pb-3 pl-4 pr-2.5">
            <p
              className={cn(
                'font-display font-extrabold leading-tight text-white drop-shadow-sm',
                compact ? 'line-clamp-3 text-[10px]' : 'line-clamp-4 text-[11px]',
              )}
            >
              {title}
            </p>
            {author && !compact && (
              <p className="mt-1 line-clamp-1 text-[9px] font-semibold uppercase tracking-wider text-white/70">
                {author}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Stationery: oversized icon on a tinted field.
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', grad, className)}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.5)_0,rgba(255,255,255,.5)_1px,transparent_1px,transparent_14px)]"
      />
      <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      <Icon
        aria-hidden
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/90',
          compact ? 'h-10 w-10' : 'h-16 w-16',
        )}
        strokeWidth={1.25}
      />
    </div>
  )
}
