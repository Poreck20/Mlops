import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  let query = supabase
    .from('shipment_requests')
    .select(`*, shipper:users(id, first_name, last_name, avg_rating)`)
    .eq('status', 'PUBLISHED')
    .order('created_at', { ascending: false })

  const goods_type = searchParams.get('goods_type')
  if (goods_type) query = query.eq('goods_type', goods_type)

  const max_weight = searchParams.get('max_weight')
  if (max_weight) query = query.lte('weight_kg', Number(max_weight))

  const limit = Number(searchParams.get('limit') || '50')
  query = query.limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('shipment_requests')
    .insert({ ...body, shipper_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
