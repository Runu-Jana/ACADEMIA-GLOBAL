/**
 * One chokepoint for unexpected errors.
 *
 * Anything that would otherwise swallow an error or scatter a bare console.error
 * routes through here, so there is a single place to attach a monitoring vendor
 * (Sentry, Highlight, etc.) without touching call sites. Until one is wired, it
 * emits a single structured JSON line to stderr — which a log drain (Vercel,
 * Datadog, CloudWatch) can parse and alert on — instead of an unstructured dump.
 */

export interface ErrorContext {
  /** Where it happened, e.g. 'payments/webhook' or 'ai/tutor'. */
  scope?: string
  /** Any extra breadcrumbs — ids, feature names — but never secrets or PII. */
  [key: string]: unknown
}

export function captureError(error: unknown, context: ErrorContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error))

  console.error(
    JSON.stringify({
      level: 'error',
      at: new Date().toISOString(),
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...context,
    }),
  )

  // ── Attach a monitoring vendor here, e.g. Sentry:
  //   if (process.env.SENTRY_DSN) {
  //     Sentry.captureException(err, { tags: { scope: context.scope }, extra: context })
  //   }
}
