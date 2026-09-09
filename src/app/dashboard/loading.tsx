import { BookLoader } from '@/components/ui/book-loader'

/** Shown in the content area while a dashboard page loads its data. */
export default function DashboardLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <BookLoader label="Loading…" />
    </div>
  )
}
