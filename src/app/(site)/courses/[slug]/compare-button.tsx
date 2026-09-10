'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check, GitCompare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCompare } from '@/lib/use-compare'

/**
 * Compare toggle for the course detail rail. Takes only the id so nothing but
 * a string crosses the server/client boundary.
 */
export function CompareButton({ courseId }: { courseId: string }) {
  const t = useTranslations('courses.detail')
  const { has, toggle, count, ready } = useCompare()
  const [full, setFull] = React.useState(false)
  const inCompare = has(courseId)

  return (
    <div>
      <Button
        type="button"
        variant={inCompare ? 'secondary' : 'outline'}
        className="w-full"
        aria-pressed={inCompare}
        onClick={() => {
          const result = toggle(courseId)
          setFull(result.full)
        }}
      >
        {inCompare ? <Check className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
        {inCompare ? t('compareAdded') : t('compareAdd')}
      </Button>

      <p role="status" aria-live="polite" className="mt-2 text-center text-xs text-muted-foreground">
        {full ? (
          <span className="font-semibold text-accent-orange">
            {t('compareFull')}
          </span>
        ) : ready && inCompare ? (
          <Link href="/compare" className="font-bold text-primary-600 hover:underline">
            {t('compareLink', { count })}
          </Link>
        ) : (
          t('compareHint')
        )}
      </p>
    </div>
  )
}
