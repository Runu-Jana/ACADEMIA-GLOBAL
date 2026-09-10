import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { PanelHeading } from '@/components/dashboard/primitives'
import { ProfileForm } from '@/components/dashboard/profile-form'
import { NotificationSettings } from '@/components/dashboard/notification-settings'
import { resolvePrefs } from '@/lib/notification-prefs'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await requireUser('/dashboard/profile')

  const prefRow = await prisma.notificationPreference.findUnique({
    where: { userId: user.id },
    select: { channels: true },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <PanelHeading
        title="My Profile"
        sub="Your details are used across admissions, live classes and certificates."
      />

      <ProfileForm
        email={user.email}
        memberSince={formatDate(user.createdAt)}
        initial={{
          name: user.name ?? '',
          phone: user.phone ?? '',
          dob: user.dob ?? '',
          gender: user.gender ?? '',
          city: user.city ?? '',
          state: user.state ?? '',
        }}
      />

      <NotificationSettings initial={resolvePrefs(prefRow?.channels)} />
    </div>
  )
}
