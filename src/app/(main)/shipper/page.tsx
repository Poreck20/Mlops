'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Package, MapPin, Calendar, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/pricing'
import type { ShipmentRequest, Booking } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ShipperDashboard() {
  const [requests, setRequests] = useState<ShipmentRequest[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: u }, { data: reqs }, { data: bkgs }] = await Promise.all([
        supabase.from('users').select('first_name').eq('id', user.id).single(),
        supabase.from('shipment_requests').select('*').eq('shipper_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('bookings').select('*, request:shipment_requests(*), offer:carrier_offers(*)').eq('shipper_id', user.id).order('created_at', { ascending: false }).limit(10),
      ])
      if (u) setUserName(u.first_name)
      if (reqs) setRequests(reqs)
      if (bkgs) setBookings(bkgs as Booking[])
      setLoading(false)
    })
  }, [])

  const activeBookings = bookings.filter((b) => ['CONFIRMED', 'PAID', 'IN_TRANSIT'].includes(b.status))
  const totalSpent = bookings
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + b.agreed_price_eur + b.platform_fee_eur, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {userName} 👋</h1>
          <p className="text-gray-500">Tableau de bord expéditeur</p>
        </div>
        <Link href="/shipper/nouvelle-demande">
          <Button>
            <Plus className="h-4 w-4" /> Nouvelle demande
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Demandes actives', value: requests.filter((r) => r.status === 'PUBLISHED').length, icon: Package, color: 'blue' },
          { label: 'En cours', value: activeBookings.length, icon: MapPin, color: 'orange' },
          { label: 'Livrés', value: bookings.filter((b) => ['DELIVERED', 'COMPLETED'].includes(b.status)).length, icon: TrendingUp, color: 'green' },
          { label: 'Total dépensé', value: formatPrice(totalSpent), icon: Calendar, color: 'purple' },
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Active bookings */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Transports en cours</h2>
            <Link href="/bookings" className="text-xs text-blue-600 hover:underline">Tout voir</Link>
          </CardHeader>
          <CardBody className="divide-y divide-gray-100">
            {activeBookings.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun transport en cours</p>
            ) : activeBookings.map((b) => (
              <Link key={b.id} href={`/bookings/${b.id}`} className="block py-3 hover:bg-gray-50 -mx-6 px-6 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(b.request as any)?.origin_address?.split(',')[0]} → {(b.request as any)?.destination_address?.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(b.created_at), 'd MMM yyyy', { locale: fr })} · {formatPrice(b.agreed_price_eur + b.platform_fee_eur)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>

        {/* My requests */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Mes demandes</h2>
            <Link href="/shipper/nouvelle-demande" className="text-xs text-blue-600 hover:underline">+ Nouvelle</Link>
          </CardHeader>
          <CardBody className="divide-y divide-gray-100">
            {loading ? (
              <div className="space-y-3 py-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">Aucune demande publiée</p>
                <Link href="/shipper/nouvelle-demande">
                  <Button size="sm" className="mt-3">Créer une demande</Button>
                </Link>
              </div>
            ) : requests.slice(0, 5).map((r) => (
              <Link key={r.id} href={`/annonces/demandes/${r.id}`} className="block py-3 hover:bg-gray-50 -mx-6 px-6 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {r.origin_address.split(',')[0]} → {r.destination_address.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(r.pickup_date_from), 'd MMM', { locale: fr })} · {r.weight_kg} kg
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
