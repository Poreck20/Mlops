export interface GeocodedAddress {
  address: string
  lat: number
  lng: number
  place_name: string
}

export interface RouteResult {
  distance_km: number
  duration_min: number
  polyline: GeoJSON.LineString
}

// Nominatim (OpenStreetMap) — 100% gratuit, sans clé API
export async function geocodeAddress(query: string): Promise<GeocodedAddress[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=fr`

  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'fr', 'User-Agent': 'FretoMatch/1.0' },
    })
    const data = await res.json()
    return data.map((f: any) => ({
      address: f.display_name,
      place_name: f.display_name,
      lat: parseFloat(f.lat),
      lng: parseFloat(f.lon),
    }))
  } catch {
    return []
  }
}

// OSRM public instance — 100% gratuit
export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?overview=full&geometries=geojson`

  try {
    const res = await fetch(url)
    const data = await res.json()
    if (!data.routes?.length) return null
    return {
      distance_km: data.routes[0].distance / 1000,
      duration_min: data.routes[0].duration / 60,
      polyline: data.routes[0].geometry,
    }
  } catch {
    return null
  }
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}
