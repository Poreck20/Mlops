'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Package, Camera, MessageSquare, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { MapView } from '@/components/map/map-view'
import { formatPrice } from '@/lib/pricing'
import type { Booking } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STEPS = [
  { status: 'PENDING', label: 'En attente' },
  { status: 'CONFIRMED', label: 'Confirmé' },
  { status: 'PAID', label: 'Payé' },
  { status: 'IN_TRANSIT', label: 'En transit' },
  { status: 'DELIVERED', label: 'Livré' },
  { status: 'COMPLETED', label: 'Terminé' },
]

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('bookings').select(`
        *,
        request:shipment_requests(*),
        offer:carrier_offers(*, vehicle:vehicles(*), carrier:carrier_profiles(*, user:users(*)))
      `).eq('id', id).single(),
      supabase.auth.getUser(),
      supabase.from('conversations').select('id').eq('booking_id', id).single(),
    ]).then(async ([{ data: bk }, { data: { user } }, { data: conv }]) => {
      if (bk) setBooking(bk as Booking)
      if (user) {
        const { data: u } = await supabase.from('users').select('*, carrier_profiles(id)').eq('id', user.id).single()
        setCurrentUser(u)
      }
      if (conv) {
        setConversationId(conv.id)
        const { data: msgs } = await supabase.from('messages').select('*, sender:users(id,first_name,last_name)').eq('conversation_id', conv.id).order('created_at')
        if (msgs) setMessages(msgs)
      }
      setLoading(false)
    })
  }, [id])

  async function doAction(action: string, extra?: Record<string, unknown>) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (data.data) setBooking((prev) => ({ ...prev!, ...data.data }))
    } finally {
      setActionLoading(false)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !conversationId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim(),
    }).select('*, sender:users(id,first_name,last_name)').single()
    if (msg) setMessages((prev) => [...prev, msg])
    setNewMessage('')
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 text-center">Chargement...</div>
  if (!booking) return <div className="max-w-3xl mx-auto px-4 py-10 text-center">Réservation introuvable.</div>

  const req = (booking as any).request
  const offer = (booking as any).offer
  const isShipper = currentUser?.id === booking.shipper_id
  const isCarrier = currentUser?.carrier_profiles?.some((p: any) => p.id === booking.carrier_id)

  const currentStepIdx = STEPS.findIndex((s) => s.status === booking.status)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {req?.origin_address?.split(',')[0]} → {req?.destination_address?.split(',')[0]}
            </h1>
            <p className="text-sm text-gray-500">Réservation #{id.slice(0, 8)}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between overflow-x-auto pb-1">
            {STEPS.slice(0, 6).map((step, i) => (
              <div key={step.status} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i <= currentStepIdx ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                    {i < currentStepIdx ? '✓' : i + 1}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < currentStepIdx ? 'bg-blue-600' : 'bg-gray-200'}`} style={{ minWidth: '2rem' }} />
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Details */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><h3 className="font-semibold text-sm text-gray-900">Détails transport</h3></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">Collecte</div>
                <div>{req?.origin_address}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <div className="text-xs text-gray-400">Livraison</div>
                <div>{req?.destination_address}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Package className="h-4 w-4" />
              {req?.weight_kg} kg · {req?.volume_m3} m³
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-sm text-gray-900">Paiement</h3></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Transport HT</span><span>{formatPrice(booking.agreed_price_eur)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Commission</span><span>{formatPrice(booking.platform_fee_eur)}</span></div>
            <div className="flex justify-between font-semibold border-t border-gray-100 pt-2">
              <span>Total chargeur</span>
              <span className="text-blue-700">{formatPrice(booking.agreed_price_eur + booking.platform_fee_eur)}</span>
            </div>
            {isCarrier && (
              <div className="flex justify-between text-green-700">
                <span>Votre revenu</span>
                <span className="font-semibold">{formatPrice(booking.carrier_payout_eur)}</span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Map */}
      {req && (
        <div className="mb-4">
          <MapView
            height="250px"
            showRoute={{
              origin: [req.origin_lng, req.origin_lat],
              destination: [req.destination_lng, req.destination_lat],
            }}
          />
        </div>
      )}

      {/* Actions */}
      <Card className="mb-4">
        <CardHeader><h3 className="font-semibold text-sm text-gray-900">Actions</h3></CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          {isCarrier && booking.status === 'PENDING' && (
            <>
              <Button loading={actionLoading} onClick={() => doAction('confirm')}>
                <CheckCircle className="h-4 w-4" /> Accepter la réservation
              </Button>
              <Button variant="secondary" loading={actionLoading} onClick={() => doAction('refuse')}>
                Refuser
              </Button>
            </>
          )}
          {isCarrier && booking.status === 'PAID' && (
            <Button loading={actionLoading} onClick={() => doAction('pickup')}>
              <Camera className="h-4 w-4" /> Confirmer la prise en charge
            </Button>
          )}
          {isCarrier && booking.status === 'IN_TRANSIT' && (
            <Button loading={actionLoading} onClick={() => doAction('deliver')}>
              <CheckCircle className="h-4 w-4" /> Confirmer la livraison
            </Button>
          )}
          {isShipper && booking.status === 'DELIVERED' && (
            <Button loading={actionLoading} onClick={() => doAction('release')}>
              <CheckCircle className="h-4 w-4" /> Confirmer et libérer le paiement
            </Button>
          )}
          {isShipper && ['PENDING', 'CONFIRMED'].includes(booking.status) && (
            <Button variant="danger" loading={actionLoading} onClick={() => doAction('cancel')}>
              Annuler
            </Button>
          )}
          {['PENDING', 'CONFIRMED', 'PAID', 'IN_TRANSIT', 'DELIVERED'].includes(booking.status) === false && (
            <p className="text-sm text-gray-400">Aucune action disponible pour ce statut.</p>
          )}
        </CardBody>
      </Card>

      {/* Messagerie */}
      {conversationId && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Messages
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucun message pour l&apos;instant.</p>
              ) : messages.map((m) => {
                const isMe = m.sender_id === currentUser?.id
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {!isMe && <p className="text-xs font-medium mb-0.5 opacity-70">{m.sender?.first_name}</p>}
                      {m.content}
                      <p className={`text-xs mt-0.5 opacity-60 ${isMe ? 'text-right' : ''}`}>
                        {format(new Date(m.created_at), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Écrire un message..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button size="sm" onClick={sendMessage} disabled={!newMessage.trim()}>
                Envoyer
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
