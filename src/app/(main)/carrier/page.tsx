'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Truck, MapPin, Calendar, Euro, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/pricing'
import type { CarrierOffer, Booking } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function CarrierDashboard() {
  const [offers, setOffers] = useState<CarrierOffer[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [verificationStatus, setVerificationStatus] = useState<string>('PENDING')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: u }, { data: profile }] = await Promise.all([
        supabase.from('users').select('first_name').eq('id', user.id).single(),
        supabase.from('carrier_profiles').select('id, verification_status').eq('user_id', user.id).single(),
      ])
      if (u) setUserName(u.first_name)
      if (profile) {
        setVerificationStatus(profile.verification_status)
        const [{ data: offs }, { data: bkgs }] = await Promise.all([
          supabase.from('carrier_offers').select('*').eq('carrier_id', profile.id).order('departure_date').limit(20),
          supabase.from('bookings').select('*, request:shipment_requests(*)').eq('carrier_id', profile.id).order('created_at', { ascending: false }).limit(20),
        ])
        if (offs) setOffers(offs)
        if (bkgs) setBookings(bkgs as Booking[])
      }
      setLoading(false)
    })
  }, [])

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING')
  const activeBookings = bookings.filter((b) => ['CONFIRMED', 'PAID', 'IN_TRANSIT'].includes(b.status))
  const totalEarned = bookings
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + b.carrier_payout_eur, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {verificationStatus !== 'VERIFIED' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Profil en attente de vérification</p>
            <p className="text-sm text-yellow-700">Uploadez vos documents pour être visible et réservable par les chargeurs.</p>
            <Link href="/carrier/documents" className="text-sm text-yellow-900 font-medium underline">Ajouter mes documents →</Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {userName} 👋</h1>
          <p className="text-gray-500">Tableau de bord transporteur</p>
        </div>
        <Link href="/carrier/nouvelle-offre">
          <Button>
            <Plus className="h-4 w-4" /> Proposer un trajet
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Demandes en attente', value: pendingBookings.length, icon: AlertCircle, color: 'orange' },
          { label: 'En cours', value: activeBookings.length, icon: Truck, color: 'blue' },
          { label: 'Livrés', value: bookings.filter((b) => ['DELIVERED', 'COMPLETED'].includes(b.status)).length, icon: MapPin, color: 'green' },
          { label: 'Revenus totaux', value: formatPrice(totalEarned), icon: Euro, color: 'purple' },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg bg-${s.color}-100 flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 text-${s.color}-600`} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Pending bookings - action required */}
      {pendingBookings.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Demandes à traiter ({pendingBookings.length})
          </h2>
          <div className="space-y-3">
            {pendingBookings.map((b) => (
              <Card key={b.id} className="border-orange-200 bg-orange-50">
                <CardBody>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">{(b.request as any)?.origin_address?.split(',')[0]} → {(b.request as any)?.destination_address?.split(',')[0]}</p>
                      <p className="text-xs text-gray-500">{(b.request as any)?.weight_kg} kg · {formatPrice(b.carrier_payout_eur)} pour vous</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          await fetch(`/api/bookings/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm' }) })
                          window.location.reload()
                        }}
                      >
                        ✓ Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await fetch(`/api/bookings/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refuse' }) })
                          window.location.reload()
                        }}
                      >
                        Refuser
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* My offers */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Mes trajets publiés</h2>
            <Link href="/carrier/nouvelle-offre" className="text-xs text-blue-600 hover:underline">+ Nouveau</Link>
          </CardHeader>
          <CardBody className="divide-y divide-gray-100">
            {loading ? (
              <div className="space-y-3 py-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : offers.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">Aucun trajet publié</p>
              </div>
            ) : offers.slice(0, 5).map((o) => (
              <Link key={o.id} href={`/annonces/offres/${o.id}`} className="block py-3 hover:bg-gray-50 -mx-6 px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {o.origin_address.split(',')[0]} → {o.destination_address.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(o.departure_date), 'd MMM', { locale: fr })} · {o.available_weight_kg} kg dispo
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>

        {/* Active bookings */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Transports en cours</h2>
          </CardHeader>
          <CardBody className="divide-y divide-gray-100">
            {activeBookings.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun transport en cours</p>
            ) : activeBookings.map((b) => (
              <Link key={b.id} href={`/bookings/${b.id}`} className="block py-3 hover:bg-gray-50 -mx-6 px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(b.request as any)?.origin_address?.split(',')[0]} → {(b.request as any)?.destination_address?.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPrice(b.carrier_payout_eur)} à recevoir
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
