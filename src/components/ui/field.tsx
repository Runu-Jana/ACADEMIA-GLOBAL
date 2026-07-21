import * as React from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground shadow-sm transition-all duration-200 ' +
  'placeholder:text-muted-foreground/70 ' +
  'focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/12 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, 'h-11', className)} {...props} />
  },
)

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, 'min-h-[104px] py-2.5', className)} {...props} />
})

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(base, 'h-11 cursor-pointer pr-9', className)} {...props}>
      {children}
    </select>
  )
})

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('mb-1.5 block text-[13px] font-semibold', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  )
}

export function Field({
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded border-input text-primary-600',
        'focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-0',
        className,
      )}
      {...props}
    />
  )
}
