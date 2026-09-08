'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Plus, X, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input, Select, Textarea, Checkbox } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import {
  PRODUCT_KINDS, PRODUCT_STATUSES, SHOP_CATEGORIES, EXAM_TAGS,
  categoriesFor, toPaise, toRupees, discountPct,
} from '@/lib/shop'

export type ProductFormValues = {
  id?: string
  slug: string
  title: string
  subtitle: string
  kind: string
  category: string
  description: string
  highlights: string[]
  priceRupees: number
  mrpRupees: number | null
  stock: number
  sku: string
  imageUrl: string
  images: string[]
  status: string
  featured: boolean
  author: string
  publisher: string
  isbn: string
  edition: string
  language: string
  pages: number | null
  binding: string
  publishedYear: number | null
  examTags: string[]
  brand: string
  specs: string[]
}

export const BLANK: ProductFormValues = {
  slug: '', title: '', subtitle: '', kind: 'BOOK', category: 'ENGINEERING_ENTRANCE',
  description: '', highlights: [], priceRupees: 0, mrpRupees: null, stock: 0, sku: '',
  imageUrl: '', images: [], status: 'DRAFT', featured: false,
  author: '', publisher: '', isbn: '', edition: '', language: 'English',
  pages: null, binding: 'Paperback', publishedYear: null, examTags: [],
  brand: '', specs: [],
}

