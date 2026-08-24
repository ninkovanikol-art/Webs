import Amadeus from 'amadeus'
import type { HotelOffer } from './types'
import { cacheGet, cacheSet, hotelCacheKey } from './cache'

let client: Amadeus | null = null

function getClient(): Amadeus | null {
  if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) return null
  if (!client) {
    client = new Amadeus({
      clientId:     process.env.AMADEUS_API_KEY,
      clientSecret: process.env.AMADEUS_API_SECRET,
      hostname:     process.env.AMADEUS_ENV === 'production' ? 'production' : 'test',
    })
  }
  return client
}

// City name → IATA city code (basic lookup; extend as needed)
const CITY_CODES: Record<string, string> = {
  'benidorm':      'BCN',
  'alicante':      'ALC',
  'madrid':        'MAD',
  'barcelona':     'BCN',
  'seville':       'SVQ',
  'sevilla':       'SVQ',
  'granada':       'GRX',
  'mallorca':      'PMI',
  'ibiza':         'IBZ',
  'tenerife':      'TFN',
  'lanzarote':     'ACE',
  'fuerteventura': 'FUE',
  'paris':         'PAR',
  'london':        'LON',
  'rome':          'ROM',
  'lisbon':        'LIS',
  'porto':         'OPO',
  'amsterdam':     'AMS',
  'florence':      'FLR',
  'amalfi coast':  'NAP',
  'naples':        'NAP',
  'costa brava':   'GRO',
  'menorca':       'MAH',
  'formentera':    'IBZ',
  'finestrat':     'ALC',
  'calpe':         'ALC',
  'altea':         'ALC',
  'moraira':       'ALC',
}

export function getCityCode(destination: string): string {
  const lower = destination.toLowerCase()
  for (const [key, code] of Object.entries(CITY_CODES)) {
    if (lower.includes(key)) return code
  }
  // Default to the destination uppercased trimmed to 3 chars as best guess
  return destination.toUpperCase().replace(/\s/g, '').slice(0, 3)
}

export async function searchHotels(params: {
  cityCode: string
  checkIn: string
  checkOut: string
  adults: number
  maxResults?: number
}): Promise<HotelOffer[]> {
  const { cityCode, checkIn, checkOut, adults, maxResults = 5 } = params
  const cacheKey = hotelCacheKey(cityCode, checkIn, checkOut, adults)

  const cached = await cacheGet<HotelOffer[]>(cacheKey)
  if (cached) return cached

  const amadeus = getClient()
  if (!amadeus) {
    console.warn('[Amadeus] No credentials configured, using mock data')
    return getMockHotels(cityCode, checkIn, checkOut, adults)
  }

  try {
    // Step 1: Get hotel list for city
    const hotelsResponse = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode,
      radius: 20,
      radiusUnit: 'KM',
      ratings: ['3', '4', '5'],
    })

    if (!hotelsResponse.data?.length) return getMockHotels(cityCode, checkIn, checkOut, adults)

    // Take top hotels by rating
    const hotelIds = (hotelsResponse.data as Array<{ hotelId: string }>)
      .slice(0, 20)
      .map(h => h.hotelId)

    // Step 2: Get offers for those hotels
    const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds: hotelIds.join(','),
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      currency: 'EUR',
      bestRateOnly: true,
      view: 'FULL',
    })

    if (!offersResponse.data?.length) return getMockHotels(cityCode, checkIn, checkOut, adults)

    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    )

    const hotels: HotelOffer[] = (offersResponse.data as AmadeusHotelItem[])
      .filter(item => item.offers?.length)
      .slice(0, maxResults)
      .map((item): HotelOffer => {
        const hotel = item.hotel
        const offer = item.offers[0]
        const totalPrice  = parseFloat(offer.price?.total ?? '0')
        const pricePerNight = nights > 0 ? totalPrice / nights : totalPrice

        return {
          id:            hotel.hotelId,
          name:          hotel.name,
          chainCode:     hotel.chainCode,
          iataCode:      cityCode,
          latitude:      hotel.latitude ?? 0,
          longitude:     hotel.longitude ?? 0,
          address:       [hotel.address?.lines?.[0], hotel.address?.cityName].filter(Boolean).join(', '),
          starRating:    parseInt(hotel.rating ?? '4'),
          description:   hotel.description?.text,
          images:        (hotel.media ?? []).slice(0, 3).map((m: { uri: string }) => m.uri),
          pricePerNight: Math.round(pricePerNight),
          totalPrice:    Math.round(totalPrice),
          currency:      offer.price?.currency ?? 'EUR',
          source:        'amadeus',
          bookingUrl:    `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name)}`,
          cancellationPolicy: offer.policies?.cancellation?.description?.text ?? 'Consultar condiciones',
          reviewScore:   parseFloat(hotel.rating ?? '4') * 2,
          reviewCount:   0,
          reviewSource:  'Amadeus',
          available:     true,
          urgency:       pricePerNight > 400 ? 'high' : 'medium',
        }
      })

    await cacheSet(cacheKey, hotels)
    return hotels
  } catch (err) {
    console.error('[Amadeus] Search error:', err)
    return getMockHotels(cityCode, checkIn, checkOut, adults)
  }
}

