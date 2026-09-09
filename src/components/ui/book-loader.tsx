import { cn } from '@/lib/utils'
import styles from './book-loader.module.css'

/**
 * A page-flipping book loader in the site's holographic blue.
 * (Adapted from Uiverse.io by Nawsome.)
 *
 * Use it as a route `loading.tsx` fallback or inside any Suspense boundary:
 *   <BookLoader label="Loading courses…" />
 */
export function BookLoader({
  label = 'Loading',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div className={cn(styles.loader, className)} role="status" aria-live="polite">
      <div>
        <ul>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <svg fill="currentColor" viewBox="0 0 90 120" aria-hidden="true">
                <path d="M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z" />
              </svg>
            </li>
          ))}
        </ul>
      </div>
      <span>{label}</span>
    </div>
  )
}
