import { getSession } from '@/lib/auth'
import { HeaderClient } from './header-client'

/** Server wrapper: reads the session cookie, hands a plain object to the client bar. */
export async function SiteHeader() {
  const session = await getSession()
  return (
    <HeaderClient
      user={
        session
          ? { id: session.userId, name: session.name, email: session.email, role: session.role }
          : null
      }
    />
  )
}
