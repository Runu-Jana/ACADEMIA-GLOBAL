/**
 * Fills in the message catalogues for every non-English locale by translating
 * the English source (messages/en.json) with the platform's own AI layer.
 *
 *   npm run i18n:translate           # every configured locale (hi, …)
 *   npm run i18n:translate ta        # just Tamil (creates messages/ta.json)
 *
 * INCREMENTAL: only keys that are missing (or blank) in a target file are sent
 * to the model, so re-running is cheap and it never overwrites a translation a
 * human has already corrected. English stays the single source of truth — add a
 * key there, re-run this, review the output, ship.
 *
 * Needs an AI key (ANTHROPIC_API_KEY, or OPENAI_API_KEY with AI_COST_PROFILE=economy);
 * the .env is loaded for you because @prisma/client reads it on import.
 */
import fs from 'node:fs'
import path from 'node:path'
import { runAi, isFeatureConfigured } from '../src/lib/ai/index'
import { LOCALES, DEFAULT_LOCALE } from '../src/i18n/config'

const MESSAGES_DIR = path.join(process.cwd(), 'messages')
const CHUNK = 30

/** English names used in the prompt. Extend as you add languages. */
const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', mr: 'Marathi',
  gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', or: 'Odia',
  as: 'Assamese', ur: 'Urdu',
}

type Flat = Record<string, string>

/** { nav: { shop: "Shop" } } -> { "nav.shop": "Shop" } */
function flatten(obj: Record<string, unknown>, prefix = '', out: Flat = {}): Flat {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v as Record<string, unknown>, key, out)
    else out[key] = String(v)
  }
  return out
}

/** The inverse — rebuilds the nested shape from dotted keys. */
function unflatten(flat: Flat): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.')
    let cur = out
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {}
      cur = cur[parts[i]] as Record<string, unknown>
    }
    cur[parts[parts.length - 1]] = val
  }
  return out
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

/** Tolerant parse — models sometimes wrap JSON in prose or ``` fences. */
function parseObject(text: string): Flat {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first >= 0 && last > first) t = t.slice(first, last + 1)
  const parsed = JSON.parse(t) as Record<string, unknown>
  const out: Flat = {}
  for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') out[k] = v
  return out
}

async function translateBatch(pairs: Flat, language: string): Promise<Flat> {
  const system = `You are a professional UI localiser for an Indian online education platform, translating interface strings into ${language}.
Rules:
- You are given a JSON object of key -> English text. Return a JSON object with the SAME keys and the value translated into natural, concise ${language} that a student reads comfortably. Translate values only, never the keys.
- Preserve interpolation tokens ({name}, {count}), HTML tags, and punctuation such as the ellipsis "…" exactly.
- Do NOT translate the brand "Shiksha Sarthi". The assistant name "Sarthi" may be transliterated into the target script if that reads naturally (e.g. सार्थी in Hindi).
- Keep it short — these are buttons, labels and menu items, not sentences to expand.
Return ONLY the JSON object.`

  const content = JSON.stringify(pairs, null, 2)
  const maxTokens = Math.min(4000, 400 + Object.keys(pairs).length * 90)

  const res = await runAi(
    'translate',
    {
      system,
      schema: { type: 'object', additionalProperties: { type: 'string' } } as Record<string, unknown>,
      maxTokens,
      messages: [{ role: 'user', content }],
    },
    {},
  )
  return parseObject(res.text)
}

async function translateLocale(locale: string, enFlat: Flat) {
  const language = LANGUAGE_NAMES[locale]
  if (!language) {
    console.error(`  ✕ ${locale}: add its English name to LANGUAGE_NAMES in this script first.`)
    return
  }

  const file = path.join(MESSAGES_DIR, `${locale}.json`)
  const existing: Record<string, unknown> = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : {}
  const existingFlat = flatten(existing)

  const missing = Object.keys(enFlat).filter((k) => !existingFlat[k]?.trim())
  if (missing.length === 0) {
    console.log(`  ✓ ${locale} (${language}): already complete — ${Object.keys(enFlat).length} keys.`)
    return
  }

  console.log(`  … ${locale} (${language}): translating ${missing.length} new key(s)`)
  const translated: Flat = {}
  for (const part of chunk(missing, CHUNK)) {
    const pairs = Object.fromEntries(part.map((k) => [k, enFlat[k]]))
    try {
      Object.assign(translated, await translateBatch(pairs, language))
    } catch (err) {
      console.error(`    ! a batch failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Rebuild in en's key order; keep existing translations, fill new ones, and
  // fall back to English for anything the model missed so the UI never breaks.
  const finalFlat: Flat = {}
  let filled = 0
  let unresolved = 0
  for (const k of Object.keys(enFlat)) {
    if (existingFlat[k]?.trim()) finalFlat[k] = existingFlat[k]
    else if (translated[k]?.trim()) {
      finalFlat[k] = translated[k]
      filled++
    } else {
      finalFlat[k] = enFlat[k]
      unresolved++
    }
  }

  fs.writeFileSync(file, JSON.stringify(unflatten(finalFlat), null, 2) + '\n', 'utf8')
  console.log(
    `  ✓ ${locale}: wrote ${path.relative(process.cwd(), file)} (+${filled} translated` +
      (unresolved ? `, ${unresolved} left as English — re-run to retry` : '') +
      ')',
  )
}

async function main() {
  if (!isFeatureConfigured('translate')) {
    console.error(
      'AI is not configured. Add ANTHROPIC_API_KEY (or OPENAI_API_KEY with AI_COST_PROFILE=economy) to .env, then re-run.',
    )
    process.exit(1)
  }

  const arg = process.argv[2]
  const targets = arg ? [arg] : LOCALES.filter((l) => l !== DEFAULT_LOCALE)
  if (targets.length === 0) {
    console.log('No target locales. Add one to LOCALES in src/i18n/config.ts, or pass a code: npm run i18n:translate ta')
    return
  }

  const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'en.json'), 'utf8')))
  console.log(`Source: messages/en.json (${Object.keys(enFlat).length} keys)\nTargets: ${targets.join(', ')}\n`)

  for (const locale of targets) await translateLocale(locale, enFlat)

  console.log('\nDone. Review the generated files before shipping.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
