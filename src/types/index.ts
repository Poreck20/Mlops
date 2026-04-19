export type UserRole = 'SHIPPER' | 'CARRIER' | 'ADMIN'
export type UserType = 'INDIVIDUAL' | 'BUSINESS'
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export type GoodsType = 'palette' | 'colis' | 'meuble' | 'vehicule' | 'vrac' | 'autre'
export type VehicleType = 'VAN' | 'LIGHT_TRUCK' | 'TRUCK_3T5' | 'TRUCK_12T'
export type DocumentType = 'ID_CARD' | 'DRIVER_LICENSE' | 'INSURANCE' | 'VEHICLE_REGISTRATION' | 'BUSINESS_REG'

export type ShipmentStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'MATCHED'
  | 'BOOKED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'

export type OfferStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'PARTIALLY_BOOKED'
  | 'FULLY_BOOKED'
  | 'COMPLETED'
  | 'CANCELLED'

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED_FREE'
  | 'CANCELLED_FEE'
  | 'IN_DISPUTE'
  | 'COMPLETED'

export interface User {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  phone?: string
  type: UserType
  verified_at?: string
  stripe_customer_id?: string
  created_at: string
  avg_rating?: number
}

export interface CarrierProfile {
  id: string
  user_id: string
  bio?: string
  response_rate: number
  completion_rate: number
  avg_rating: number
  total_trips: number
  verification_status: VerificationStatus
  stripe_account_id?: string
  user?: User
}

export interface Vehicle {
  id: string
  carrier_id: string
  type: VehicleType
  brand: string
  model: string
  year: number
  plate_number: string
  max_weight_kg: number
  max_volume_m3: number
  has_refrigeration: boolean
  has_tail_lift: boolean
}

export interface ShipmentRequest {
  id: string
  shipper_id: string
  origin_address: string
  origin_lat: number
  origin_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  pickup_date_from: string
  pickup_date_to: string
  delivery_date_desired: string
  weight_kg: number
  volume_m3: number
  length_cm?: number
  width_cm?: number
  height_cm?: number
  goods_type: GoodsType
  description?: string
  fragile: boolean
  refrigerated: boolean
  urgent: boolean
  max_price_eur?: number
  status: ShipmentStatus
  created_at: string
  shipper?: User
  estimated_price?: number
}

export interface CarrierOffer {
  id: string
  carrier_id: string
  vehicle_id: string
  origin_address: string
  origin_lat: number
  origin_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  route_polyline?: string
  departure_date: string
  arrival_date_estimated: string
  available_weight_kg: number
  available_volume_m3: number
  accepted_goods_types: GoodsType[]
  detour_max_km: number
  price_per_km_eur?: number
  status: OfferStatus
  created_at: string
  carrier?: CarrierProfile
  vehicle?: Vehicle
  distance_km?: number
  estimated_price?: number
}

export interface Booking {
  id: string
  request_id: string
  offer_id: string
  shipper_id: string
  carrier_id: string
  agreed_price_eur: number
  platform_fee_eur: number
  carrier_payout_eur: number
  status: BookingStatus
  payment_intent_id?: string
  pickup_proof_url?: string
  delivery_proof_url?: string
  pickup_confirmed_at?: string
  delivery_confirmed_at?: string
  created_at: string
  request?: ShipmentRequest
  offer?: CarrierOffer
}

export interface MatchResult {
  offer: CarrierOffer
  score: number
  detour_km: number
  estimated_price: number
}

export interface PriceBreakdown {
  base: number
  weight_surcharge: number
  volume_surcharge: number
  detour: number
  urgency_factor: number
  fragile_factor: number
  cold_factor: number
  price_ht: number
  platform_fee: number
  total_shipper_eur: number
  carrier_payout_eur: number
}
