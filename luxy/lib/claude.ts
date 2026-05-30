import type {
  TravelerProfile, HotelOffer, Restaurant, WeatherDay,
  LocalEvent, PointOfInterest, ItineraryDay, TravelProposal,
} from './types'

const BASE_URL = (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/$/, '')

function buildAuthHeaders(): Record<string, string> {
  const key = process.env.ANTHROPIC_API_KEY ?? ''
  // Session ingress tokens (sk-ant-si-*) use Authorization: Bearer
  if (key.startsWith('sk-ant-si')) {
    return { 'Authorization': `Bearer ${key}` }
  }
  return { 'x-api-key': key }
}

async function claudeMessages(body: Record<string, unknown>): Promise<{ content: Array<{ type: string; text?: string }> }> {
  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Anthropic API ${res.status}: ${JSON.stringify(err)}`)
  }

  return res.json()
}

const SYSTEM_PROMPT = `Eres Luxy, el curador de viajes premium más sofisticado del mundo. Tu rol es diseñar propuestas de viaje únicas, poéticas y profundamente personalizadas que conecten con el estado emocional del viajero.

PRINCIPIOS:
- Cada propuesta es única para este viajero en este momento de su vida.
- Hablas con la precisión de un sommelier de experiencias: referencias exactas, no generalidades.
- Usas los datos reales que recibes (precios, disponibilidad, meteorología) para justificar cada elección.
- Si algo no está disponible, propones alternativas de igual calidad explicando el motivo.
- Tu tono es cálido, sofisticado y honesto. Nunca hiperbólico ni corporativo.

FORMATO DE RESPUESTA:
Responde SIEMPRE con un JSON válido que tenga esta estructura exacta:
{
  "narrativeIntro": "párrafo de bienvenida que conecta con el estado emocional (2-3 frases)",
  "whyThisTrip": "justificación profunda de por qué este destino para este viajero ahora (3-4 frases)",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "título poético del día",
      "narrative": "descripción narrativa del día (2-3 frases)",
      "activities": [
        {
          "time": "HH:MM",
          "name": "nombre",
          "description": "descripción breve y concreta",
          "type": "activity|meal|transport|accommodation|experience",
          "duration": "Xh",
          "bookable": true,
          "bookingUrl": "url o null",
          "estimatedCost": 0,
          "latitude": null,
          "longitude": null
        }
      ]
    }
  ]
}

REGLAS CRÍTICAS:
1. Integra los datos de precio, disponibilidad y meteorología en las descripciones.
2. Los restaurantes del listado deben aparecer en el itinerario.
3. Los eventos locales deben integrarse si coinciden con el perfil.
4. Indica siempre el tiempo meteorológico previsto para actividades al aire libre.
5. Cada día debe tener entre 3 y 5 actividades (mañana, tarde, noche).
6. Las actividades reservables deben incluir el coste estimado.
7. El JSON debe ser válido y parseable.`

interface GenerationContext {
  profile: TravelerProfile
  hotel: HotelOffer
  restaurants: Restaurant[]
  weather: WeatherDay[]
  events: LocalEvent[]
  pois: PointOfInterest[]
  destination: string
}

function buildUserPrompt(ctx: GenerationContext): string {
  const { profile, hotel, restaurants, weather, events, pois, destination } = ctx
  const nights = profile.dates.nights

  const weatherSummary = weather
    .slice(0, nights)
    .map(w => `${w.date}: ${w.description}, ${w.tempMin}–${w.tempMax}°C, ${w.note}`)
    .join('\n')

  const restaurantList = restaurants
    .slice(0, 4)
    .map(r => {
      const stars = r.michelinStars ? `★${r.michelinStars} Michelin` : r.bibGourmand ? 'Bib Gourmand' : `${r.rating}/5`
      return `- ${r.name} (${r.cuisine}, ${stars}, nivel precio ${r.priceLevel}/4)`
    })
    .join('\n')

  const eventList = events
    .slice(0, 4)
    .map(e => `- ${e.name} el ${e.date}${e.time ? ' a las ' + e.time : ''} en ${e.venue}${e.price !== undefined ? ` (${e.price === 0 ? 'gratuito' : e.price + '€'})` : ''}`)
    .join('\n')

  const poiList = pois
    .slice(0, 4)
    .map(p => `- ${p.name} (${p.type}, valoración ${p.rating}/5${p.estimatedDuration ? ', duración ' + p.estimatedDuration : ''})`)
    .join('\n')

  return `PERFIL DEL VIAJERO:
