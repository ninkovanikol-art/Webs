import type { HotelOffer, BudgetBreakdown } from './types'

export function enrichHotelWithPricing(hotel: HotelOffer): HotelOffer {
  const base = hotel.pricePerNight

  // Simulate multi-source comparison with ±15% variance
  const amadeusPrice  = hotel.source === 'amadeus' ? base : Math.round(base * 1.05)
  const bookingPrice  = Math.round(base * (1 + (Math.random() * 0.1 + 0.02)))
  const expediaPrice  = Math.round(base * (1 + (Math.random() * 0.12 + 0.03)))
  const directPrice   = Math.round(base * (1 - (Math.random() * 0.08 + 0.02))) // usually cheaper

  const lowestPrice  = Math.min(amadeusPrice, bookingPrice, expediaPrice, directPrice)
  const lowestSource = lowestPrice === directPrice  ? 'direct'
                     : lowestPrice === amadeusPrice ? 'amadeus'
                     : lowestPrice === bookingPrice ? 'booking'
                     : 'expedia'

  const directSaving = directPrice < Math.min(amadeusPrice, bookingPrice, expediaPrice)
    ? Math.min(amadeusPrice, bookingPrice, expediaPrice) - directPrice
    : undefined

  const urgency: HotelOffer['urgency'] =
    (hotel.availabilityPct ?? 50) < 30 ? 'high' :
    (hotel.availabilityPct ?? 50) < 60 ? 'medium' :
    'low'

  return {
    ...hotel,
    pricePerNight: lowestPrice,
    urgency,
    priceComparison: {
      amadeus:      amadeusPrice,
      booking:      bookingPrice,
      expedia:      expediaPrice,
      direct:       directPrice,
      lowestSource,
      lowestPrice,
      directSaving,
    },
  }
}

export function buildBudgetBreakdown(params: {
  hotel: HotelOffer
  nights: number
  adults: number
  activitiesEstimate?: number
}): BudgetBreakdown {
  const { hotel, nights, adults, activitiesEstimate } = params

  const accommodation = hotel.pricePerNight * nights
  const activities    = activitiesEstimate ?? Math.round(40 * nights * adults)
  const dining        = Math.round(60 * nights * adults)
  const transport     = Math.round(30 * nights)
  const miscellaneous = Math.round((accommodation + activities + dining + transport) * 0.05)
  const total         = accommodation + activities + dining + transport + miscellaneous
  const perPersonPerDay = Math.round(total / (nights * adults))

  return {
    accommodation,
    activities,
    dining,
    transport,
    miscellaneous,
    total,
    currency: hotel.currency,
    perPersonPerDay,
  }
}

export function inferDestination(profile: {
  environment: string
  accomStyle: string
  emotionalState: string
}): string {
  const { environment, accomStyle, emotionalState } = profile

  if (environment === 'coast' && accomStyle === 'eco-resort')   return 'Costa Blanca, Alicante'
  if (environment === 'coast' && emotionalState === 'romance')   return 'Mallorca, Islas Baleares'
  if (environment === 'coast' && accomStyle === 'glamping')      return 'Cabo de Gata, Almería'
  if (environment === 'mountain' && emotionalState === 'rest')   return 'Sierra Nevada, Granada'
  if (environment === 'mountain' && emotionalState === 'adventure') return 'Picos de Europa, Asturias'
  if (environment === 'forest' && emotionalState === 'detox')    return 'Ribeira Sacra, Galicia'
  if (environment === 'island')                                   return 'Formentera, Baleares'
  if (environment === 'desert')                                   return 'Bardenas Reales, Navarra'
  if (environment === 'city' && emotionalState === 'culture')    return 'San Sebastián, País Vasco'
  if (emotionalState === 'wellness' || emotionalState === 'rest') return 'Costa Brava, Girona'
  return 'Costa Blanca, Alicante'
}
