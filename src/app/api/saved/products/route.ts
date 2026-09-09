import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** The ids of every product the signed-in student has saved — hydrates the hearts. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  const rows = await prisma.savedProduct.findMany({
    where: { userId: user.id },
    select: { productId: true },
  })
  return NextResponse.json({ productIds: rows.map((r) => r.productId) })
}

const schema = z.object({ productId: z.string().trim().min(1) })

/** Toggles a product in the student's saved list; returns the resulting state. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { productId } = parsed.data

  const existing = await prisma.savedProduct.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { id: true },
  })
  if (existing) {
    await prisma.savedProduct.delete({ where: { id: existing.id } })
    return NextResponse.json({ saved: false })
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  try {
    await prisma.savedProduct.create({ data: { userId: user.id, productId } })
  } catch {
    // Raced with another tab that saved first — the end state is still "saved".
  }
  return NextResponse.json({ saved: true })
}
