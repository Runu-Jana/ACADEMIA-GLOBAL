import { cn } from '@/lib/utils'
import styles from './loader.module.css'

/**
 * A self-drawing line loader in the site's primary blue.
 * (Animation adapted from Uiverse.io by arad_8645; shape is a double hexagon.)
 *
 * Use as a route `loading.tsx` fallback or inside any Suspense boundary:
 *   <Loader label="Loading courses…" />
 */
export function Loader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('inline-flex flex-col items-center gap-3', className)} role="status" aria-live="polite">
      <div className={styles.loader}>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path
            className={styles.loaderPath}
            pathLength={220}
            d="M44 24 L34 41.32 L14 41.32 L4 24 L14 6.68 L34 6.68 Z"
          />
          <path
            className={styles.loaderInner}
            pathLength={120}
            d="M35 24 L29.5 33.53 L18.5 33.53 L13 24 L18.5 14.47 L29.5 14.47 Z"
          />
        </svg>
      </div>
      {label && <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>}
    </div>
  )
}
