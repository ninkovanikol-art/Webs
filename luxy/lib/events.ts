import type { LocalEvent } from './types'

export async function getLocalEvents(params: {
  latitude: number
  longitude: number
  checkIn: string
  checkOut: string
  destination: string
}): Promise<LocalEvent[]> {
  const { checkIn, checkOut, destination } = params

  const [eventbrite, ticketmaster] = await Promise.allSettled([
    fetchEventbriteEvents({ checkIn, checkOut, destination }),
    fetchTicketmasterEvents({ checkIn, checkOut, destination }),
  ])

  const events: LocalEvent[] = [
    ...(eventbrite.status === 'fulfilled' ? eventbrite.value : []),
    ...(ticketmaster.status === 'fulfilled' ? ticketmaster.value : []),
  ]

  if (!events.length) return getMockEvents(checkIn, checkOut, destination)

  return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)
}

async function fetchEventbriteEvents(params: {
  checkIn: string
  checkOut: string
  destination: string
}): Promise<LocalEvent[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
    url.searchParams.set('location.address', params.destination)
    url.searchParams.set('start_date.range_start', `${params.checkIn}T00:00:00`)
    url.searchParams.set('start_date.range_end', `${params.checkOut}T23:59:59`)
    url.searchParams.set('expand', 'venue,category')
    url.searchParams.set('categories', '103,108,110,113')  // Music, Film, Food, Sports
    url.searchParams.set('sort_by', 'best')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return []

    const data = await res.json()
    return (data.events ?? []).slice(0, 4).map((e: EventbriteEvent) => ({
      name:        e.name.text,
      date:        e.start.local.slice(0, 10),
      time:        e.start.local.slice(11, 16),
      venue:       e.venue?.name ?? params.destination,
      category:    e.category?.name ?? 'Evento',
      url:         e.url,
      price:       e.is_free ? 0 : undefined,
      description: e.description?.text?.slice(0, 200),
    }))
  } catch (err) {
    console.error('[Eventbrite] Error:', err)
    return []
  }
}

async function fetchTicketmasterEvents(params: {
  checkIn: string
  checkOut: string
  destination: string
}): Promise<LocalEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
    url.searchParams.set('apikey', apiKey)
    url.searchParams.set('keyword', params.destination)
    url.searchParams.set('startDateTime', `${params.checkIn}T00:00:00Z`)
    url.searchParams.set('endDateTime', `${params.checkOut}T23:59:59Z`)
    url.searchParams.set('classificationName', 'Music,Arts & Theatre,Miscellaneous')
    url.searchParams.set('size', '4')
    url.searchParams.set('sort', 'relevance,desc')

    const res = await fetch(url.toString())
    if (!res.ok) return []

    const data = await res.json()
    const eventsArray = data._embedded?.events ?? []
    return eventsArray.map((e: TicketmasterEvent) => ({
      name:        e.name,
      date:        e.dates.start.localDate,
      time:        e.dates.start.localTime?.slice(0, 5),
      venue:       e._embedded?.venues?.[0]?.name ?? params.destination,
      category:    e.classifications?.[0]?.segment?.name ?? 'Evento',
      url:         e.url,
      description: '',
    }))
  } catch (err) {
    console.error('[Ticketmaster] Error:', err)
    return []
  }
}

interface EventbriteEvent {
  name: { text: string }
  start: { local: string }
  venue?: { name: string }
  category?: { name: string }
  url: string
  is_free: boolean
  description?: { text: string }
}

interface TicketmasterEvent {
  name: string
  dates: { start: { localDate: string; localTime?: string } }
  _embedded?: { venues?: Array<{ name: string }> }
  classifications?: Array<{ segment?: { name: string } }>
  url: string
}

function getMockEvents(checkIn: string, checkOut: string, destination: string): LocalEvent[] {
  const checkInDate = new Date(checkIn)

  return [
    {
      name:        'Noche de Astronomía en el Observatorio',
      date:        checkIn,
      time:        '22:00',
      venue:       `Observatorio Local — ${destination}`,
      category:    'Cultura & Ciencia',
      price:       18,
      description: 'Observación de estrellas con telescopio profesional. Capacidad limitada a 20 personas.',
    },
    {
      name:        'Mercado Gastronómico de Productores',
      date:        new Date(checkInDate.setDate(checkInDate.getDate() + 1)).toISOString().slice(0, 10),
      time:        '10:00',
      venue:       `Plaza Mayor — ${destination}`,
      category:    'Gastronomía',
      price:       0,
      description: 'Productores locales de aceite, vino, queso y productos artesanales de la comarca.',
    },
    {
      name:        'Concierto de Música Clásica al Atardecer',
      date:        new Date(new Date(checkIn).setDate(new Date(checkIn).getDate() + 2)).toISOString().slice(0, 10),
      time:        '20:30',
      venue:       `Castillo Medieval — ${destination}`,
      category:    'Música',
      price:       35,
      description: 'Cuarteto de cuerda en el marco único del castillo con vistas al mar.',
    },
    {
      name:        'Cata Maridaje: Vinos DO Marina Alta',
      date:        checkOut,
      time:        '19:00',
      venue:       `Bodega Artesanal — ${destination}`,
      category:    'Gastronomía',
      price:       45,
      description: 'Visita a bodega con cata guiada de 6 vinos de la denominación Marina Alta.',
    },
  ]
}
