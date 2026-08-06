import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // Resolves the `@/…` path alias the app uses.
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Run against an isolated Postgres database so tests never touch dev data.
    // Override with TEST_DATABASE_URL (e.g. in CI); defaults to the local
    // docker-compose Postgres on 5544.
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://shiksha:shiksha@127.0.0.1:5544/shiksha_sarthi_test?schema=public',
    },
    // Serialise files — tests share one database and reset rows between them.
    fileParallelism: false,
    globalSetup: ['./test/setup/global-setup.ts'],
    hookTimeout: 60_000,
  },
})
