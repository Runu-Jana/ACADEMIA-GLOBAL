'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string }

/**
 * A fully themed, accessible single-select dropdown.
 *
 * Native <select> option popups are rendered by the OS and can't be styled, so
 * they clash with the rest of the design. This is a lightweight custom listbox
 * that keeps the same value/onChange contract while matching the app's surface,
 * radius and colours.
 */
export function SelectMenu({
  value,
  onChange,
  options,
  placeholder,
  className,
  buttonClassName,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  /** When set, adds a leading "clear" option with an empty value (e.g. "All states"). */
  placeholder?: string
  className?: string
  buttonClassName?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  // when a placeholder is given it occupies index 0 so "clear" stays keyboard-reachable
  const items = React.useMemo<SelectOption[]>(
    () => (placeholder != null ? [{ value: '', label: placeholder }, ...options] : [...options]),
    [options, placeholder],
  )
  const selected = items.find((o) => o.value === value) ?? items[0]

  React.useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  React.useEffect(() => {
    if (open) {
      const i = items.findIndex((o) => o.value === value)
      setActiveIndex(i < 0 ? 0 : i)
    }
  }, [open, items, value])

  React.useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.querySelectorAll('li')[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex])

  const commit = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(items.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(items.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (activeIndex >= 0) commit(items[activeIndex].value)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground shadow-sm',
          'transition-all duration-200 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/12',
          buttonClassName,
        )}
      >
        <span className={cn('truncate', value === '' && 'text-muted-foreground')}>{selected.label}</span>
        <ChevronDown
          aria-hidden
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg animate-fade-up"
        >
          {items.map((o, i) => {
            const isSelected = o.value === value
            const isActive = i === activeIndex
            return (
              <li
                key={o.value || '__any'}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(o.value)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm',
                  isActive ? 'bg-muted text-foreground' : 'text-foreground',
                  isSelected && 'font-semibold text-primary-700 dark:text-primary-300',
                )}
              >
                <span className={cn('truncate', o.value === '' && !isSelected && 'text-muted-foreground')}>
                  {o.label}
                </span>
                {isSelected && <Check aria-hidden className="h-4 w-4 shrink-0 text-primary-600" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
