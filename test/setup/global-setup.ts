import { execSync } from 'node:child_process'

/**
 * Ensures the isolated Postgres test database has the current schema before the
 * suite runs. `db push` is idempotent — it creates the tables on an empty DB
 * and reconciles them when they already exist; `--accept-data-loss` lets it do
 * so non-interactively (per-test row cleanup is handled by resetDb()).
 * `--skip-generate` sidesteps the client generator's Windows file lock.
 *
 * The target database (default: shiksha_sarthi_test on the docker-compose
 * Postgres) must already exist — create it once with:
 *   docker exec shiksha-sarthi-db psql -U shiksha -d shiksha_sarthi -c "CREATE DATABASE shiksha_sarthi_test;"
 */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    'postgresql://shiksha:shiksha@127.0.0.1:5544/shiksha_sarthi_test?schema=public'

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  })
}