/** A repeatable list of short free-text lines (highlights, specs, gallery URLs). */
function LineList({
  label, hint, placeholder, values, onChange, max = 12,
}: {
  label: string
  hint?: string
  placeholder: string
  values: string[]
  onChange: (next: string[]) => void
  max?: number
}) {
  const [draft, setDraft] = React.useState('')

  function add() {
    const v = draft.trim()
    if (!v || values.length >= max) return
    onChange([...values, v])
    setDraft('')
  }

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-bold">{label}</p>
      {hint && <p className="mb-2 text-[12px] text-muted-foreground">{hint}</p>}

      {values.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {values.map((v, i) => (
            <li key={`${v}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
              <span className="flex-1 text-[13px]">{v}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${v}`}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={values.length >= max}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  )
}

export function ProductForm({ initial }: { initial?: ProductFormValues }) {
  const router = useRouter()
  const [v, setV] = React.useState<ProductFormValues>(initial ?? BLANK)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const isBook = v.kind === 'BOOK'
  const editing = Boolean(v.id)
  const off = discountPct(toPaise(v.priceRupees), v.mrpRupees ? toPaise(v.mrpRupees) : null)

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setV((s) => ({ ...s, [key]: value }))

  // Switching kind can strand the category on a shelf that belongs to the other
  // kind, so snap it to the first valid one.
  React.useEffect(() => {
    const valid = categoriesFor(v.kind).map((c) => c.value as string)
    if (!valid.includes(v.category)) set('category', valid[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.kind])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const payload = {
      slug: v.slug || undefined,
      title: v.title,
      subtitle: v.subtitle,
      kind: v.kind,
      category: v.category,
      description: v.description,
      highlights: v.highlights,
      price: toPaise(v.priceRupees),
      mrp: v.mrpRupees ? toPaise(v.mrpRupees) : null,
      stock: v.stock,
      sku: v.sku || null,
      imageUrl: v.imageUrl || null,
      images: v.images,
      status: v.status,
      featured: v.featured,
      // Only send the block that applies, so a book never carries stationery
      // fields and vice versa.
      author: isBook ? v.author || null : null,
      publisher: isBook ? v.publisher || null : null,
      isbn: isBook ? v.isbn || null : null,
      edition: isBook ? v.edition || null : null,
      language: isBook ? v.language || null : null,
      pages: isBook ? v.pages : null,
      binding: isBook ? v.binding || null : null,
      publishedYear: isBook ? v.publishedYear : null,
      examTags: isBook ? v.examTags : [],
      brand: isBook ? null : v.brand || null,
      specs: isBook ? [] : v.specs,
    }

    try {
      const res = await fetch(
        editing ? `/api/admin/shop/products/${v.id}` : '/api/admin/shop/products',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not save the product.')
        setBusy(false)
        return
      }
      router.push('/admin/shop')
      router.refresh()
    } catch {
      setError('Could not reach the server. Please try again.')
      setBusy(false)
    }
  }

  async function archive() {
    if (!v.id) return
    setBusy(true)
    await fetch(`/api/admin/shop/products/${v.id}`, { method: 'DELETE' })
    router.push('/admin/shop')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[1fr_19rem] lg:items-start">
      <div className="space-y-5">
        {/* ------------------------------------------------------ basics */}
        <section className="card-base p-5">
          <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">Basics</h2>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Product type">
              <Select value={v.kind} onChange={(e) => set('kind', e.target.value)}>
                {PRODUCT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Category">
              <Select value={v.category} onChange={(e) => set('category', e.target.value)}>
                {categoriesFor(v.kind).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Title" className="sm:col-span-2">
              <Input value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={200} required />
            </Field>

            <Field
              label="Subtitle"
              hint="One line. Also used as the meta description in search results."
              className="sm:col-span-2"
            >
              <Input value={v.subtitle} onChange={(e) => set('subtitle', e.target.value)} maxLength={300} required />
            </Field>

            <Field
              label="URL slug"
              hint={editing ? 'Changing this breaks existing links.' : 'Leave blank to generate from the title.'}
              className="sm:col-span-2"
            >
              <Input value={v.slug} onChange={(e) => set('slug', e.target.value)} maxLength={120} placeholder="auto-generated" />
            </Field>

            <Field label="Description" hint="Blank lines separate paragraphs." className="sm:col-span-2">
              <Textarea
                value={v.description}
                onChange={(e) => set('description', e.target.value)}
                rows={7}
                maxLength={8000}
                required
              />
            </Field>
          </div>

          <div className="mt-4">
            <LineList
              label="Highlights"
              hint="Short selling points shown beside the price."
              placeholder="e.g. 3,200+ problems with full solutions"
              values={v.highlights}
              onChange={(next) => set('highlights', next)}
            />
          </div>
        </section>

        {/* -------------------------------------------- book / stationery */}
        <section className="card-base p-5">
          <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">
            {isBook ? 'Book details' : 'Product specifications'}
          </h2>

          {isBook ? (
            <>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Author">
                  <Input value={v.author} onChange={(e) => set('author', e.target.value)} maxLength={120} />
                </Field>
                <Field label="Publisher">
                  <Input value={v.publisher} onChange={(e) => set('publisher', e.target.value)} maxLength={120} />
                </Field>
                <Field label="ISBN-13" hint="Powers the book rich result in Google.">
                  <Input value={v.isbn} onChange={(e) => set('isbn', e.target.value)} maxLength={20} inputMode="numeric" />
                </Field>
                <Field label="Edition">
                  <Input value={v.edition} onChange={(e) => set('edition', e.target.value)} maxLength={60} placeholder="2026 Edition" />
                </Field>
                <Field label="Language">
                  <Input value={v.language} onChange={(e) => set('language', e.target.value)} maxLength={40} />
                </Field>
                <Field label="Pages">
                  <Input
                    type="number"
                    value={v.pages ?? ''}
                    onChange={(e) => set('pages', e.target.value ? Number(e.target.value) : null)}
                    min={1}
                    max={20000}
                  />
                </Field>
                <Field label="Binding">
                  <Select value={v.binding} onChange={(e) => set('binding', e.target.value)}>
                    <option value="Paperback">Paperback</option>
                    <option value="Hardcover">Hardcover</option>
                    <option value="Spiral">Spiral</option>
                  </Select>
                </Field>
                <Field label="Published year">
                  <Input
                    type="number"
                    value={v.publishedYear ?? ''}
                    onChange={(e) => set('publishedYear', e.target.value ? Number(e.target.value) : null)}
                    min={1800}
                    max={2200}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-[13px] font-bold">Exams this targets</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAM_TAGS.map((tag) => {
                    const on = v.examTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          set('examTags', on ? v.examTags.filter((t) => t !== tag) : [...v.examTags, tag])
                        }
                        aria-pressed={on}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-all duration-200',
                          on
                            ? 'border-transparent bg-primary-600 text-white'
                            : 'border-border bg-card hover:border-primary-300',
                        )}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <Field label="Brand">
                <Input value={v.brand} onChange={(e) => set('brand', e.target.value)} maxLength={120} />
              </Field>
              <div className="mt-4">
                <LineList
                  label="Specifications"
                  hint='Write each as "Label: value" — the product page splits on the colon.'
                  placeholder="e.g. Paper: 70 GSM"
                  values={v.specs}
                  onChange={(next) => set('specs', next)}
                  max={20}
                />
              </div>
            </>
          )}
        </section>

        {/* ------------------------------------------------------ imagery */}
        <section className="card-base p-5">
          <h2 className="mb-1 text-[15px] font-extrabold tracking-tight">Imagery</h2>
          <p className="mb-4 text-[12px] text-muted-foreground">
            Optional. With no image, the storefront draws designed cover art from the category —
            so a product never looks unfinished.
          </p>
          <Field label="Main image URL">
            <Input
              type="url"
              value={v.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              maxLength={500}
              placeholder="https://…"
            />
          </Field>
          <div className="mt-4">
            <LineList
              label="Gallery image URLs"
              placeholder="https://…"
              values={v.images}
              onChange={(next) => set('images', next)}
              max={8}
            />
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------- sidebar */}
      <aside className="space-y-5 lg:sticky lg:top-24">
        <section className="card-base p-5">
          <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">Pricing & stock</h2>
          <div className="grid gap-3.5">
            <Field label="Selling price (₹)">
              <Input
                type="number"
                value={v.priceRupees || ''}
                onChange={(e) => set('priceRupees', Number(e.target.value) || 0)}
                min={0}
                required
              />
            </Field>

            <Field label="MRP (₹)" hint="Shown struck through. Leave blank if there's no discount.">
              <Input
                type="number"
                value={v.mrpRupees ?? ''}
                onChange={(e) => set('mrpRupees', e.target.value ? Number(e.target.value) : null)}
                min={0}
              />
            </Field>

            {off > 0 && (
              <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Buyers will see {off}% off
              </p>
            )}
            {v.mrpRupees !== null && v.mrpRupees > 0 && v.mrpRupees < v.priceRupees && (
              <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                MRP is below the selling price — this will be rejected.
              </p>
            )}

            <Field label="Stock on hand">
              <Input
                type="number"
                value={v.stock}
                onChange={(e) => set('stock', Number(e.target.value) || 0)}
                min={0}
                required
              />
            </Field>

            <Field label="SKU">
              <Input value={v.sku} onChange={(e) => set('sku', e.target.value)} maxLength={60} />
            </Field>
          </div>
        </section>

        <section className="card-base p-5">
          <h2 className="mb-4 text-[15px] font-extrabold tracking-tight">Visibility</h2>
          <Field label="Status" hint="Only PUBLISHED products reach the storefront.">
            <Select value={v.status} onChange={(e) => set('status', e.target.value)}>
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>

          <label className="mt-3.5 flex cursor-pointer items-center gap-2.5">
            <Checkbox checked={v.featured} onChange={(e) => set('featured', e.target.checked)} />
            <span className="text-[13px] font-semibold">Feature on the storefront</span>
          </label>
        </section>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Button type="submit" className="w-full" loading={busy} disabled={busy}>
            {editing ? 'Save changes' : 'Create product'}
          </Button>
          <Link href="/admin/shop" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full')}>
            Cancel
          </Link>
          {editing && v.status !== 'ARCHIVED' && (
            <Button type="button" variant="danger" size="sm" className="w-full" onClick={archive} disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" />
              Archive product
            </Button>
          )}
        </div>
      </aside>
    </form>
  )
}

/** Maps a database row into the rupee-denominated shape the form edits. */
export function toFormValues(p: {
  id: string; slug: string; title: string; subtitle: string; kind: string; category: string
  description: string; highlights: unknown; price: number; mrp: number | null; stock: number
  sku: string | null; imageUrl: string | null; images: unknown; status: string; featured: boolean
  author: string | null; publisher: string | null; isbn: string | null; edition: string | null
  language: string | null; pages: number | null; binding: string | null; publishedYear: number | null
  examTags: unknown; brand: string | null; specs: unknown
}): ProductFormValues {
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

  return {
    id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle, kind: p.kind,
    category: p.category, description: p.description, highlights: list(p.highlights),
    priceRupees: toRupees(p.price), mrpRupees: p.mrp === null ? null : toRupees(p.mrp),
    stock: p.stock, sku: p.sku ?? '', imageUrl: p.imageUrl ?? '', images: list(p.images),
    status: p.status, featured: p.featured,
    author: p.author ?? '', publisher: p.publisher ?? '', isbn: p.isbn ?? '',
    edition: p.edition ?? '', language: p.language ?? 'English', pages: p.pages,
    binding: p.binding ?? 'Paperback', publishedYear: p.publishedYear,
    examTags: list(p.examTags), brand: p.brand ?? '', specs: list(p.specs),
  }
}
