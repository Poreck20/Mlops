import { NextRequest, NextResponse } from 'next/server'
import { calculatePrice } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const breakdown = calculatePrice(body)
    return NextResponse.json(breakdown)
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
}
