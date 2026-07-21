import type { Metadata } from 'next'

// The compare page itself is a client component (the shortlist lives in
// localStorage), so its metadata is declared here instead.
export const metadata: Metadata = {
  title: 'Compare Courses',
  description:
    'Put up to four shortlisted programs side by side — fees, duration, delivery mode, UGC entitlement, ratings, placement support and the skills each one teaches.',
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
