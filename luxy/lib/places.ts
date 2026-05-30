import type { Restaurant, PointOfInterest } from './types'
import { cacheGet, cacheSetEnrichment, placesCacheKey } from './cache'

const PLACES_BASE = 'https://places.googleapis.com/v1/places'

interface GooglePlace {
  id: string
  displayName: { text: string }
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  location: { latitude: number; longitude: number }
  primaryTypeDisplayName?: { text: string }
  editorialSummary?: { text: string }
  websiteUri?: string
  currentOpeningHours?: { openNow: boolean }
}

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

async function nearbySearch(params: {
  latitude: number
  longitude: number
  radius: number
  includedTypes: string[]
  maxResults: number
  minRating?: number
  fieldMask?: string
}): Promise<GooglePlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  const body = {
    includedTypes: params.includedTypes,
    maxResultCount: params.maxResults,
    locationRestriction: {
      circle: {
        center: { latitude: params.latitude, longitude: params.longitude },
        radius: params.radius,
      },
    },
  }

  const fieldMask = params.fieldMask ??
    'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.location,places.primaryTypeDisplayName,places.editorialSummary,places.websiteUri'

  const res = await fetch(`${PLACES_BASE}:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error('[Places] HTTP error:', res.status, await res.text())
    return []
  }

  const data = await res.json()
  let places = data.places ?? []
  if (params.minRating) {
    places = places.filter((p: GooglePlace) => (p.rating ?? 0) >= params.minRating!)
  }
  return places
}

export async function getNearbyRestaurants(
  latitude: number,
  longitude: number
): Promise<Restaurant[]> {
  const cacheKey = placesCacheKey(latitude, longitude, 'restaurants')
  const cached = await cacheGet<Restaurant[]>(cacheKey)
  if (cached) return cached

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('[Places] No API key, using mock restaurants')
    return getMockRestaurants()
  }

  try {
    const places = await nearbySearch({
      latitude,
      longitude,
      radius: 20000,  // 20km
      includedTypes: ['restaurant', 'fine_dining_restaurant'],
      maxResults: 10,
      minRating: 4.3,
    })

    const restaurants: Restaurant[] = places.map((p: GooglePlace): Restaurant => ({
      name:         p.displayName.text,
      cuisine:      p.primaryTypeDisplayName?.text ?? 'Restaurante',
      rating:       p.rating ?? 4.5,
      priceLevel:   PRICE_MAP[p.priceLevel ?? ''] ?? 3,
      address:      p.formattedAddress ?? '',
      latitude:     p.location.latitude,
      longitude:    p.location.longitude,
      bookingUrl:   p.websiteUri,
      description:  p.editorialSummary?.text,
      source:       'google',
    }))

    await cacheSetEnrichment(cacheKey, restaurants)
    return restaurants
  } catch (err) {
    console.error('[Places] Error fetching restaurants:', err)
    return getMockRestaurants()
  }
}

export async function getNearbyPOIs(
  latitude: number,
  longitude: number
): Promise<PointOfInterest[]> {
  const cacheKey = placesCacheKey(latitude, longitude, 'pois')
  const cached = await cacheGet<PointOfInterest[]>(cacheKey)
  if (cached) return cached

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('[Places] No API key, using mock POIs')
    return getMockPOIs()
  }

  try {
    const places = await nearbySearch({
      latitude,
      longitude,
      radius: 30000,
      includedTypes: ['tourist_attraction', 'museum', 'spa', 'natural_feature', 'park', 'art_gallery'],
      maxResults: 10,
      minRating: 4.0,
    })

    const pois: PointOfInterest[] = places.map((p: GooglePlace): PointOfInterest => ({
      name:        p.displayName.text,
      type:        p.primaryTypeDisplayName?.text ?? 'Atracción',
      rating:      p.rating ?? 4.2,
      latitude:    p.location.latitude,
      longitude:   p.location.longitude,
      description: p.editorialSummary?.text,
      bookingUrl:  p.websiteUri,
    }))

    await cacheSetEnrichment(cacheKey, pois)
    return pois
  } catch (err) {
    console.error('[Places] Error fetching POIs:', err)
    return getMockPOIs()
  }
}

function getMockRestaurants(): Restaurant[] {
  return [
    {
      name:         'Quique Dacosta',
      cuisine:      'Alta cocina mediterránea',
      rating:       9.5,
      priceLevel:   4,
      address:      'Ctra. Las Marinas, Km. 3, Dénia',
      latitude:     38.8537,
      longitude:    0.1042,
      michelinStars: 3,
      description:  'Tres estrellas Michelin. Cocina de vanguardia que reinterpreta el Mediterráneo.',
      source:       'michelin',
    },
    {
      name:         'Casa Pepa',
      cuisine:      'Cocina tradicional valenciana',
      rating:       9.1,
      priceLevel:   3,
      address:      'Partida Pamis, 7-30, Ondara',
      latitude:     38.8201,
      longitude:    0.0118,
      michelinStars: 1,
      description:  'Una estrella Michelin. Tradición valenciana elevada a arte culinario.',
      source:       'michelin',
    },
    {
      name:         'La Seu',
      cuisine:      'Cocina de mercado',
      rating:       8.8,
      priceLevel:   3,
      address:      'Carrer Duc de Loubat, Dénia',
      latitude:     38.8412,
      longitude:    0.1068,
      bibGourmand:  true,
      description:  'Bib Gourmand. Producto local de temporada, cocina honesta y contemporánea.',
      source:       'michelin',
    },
    {
      name:         'El Poblet',
      cuisine:      'Gastronomía valenciana contemporánea',
      rating:       9.3,
      priceLevel:   4,
      address:      'C. Correos, 8, Valencia',
      latitude:     39.4764,
      longitude:    -0.3786,
      michelinStars: 2,
      description:  'Dos estrellas Michelin. Luis Valls reinterpreta la memoria gastronómica valenciana.',
      source:       'michelin',
    },
  ]
}

function getMockPOIs(): PointOfInterest[] {
  return [
    {
      name:               'Parque Natural del Montgó',
      type:               'Parque Natural',
      rating:             4.7,
      latitude:           38.8212,
      longitude:          0.0654,
      description:        'Macizo calizo de 753m con flora endémica y vistas al mar. Rutas de senderismo para todos los niveles.',
      estimatedDuration:  'Medio día',
      price:              0,
    },
    {
      name:               'Ruta de los Miradores Benidorm',
      type:               'Mirador panorámico',
      rating:             4.5,
      latitude:           38.5386,
      longitude:          -0.1322,
      description:        'Tres miradores conectados con vistas únicas a la bahía y al skyline.',
      estimatedDuration:  '2h',
      price:              0,
    },
    {
      name:               'Castello de la Seua - MACA',
      type:               'Museo de Arte',
      rating:             4.4,
      latitude:           38.8460,
      longitude:          0.1056,
      description:        'Museo de Arte Contemporáneo de Alicante. Colección permanente de arte moderno en entorno histórico.',
      estimatedDuration:  '2h',
      price:              4,
    },
    {
      name:               'Cueva de Canelobre',
      type:               'Cueva natural',
      rating:             4.6,
      latitude:           38.6012,
      longitude:          -0.4923,
      description:        'Espectacular formación kárstica a 700m de altitud con conciertos de música clásica en verano.',
      estimatedDuration:  '1h',
      price:              8,
    },
  ]
}
