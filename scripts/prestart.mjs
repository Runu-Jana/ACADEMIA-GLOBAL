// Sync the Prisma schema to the database on boot — with retries.
//
// On Railway the private network to Postgres (`*.railway.internal`) is not
// resolvable for the first few seconds after the container starts. A `prisma db
// push` that fires immediately fails with `P1001: Can't reach database server`
// and the container crash-loops. Retrying for ~half a minute rides out that
// window, so the app comes up cleanly instead of looping.
import { execSync } from 'node:child_process'

const MAX_ATTEMPTS = 10
const DELAY_MS = 3000

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
    console.log('[prestart] database schema is in sync')
    process.exit(0)
  } catch {
    if (attempt === MAX_ATTEMPTS) {
      console.error(`[prestart] could not reach the database after ${MAX_ATTEMPTS} attempts — giving up`)
      process.exit(1)
    }
    console.warn(
      `[prestart] database not ready (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${DELAY_MS / 1000}s…`,
    )
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }
}
