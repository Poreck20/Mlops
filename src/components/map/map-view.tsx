'use client'

import { useEffect, useRef } from 'react'
import type { ShipmentRequest, CarrierOffer } from '@/types'

interface MapViewProps {
  requests?: ShipmentRequest[]
  offers?: CarrierOffer[]
  height?: string
  selectedRequestId?: string
  selectedOfferId?: string
  onRequestClick?: (r: ShipmentRequest) => void
  onOfferClick?: (o: CarrierOffer) => void
  showRoute?: { origin: [number, number]; destination: [number, number]; polyline?: GeoJSON.LineString }
}

export function MapView({
  requests = [],
  offers = [],
  height = '500px',
  selectedRequestId,
  selectedOfferId,
  onRequestClick,
  onOfferClick,
  showRoute,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeLayerRef = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    // Leaflet doit être importé côté client uniquement
    import('leaflet').then((L) => {
      // Fix icônes manquantes
      delete (L.default.Icon.Default.prototype as any)._getIconUrl
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.default.map(mapContainer.current!, {
        center: [46.8, 2.35],
        zoom: 5,
        zoomControl: true,
      })

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = { map, L: L.default }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.map.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Mise à jour markers / route quand les données changent
  useEffect(() => {
    if (!mapRef.current) {
      // Retry après que la carte soit initialisée
      const timer = setTimeout(() => {
        updateMap()
      }, 600)
      return () => clearTimeout(timer)
    }
    updateMap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, offers, showRoute, selectedRequestId, selectedOfferId])

  function updateMap() {
    if (!mapRef.current) return
    const { map, L } = mapRef.current

    // Nettoyer anciens markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    const bounds: [number, number][] = []

    // Icônes personnalisées
    const blueIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563EB;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    const greenIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    const originIcon = L.divIcon({
      className: '',
      html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:10px">🚚</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
    const destIcon = L.divIcon({
      className: '',
      html: `<div style="width:20px;height:20px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:10px">🏁</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    // Markers demandes (bleu)
    requests.forEach((r) => {
      const m = L.marker([r.origin_lat, r.origin_lng], { icon: blueIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-size:12px;min-width:160px">
            <b>${r.origin_address.split(',')[0]}</b><br/>
            → ${r.destination_address.split(',')[0]}<br/>
            <span style="color:#6b7280">${r.weight_kg} kg · ${r.goods_type}</span>
          </div>
        `)
      if (onRequestClick) m.on('click', () => onRequestClick(r))
      markersRef.current.push(m)
      bounds.push([r.origin_lat, r.origin_lng])
    })

    // Markers offres (vert)
    offers.forEach((o) => {
      const m = L.marker([o.origin_lat, o.origin_lng], { icon: greenIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-size:12px;min-width:160px">
            <b>${o.origin_address.split(',')[0]}</b><br/>
            → ${o.destination_address.split(',')[0]}<br/>
            <span style="color:#6b7280">${o.available_weight_kg} kg dispo</span>
          </div>
        `)
      if (onOfferClick) m.on('click', () => onOfferClick(o))
      markersRef.current.push(m)
      bounds.push([o.origin_lat, o.origin_lng])
    })

    // Route
    if (showRoute) {
      const originM = L.marker(
        [showRoute.origin[1], showRoute.origin[0]],
        { icon: originIcon }
      ).addTo(map)
      const destM = L.marker(
        [showRoute.destination[1], showRoute.destination[0]],
        { icon: destIcon }
      ).addTo(map)
      markersRef.current.push(originM, destM)
      bounds.push([showRoute.origin[1], showRoute.origin[0]])
      bounds.push([showRoute.destination[1], showRoute.destination[0]])

      if (showRoute.polyline?.coordinates) {
        const latlngs = showRoute.polyline.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number]
        )
        const polyline = L.polyline(latlngs, {
          color: '#2563EB',
          weight: 4,
          opacity: 0.8,
        }).addTo(map)
        routeLayerRef.current = polyline
      }
    }

    // Fit bounds
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 10)
      } else {
        map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 12 })
      }
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={mapContainer} className="w-full h-full" />
      {/* Legend */}
      {(requests.length > 0 || offers.length > 0) && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow border border-gray-100 p-2 text-xs space-y-1 z-[1000]">
          {requests.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-blue-600" />Demandes
            </div>
          )}
          {offers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-green-600" />Offres
            </div>
          )}
        </div>
      )}
    </div>
  )
}
