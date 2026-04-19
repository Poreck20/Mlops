'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Weight, Calendar, Package, Search, Filter, Map } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MapView } from '@/components/map/map-view'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import { GOODS_TYPE_LABELS } from '@/lib/utils'
import { formatPrice } from '@/lib/pricing'
import type { ShipmentRequest, CarrierOffer } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Tab = 'demandes' | 'offres'

export default function AnnoncesPage() {
  const [tab, setTab] = useState<Tab>('demandes')
  const [requests, setRequests] = useState<ShipmentRequest[]>([])
  const [offers, setOffers] = useState<CarrierOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ShipmentRequest | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('shipment_requests').select('*, shipper:users(id,first_name,last_name,avg_rating)').eq('status', 'PUBLISHED').order('created_at', { ascending: false }).limit(50),
      supabase.from('carrier_offers').select('*, carrier:carrier_profiles(id,avg_rating,verification_status,user:users(id,first_name,last_name)), vehicle:vehicles(*)').eq('status', 'PUBLISHED').order('departure_date').limit(50),
    ]).then(([{ data: reqs }, { data: offs }]) => {
      if (reqs) setRequests(reqs as ShipmentRequest[])
      if (offs) setOffers(offs as CarrierOffer[])
      setLoading(false)
    })
  }, [])

  const filteredRequests = requests.filter((r) =>
    !search || r.origin_address.toLowerCase().includes(search.toLowerCase()) ||
    r.destination_address.toLowerCase().includes(search.toLowerCase())
  )
  const filteredOffers = offers.filter((o) =>
    !search || o.origin_address.toLowerCase().includes(search.toLowerCase()) ||
    o.destination_address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Annonces de transport</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowMap(!showMap)}>
            <Map className="h-4 w-4" /> {showMap ? 'Liste' : 'Carte'}
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par ville, adresse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(['demandes', 'offres'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'demandes' ? `Demandes (${filteredRequests.length})` : `Offres de trajet (${filteredOffers.length})`}
          </button>
        ))}
      </div>

      {showMap && (
        <div className="mb-6">
          <MapView
            requests={tab === 'demandes' ? filteredRequests : []}
            offers={tab === 'offres' ? filteredOffers : []}
            height="400px"
            selectedRequestId={selectedRequest?.id}
            onRequestClick={(r) => { setSelectedRequest(r); setShowMap(false) }}
          />
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : tab === 'demandes' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((r) => (
            <Link key={r.id} href={`/annonces/demandes/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-900 truncate">
                        <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        {r.origin_address.split(',')[0]}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 truncate mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        {r.destination_address.split(',')[0]}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Weight className="h-3.5 w-3.5" /> {r.weight_kg} kg
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" /> {GOODS_TYPE_LABELS[r.goods_type]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(r.pickup_date_from), 'd MMM', { locale: fr })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {r.urgent && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">🚀 Urgent</span>}
                    {r.fragile && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⚠️ Fragile</span>}
                    {r.refrigerated && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">❄️ Réfrigéré</span>}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {(r as any).shipper?.first_name} · ⭐ {(r as any).shipper?.avg_rating?.toFixed(1) || '—'}
                    </span>
                    {r.estimated_price && (
                      <span className="text-sm font-semibold text-blue-700">
                        ~{formatPrice(r.estimated_price)}
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
          {filteredRequests.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune demande publiée pour le moment.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((o) => (
            <Link key={o.id} href={`/annonces/offres/${o.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-900 truncate">
                        <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        {o.origin_address.split(',')[0]}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 truncate mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        {o.destination_address.split(',')[0]}
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Weight className="h-3.5 w-3.5" /> {o.available_weight_kg} kg dispo
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(o.departure_date), 'd MMM', { locale: fr })}
                    </span>
                  </div>

                  {(o as any).vehicle && (
                    <p className="text-xs text-gray-500">
                      🚛 {(o as any).vehicle.brand} {(o as any).vehicle.model} · {o.distance_km ? `${Math.round(o.distance_km)} km` : ''}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      {(o as any).carrier?.verification_status === 'VERIFIED' && (
                        <span className="text-green-600">✓ Vérifié</span>
                      )}
                      · ⭐ {(o as any).carrier?.avg_rating?.toFixed(1) || '—'}
                    </span>
                    {o.price_per_km_eur && (
                      <span className="text-sm font-semibold text-green-700">
                        {formatPrice(o.price_per_km_eur)}/km
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
          {filteredOffers.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune offre de trajet pour le moment.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
