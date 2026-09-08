import { prisma } from '@/lib/prisma'
import { liveProducts } from '@/lib/visibility'
import { shippingFor, MAX_QTY } from '@/lib/shop'

/**
 * The single place a cart turns into money.
 *
 * The browser sends product ids and quantities — nothing else. This module
 * looks every line up in the database, re-reads the current price, checks the
 * product is still published and still in stock, and computes the total. The
 * client's idea of the price is never consulted, which is what stops anyone
 * editing localStorage and buying a ₹899 book for ₹1.
 *
 * Both the cart page and the checkout endpoint call this, so what a buyer is
 * shown and what they are charged come from one calculation.
 */

export type CartInput = { productId: string; qty: number }[]

export type PricedLine = {
  productId: string
  slug: string
  title: string
  kind: string
  category: string
  author: string | null
  brand: string | null
  imageUrl: string | null
  /** Current unit price in paise, from the database. */
  price: number
  mrp: number | null
  /** Quantity actually purchasable — may be below what was requested. */
  qty: number
  /** What the buyer asked for, when it had to be reduced. */
  requestedQty: number
  stock: number
  lineTotal: number
}

export type PricedCart = {
  lines: PricedLine[]
  /** Lines dropped because the product vanished, was unpublished or sold out. */
  removed: { productId: string; title: string; reason: 'unavailable' | 'out_of_stock' }[]
  /** True when any quantity was capped to available stock. */
  adjusted: boolean
  subtotal: number
  shipping: number
  total: number
}

/**
 * Prices a cart against live data.
 *
 * Unavailable lines are REMOVED rather than rejecting the whole cart — a buyer
 * whose third item sold out should still be able to buy the other two, told
 * plainly what changed.
 */
export async function priceCart(input: CartInput): Promise<PricedCart> {
  // Collapse duplicate ids and clamp quantities before touching the database.
  const wanted = new Map<string, number>()
  for (const line of input) {
    if (!line?.productId || typeof line.productId !== 'string') continue
    const qty = Math.floor(Number(line.qty) || 0)
    if (qty <= 0) continue
    wanted.set(line.productId, Math.min(MAX_QTY, (wanted.get(line.productId) ?? 0) + qty))
  }

  if (wanted.size === 0) {
    return { lines: [], removed: [], adjusted: false, subtotal: 0, shipping: 0, total: 0 }
  }

  const products = await prisma.product.findMany({
    where: liveProducts({ id: { in: [...wanted.keys()] } }),
    select: {
      id: true, slug: true, title: true, kind: true, category: true,
      price: true, mrp: true, stock: true, author: true, brand: true, imageUrl: true,
    },
  })

  const byId = new Map(products.map((p) => [p.id, p]))
  const lines: PricedLine[] = []
  const removed: PricedCart['removed'] = []
  let adjusted = false

  for (const [productId, requestedQty] of wanted) {
    const p = byId.get(productId)

    // Missing from the live query = deleted, archived or unpublished since the
    // buyer added it.
    if (!p) {
      removed.push({ productId, title: 'This product', reason: 'unavailable' })
      continue
    }

    if (p.stock <= 0) {
      removed.push({ productId, title: p.title, reason: 'out_of_stock' })
      continue
    }

    const qty = Math.min(requestedQty, p.stock)
    if (qty < requestedQty) adjusted = true

    lines.push({
      productId: p.id,
      slug: p.slug,
      title: p.title,
      kind: p.kind,
      category: p.category,
      author: p.author,
      brand: p.brand,
      imageUrl: p.imageUrl,
      price: p.price,
      mrp: p.mrp,
      qty,
      requestedQty,
      stock: p.stock,
      lineTotal: p.price * qty,
    })
  }

  // Stable order so the cart doesn't reshuffle between renders.
  lines.sort((a, b) => a.title.localeCompare(b.title))

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
  const shipping = shippingFor(subtotal)

  return { lines, removed, adjusted, subtotal, shipping, total: subtotal + shipping }
}
