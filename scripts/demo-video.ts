/**
 * Attaches (or clears) a TEST video + transcript on the first couple of video
 * lessons so the player, the embed path and the transcript panel can be
 * exercised before real lesson footage exists.
 *
 *   npx tsx scripts/demo-video.ts        # attach
 *   npx tsx scripts/demo-video.ts clear  # remove
 *
 * These are placeholders (a Creative-Commons sample clip). Clear them before
 * launch and attach the real lesson videos through the admin course editor.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIXTURES = [
  {
    // Direct MP4 — plays in the native <video> element.
    contentUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    transcript: `Welcome to this lesson. In the next few minutes we'll walk through the core idea from start to finish, so keep a pen handy and pause whenever you need to.

We open with the intuition — why this topic matters and where you'll see it again in later chapters. Getting the intuition first makes the formal steps feel obvious rather than arbitrary.

Next we work a full example end to end. Notice how each step follows from the last; if a step ever feels like a leap, that's usually the place to slow down and re-read.

We close with the two mistakes students most often make here, and a quick self-check you can try before the next lesson. When you're ready, mark this lesson complete and move on.`,
  },
  {
    // YouTube (Blender's Big Buck Bunny, CC-BY) — plays via the embed path.
    contentUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    transcript: `This is a short worked walkthrough. Follow along with the video and use the transcript to jump back to any moment you want to revisit.

First, we set up the problem and name what we're solving for. Being explicit about the goal keeps the working honest — every later step should move toward it.

Then we solve it one move at a time, saying out loud why each move is allowed. That running justification is exactly what an examiner is looking for in your own answers.

Finally, we sanity-check the result against the units and a rough estimate. If those don't agree, the answer is wrong no matter how clean the algebra looked. See you in the next lesson.`,
  },
]

async function main() {
  const clear = process.argv.includes('clear')

  if (clear) {
    const res = await prisma.lesson.updateMany({
      where: { contentUrl: { in: FIXTURES.map((f) => f.contentUrl) } },
      data: { contentUrl: null, transcript: null },
    })
    console.log(`Cleared demo video + transcript from ${res.count} lesson(s).`)
    return
  }

  const lessons = await prisma.lesson.findMany({
    where: { type: 'VIDEO' },
    orderBy: [{ moduleId: 'asc' }, { order: 'asc' }],
    take: FIXTURES.length,
    select: { id: true, title: true },
  })

  if (lessons.length === 0) {
    console.log('No VIDEO lessons found — seed the database first.')
    return
  }

  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i]
    const fx = FIXTURES[i]
    await prisma.lesson.update({
      where: { id: l.id },
      data: { contentUrl: fx.contentUrl, transcript: fx.transcript },
    })
    console.log(`Attached demo ${i === 0 ? 'MP4' : 'YouTube'} + transcript → "${l.title}"`)
  }
  console.log('\nOpen these lessons in the course player to see the video + transcript.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
