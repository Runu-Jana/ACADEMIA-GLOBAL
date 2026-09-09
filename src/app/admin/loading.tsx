import { Loader } from '@/components/ui/loader'

/** Shown in the content area while an admin page loads its data. */
export default function AdminLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader label="Loading…" />
    </div>
  )
}
