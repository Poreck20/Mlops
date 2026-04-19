'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Package, Ruler, Calendar, AlertCircle, Euro } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getRoute } from '@/lib/mapbox'
import { formatPrice } from '@/lib/pricing'
import { AddressInput } from '@/components/forms/address-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { GOODS_TYPE_LABELS } from '@/lib/utils'
import type { GeocodedAddress } from '@/lib/mapbox'
import type { PriceBreakdown } from '@/types'

const schema = z.object({
  pickup_date_from: z.string().min(1, 'Requis'),
  pickup_date_to: z.string().min(1, 'Requis'),
  delivery_date_desired: z.string().min(1, 'Requis'),
  weight_kg: z.coerce.number().min(1, 'Min 1 kg').max(3500, 'Max 3 500 kg'),
  volume_m3: z.coerce.number().min(0.01).max(30),
  goods_type: z.enum(['palette', 'colis', 'meuble', 'vehicule', 'vrac', 'autre']),
  description: z.string().optional(),
  fragile: z.boolean().optional(),
  refrigerated: z.boolean().optional(),
  urgent: z.boolean().optional(),
  max_price_eur: z.coerce.number().optional(),
})
type FormData = z.infer<typeof schema>

export default function NouvelleDemandeePage() {
  const router = useRouter()
  const [origin, setOrigin] = useState<GeocodedAddress | null>(null)
  const [destination, setDestination] = useState<GeocodedAddress | null>(null)
  const [originError, setOriginError] = useState('')
  const [destError, setDestError] = useState('')
  const [pricingPreview, setPricingPreview] = useState<PriceBreakdown | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { goods_type: 'colis', fragile: false, refrigerated: false, urgent: false },
  })

  const watchedFields = watch(['weight_kg', 'volume_m3', 'fragile', 'refrigerated', 'urgent'])

  // Compute route when both addresses are set
  useEffect(() => {
    if (!origin || !destination) return
    setLoadingRoute(true)
    getRoute(origin, destination).then((route) => {
      if (route) {
        setDistanceKm(route.distance_km)
        // Fetch pricing preview
        const [weight_kg, volume_m3, is_fragile, is_refrigerated, is_urgent] = watchedFields
        fetch('/api/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distance_km: route.distance_km,
            weight_kg: Number(weight_kg) || 50,
            volume_m3: Number(volume_m3) || 0.5,
            is_fragile: is_fragile,
            is_refrigerated: is_refrigerated,
            is_urgent: is_urgent,
          }),
        })
          .then((r) => r.json())
          .then(setPricingPreview)
      }
      setLoadingRoute(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, watchedFields[0], watchedFields[1], watchedFields[2], watchedFields[3], watchedFields[4]])

  async function onSubmit(data: any) {
    if (!origin) { setOriginError('Veuillez sélectionner une adresse d\'origine'); return }
    if (!destination) { setDestError('Veuillez sélectionner une adresse de destination'); return }
    setOriginError(''); setDestError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const route = await getRoute(origin, destination)

    const { data: inserted, error } = await supabase
      .from('shipment_requests')
      .insert({
        shipper_id: user.id,
        origin_address: origin.place_name,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_address: destination.place_name,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        pickup_date_from: data.pickup_date_from,
        pickup_date_to: data.pickup_date_to,
        delivery_date_desired: data.delivery_date_desired,
        weight_kg: data.weight_kg,
        volume_m3: data.volume_m3,
        goods_type: data.goods_type,
        description: data.description,
        fragile: data.fragile || false,
        refrigerated: data.refrigerated || false,
        urgent: data.urgent || false,
        max_price_eur: data.max_price_eur || null,
        estimated_price: pricingPreview?.total_shipper_eur || null,
        distance_km: route?.distance_km || null,
        status: 'PUBLISHED',
      })
      .select()
      .single()

    if (error) { console.error(error); return }
    router.push(`/annonces/demandes/${inserted.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nouvelle demande de transport</h1>
        <p className="text-gray-500">Décrivez votre marchandise et votre trajet pour trouver un transporteur.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Trajet */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" /> Trajet
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <AddressInput
              label="Adresse de collecte"
              placeholder="Ex: 10 rue de la Paix, Paris"
              error={originError}
              onSelect={(a) => { setOrigin(a); setOriginError('') }}
              value={origin?.place_name}
            />
            <AddressInput
              label="Adresse de livraison"
              placeholder="Ex: 5 avenue Jean Jaurès, Lyon"
              error={destError}
              onSelect={(a) => { setDestination(a); setDestError('') }}
              value={destination?.place_name}
            />
            {loadingRoute && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <span className="h-3 w-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                Calcul du trajet en cours...
              </p>
            )}
            {distanceKm && !loadingRoute && (
              <p className="text-sm text-green-600 font-medium">
                Distance estimée : {Math.round(distanceKm)} km
              </p>
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
            <Input
              label="Collecte au plus tôt"
              type="date"
              error={errors.pickup_date_from?.message}
              {...register('pickup_date_from')}
            />
            <Input
              label="Collecte au plus tard"
              type="date"
              error={errors.pickup_date_to?.message}
              {...register('pickup_date_to')}
            />
            <Input
              label="Livraison souhaitée"
              type="date"
              error={errors.delivery_date_desired?.message}
              {...register('delivery_date_desired')}
              className="col-span-2"
            />
          </CardBody>
        </Card>

        {/* Marchandise */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-600" /> Marchandise
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Select
              label="Type de marchandise"
              options={Object.entries(GOODS_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              error={errors.goods_type?.message}
              {...register('goods_type')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Poids (kg)"
                type="number"
                placeholder="Ex: 150"
                error={errors.weight_kg?.message}
                {...register('weight_kg')}
              />
              <Input
                label="Volume (m³)"
                type="number"
                step="0.1"
                placeholder="Ex: 1.5"
                error={errors.volume_m3?.message}
                {...register('volume_m3')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Description (optionnel)</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                placeholder="Décrivez votre marchandise..."
                {...register('description')}
              />
            </div>
          </CardBody>
        </Card>

        {/* Contraintes */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" /> Contraintes
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'fragile', label: '⚠️ Fragile' },
                { name: 'refrigerated', label: '❄️ Réfrigéré' },
                { name: 'urgent', label: '🚀 Urgent' },
              ].map((opt) => (
                <label key={opt.name} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" className="rounded" {...register(opt.name as keyof FormData)} />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Prix max */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Euro className="h-5 w-5 text-blue-600" /> Budget (optionnel)
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Prix maximum accepté (€)"
              type="number"
              placeholder="Laissez vide pour recevoir toutes les propositions"
              {...register('max_price_eur')}
            />

            {pricingPreview && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">Estimation du prix</p>
                <div className="space-y-1 text-sm text-blue-700">
                  <div className="flex justify-between">
                    <span>Transport HT</span>
                    <span>{formatPrice(pricingPreview.price_ht)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commission plateforme (10%)</span>
                    <span>{formatPrice(pricingPreview.platform_fee)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-blue-200 pt-1 mt-1">
                    <span>Total estimé</span>
                    <span className="text-blue-900">{formatPrice(pricingPreview.total_shipper_eur)}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-500 mt-2">* Estimation basée sur la distance. Le prix final est négocié avec le transporteur.</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Publier ma demande
        </Button>
      </form>
    </div>
  )
}
