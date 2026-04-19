'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Weight, Calendar, Package, Star, CheckCircle, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MapView } from '@/components/map/map-view'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { GOODS_TYPE_LABELS } from '@/lib/utils'
import { formatPrice } from '@/lib/pricing'
import type { ShipmentRequest, MatchResult } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function DemandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [request, setRequest] = useState<ShipmentRequest | null>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingLoading, setBookingLoading] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('shipment_requests').select('*, shipper:users(*)').eq('id', id).single(),
      supabase.auth.getUser(),
    ]).then(([{ data: req }, { data: { user } }]) => {
      if (req) setRequest(req as ShipmentRequest)
      if (user) setCurrentUserId(user.id)
      setLoading(false)
    })

    fetch(`/api/matching?request_id=${id}`)
      .then((r) => r.json())
      .then(({ data }) => { if (data) setMatches(data) })
  }, [id])

  async function handleBook(offerId: string, price: number) {
    setBookingLoading(offerId)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: id, offer_id: offerId }),
      })
      const data = await res.json()
      if (data.data?.id) {
        router.push(`/bookings/${data.data.id}`)
      }
    } finally {
      setBookingLoading(null)
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10 text-center">Chargement...</div>
  if (!request) return <div className="max-w-4xl mx-auto px-4 py-10 text-center">Demande introuvable.</div>

  const isOwner = currentUserId === (request as any).shipper?.id

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {request.origin_address.split(',')[0]} → {request.destination_address.split(',')[0]}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={request.status} />
              {request.urgent && <Badge variant="warning">🚀 Urgent</Badge>}
              {request.fragile && <Badge variant="warning">⚠️ Fragile</Badge>}
              {request.refrigerated && <Badge variant="info">❄️ Réfrigéré</Badge>}
            </div>
          </div>
          {request.estimated_price && (
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">{formatPrice(request.estimated_price)}</div>
              <div className="text-xs text-gray-500">Prix estimé</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-5 w-5 rounded-full bg-blue-100 border-2 border-blue-500 flex-shrink-0" />
                  <div className="w-0.5 h-6 bg-gray-200 my-1" />
                  <div className="h-5 w-5 rounded-full bg-green-100 border-2 border-green-500 flex-shrink-0" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Collecte</p>
                    <p className="font-medium text-gray-900">{request.origin_address}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Livraison</p>
                    <p className="font-medium text-gray-900">{request.destination_address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Calendar className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-500">Collecte entre</div>
                <div className="text-sm font-medium">{format(new Date(request.pickup_date_from), 'd MMM', { locale: fr })}</div>
                <div className="text-xs text-gray-400">et {format(new Date(request.pickup_date_to), 'd MMM', { locale: fr })}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Weight className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-500">Poids</div>
                <div className="text-sm font-medium">{request.weight_kg} kg</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Package className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-500">Volume</div>
                <div className="text-sm font-medium">{request.volume_m3} m³</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <Package className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-500">Type</div>
                <div className="text-sm font-medium">{GOODS_TYPE_LABELS[request.goods_type]}</div>
              </div>
            </div>

            {request.description && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{request.description}</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-gray-900">Expéditeur</h3></CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                {(request as any).shipper?.first_name?.[0]}
              </div>
              <div>
                <div className="font-medium text-sm">{(request as any).shipper?.first_name} {(request as any).shipper?.last_name?.[0]}.</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {(request as any).shipper?.avg_rating?.toFixed(1) || '—'}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Carte */}
      <div className="mb-6">
        <MapView
          requests={[request]}
          height="350px"
          showRoute={{
            origin: [request.origin_lng, request.origin_lat],
            destination: [request.destination_lng, request.destination_lat],
          }}
        />
      </div>

      {/* Matches transporteurs */}
      {!isOwner && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Transporteurs compatibles ({matches.length})
          </h2>
          <div className="space-y-3">
            {matches.map((m) => (
              <Card key={m.offer.id} className="hover:shadow-md transition-shadow">
                <CardBody>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
                          {(m.offer as any).carrier?.user?.first_name?.[0]}
                        </div>
                        <div>
                          <span className="font-medium text-sm">{(m.offer as any).carrier?.user?.first_name} {(m.offer as any).carrier?.user?.last_name?.[0]}.</span>
                          {(m.offer as any).carrier?.verification_status === 'VERIFIED' && (
                            <span className="ml-2 text-xs text-green-600 flex items-center gap-0.5 inline-flex">
                              <CheckCircle className="h-3 w-3" /> Vérifié
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3 ml-11">
                        <span>⭐ {(m.offer as any).carrier?.avg_rating?.toFixed(1) || '—'}</span>
                        <span>🚚 {m.offer.origin_address.split(',')[0]} → {m.offer.destination_address.split(',')[0]}</span>
                        <span>📅 {format(new Date(m.offer.departure_date), 'd MMM', { locale: fr })}</span>
                        {m.detour_km > 0 && <span>+{m.detour_km} km détour</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-700">{formatPrice(m.estimated_price)}</div>
                        <div className="text-xs text-gray-400">Score {m.score}/100</div>
                      </div>
                      <Button
                        size="sm"
                        loading={bookingLoading === m.offer.id}
                        onClick={() => handleBook(m.offer.id, m.estimated_price)}
                      >
                        Réserver
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
            {matches.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Aucun transporteur compatible pour le moment.</p>
                <p className="text-sm">Votre demande est publiée et visible des transporteurs.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
