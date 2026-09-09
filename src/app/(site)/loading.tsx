import { BookLoader } from '@/components/ui/book-loader'

/** Shown while any public site route loads its data. */
export default function SiteLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-16">
      <BookLoader label="Loading…" />
    </div>
  )
}