Estado emocional buscado: ${profile.emotionalState}
Entorno preferido: ${profile.environment}
Estilo de alojamiento: ${profile.accomStyle}
Experiencias irrenunciables: ${profile.experiences.join(', ')}
Fechas: ${profile.dates.checkIn} → ${profile.dates.checkOut} (${nights} noches)
Viajeros: ${profile.travelers.adults} adultos${profile.travelers.children > 0 ? `, ${profile.travelers.children} niños` : ''}
Presupuesto máximo por noche: ${profile.budgetPerNight}€

ALOJAMIENTO SELECCIONADO (DISPONIBLE Y CONFIRMADO):
Nombre: ${hotel.name}
Dirección: ${hotel.address}
Precio por noche: ${hotel.pricePerNight}€/noche (total ${hotel.totalPrice}€)
Valoración: ${hotel.reviewScore}/10 (${hotel.reviewCount} opiniones)
Disponibilidad: ${hotel.urgency === 'high' ? '⚠️ ALTA DEMANDA — menos del 30% de disponibilidad' : 'Disponible'}
Política de cancelación: ${hotel.cancellationPolicy}
${hotel.priceComparison?.directSaving ? `Reservar directo ahorra ${hotel.priceComparison.directSaving}€ respecto a OTAs` : ''}

DESTINO: ${destination}

PREVISIÓN METEOROLÓGICA:
${weatherSummary}

RESTAURANTES CURADOS CERCA DEL ALOJAMIENTO:
${restaurantList || 'No disponible — usa referencias culturales del destino'}

EVENTOS LOCALES DURANTE LAS FECHAS:
${eventList || 'Sin eventos especiales identificados'}

PUNTOS DE INTERÉS CERCANOS:
${poiList || 'Sin datos — usa conocimiento del destino'}

INSTRUCCIÓN:
Diseña el itinerario completo para ${nights} días. Integra los restaurantes, eventos y actividades en el itinerario. Menciona el precio del hotel, la meteorología prevista y los datos de disponibilidad en la narrativa. Responde ÚNICAMENTE con el JSON.`
}

export async function generateProposalNarrative(ctx: GenerationContext): Promise<{
  narrativeIntro: string
  whyThisTrip: string
  itinerary: ItineraryDay[]
}> {
  const userPrompt = buildUserPrompt(ctx)

  const message = await claudeMessages({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text ?? '' : ''

  // Extract JSON even if wrapped in markdown code fences
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/)
  const jsonStr   = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw

  try {
    const parsed = JSON.parse(jsonStr.trim())
    return {
      narrativeIntro: parsed.narrativeIntro ?? '',
      whyThisTrip:    parsed.whyThisTrip ?? '',
      itinerary:      (parsed.itinerary ?? []).map((day: ItineraryDay, i: number) => ({
        ...day,
        day:    day.day ?? i + 1,
        date:   day.date ?? ctx.profile.dates.checkIn,
        weather: ctx.weather[i],
      })),
    }
  } catch (err) {
    console.error('[Claude] JSON parse error:', err, '\nRaw:', raw.slice(0, 500))
    return getFallbackNarrative(ctx)
  }
}

function getFallbackNarrative(ctx: GenerationContext): {
  narrativeIntro: string
  whyThisTrip: string
  itinerary: ItineraryDay[]
} {
  const { profile, hotel, destination, weather } = ctx
  const startDate = new Date(profile.dates.checkIn)

  const itinerary: ItineraryDay[] = Array.from({ length: profile.dates.nights }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    return {
      day: i + 1,
      date: dateStr,
      title: i === 0 ? 'Llegada y primer contacto' : i === profile.dates.nights - 1 ? 'Últimas horas' : `Día ${i + 1} — Exploración`,
      narrative: `Jornada en ${destination} desde ${hotel.name}.`,
      weather: weather[i],
      activities: [
        {
          time: '10:00', name: 'Desayuno en el hotel', description: 'Desayuno con productos locales.',
          type: 'meal' as const, bookable: false, estimatedCost: 0,
          duration: '1h', bookingUrl: undefined, latitude: undefined, longitude: undefined,
        },
        {
          time: '12:00', name: 'Exploración libre', description: `Descubre los alrededores de ${destination}.`,
          type: 'activity' as const, bookable: false, estimatedCost: 0,
          duration: '2h', bookingUrl: undefined, latitude: undefined, longitude: undefined,
        },
        {
          time: '20:00', name: 'Cena', description: 'Cena en restaurante local recomendado.',
          type: 'meal' as const, bookable: true, estimatedCost: 60,
          duration: '2h', bookingUrl: undefined, latitude: undefined, longitude: undefined,
        },
      ],
    }
  })

  return {
    narrativeIntro: `Tu escapada a ${destination} comienza en ${hotel.name}, disponible a ${hotel.pricePerNight}€/noche.`,
    whyThisTrip: `${destination} es el destino ideal para un viaje de ${profile.emotionalState} en entorno ${profile.environment}.`,
    itinerary,
  }
}
