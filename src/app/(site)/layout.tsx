import { getSession } from '@/lib/auth'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { MobileTabBar } from '@/components/layout/mobile-tabbar'
import { AuthGate } from '@/components/layout/auth-gate'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Already read by SiteHeader, so this is not an extra cost — it just tells the
  // scroll-triggered auth prompt whether there's anyone to convert.
  const session = await getSession()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {/* pb-20 clears the mobile tab bar; removed once it's hidden at lg. */}
      <main id="main" className="flex-1 pb-20 lg:pb-0">
        {children}
      </main>
      <SiteFooter />
      <MobileTabBar />
      <AuthGate signedIn={Boolean(session)} />
    </div>
  )
}
