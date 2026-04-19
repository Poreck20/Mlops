'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Weight, Calendar, Package, List } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MapView } from '@/components/map/map-view'
import { Card, CardBody } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { GOODS_TYPE_LABELS } from '@/lib/utils'
import { formatPrice } from '@/lib/pricing'
import type { ShipmentRequest, CarrierOffer } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type Tab = 'demandes' | 'offres'

export default function CartePage() {
  const [tab, setTab] = useState<Tab>('demandes')
  const [requests, setRequests] = useState<ShipmentRequest[]>([])
  const [offers, setOffers] = useState<CarrierOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ShipmentRequest | CarrierOffer | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('shipment_requests').select('*, shipper:users(id,first_name,last_name,avg_rating)').eq('status', 'PUBLISHED').order('created_at', { ascending: false }).limit(100),
      supabase.from('carrier_offers').select('*, carrier:carrier_profiles(id,avg_rating,verification_status,user:users(id,first_name,last_name)), vehicle:vehicles(*)').eq('status', 'PUBLISHED').order('departure_date').limit(100),
    ]).then(([{ data: reqs }, { data: offs }]) => {
      if (reqs) setRequests(reqs as ShipmentRequest[])
      if (offs) setOffers(offs as CarrierOffer[])
      setLoading(false)
    })
  }, [])

  const selectedRequest = tab === 'demandes' ? (selected as ShipmentRequest) : null
  const selectedOffer = tab === 'offres' ? (selected as CarrierOffer) : null

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Tabs */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['demandes', 'offres'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelected(null) }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                {t === 'demandes' ? `Demandes (${requests.length})` : `Offres (${offers.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : tab === 'demandes' ? (
            requests.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Aucune demande publiée</div>
            ) : requests.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected?.id === r.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      {r.origin_address.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {r.destination_address.split(',')[0]}
                    </p>
                  </div>
                  <StatusBadge status={r.status} className="text-[10px]" />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{r.weight_kg} kg</span>
                  <span>{GOODS_TYPE_LABELS[r.goods_type]}</span>
                  <span>{format(new Date(r.pickup_date_from), 'd MMM', { locale: fr })}</span>
                  {r.estimated_price && <span className="text-blue-600 font-medium ml-auto">~{formatPrice(r.estimated_price)}</span>}
                </div>
              </button>
            ))
          ) : (
            offers.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Aucune offre publiée</div>
            ) : offers.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelected(selected?.id === o.id ? null : o)}
                className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected?.id === o.id ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      {o.origin_address.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {o.destination_address.split(',')[0]}
                    </p>
                  </div>
                  {(o as any).carrier?.verification_status === 'VERIFIED' && (
                    <span className="text-[10px] text-green-600">✓</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{o.available_weight_kg} kg dispo</span>
                  <span>{format(new Date(o.departure_date), 'd MMM', { locale: fr })}</span>
                  {o.distance_km && <span>{Math.round(o.distance_km)} km</span>}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          <Link href="/annonces" className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600">
            <List className="h-3.5 w-3.5" /> Vue liste
          </Link>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          requests={tab === 'demandes' ? requests : []}
          offers={tab === 'offres' ? offers : []}
          height="100%"
          selectedRequestId={selectedRequest?.id}
          selectedOfferId={selectedOffer?.id}
          onRequestClick={(r) => setSelected(selected?.id === r.id ? null : r)}
          onOfferClick={(o) => setSelected(selected?.id === o.id ? null : o)}
        />

        {/* Popup détail sélectionné */}
        {selected && (
          <div className="absolute top-4 right-4 w-72 z-[1000]">
            <Card className="shadow-lg">
              <CardBody className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(selected as any).origin_address?.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      → {(selected as any).destination_address?.split(',')[0]}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  {'weight_kg' in selected && (
                    <>
                      <span className="flex items-center gap-1"><Weight className="h-3 w-3" />{selected.weight_kg} kg</span>
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" />{GOODS_TYPE_LABELS[(selected as ShipmentRequest).goods_type]}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date((selected as ShipmentRequest).pickup_date_from), 'd MMM', { locale: fr })}</span>
                      {(selected as ShipmentRequest).estimated_price && (
                        <span className="font-semibold text-blue-700">{formatPrice((selected as ShipmentRequest).estimated_price!)}</span>
                      )}
                    </>
                  )}
                  {'available_weight_kg' in selected && (
                    <>
                      <span className="flex items-center gap-1"><Weight className="h-3 w-3" />{(selected as CarrierOffer).available_weight_kg} kg</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date((selected as CarrierOffer).departure_date), 'd MMM', { locale: fr })}</span>
                    </>
                  )}
                </div>

                <Link
                  href={tab === 'demandes' ? `/annonces/demandes/${selected.id}` : `/annonces/offres/${selected.id}`}
                  className="block w-full text-center text-xs font-medium bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Voir le détail →
                </Link>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
