import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Logo({
  className,
  compact,
  invert,
}: {
  className?: string
  compact?: boolean
  invert?: boolean
}) {
  return (
    <Link href="/" className={cn('group flex shrink-0 items-center gap-2.5', className)}>
      <span className="relative grid h-10 w-10 place-items-center">
        <span className="absolute inset-0 rounded-xl bg-brand-fade shadow-glow transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:rotate-6" />
        <span className="absolute inset-0 rounded-xl bg-holo-sweep opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-70" />
        <svg viewBox="0 0 24 24" className="relative h-5 w-5 text-white" fill="none" aria-hidden>
          <path
            d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"
            fill="currentColor"
            fillOpacity=".95"
          />
          <path
            d="M6 10.5v4.2c0 .7.4 1.4 1.1 1.7 1.5.8 3.2 1.2 4.9 1.2s3.4-.4 4.9-1.2c.7-.3 1.1-1 1.1-1.7v-4.2"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path d="M21 7.5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>

      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-[17px] font-extrabold tracking-tight',
              invert ? 'text-white' : 'text-primary-800 dark:text-white',
            )}
          >
            ACADEMIA
          </span>
          <span
            className={cn(
              'text-[8.5px] font-bold uppercase tracking-[.155em]',
              invert ? 'text-white/70' : 'text-primary-500 dark:text-primary-300',
            )}
          >
            Global Virtual Learning
          </span>
        </span>
      )}
    </Link>
  )
}
