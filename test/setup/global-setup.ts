import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Builds a fresh schema in the isolated test DB (prisma/test.db) before the
 * suite runs. We delete the file first (a plain fs op) so a *non-destructive*
 * `db push` re-creates the schema on an empty database — this avoids
 * `--force-reset`, which Prisma (rightly) blocks for automated agents.
 * `--skip-generate` sidesteps the client generator's Windows file lock.
 */
export default function setup() {
  const dbFile = resolve(process.cwd(), 'prisma', 'test.db')
  rmSync(dbFile, { force: true })
  rmSync(`${dbFile}-journal`, { force: true })

  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  })
}
