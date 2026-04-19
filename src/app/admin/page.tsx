'use client'

import { useEffect, useState } from 'react'
import { Users, Package, Truck, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Navbar } from '@/components/layout/navbar'
import { formatPrice } from '@/lib/pricing'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AdminPage() {
  const [stats, setStats] = useState({ users: 0, requests: 0, offers: 0, bookings: 0, gmv: 0 })
  const [pendingCarriers, setPendingCarriers] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'carriers' | 'incidents'>('overview')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('shipment_requests').select('id', { count: 'exact' }),
      supabase.from('carrier_offers').select('id', { count: 'exact' }),
      supabase.from('bookings').select('id, agreed_price_eur, platform_fee_eur', { count: 'exact' }),
      supabase.from('carrier_profiles').select('*, user:users(id,first_name,last_name,email,created_at)').eq('verification_status', 'PENDING').limit(20),
      supabase.from('incidents').select('*, booking:bookings(*), opener:users(first_name, last_name)').eq('status', 'OPEN').limit(20),
      supabase.from('bookings').select('*, request:shipment_requests(origin_address,destination_address)').order('created_at', { ascending: false }).limit(10),
    ]).then(([{ count: uc }, { count: rc }, { count: oc }, { data: bk, count: bc }, { data: pc }, { data: inc }, { data: rbk }]) => {
      const gmv = (bk || []).reduce((s: number, b: any) => s + (b.agreed_price_eur || 0) + (b.platform_fee_eur || 0), 0)
      setStats({ users: uc || 0, requests: rc || 0, offers: oc || 0, bookings: bc || 0, gmv })
      setPendingCarriers(pc || [])
      setIncidents(inc || [])
      setRecentBookings(rbk || [])
      setLoading(false)
    })
  }, [])

  async function validateCarrier(carrierId: string, status: 'VERIFIED' | 'REJECTED') {
    const supabase = createClient()
    await supabase.from('carrier_profiles').update({ verification_status: status }).eq('id', carrierId)
    setPendingCarriers((prev) => prev.filter((c) => c.id !== carrierId))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Administration FretoMatch</h1>
          <p className="text-gray-500">Vue d&apos;ensemble de la plateforme</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {([
            { key: 'overview', label: 'Vue générale' },
            { key: 'carriers', label: `Transporteurs (${pendingCarriers.length})` },
            { key: 'incidents', label: `Litiges (${incidents.length})` },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {/* KPI Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Utilisateurs', value: stats.users, icon: Users, color: 'blue' },
                { label: 'Demandes', value: stats.requests, icon: Package, color: 'purple' },
                { label: 'Offres', value: stats.offers, icon: Truck, color: 'green' },
                { label: 'Réservations', value: stats.bookings, icon: CheckCircle, color: 'orange' },
                { label: 'GMV total', value: formatPrice(stats.gmv), icon: AlertCircle, color: 'red' },
              ].map((s) => (
                <Card key={s.label}>
                  <CardBody className="text-center">
                    <div className={`h-10 w-10 rounded-lg bg-${s.color}-100 flex items-center justify-center mx-auto mb-2`}>
                      <s.icon className={`h-5 w-5 text-${s.color}-600`} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* Recent bookings */}
            <Card>
              <CardHeader><h2 className="font-semibold text-gray-900">Réservations récentes</h2></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Trajet</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Montant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentBookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {b.request?.origin_address?.split(',')[0]} → {b.request?.destination_address?.split(',')[0]}
                        </td>
                        <td className="px-6 py-3 text-gray-500">{format(new Date(b.created_at), 'd MMM yyyy', { locale: fr })}</td>
                        <td className="px-6 py-3">{formatPrice((b.agreed_price_eur || 0) + (b.platform_fee_eur || 0))}</td>
                        <td className="px-6 py-3"><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {tab === 'carriers' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{pendingCarriers.length} transporteur(s) en attente de vérification</p>
            {pendingCarriers.length === 0 ? (
              <Card>
                <CardBody className="text-center py-12 text-gray-400">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Aucun transporteur en attente</p>
                </CardBody>
              </Card>
            ) : pendingCarriers.map((c: any) => (
              <Card key={c.id}>
                <CardBody>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
                        {c.user?.first_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium">{c.user?.first_name} {c.user?.last_name}</p>
                        <p className="text-sm text-gray-500">{c.user?.email}</p>
                        <p className="text-xs text-gray-400">Inscrit le {format(new Date(c.user?.created_at || Date.now()), 'd MMM yyyy', { locale: fr })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={`/admin/carriers/${c.id}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <FileText className="h-4 w-4" /> Voir documents
                      </a>
                      <Button size="sm" onClick={() => validateCarrier(c.id, 'VERIFIED')} className="gap-1">
                        <CheckCircle className="h-4 w-4" /> Valider
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => validateCarrier(c.id, 'REJECTED')} className="gap-1">
                        <XCircle className="h-4 w-4" /> Rejeter
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {tab === 'incidents' && (
          <div className="space-y-4">
            {incidents.length === 0 ? (
              <Card>
                <CardBody className="text-center py-12 text-gray-400">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Aucun litige ouvert</p>
                </CardBody>
              </Card>
            ) : incidents.map((inc: any) => (
              <Card key={inc.id} className="border-red-100">
                <CardBody>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-sm">{inc.type}</span>
                        <StatusBadge status={inc.status} />
                      </div>
                      <p className="text-sm text-gray-600">{inc.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Ouvert par {inc.opener?.first_name} · {format(new Date(inc.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <a href={`/bookings/${inc.booking_id}`} className="text-sm text-blue-600 hover:underline">
                      Voir réservation →
                    </a>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
