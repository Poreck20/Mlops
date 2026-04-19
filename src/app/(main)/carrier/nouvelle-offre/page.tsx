'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Ruler, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getRoute } from '@/lib/mapbox'
import { AddressInput } from '@/components/forms/address-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { GOODS_TYPE_LABELS, VEHICLE_TYPE_LABELS } from '@/lib/utils'
import type { GeocodedAddress } from '@/lib/mapbox'
import type { Vehicle } from '@/types'

const schema = z.object({
  vehicle_id: z.string().min(1, 'Sélectionnez un véhicule'),
  departure_date: z.string().min(1, 'Requis'),
  arrival_date_estimated: z.string().min(1, 'Requis'),
  available_weight_kg: z.coerce.number().min(1, 'Min 1 kg'),
  available_volume_m3: z.coerce.number().min(0.01),
  accepted_goods_types: z.array(z.string()).min(1, 'Sélectionnez au moins un type'),
  detour_max_km: z.coerce.number().min(5).max(200).default(50),
  price_per_km_eur: z.coerce.number().optional(),
})
type FormData = z.infer<typeof schema>

export default function NouvelleOffrePage() {
  const router = useRouter()
  const [origin, setOrigin] = useState<GeocodedAddress | null>(null)
  const [destination, setDestination] = useState<GeocodedAddress | null>(null)
  const [originError, setOriginError] = useState('')
  const [destError, setDestError] = useState('')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [routePolyline, setRoutePolyline] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      detour_max_km: 50,
      accepted_goods_types: ['palette', 'colis', 'meuble', 'vrac', 'autre'],
    },
  })

  const acceptedTypes = watch('accepted_goods_types') || []

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('carrier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!profile) return
      const { data: v } = await supabase
        .from('vehicles')
        .select('*')
        .eq('carrier_id', profile.id)
      if (v) setVehicles(v)
    })
  }, [])

  useEffect(() => {
    if (!origin || !destination) return
    getRoute(origin, destination).then((route) => {
      if (route) {
        setDistanceKm(route.distance_km)
        setRoutePolyline(JSON.stringify(route.polyline))
      }
    })
  }, [origin, destination])

  function toggleGoodsType(type: string) {
    const current = acceptedTypes
    if (current.includes(type)) {
      setValue('accepted_goods_types', current.filter((t) => t !== type))
    } else {
      setValue('accepted_goods_types', [...current, type])
    }
  }

  async function onSubmit(data: any) {
    if (!origin) { setOriginError('Requis'); return }
    if (!destination) { setDestError('Requis'); return }
    setOriginError(''); setDestError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('carrier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!profile) { router.push('/carrier/onboarding'); return }

    const { data: inserted, error } = await supabase
      .from('carrier_offers')
      .insert({
        carrier_id: profile.id,
        vehicle_id: data.vehicle_id,
        origin_address: origin.place_name,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_address: destination.place_name,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        route_polyline: routePolyline,
        departure_date: data.departure_date,
        arrival_date_estimated: data.arrival_date_estimated,
        available_weight_kg: data.available_weight_kg,
        available_volume_m3: data.available_volume_m3,
        accepted_goods_types: data.accepted_goods_types,
        detour_max_km: data.detour_max_km,
        price_per_km_eur: data.price_per_km_eur || null,
        distance_km: distanceKm,
        status: 'PUBLISHED',
      })
      .select()
      .single()

    if (error) { console.error(error); return }
    router.push(`/annonces/offres/${inserted.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Proposer un trajet</h1>
        <p className="text-gray-500">Indiquez votre itinéraire et votre capacité disponible.</p>
      </div>

      {vehicles.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
          Vous n&apos;avez pas encore de véhicule enregistré.{' '}
          <a href="/carrier/vehicules/nouveau" className="font-medium underline">Ajouter un véhicule</a>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Trajet */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" /> Itinéraire
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <AddressInput
              label="Départ"
              placeholder="Ville ou adresse de départ"
              error={originError}
              onSelect={(a) => { setOrigin(a); setOriginError('') }}
            />
            <AddressInput
              label="Arrivée"
              placeholder="Ville ou adresse d'arrivée"
              error={destError}
              onSelect={(a) => { setDestination(a); setDestError('') }}
            />
            {distanceKm && (
              <p className="text-sm text-green-600 font-medium">
                Distance : {Math.round(distanceKm)} km
              </p>
            )}
          </CardBody>
        </Card>

        {/* Véhicule */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" /> Véhicule
            </h2>
          </CardHeader>
          <CardBody>
            {vehicles.length > 0 ? (
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" value={v.id} {...register('vehicle_id')} />
                    <div>
                      <div className="font-medium text-sm">{v.brand} {v.model} — {VEHICLE_TYPE_LABELS[v.type]}</div>
                      <div className="text-xs text-gray-500">{v.plate_number} · {v.max_weight_kg} kg max · {v.max_volume_m3} m³</div>
                    </div>
                  </label>
                ))}
                {errors.vehicle_id && <p className="text-xs text-red-600">{errors.vehicle_id.message}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucun véhicule disponible.</p>
            )}
          </CardBody>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" /> Dates
            </h2>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Input label="Date de départ" type="date" error={errors.departure_date?.message} {...register('departure_date')} />
            <Input label="Arrivée estimée" type="date" error={errors.arrival_date_estimated?.message} {...register('arrival_date_estimated')} />
          </CardBody>
        </Card>

        {/* Capacité */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-600" /> Capacité disponible
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Poids disponible (kg)" type="number" placeholder="Ex: 500" error={errors.available_weight_kg?.message} {...register('available_weight_kg')} />
              <Input label="Volume disponible (m³)" type="number" step="0.1" placeholder="Ex: 3.5" error={errors.available_volume_m3?.message} {...register('available_volume_m3')} />
            </div>
            <Input label="Détour maximum accepté (km)" type="number" hint="Distance max que vous acceptez de dévier de votre trajet" {...register('detour_max_km')} />
            <Input label="Prix indicatif (€/km, optionnel)" type="number" step="0.01" placeholder="Ex: 1.20" {...register('price_per_km_eur')} />
          </CardBody>
        </Card>

        {/* Types acceptés */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Types de marchandises acceptés</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(GOODS_TYPE_LABELS).map(([value, label]) => (
                <label key={value} className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer text-sm transition-colors ${acceptedTypes.includes(value) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={acceptedTypes.includes(value)}
                    onChange={() => toggleGoodsType(value)}
                    className="hidden"
                  />
                  {label}
                </label>
              ))}
            </div>
            {errors.accepted_goods_types && <p className="text-xs text-red-600 mt-2">{errors.accepted_goods_types.message}</p>}
          </CardBody>
        </Card>

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Publier mon trajet
        </Button>
      </form>
    </div>
  )
}
