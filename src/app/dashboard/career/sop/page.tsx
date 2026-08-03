import type { Metadata } from 'next'
import { CareerToolPage } from '@/components/dashboard/career-tool-page'
import { TOOL_CONFIGS } from '@/lib/career-kit-tools'

export const metadata: Metadata = { title: TOOL_CONFIGS.sop.title }
export const dynamic = 'force-dynamic'

export default async function Page() {
  return <CareerToolPage configKey="sop" />
}
