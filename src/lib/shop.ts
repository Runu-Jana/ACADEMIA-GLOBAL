/**
 * Shop domain rules: the vocabulary, the money, and the delivery charge.
 *
 * Everything the storefront, the cart, the checkout and the admin screens agree
 * on lives here, so a price shown on a product card and a price charged at
 * checkout can never drift apart.
 *
 * MONEY IS PAISE. Every amount in this section is an integer number of paise —
 * ₹499 is 49900. Rupees only exist at the edges, where a human types a price
 * into the admin form or reads one off the page.
 */

/* ------------------------------------------------------------------ kinds */

export const PRODUCT_KINDS = [
  { value: 'BOOK', label: 'Books' },
  { value: 'STATIONERY', label: 'Stationery' },
] as const

export type ProductKind = (typeof PRODUCT_KINDS)[number]['value']

/* ------------------------------------------------------------- categories */

/** Shelves, grouped by the kind they belong to. */
export const SHOP_CATEGORIES = [
  { value: 'ENGINEERING_ENTRANCE', label: 'Engineering Entrance', kind: 'BOOK' },
  { value: 'MEDICAL_ENTRANCE', label: 'Medical Entrance', kind: 'BOOK' },
  { value: 'GOVERNMENT_EXAMS', label: 'Government & Banking', kind: 'BOOK' },
  { value: 'MANAGEMENT_ENTRANCE', label: 'Management Entrance', kind: 'BOOK' },
  { value: 'SCHOOL_BOARDS', label: 'School & Boards', kind: 'BOOK' },
  { value: 'GENERAL_STUDIES', label: 'General Studies', kind: 'BOOK' },
  { value: 'NOTEBOOKS', label: 'Notebooks & Registers', kind: 'STATIONERY' },
  { value: 'WRITING', label: 'Pens & Pencils', kind: 'STATIONERY' },
  { value: 'GEOMETRY', label: 'Geometry & Maths', kind: 'STATIONERY' },
  { value: 'EXAM_ESSENTIALS', label: 'Exam Day Essentials', kind: 'STATIONERY' },
  { value: 'DESK', label: 'Desk & Organisers', kind: 'STATIONERY' },
] as const

export type ShopCategory = (typeof SHOP_CATEGORIES)[number]['value']

export const categoriesFor = (kind?: string) =>
  kind ? SHOP_CATEGORIES.filter((c) => c.kind === kind) : SHOP_CATEGORIES

export const categoryLabel = (value: string) =>
  SHOP_CATEGORIES.find((c) => c.value === value)?.label ?? value

export const kindLabel = (value: string) =>
  PRODUCT_KINDS.find((k) => k.value === value)?.label ?? value

/** Exams offered in the filter rail; also the suggestions in the admin form. */
export const EXAM_TAGS = [
  'JEE Main', 'JEE Advanced', 'NEET', 'CUET', 'CAT', 'CLAT',
  'UPSC', 'SSC', 'Banking', 'GATE', 'Class 10', 'Class 12',
] as const

export const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const

/** The fulfilment ladder, in order. Used by admin to offer the next step. */
export const SHOP_ORDER_STATUSES = [
  'PENDING', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
] as const

export type ShopOrderStatus = (typeof SHOP_ORDER_STATUSES)[number]

/* ---------------------------------------------------------------- money */

/** Flat delivery charge, in paise (₹49). */
export const SHIPPING_FLAT = 4900

/** Cart subtotal at or above which delivery is free, in paise (₹499). */
export const FREE_SHIPPING_OVER = 49900

/** Delivery charge for a given subtotal. An empty cart never ships. */
export function shippingFor(subtotal: number): number {
  if (subtotal <= 0) return 0
  return subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT
}

/** ₹1,299 — paise in, Indian-grouped rupees out. */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(paise / 100))
}

/** Whole-rupee helpers for the admin form, which talks in rupees. */
export const toPaise = (rupees: number): number => Math.round(rupees * 100)
export const toRupees = (paise: number): number => Math.round(paise / 100)

/** Percentage off MRP, or 0 when there's no genuine saving to advertise. */
export function discountPct(price: number, mrp?: number | null): number {
  if (!mrp || mrp <= price) return 0
  return Math.round(((mrp - price) / mrp) * 100)
}

/* ---------------------------------------------------------------- stock */

/** Below this, the product page nudges with "Only N left". */
export const LOW_STOCK_AT = 5

export type StockState = 'IN_STOCK' | 'LOW' | 'OUT'

export function stockState(stock: number): StockState {
  if (stock <= 0) return 'OUT'
  return stock <= LOW_STOCK_AT ? 'LOW' : 'IN_STOCK'
}

/* ----------------------------------------------------------- validation */

/** Indian PIN code: six digits, never starting at zero. */
export const PINCODE_RE = /^[1-9][0-9]{5}$/

/** Ten-digit Indian mobile, optionally +91 / 0 prefixed. */
export const PHONE_RE = /^(?:\+91[-\s]?|0)?[6-9]\d{9}$/

/** Indian states and union territories, for the delivery address select. */
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const

/* ------------------------------------------------------------- ordering */

/** Sort options offered on the listing, mapped to Prisma orderBy clauses. */
export const SHOP_SORTS = {
  relevance: { featured: 'desc' as const },
  'price-asc': { price: 'asc' as const },
  'price-desc': { price: 'desc' as const },
  newest: { createdAt: 'desc' as const },
  rating: { rating: 'desc' as const },
}

export type ShopSort = keyof typeof SHOP_SORTS

/** Price filter buckets, in paise, for the listing rail. */
export const PRICE_BUCKETS = [
  { value: 'under-200', label: 'Under ₹200', min: 0, max: 19999 },
  { value: '200-500', label: '₹200 – ₹500', min: 20000, max: 50000 },
  { value: '500-1000', label: '₹500 – ₹1,000', min: 50000, max: 100000 },
  { value: 'over-1000', label: 'Above ₹1,000', min: 100001, max: Number.MAX_SAFE_INTEGER },
] as const

/**
 * A human-quotable order reference, e.g. SS-7K3P9Q.
 *
 * Deliberately not sequential: an incrementing number would leak how many
 * orders the shop has taken to anyone who buys once.
 */
export function makeOrderNumber(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 — misread aloud
  let out = ''
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `SS-${out}`
}

/**
 * Per-line quantity cap, shared by the browser cart and the server re-pricer.
 *
 * Lives here rather than in use-cart.ts because the server needs it too, and
 * importing a value out of a `'use client'` module into server code turns it
 * into a client reference instead of a plain number.
 */
export const MAX_QTY = 10
