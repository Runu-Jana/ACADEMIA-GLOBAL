import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { getEngagement } from '@/lib/gamification'
import { PanelHeading } from '@/components/dashboard/primitives'
import {
  StreakCard, WeeklyGoalCard, ActivityHeatmap, BadgeGrid,
} from '@/components/dashboard/engagement'

export const metadata: Metadata = { title: 'Goals & Streaks' }
export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const user = await requireUser('/dashboard/goals')
  const engagement = await getEngagement(user.id)

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">Goals &amp; Streaks</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Small, steady days add up. Keep your streak going and unlock achievements as you learn.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <StreakCard streak={engagement.streak} />
        <WeeklyGoalCard goal={engagement.goal} />
      </div>

      <ActivityHeatmap heatmap={engagement.heatmap} />

      <section aria-labelledby="achievements-heading">
        <PanelHeading
          title="Achievements"
          sub={`${engagement.earnedCount} of ${engagement.badges.length} unlocked`}
        />
        <h2 id="achievements-heading" className="sr-only">Achievements</h2>
        <BadgeGrid badges={engagement.badges} />
      </section>
    </div>
  )
}
