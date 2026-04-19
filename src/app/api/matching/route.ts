import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { haversineDistance } from '@/lib/mapbox'
import { calculatePrice } from '@/lib/pricing'
import type { MatchResult, CarrierOffer } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const request_id = searchParams.get('request_id')
  if (!request_id) return NextResponse.json({ error: 'request_id required' }, { status: 400 })

  // Fetch the shipment request
  const { data: shipment, error: shipErr } = await supabase
    .from('shipment_requests')
    .select('*')
    .eq('id', request_id)
    .single()

  if (shipErr || !shipment) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  // Fetch published carrier offers that match:
  // - departure_date within pickup window
  // - sufficient weight and volume
  // - accepts the goods type
  const { data: offers, error: offersErr } = await supabase
    .from('carrier_offers')
    .select(`
      *,
      carrier:carrier_profiles(id, avg_rating, verification_status, response_rate, completion_rate,
        user:users(id, first_name, last_name)
      ),
      vehicle:vehicles(*)
    `)
    .eq('status', 'PUBLISHED')
    .gte('departure_date', shipment.pickup_date_from)
    .lte('departure_date', shipment.pickup_date_to)
    .gte('available_weight_kg', shipment.weight_kg)
    .gte('available_volume_m3', shipment.volume_m3)
    .contains('accepted_goods_types', [shipment.goods_type])
    .limit(100)

  if (offersErr) return NextResponse.json({ error: offersErr.message }, { status: 500 })

  // Filter and score matches geographically
  const results: MatchResult[] = []

  for (const offer of (offers as CarrierOffer[])) {
    // Distance from offer origin to shipment origin
    const d_origin = haversineDistance(
      offer.origin_lat, offer.origin_lng,
      shipment.origin_lat, shipment.origin_lng
    )
    // Distance from offer destination to shipment destination
    const d_dest = haversineDistance(
      offer.destination_lat, offer.destination_lng,
      shipment.destination_lat, shipment.destination_lng
    )

    const detour_km = Math.max(0, d_origin - 0) + Math.max(0, d_dest - 0)

    // Only include if detour is within max
    const max_detour = (offer as any).detour_max_km || 50
    if (d_origin > max_detour || d_dest > max_detour) continue

    // Calculate price for this match
    const distance_km = offer.distance_km ||
      haversineDistance(offer.origin_lat, offer.origin_lng, offer.destination_lat, offer.destination_lng)

    const pricing = calculatePrice({
      distance_km,
      weight_kg: shipment.weight_kg,
      volume_m3: shipment.volume_m3,
      is_urgent: shipment.urgent,
      is_fragile: shipment.fragile,
      is_refrigerated: shipment.refrigerated,
      detour_km,
    })

    // Compute compatibility score (0-100)
    const carrier = (offer as any).carrier
    const detour_score = Math.max(0, 1 - detour_km / max_detour) * 30
    const rating_score = ((carrier?.avg_rating || 3) / 5) * 15
    const completion_score = ((carrier?.completion_rate || 80) / 100) * 10
    const response_score = ((carrier?.response_rate || 80) / 100) * 10
    const geo_score = Math.max(0, 1 - (d_origin + d_dest) / (max_detour * 2)) * 35
    const score = Math.round(detour_score + rating_score + completion_score + response_score + geo_score)

    results.push({
      offer: offer as CarrierOffer,
      score,
      detour_km: Math.round(detour_km),
      estimated_price: pricing.total_shipper_eur,
    })
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  return NextResponse.json({ data: results.slice(0, 20) })
}