interface AmadeusHotelItem {
  hotel: {
    hotelId: string
    name: string
    chainCode?: string
    latitude?: number
    longitude?: number
    rating?: string
    description?: { text: string }
    address?: { lines?: string[]; cityName?: string }
    media?: Array<{ uri: string }>
  }
  offers: Array<{
    price?: { total?: string; currency?: string }
    policies?: { cancellation?: { description?: { text: string } } }
  }>
}

// ─── Mock data fallback ────────────────────────────────────────────────────────

function getMockHotels(cityCode: string, checkIn: string, checkOut: string, adults: number): HotelOffer[] {
  const nights = Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ) || 3

  const MOCKS: Record<string, Partial<HotelOffer>[]> = {
    ALC: [
      {
        id: 'mock-vivood',
        name: 'VIVOOD Landscape Hotel',
        latitude: 38.6991,
        longitude: -0.0804,
        address: 'Benasau, Alicante, España',
        starRating: 5,
        description: 'Hotel único en medio de la naturaleza con vistas espectaculares al valle de Guadalest. Arquitectura de diseño integrada en el paisaje.',
        images: [],
        pricePerNight: 340,
        reviewScore: 9.4,
        reviewCount: 1247,
        cancellationPolicy: 'Cancelación gratuita hasta 7 días antes',
        urgency: 'high',
        availabilityPct: 25,
      },
      {
        id: 'mock-sha',
        name: 'SHA Wellness Clinic',
        latitude: 38.6850,
        longitude: -0.1205,
        address: 'El Albir, Alicante, España',
        starRating: 5,
        description: 'Referente mundial en medicina preventiva y bienestar. Vistas al Mediterráneo, gastronomía saludable premiada.',
        images: [],
        pricePerNight: 680,
        reviewScore: 9.6,
        reviewCount: 2841,
        cancellationPolicy: 'No reembolsable',
        urgency: 'high',
        availabilityPct: 15,
      },
    ],
    BCN: [
      {
        id: 'mock-arts',
        name: 'Hotel Arts Barcelona',
        latitude: 41.3887,
        longitude: 2.1972,
        address: 'Carrer de la Marina, 19-21, Barcelona',
        starRating: 5,
        description: 'Icono de Barcelona frente al mar. Vistas panorámicas a la ciudad y al Mediterráneo.',
        images: [],
        pricePerNight: 520,
        reviewScore: 9.1,
        reviewCount: 5682,
        cancellationPolicy: 'Cancelación gratuita hasta 48h',
        urgency: 'medium',
        availabilityPct: 40,
      },
    ],
    MAD: [
      {
        id: 'mock-villa-magna',
        name: 'Villa Magna',
        latitude: 40.4256,
        longitude: -3.6921,
        address: 'Paseo de la Castellana 22, Madrid',
        starRating: 5,
        description: 'Elegancia atemporal en el corazón del Madrid más exclusivo. Colección de arte contemporáneo.',
        images: [],
        pricePerNight: 610,
        reviewScore: 9.5,
        reviewCount: 3201,
        cancellationPolicy: 'Cancelación gratuita hasta 72h',
        urgency: 'low',
        availabilityPct: 55,
      },
    ],
  }

  const base = MOCKS[cityCode] ?? MOCKS.ALC
  return base.map((mock, i): HotelOffer => ({
    id:            mock.id ?? `mock-${cityCode}-${i}`,
    name:          mock.name ?? 'Hotel Premium',
    latitude:      mock.latitude ?? 40.0,
    longitude:     mock.longitude ?? -3.0,
    address:       mock.address ?? cityCode,
    starRating:    mock.starRating ?? 5,
    description:   mock.description ?? '',
    images:        mock.images ?? [],
    pricePerNight: mock.pricePerNight ?? 280,
    totalPrice:    (mock.pricePerNight ?? 280) * nights,
    currency:      'EUR',
    source:        'mock',
    bookingUrl:    `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(mock.name ?? 'Hotel')}`,
    cancellationPolicy: mock.cancellationPolicy ?? 'Consultar condiciones',
    reviewScore:   mock.reviewScore ?? 9.0,
    reviewCount:   mock.reviewCount ?? 500,
    reviewSource:  'Datos de muestra',
    available:     true,
    urgency:       mock.urgency ?? 'medium',
    availabilityPct: mock.availabilityPct ?? 45,
    chainCode:     undefined,
    iataCode:      cityCode,
  }))
}
