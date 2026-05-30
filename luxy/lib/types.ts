// ─── Traveler Profile ──────────────────────────────────────────────────────────

export interface TravelDates {
  checkIn: string   // ISO date string YYYY-MM-DD
  checkOut: string
  nights: number
}

export type EmotionalState = 'reconnect' | 'adventure' | 'rest' | 'romance' | 'culture' | 'detox'
export type Environment    = 'coast' | 'mountain' | 'desert' | 'forest' | 'city' | 'island'
export type AccomStyle     = 'design-hotel' | 'glamping' | 'villa' | 'eco-resort' | 'boutique' | 'palace'
export type Experience     = 'gastronomy' | 'wellness' | 'culture' | 'nature' | 'nightlife' | 'sport'

export interface TravelerProfile {
  id?: string
  dates: TravelDates
  travelers: { adults: number; children: number }
  emotionalState: EmotionalState
  environment: Environment
  accomStyle: AccomStyle
  experiences: Experience[]
  budgetPerNight: number   // EUR
  destination?: string     // optional override, otherwise inferred
  previousProposalIds?: string[]
}

// ─── Hotel / Inventory ─────────────────────────────────────────────────────────

export interface HotelOffer {
  id: string
  name: string
  chainCode?: string
  iataCode?: string           // city code
  latitude: number
  longitude: number
  address: string
  starRating: number
  description?: string
  images: string[]

  // Pricing
  pricePerNight: number       // EUR, lowest available
  totalPrice: number
  currency: string
  source: 'amadeus' | 'booking' | 'expedia' | 'direct' | 'mock'
  bookingUrl: string
  cancellationPolicy: string

  // Quality signals
  reviewScore: number         // 0–10
  reviewCount: number
  reviewSource: string

  // Availability
  available: boolean
  availabilityPct?: number    // 0–100, used for urgency indicator
  urgency?: 'high' | 'medium' | 'low'

  // Price comparison
  priceComparison?: PriceComparison
}

export interface PriceComparison {
  amadeus?: number
  booking?: number
  expedia?: number
  direct?: number
  lowestSource: string
  lowestPrice: number
  directSaving?: number       // savings vs OTA if booking direct is cheaper
}

// ─── Enrichment Data ──────────────────────────────────────────────────────────

export interface Restaurant {
  name: string
  cuisine: string
  rating: number
  priceLevel: number          // 1–4
  address: string
  latitude: number
  longitude: number
  michelinStars?: number
  bibGourmand?: boolean
  bookingUrl?: string
  description?: string
  source: 'google' | 'michelin' | 'tripadvisor'
}

export interface WeatherDay {
  date: string
  description: string
  tempMin: number
  tempMax: number
  precipitation: number       // mm
  windSpeed: number           // km/h
  icon: string
  suitable: boolean           // for outdoor activities
  note?: string               // experiential note ("ideal para astronomía")
}

export interface LocalEvent {
  name: string
  date: string
  time?: string
  venue: string
  category: string
  url?: string
  price?: number
  description?: string
}

export interface PointOfInterest {
  name: string
  type: string
  rating: number
  latitude: number
  longitude: number
  description?: string
  bookingUrl?: string
  estimatedDuration?: string   // "2h", "half day"
  price?: number
}

// ─── Proposal ─────────────────────────────────────────────────────────────────

export interface ItineraryDay {
  day: number
  date: string
  title: string
  narrative: string
  weather?: WeatherDay
  activities: ItineraryActivity[]
}

export interface ItineraryActivity {
  time: string                 // "09:00"
  name: string
  description: string
  type: 'activity' | 'meal' | 'transport' | 'accommodation' | 'experience'
  duration?: string
  bookable: boolean
  bookingUrl?: string
  estimatedCost?: number
  latitude?: number
  longitude?: number
}

export interface BudgetBreakdown {
  accommodation: number
  activities: number
  dining: number
  transport: number
  miscellaneous: number
  total: number
  currency: string
  perPersonPerDay?: number
}

export interface TravelProposal {
  id: string
  createdAt: string
  profile: TravelerProfile

  // Core proposal
  narrativeIntro: string
  whyThisTrip: string

  // Accommodation
  primaryHotel: HotelOffer
  alternativeHotels?: HotelOffer[]

  // Itinerary
  itinerary: ItineraryDay[]

  // Enrichment
  restaurants: Restaurant[]
  events: LocalEvent[]
  pointsOfInterest: PointOfInterest[]
  weather: WeatherDay[]

  // Financials
  budget: BudgetBreakdown

  // Meta
  dataSources: string[]
  dataFreshness: string        // ISO timestamp of when data was fetched
  cacheHit?: boolean
}

// ─── API Request/Response ─────────────────────────────────────────────────────

export interface GenerateProposalRequest {
  profile: TravelerProfile
}

export interface GenerateProposalResponse {
  proposalId: string
  proposal: TravelProposal
}

export interface ApiError {
  error: string
  details?: string
}
