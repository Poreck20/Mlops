import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  let query = supabase
    .from('carrier_offers')
    .select(`
      *,
      carrier:carrier_profiles(
        id, avg_rating, verification_status,
        user:users(id, first_name, last_name)
      ),
      vehicle:vehicles(*)
    `)
    .eq('status', 'PUBLISHED')
    .order('departure_date', { ascending: true })

  const departure_from = searchParams.get('departure_from')
  if (departure_from) query = query.gte('departure_date', departure_from)

  const goods_type = searchParams.get('goods_type')
  if (goods_type) query = query.contains('accepted_goods_types', [goods_type])

  const min_weight = searchParams.get('min_weight')
  if (min_weight) query = query.gte('available_weight_kg', Number(min_weight))

  const limit = Number(searchParams.get('limit') || '50')
  query = query.limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
