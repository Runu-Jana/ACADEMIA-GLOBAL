import { prisma } from '../prisma'
import { embed, embedOne } from './embeddings'

/**
 * Course-aware retrieval for the AI tutor.
 *
 * The tutor must answer only from the course a student is enrolled in — that
 * scoping is what stops "when is my assignment due?" in one programme leaking
 * an answer from another, and what keeps the model from inventing content it
 * was never given. Retrieval is the mechanism: index a course's text once,
 * then fetch the few most relevant passages per question and hand only those
 * to the model.
 *
 * Two retrieval paths share one index:
 *   - semantic — cosine over stored embeddings, when an embeddings key exists;
 *   - lexical  — tf-idf term overlap, always available, no key required.
 * The index stores plain text either way, so switching between them is a
 * config change, not a re-architecture.
 */

export type SourceType = 'COURSE' | 'MODULE' | 'LESSON' | 'SUBJECT' | 'MATERIAL'

export interface RetrievedChunk {
  text: string
  sourceType: string
  sourceId: string
  sourceLabel: string
  score: number
}

// ------------------------------------------------------------------ chunking

/**
 * Splits text into passages small enough to be individually relevant but large
 * enough to stand alone. Breaks on paragraph boundaries first so a chunk is a
 * coherent thought, not a sentence sawn in half. A short overlap carries
 * context across a boundary so a fact split between two chunks isn't lost.
 */
export function chunkText(text: string, maxChars = 1400, overlap = 180): string[] {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (!clean) return []
  if (clean.length <= maxChars) return [clean]

  const paras = clean.split(/\n{2,}/)
  const chunks: string[] = []
  let buf = ''

  const flush = () => {
    const t = buf.trim()
    if (t) chunks.push(t)
    // Seed the next buffer with the tail of this one for continuity.
    buf = overlap > 0 && t.length > overlap ? `${t.slice(-overlap)} ` : ''
  }

  for (const para of paras) {
    // A single paragraph larger than the cap is hard-split on sentences.
    if (para.length > maxChars) {
      if (buf.trim()) flush()
      for (const sentence of para.split(/(?<=[.!?])\s+/)) {
        if (buf.length + sentence.length > maxChars) flush()
        buf += sentence + ' '
      }
      continue
    }
    if (buf.length + para.length > maxChars) flush()
    buf += para + '\n\n'
  }
  if (buf.trim()) chunks.push(buf.trim())
  return chunks
}

// --------------------------------------------------------- source collection

interface SourceDoc {
  sourceType: SourceType
  sourceId: string
  sourceLabel: string
  text: string
}

/**
 * Gathers every piece of a course's text worth grounding an answer in.
 *
 * Reads only what's already in the database — course blurb, module and lesson
 * copy, subject outlines, material captions. Extracting the full text of
 * uploaded PDFs would enrich this considerably and is the obvious next step,
 * but it belongs behind the same indexer rather than inline here.
 */
