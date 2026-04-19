import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, proof_url } = await request.json()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, carrier:carrier_profiles(user_id, stripe_account_id)')
    .eq('id', id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isShipper = booking.shipper_id === user.id
  const isCarrier = (booking as any).carrier?.user_id === user.id

  let update: Record<string, unknown> = {}

  switch (action) {
    case 'confirm': // Carrier accepts
      if (!isCarrier) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (booking.status !== 'PENDING') return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
      update = { status: 'CONFIRMED' }
      break

    case 'refuse': // Carrier refuses
      if (!isCarrier) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (booking.status !== 'PENDING') return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
      update = { status: 'CANCELLED_FREE' }
      if (booking.payment_intent_id) {
        await stripe.paymentIntents.cancel(booking.payment_intent_id)
      }
      break

    case 'pickup': // Carrier confirms pickup
      if (!isCarrier) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (booking.status !== 'PAID') return NextResponse.json({ error: 'Payment required first' }, { status: 400 })
      update = { status: 'IN_TRANSIT', pickup_proof_url: proof_url, pickup_confirmed_at: new Date().toISOString() }
      break

    case 'deliver': // Carrier confirms delivery
      if (!isCarrier) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (booking.status !== 'IN_TRANSIT') return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
      update = { status: 'DELIVERED', delivery_proof_url: proof_url, delivery_confirmed_at: new Date().toISOString() }
      break

    case 'release': // Auto or shipper releases funds after 48h
      if (!isShipper && booking.status === 'DELIVERED') {
        // Admin or auto-trigger
      }
      if (booking.status !== 'DELIVERED') return NextResponse.json({ error: 'Not delivered yet' }, { status: 400 })
      // Capture payment
      if (booking.payment_intent_id) {
        await stripe.paymentIntents.capture(booking.payment_intent_id)
      }
      update = { status: 'COMPLETED', funds_released_at: new Date().toISOString() }
      break

    case 'cancel': // Shipper cancels
      if (!isShipper) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) return NextResponse.json({ error: 'Cannot cancel' }, { status: 400 })
      if (booking.payment_intent_id) {
        await stripe.paymentIntents.cancel(booking.payment_intent_id).catch(() => {})
      }
      update = { status: 'CANCELLED_FREE' }
      break

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
