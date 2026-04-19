import type { PriceBreakdown } from '@/types'

interface PricingInput {
  distance_km: number
  weight_kg: number
  volume_m3: number
  is_urgent?: boolean
  is_fragile?: boolean
  is_refrigerated?: boolean
  detour_km?: number
  toll_estimate_eur?: number
}

const BASE_RATE_PER_KM = 1.2
const WEIGHT_RATE = 0.008
const VOLUME_RATE = 0.05
const PLATFORM_FEE_RATE = 0.1
const MINIMUM_PRICE = 30

export function calculatePrice(input: PricingInput): PriceBreakdown {
  const {
    distance_km,
    weight_kg,
    volume_m3,
    is_urgent = false,
    is_fragile = false,
    is_refrigerated = false,
    detour_km = 0,
    toll_estimate_eur = 0,
  } = input

  const base = distance_km * BASE_RATE_PER_KM
  const weight_surcharge = weight_kg > 100 ? weight_kg * WEIGHT_RATE * distance_km : 0
  const volume_surcharge = volume_m3 > 1.0 ? volume_m3 * VOLUME_RATE * distance_km : 0

  const urgency_factor = is_urgent ? 1.3 : 1.0
  const fragile_factor = is_fragile ? 1.15 : 1.0
  const cold_factor = is_refrigerated ? 1.4 : 1.0

  const detour = detour_km * BASE_RATE_PER_KM * 0.5

  const raw =
    (base + weight_surcharge + volume_surcharge) *
      urgency_factor *
      fragile_factor *
      cold_factor +
    detour +
    toll_estimate_eur

  const price_ht = Math.max(raw, MINIMUM_PRICE)
  const platform_fee = round(price_ht * PLATFORM_FEE_RATE)
  const total_shipper_eur = round(price_ht + platform_fee)
  const carrier_payout_eur = round(price_ht)

  return {
    base: round(base),
    weight_surcharge: round(weight_surcharge),
    volume_surcharge: round(volume_surcharge),
    detour: round(detour),
    urgency_factor,
    fragile_factor,
    cold_factor,
    price_ht: round(price_ht),
    platform_fee,
    total_shipper_eur,
    carrier_payout_eur,
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

export function formatPrice(eur: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(eur)
}
