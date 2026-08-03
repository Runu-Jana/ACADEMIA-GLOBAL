import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // Resolves the `@/…` path alias the app uses.
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Run against an isolated SQLite DB so tests never touch dev data. The path
    // resolves relative to prisma/schema.prisma (same as the dev `file:./dev.db`).
    env: { DATABASE_URL: 'file:./test.db' },
    // One SQLite file — avoid cross-file write contention.
    fileParallelism: false,
    globalSetup: ['./test/setup/global-setup.ts'],
    hookTimeout: 60_000,
  },
})
