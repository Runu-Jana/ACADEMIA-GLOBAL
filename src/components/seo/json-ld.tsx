/**
 * Renders a schema.org JSON-LD block. Server component — the payload is built
 * on the server and inlined into the HTML so crawlers see it without running JS.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; we still escape "<" to avoid
      // any chance of breaking out of the <script> element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
