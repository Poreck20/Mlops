import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ results: [] })

  // Nominatim — OpenStreetMap, gratuit, sans clé API
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=fr`

  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'fr', 'User-Agent': 'FretoMatch/1.0' },
    })
    const data = await res.json()
    const results = data.map((f: any) => ({
      address: f.display_name,
      place_name: f.display_name,
      lat: parseFloat(f.lat),
      lng: parseFloat(f.lon),
    }))
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