async function collectCourseDocs(courseId: string): Promise<SourceDoc[]> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      subtitle: true,
      about: true,
      eligibility: true,
      examMode: true,
      modules: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: { id: true, title: true, description: true, body: true, type: true, durationMin: true },
          },
        },
      },
      subjects: {
        select: { id: true, code: true, title: true, syllabusOutline: true, credits: true },
      },
      materials: {
        select: { id: true, title: true, type: true, note: true, module: { select: { title: true } } },
      },
    },
  })
  if (!course) return []

  const docs: SourceDoc[] = []

  const overview = [
    `Course: ${course.title}`,
    course.subtitle,
    course.about,
    course.eligibility ? `Eligibility: ${course.eligibility}` : '',
    course.examMode ? `Examination: ${course.examMode}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  if (overview.trim()) {
    docs.push({ sourceType: 'COURSE', sourceId: course.id, sourceLabel: 'Course overview', text: overview })
  }

  for (const m of course.modules) {
    const head = [m.title, m.description].filter(Boolean).join(' — ')
    if (head.trim()) {
      docs.push({ sourceType: 'MODULE', sourceId: m.id, sourceLabel: `Module: ${m.title}`, text: head })
    }
    for (const l of m.lessons) {
      const body = [
        `${l.title} (${l.type.toLowerCase()}, ${l.durationMin} min)`,
        l.description,
        l.body,
      ]
        .filter(Boolean)
        .join('\n')
      if (body.trim()) {
        docs.push({
          sourceType: 'LESSON',
          sourceId: l.id,
          sourceLabel: `Lesson: ${l.title}`,
          text: `Module "${m.title}"\n${body}`,
        })
      }
    }
  }

  for (const s of course.subjects) {
    const text = [`${s.code} — ${s.title} (${s.credits} credits)`, s.syllabusOutline]
      .filter(Boolean)
      .join('\n')
    docs.push({ sourceType: 'SUBJECT', sourceId: s.id, sourceLabel: `Subject: ${s.title}`, text })
  }

  for (const mat of course.materials) {
    const text = [
      `${mat.title} (${mat.type})`,
      mat.module?.title ? `From module: ${mat.module.title}` : '',
      mat.note,
    ]
      .filter(Boolean)
      .join('\n')
    docs.push({ sourceType: 'MATERIAL', sourceId: mat.id, sourceLabel: `Material: ${mat.title}`, text })
  }

  return docs
}

// -------------------------------------------------------------------- indexing

export interface IndexResult {
  courseId: string
  chunks: number
  embedded: boolean
}

/**
 * (Re)builds the retrieval index for one course.
 *
 * Full rebuild rather than diff: content changes are infrequent (an admin edits
 * a course), the volume is small, and a stale chunk surviving a partial update
 * is a correctness bug in a feature whose whole selling point is not making
 * things up. Delete-then-write is the boring, correct choice.
 */
export async function indexCourse(courseId: string): Promise<IndexResult> {
  const docs = await collectCourseDocs(courseId)

  const rows: SourceDoc[] = []
  for (const doc of docs) {
    for (const text of chunkText(doc.text)) {
      rows.push({ ...doc, text })
    }
  }

  // Embed all chunk texts in one pass when a key is available; null means the
  // deployment is Anthropic-only and retrieval will run lexically.
  let vectors: number[][] | null = null
  try {
    vectors = await embed(rows.map((r) => r.text), { courseId })
  } catch {
    // A transient embeddings failure must not block indexing — the lexical
    // path still gives a working tutor. The vectors are simply left empty.
    vectors = null
  }

  await prisma.$transaction([
    prisma.contentChunk.deleteMany({ where: { courseId } }),
    prisma.contentChunk.createMany({
      data: rows.map((r, i) => {
        const vec = vectors ? vectors[i] : null
        return {
          courseId,
          text: r.text,
          embedding: vec ? JSON.stringify(vec) : '',
          tokens: Math.ceil(r.text.length / 4),
          sourceType: r.sourceType,
          sourceId: r.sourceId,
          sourceLabel: r.sourceLabel,
        }
      }),
    }),
  ])

  return { courseId, chunks: rows.length, embedded: Boolean(vectors) }
}

/** Reindex every course. Used by the seed/index script. */
export async function indexAllCourses(): Promise<IndexResult[]> {
  const courses = await prisma.course.findMany({ select: { id: true } })
  const results: IndexResult[] = []
  for (const c of courses) results.push(await indexCourse(c.id))
  return results
}

// ------------------------------------------------------------------ scoring

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in',
  'on', 'for', 'with', 'as', 'at', 'by', 'from', 'this', 'that', 'these', 'those', 'it', 'its', 'do',
  'does', 'did', 'can', 'could', 'should', 'would', 'will', 'i', 'you', 'my', 'me', 'we', 'our', 'how',
  'what', 'when', 'which', 'who', 'why', 'about', 'into', 'up', 'down', 'out', 'so', 'if', 'then',
])

function terms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length >= 2 && !STOPWORDS.has(t))
}

/**
 * Lexical fallback: tf-idf term overlap. Rare terms (a subject code, a proper
 * noun) count for more than common ones, which is what makes "capstone" pull
 * the capstone passage rather than every chunk that says "the".
 */
function lexicalRank(
  query: string,
  chunks: { text: string; terms: string[] }[],
  k: number,
): number[] {
  const q = terms(query)
  if (!q.length) return []

  const N = chunks.length
  const df = new Map<string, number>()
  for (const c of chunks) {
    for (const t of new Set(c.terms)) df.set(t, (df.get(t) ?? 0) + 1)
  }

  const qlc = query.toLowerCase()
  const scores = chunks.map((c, i) => {
    const tf = new Map<string, number>()
    for (const t of c.terms) tf.set(t, (tf.get(t) ?? 0) + 1)
    let score = 0
    for (const t of new Set(q)) {
      const f = tf.get(t)
      if (!f) continue
      const idf = Math.log(1 + N / (df.get(t) ?? 1))
      score += Math.min(f, 3) * idf
    }
    // A chunk containing the query phrase verbatim is almost certainly the one.
    if (score > 0 && c.text.toLowerCase().includes(qlc)) score *= 1.5
    return { i, score }
  })

  return scores
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.i)
}

// ----------------------------------------------------------------- retrieval

/**
 * Returns the `k` passages from a course most relevant to `query`.
 *
 * Semantic when embeddings exist for the query and the index; lexical
 * otherwise. When nothing matches, returns a little high-level context (the
 * overview, the module list) so the tutor can still orient a vague question —
 * but the prompt, not this function, decides what may be answered from it.
 */
export async function retrieve(
  courseId: string,
  query: string,
  k = 6,
  ctx: { userId?: string | null } = {},
): Promise<RetrievedChunk[]> {
  const chunks = await prisma.contentChunk.findMany({
    where: { courseId },
    select: { text: true, embedding: true, sourceType: true, sourceId: true, sourceLabel: true },
  })
  if (!chunks.length) return []

  const parsed = chunks.map((c) => {
    let vec: number[] | null = null
    if (c.embedding) {
      try {
        const v = JSON.parse(c.embedding)
        if (Array.isArray(v) && v.length) vec = v as number[]
      } catch {
        vec = null
      }
    }
    return { ...c, vec }
  })

  const withVec = parsed.filter((c) => c.vec)

  // --- semantic path ---
  if (withVec.length) {
    let qvec: number[] | null = null
    try {
      qvec = await embedOne(query, { userId: ctx.userId, courseId })
    } catch {
      qvec = null
    }
    if (qvec) {
      const ranked = withVec
        .map((c) => ({ c, score: cosine(qvec!, c.vec!) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .filter((r) => r.score > 0.15) // drop near-orthogonal noise
      if (ranked.length) {
        return ranked.map((r) => ({
          text: r.c.text,
          sourceType: r.c.sourceType,
          sourceId: r.c.sourceId,
          sourceLabel: r.c.sourceLabel,
          score: Number(r.score.toFixed(4)),
        }))
      }
    }
  }

  // --- lexical path ---
  const prepared = parsed.map((c) => ({ text: c.text, terms: terms(c.text) }))
  const idx = lexicalRank(query, prepared, k)
  if (idx.length) {
    return idx.map((i) => ({
      text: parsed[i].text,
      sourceType: parsed[i].sourceType,
      sourceId: parsed[i].sourceId,
      sourceLabel: parsed[i].sourceLabel,
      score: 1,
    }))
  }

  // --- orientation fallback: no direct match, hand back the course's shape ---
  return parsed
    .filter((c) => c.sourceType === 'COURSE' || c.sourceType === 'MODULE')
    .slice(0, 4)
    .map((c) => ({
      text: c.text,
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      sourceLabel: c.sourceLabel,
      score: 0,
    }))
}
