/**
 * Builds the AI tutor's retrieval index for every course.
 *
 *   npm run ai:index
 *
 * Safe to run repeatedly — each course is fully rebuilt. Runs with or without
 * an OPENAI_API_KEY: with one, chunks are embedded for semantic retrieval;
 * without, they're indexed as plain text and the tutor retrieves lexically.
 */
import { prisma } from '../src/lib/prisma'
import { indexCourse } from '../src/lib/ai/retrieval'
import { embeddingsAvailable } from '../src/lib/ai/embeddings'

async function main() {
  const semantic = embeddingsAvailable()
  console.log(
    semantic
      ? 'OPENAI_API_KEY found — chunks will be embedded for semantic retrieval.'
      : 'No OPENAI_API_KEY — indexing as plain text (lexical retrieval). Set the key and re-run to enable semantic search.',
  )

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!courses.length) {
    console.log('No courses found. Seed the database first (npm run db:seed).')
    return
  }

  console.log(`\nIndexing ${courses.length} course(s)…\n`)
  let totalChunks = 0
  for (const c of courses) {
    const { chunks, embedded } = await indexCourse(c.id)
    totalChunks += chunks
    const tag = embedded ? 'embedded' : 'lexical'
    console.log(`  ✓ ${c.title.slice(0, 54).padEnd(54)} ${String(chunks).padStart(4)} chunks  (${tag})`)
  }

  console.log(`\nDone — ${totalChunks} chunks across ${courses.length} course(s).`)
}

main()
  .catch((err) => {
    console.error('\nIndexing failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
