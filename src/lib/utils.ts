import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GOODS_TYPE_LABELS: Record<string, string> = {
  palette: 'Palette',
  colis: 'Colis / Carton',
  meuble: 'Meuble',
  vehicule: 'Véhicule',
  vrac: 'Vrac',
  autre: 'Autre',
}

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  VAN: 'Fourgonnette',
  LIGHT_TRUCK: 'Camion léger',
  TRUCK_3T5: 'Camion 3,5T',
  TRUCK_12T: 'Camion 12T',
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  MATCHED: 'Matchés',
  BOOKED: 'Réservé',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  PAID: 'Payé',
  IN_DISPUTE: 'Litige',
  COMPLETED: 'Terminé',
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  MATCHED: 'bg-yellow-100 text-yellow-700',
  BOOKED: 'bg-purple-100 text-purple-700',
  IN_TRANSIT: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-purple-100 text-purple-700',
  IN_DISPUTE: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
}
