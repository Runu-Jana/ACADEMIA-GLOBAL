import { BookOpen, Briefcase, Code2, Gavel, HeartPulse, Landmark, Palette, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

const streamStyle: Record<string, { grad: string; icon: React.ElementType }> = {
  MANAGEMENT: { grad: 'from-primary-600 via-primary-500 to-holo-indigo', icon: Briefcase },
  IT: { grad: 'from-cyan-500 via-sky-500 to-indigo-500', icon: Code2 },
  ENGINEERING: { grad: 'from-slate-700 via-primary-600 to-cyan-500', icon: Landmark },
  COMMERCE: { grad: 'from-emerald-500 via-teal-500 to-cyan-500', icon: Landmark },
  MEDICAL: { grad: 'from-rose-500 via-pink-500 to-fuchsia-500', icon: HeartPulse },
  LAW: { grad: 'from-amber-500 via-orange-500 to-rose-500', icon: Gavel },
  ARTS: { grad: 'from-violet-500 via-fuchsia-500 to-pink-500', icon: Palette },
  SCIENCE: { grad: 'from-teal-500 via-cyan-500 to-blue-500', icon: FlaskConical },
}

/**
 * Deterministic gradient artwork per stream. Avoids stock photography while
 * still giving each card a distinct, intentional-looking header.
 */
export function CourseThumb({
  stream,
  title,
  className,
  compact,
}: {
  stream: string
  title: string
  className?: string
  compact?: boolean
}) {
  const { grad, icon: Icon } = streamStyle[stream] ?? streamStyle.MANAGEMENT

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', grad, className)}>
      {/* Concentric rings + soft light give the flat gradient some depth. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 [background-image:repeating-radial-gradient(circle_at_18%_120%,rgba(255,255,255,.5)_0,rgba(255,255,255,.5)_1px,transparent_1px,transparent_22px)]"
      />
      <div aria-hidden className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

      <Icon
        aria-hidden
        className={cn(
          'absolute text-white/25',
          compact ? '-bottom-3 -right-2 h-20 w-20' : '-bottom-5 -right-3 h-28 w-28',
        )}
        strokeWidth={1.25}
      />

      {!compact && (
        <p className="absolute inset-x-4 bottom-3 line-clamp-2 text-[13px] font-bold leading-snug text-white drop-shadow-sm">
          {title}
        </p>
      )}
    </div>
  )
}

/** Square initials tile standing in for a university crest. */
export function UniversityMark({
  name,
  size = 28,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const letters = name
    .replace(/\b(University|Online|Global|The)\b/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  // Stable hue from the name so each institution keeps one colour everywhere.
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-lg font-bold text-white', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 72% 48%), hsl(${(hue + 42) % 360} 76% 56%))`,
      }}
      aria-hidden
    >
      {letters}
    </span>
  )
}
