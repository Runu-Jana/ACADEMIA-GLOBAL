import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({
  className,
  holo,
  hover,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { holo?: boolean; hover?: boolean }) {
  return (
    <div
      className={cn(
        'card-base',
        hover && 'card-hover',
        holo && 'holo-ring holo-ring-hover',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-bold leading-snug', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-3 p-5 pt-0', className)} {...props} />
}

/** Section heading used across marketing pages. */
export function SectionTitle({
  eyebrow,
  title,
  sub,
  center,
  action,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  sub?: string
  center?: boolean
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        center && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', center && 'mx-auto text-center')}>
        {eyebrow && (
          <span className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-primary-600 dark:text-primary-300">
            <span className="h-px w-6 bg-primary-400" />
            {eyebrow}
          </span>
        )}
        <h2 className="text-balance text-2xl font-extrabold sm:text-3xl lg:text-[2rem]">{title}</h2>
        {sub && <p className="mt-2 text-pretty text-sm text-muted-foreground sm:text-[15px]">{sub}</p>}
      </div>
      {action}
    </div>
  )
}
