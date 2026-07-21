import { requireUser } from '@/lib/auth'
import { PanelHeading } from '@/components/dashboard/primitives'
import { ProfileForm } from '@/components/dashboard/profile-form'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const user = await requireUser('/dashboard/profile')

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
    </div>
  )
}
