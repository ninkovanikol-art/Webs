import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { TravelerProfile, TravelProposal, HotelOffer } from '@/lib/types'
import { searchHotels, getCityCode } from '@/lib/amadeus'
import { getWeatherForecast } from '@/lib/weather'
import { getNearbyRestaurants, getNearbyPOIs } from '@/lib/places'
import { getLocalEvents } from '@/lib/events'
import { generateProposalNarrative } from '@/lib/claude'
import { enrichHotelWithPricing, buildBudgetBreakdown, inferDestination } from '@/lib/pricing'
import { cacheSet, proposalCacheKey } from '@/lib/cache'
import { logProposal } from '@/lib/logger'

// Netlify / Vercel: allow up to 60s for Claude generation
export const maxDuration = 60

const TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS ?? '55000', 10)

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  // Fast-fail if API key missing
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[Generate] ANTHROPIC_API_KEY is not set')
    return NextResponse.json(
      { error: 'Configuración incompleta: falta ANTHROPIC_API_KEY en las variables de entorno del servidor.' },
      { status: 503 }
    )
  }

  let profile: TravelerProfile
  try {
    const body = await req.json()
    profile = body.profile as TravelerProfile
    if (!profile?.dates || !profile?.emotionalState) {
      return NextResponse.json({ error: 'Perfil de viajero incompleto' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const proposalId = uuidv4()
  const destination = profile.destination ?? inferDestination(profile)
  const cityCode = getCityCode(destination)

  try {
    // ── Phase 1: Parallel data fetching ──────────────────────────────────────
    const [hotelsResult, weatherResult] = await Promise.allSettled([
      searchHotels({
        cityCode,
        checkIn:  profile.dates.checkIn,
        checkOut: profile.dates.checkOut,
        adults:   profile.travelers.adults,
        maxResults: 3,
      }),
      getWeatherForecast({
        latitude:  getDefaultCoords(cityCode).lat,
        longitude: getDefaultCoords(cityCode).lon,
        checkIn:   profile.dates.checkIn,
        nights:    profile.dates.nights,
      }),
    ])

    const hotels = hotelsResult.status === 'fulfilled' ? hotelsResult.value : []
    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : []

    if (!hotels.length) {
      return NextResponse.json(
        { error: 'No se encontraron alojamientos disponibles para las fechas seleccionadas.' },
        { status: 404 }
      )
    }

    const primaryHotel = enrichHotelWithPricing(hotels[0])
    const alternativeHotels = hotels.slice(1).map(enrichHotelWithPricing)

    // ── Phase 2: Enrichment data (restaurants, POIs, events) ─────────────────
    const [restaurantsResult, poisResult, eventsResult] = await Promise.allSettled([
      getNearbyRestaurants(primaryHotel.latitude, primaryHotel.longitude),
      getNearbyPOIs(primaryHotel.latitude, primaryHotel.longitude),
      getLocalEvents({
        latitude:    primaryHotel.latitude,
        longitude:   primaryHotel.longitude,
        checkIn:     profile.dates.checkIn,
        checkOut:    profile.dates.checkOut,
        destination,
      }),
    ])

    const restaurants = restaurantsResult.status === 'fulfilled' ? restaurantsResult.value : []
    const pois        = poisResult.status        === 'fulfilled' ? poisResult.value        : []
    const events      = eventsResult.status      === 'fulfilled' ? eventsResult.value      : []

    // ── Phase 3: Claude narrative generation ─────────────────────────────────
    const { narrativeIntro, whyThisTrip, itinerary } = await generateProposalNarrative({
      profile,
      hotel:       primaryHotel,
      restaurants,
      weather,
      events,
      pois,
      destination,
    })

    // ── Assemble proposal ─────────────────────────────────────────────────────
    const budget = buildBudgetBreakdown({
      hotel:   primaryHotel,
      nights:  profile.dates.nights,
      adults:  profile.travelers.adults,
      activitiesEstimate: itinerary
        .flatMap(d => d.activities)
        .reduce((sum, a) => sum + (a.estimatedCost ?? 0), 0),
    })

    const proposal: TravelProposal = {
      id:               proposalId,
      createdAt:        new Date().toISOString(),
      profile:          { ...profile, id: proposalId },
      narrativeIntro,
      whyThisTrip,
      primaryHotel,
      alternativeHotels,
      itinerary,
      restaurants,
      events,
      pointsOfInterest: pois,
      weather,
      budget,
      dataSources:  buildDataSourcesList(primaryHotel, restaurants),
      dataFreshness: new Date().toISOString(),
    }

    // ── Cache & log ────────────────────────────────────────────────────────────
    await Promise.allSettled([
      cacheSet(proposalCacheKey(proposalId), proposal, 3600), // 1 hour
      logProposal({
        timestamp:      proposal.createdAt,
        proposalId,
        destination,
        emotionalState: profile.emotionalState,
        budgetPerNight: profile.budgetPerNight,
        hotelName:      primaryHotel.name,
        hotelPrice:     primaryHotel.pricePerNight,
        dataSource:     primaryHotel.source,
        responseTimeMs: Date.now() - startTime,
      }),
    ])

    return NextResponse.json({
      proposalId,
      proposal,
    })

  } catch (err) {
    const elapsed = Date.now() - startTime
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Generate] Fatal error after ${elapsed}ms:`, message)

    if (elapsed > TIMEOUT_MS) {
      return NextResponse.json(
        { error: 'La generación tardó demasiado. Inténtalo de nuevo.' },
        { status: 504 }
      )
    }

    // Expose the real error in development; generic message in production
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { error: isDev ? message : 'Error generando la propuesta. Por favor inténtalo de nuevo.', details: isDev ? message : undefined },
      { status: 500 }
    )
  }
}

function getDefaultCoords(cityCode: string): { lat: number; lon: number } {
  const COORDS: Record<string, { lat: number; lon: number }> = {
    ALC: { lat: 38.3452, lon: -0.4810 },
    BCN: { lat: 41.3879, lon: 2.1699  },
    MAD: { lat: 40.4168, lon: -3.7038 },
    SVQ: { lat: 37.3891, lon: -5.9845 },
    GRX: { lat: 37.1773, lon: -3.5986 },
    PMI: { lat: 39.5696, lon: 2.6502  },
    IBZ: { lat: 38.9067, lon: 1.4206  },
    TFN: { lat: 28.4699, lon: -16.2548},
    ACE: { lat: 28.9635, lon: -13.5501},
    FUE: { lat: 28.3006, lon: -14.0007},
    GRO: { lat: 41.9794, lon: 2.8214  },
    MAH: { lat: 39.8866, lon: 4.2558  },
    NAP: { lat: 40.8518, lon: 14.2681 },
    FLR: { lat: 43.7696, lon: 11.2558 },
    LIS: { lat: 38.7167, lon: -9.1395 },
    OPO: { lat: 41.1579, lon: -8.6291 },
    PAR: { lat: 48.8566, lon: 2.3522  },
    LON: { lat: 51.5074, lon: -0.1278 },
    ROM: { lat: 41.9028, lon: 12.4964 },
    AMS: { lat: 52.3676, lon: 4.9041  },
  }
  return COORDS[cityCode] ?? { lat: 40.4168, lon: -3.7038 }
}

function buildDataSourcesList(hotel: HotelOffer, restaurants: { source: string }[]): string[] {
  const sources = new Set<string>()

  if (hotel.source !== 'mock') sources.add('Amadeus Hotel Search API')
  sources.add('OpenWeatherMap Forecast API')

  const hasMichelin = restaurants.some(r => r.source === 'michelin')
  const hasGoogle   = restaurants.some(r => r.source === 'google')
  if (hasMichelin) sources.add('Guía Michelin')
  if (hasGoogle)   sources.add('Google Places API')

  sources.add('Claude claude-sonnet-4-20250514')

  return Array.from(sources)
}
