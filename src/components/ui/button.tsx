import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'holo' | 'glass' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white shadow-glow hover:bg-primary-700 hover:shadow-lift active:scale-[.98]',
  secondary:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-500/15 dark:text-primary-200 dark:hover:bg-primary-500/25',
  outline:
    'border border-border bg-transparent text-foreground hover:border-primary-300 hover:bg-primary-50/60 dark:hover:bg-primary-500/10',
  ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  // Primary CTA: deep gradient fill, with a light sweep only on hover.
  holo:
    'holo-sheen bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 text-white shadow-glow hover:from-primary-800 hover:via-primary-700 hover:to-indigo-700 hover:shadow-lift active:scale-[.98]',
  glass: 'glass text-foreground hover:bg-white/80 dark:hover:bg-white/10',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-[.98]',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
}

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    'relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold',
    'transition-all duration-300 ease-spring',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
})
