import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { calculatePrice } from '@/lib/pricing'
import { haversineDistance } from '@/lib/mapbox'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { request_id, offer_id } = await request.json()

  // Fetch request and offer
  const [{ data: shipment }, { data: offer }] = await Promise.all([
    supabase.from('shipment_requests').select('*').eq('id', request_id).single(),
    supabase.from('carrier_offers').select('*, carrier:carrier_profiles(id, user_id, stripe_account_id)').eq('id', offer_id).single(),
  ])

  if (!shipment || !offer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify shipper owns the request
  if (shipment.shipper_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent duplicate booking
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('request_id', request_id)
    .eq('offer_id', offer_id)
    .not('status', 'in', '("CANCELLED_FREE","CANCELLED_FEE")')
    .single()
  if (existing) return NextResponse.json({ error: 'Réservation déjà existante' }, { status: 409 })

  // Calculate price
  const distance_km = offer.distance_km ||
    haversineDistance(offer.origin_lat, offer.origin_lng, offer.destination_lat, offer.destination_lng)

  const pricing = calculatePrice({
    distance_km,
    weight_kg: shipment.weight_kg,
    volume_m3: shipment.volume_m3,
    is_urgent: shipment.urgent,
    is_fragile: shipment.fragile,
    is_refrigerated: shipment.refrigerated,
  })

  // Get or create Stripe customer for shipper
  const { data: shipperUser } = await supabase.from('users').select('stripe_customer_id, email').eq('id', user.id).single()
  let customerId = shipperUser?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email: shipperUser?.email })
    customerId = customer.id
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  // Create Stripe PaymentIntent (manual capture = séquestre)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(pricing.total_shipper_eur * 100),
    currency: 'eur',
    customer: customerId,
    capture_method: 'manual',
    metadata: { request_id, offer_id, shipper_id: user.id },
    description: `FretoMatch — ${shipment.origin_address} → ${shipment.destination_address}`,
  })

  // Create booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      request_id,
      offer_id,
      shipper_id: user.id,
      carrier_id: (offer as any).carrier?.id,
      agreed_price_eur: pricing.price_ht,
      platform_fee_eur: pricing.platform_fee,
      carrier_payout_eur: pricing.carrier_payout_eur,
      status: 'PENDING',
      payment_intent_id: paymentIntent.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Create conversation for this booking
  await supabase.from('conversations').insert({ booking_id: booking.id })

  return NextResponse.json({
    data: booking,
    client_secret: paymentIntent.client_secret,
  }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('carrier_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const query = supabase
    .from('bookings')
    .select(`
      *,
      request:shipment_requests(*),
      offer:carrier_offers(*,
        vehicle:vehicles(*)
      )
    `)
    .order('created_at', { ascending: false })

  const role = request.nextUrl.searchParams.get('role')
  const { data, error } = role === 'carrier' && profile
    ? await query.eq('carrier_id', profile.id)
    : await query.eq('shipper_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
