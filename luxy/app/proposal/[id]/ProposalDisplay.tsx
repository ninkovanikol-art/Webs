'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Bookmark, Share2, RefreshCw, Star, MapPin, Calendar, Users, Database, Clock } from 'lucide-react'
import type { TravelProposal } from '@/lib/types'
import HotelCard from '@/components/HotelCard'
import ItineraryTimeline from '@/components/ItineraryTimeline'
import BudgetSummary from '@/components/BudgetSummary'
import WeatherWidget from '@/components/WeatherWidget'
import dynamic from 'next/dynamic'

type MapViewProps = { center: { lat: number; lon: number }; points: Array<{ lat: number; lon: number; name: string; type: 'hotel' | 'restaurant' | 'poi' | 'event'; description?: string }> }

// Dynamic import typed as FC to satisfy Next.js dynamic<T extends (...args) => any> constraint
const MapViewDynamic = dynamic(
  () => import('@/components/MapView').then(mod => ({ default: mod.default as React.FC<MapViewProps> })),
  { ssr: false, loading: () => <div className="h-96 bg-stone-cream rounded-3xl animate-pulse" /> }
)
const MapView = MapViewDynamic as React.FC<MapViewProps>

interface Props {
  proposal: TravelProposal
}

const LABEL: Record<string, string> = {
  reconnect:    'Reconectar',
  adventure:    'Aventura',
  rest:         'Descanso',
  romance:      'Romance',
  culture:      'Cultura',
  detox:        'Detox digital',
  coast:        'Costa',
  mountain:     'Montaña',
  forest:       'Bosque',
  desert:       'Desierto',
  island:       'Isla',
  city:         'Ciudad',
  gastronomy:   'Gastronomía',
  wellness:     'Bienestar',
  nature:       'Naturaleza',
  nightlife:    'Vida nocturna',
  sport:        'Deporte',
}

type Tab = 'overview' | 'itinerary' | 'map' | 'budget'

export default function ProposalDisplay({ proposal }: Props) {
  const router  = useRouter()
  const [tab, setTab]       = useState<Tab>('overview')
  const [saved, setSaved]   = useState(false)

  const { profile, primaryHotel, alternativeHotels, itinerary, restaurants, events, pointsOfInterest, weather, budget } = proposal

  const mapPoints = [
    primaryHotel && { lat: primaryHotel.latitude, lon: primaryHotel.longitude, name: primaryHotel.name, type: 'hotel' as const, description: `${primaryHotel.pricePerNight}€/noche` },
    ...restaurants.map(r => ({ lat: r.latitude, lon: r.longitude, name: r.name, type: 'restaurant' as const, description: r.cuisine })),
    ...pointsOfInterest.map(p => ({ lat: p.latitude, lon: p.longitude, name: p.name, type: 'poi' as const, description: p.type })),
  ].filter(Boolean) as Parameters<typeof MapView>[0]['points']

  function handleSave() {
    try {
      const saved = JSON.parse(localStorage.getItem('luxy-proposals') ?? '[]')
      if (!saved.find((p: { id: string }) => p.id === proposal.id)) {
        saved.push({ id: proposal.id, title: primaryHotel?.name, destination: profile.destination, savedAt: new Date().toISOString() })
        localStorage.setItem('luxy-proposals', JSON.stringify(saved))
      }
      setSaved(true)
    } catch {
      setSaved(true)
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: 'Mi propuesta Luxy', url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Resumen'    },
    { id: 'itinerary', label: 'Itinerario' },
    { id: 'map',       label: 'Mapa'       },
    { id: 'budget',    label: 'Presupuesto'},
  ]

  return (
    <main className="min-h-screen bg-stone-warm">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-stone-warm/90 backdrop-blur-sm border-b border-stone-taupe/20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/onboarding')}
            className="flex items-center gap-2 text-stone-mid hover:text-stone-deep transition-colors text-sm"
          >
            <ArrowLeft size={15} />
            Nueva propuesta
          </button>

          <span className="font-serif text-xl text-stone-deep tracking-widest">LUXY</span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-stone-cream transition-colors text-stone-mid"
              title="Compartir"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-full transition-all ${
                saved ? 'bg-gold-500 text-white' : 'border border-stone-taupe hover:border-gold-500 text-stone-mid hover:text-gold-500'
              }`}
            >
              <Bookmark size={13} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[profile.emotionalState, profile.environment, ...profile.experiences].map(tag => (
              <span key={tag} className="text-xs tracking-widest uppercase px-3 py-1 bg-stone-cream border border-stone-taupe/50 rounded-full text-stone-mid">
                {LABEL[tag] ?? tag}
              </span>
            ))}
          </div>

          {/* Intro */}
          <h1 className="font-serif text-4xl md:text-5xl font-light text-stone-deep leading-tight mb-4">
            Tu viaje a<br />
            <em className="text-gold-500 not-italic">{profile.destination ?? primaryHotel?.address?.split(',')[1]?.trim() ?? 'tu destino'}</em>
          </h1>

          <p className="text-stone-mid text-lg leading-relaxed max-w-2xl mb-3 font-serif italic">
            {proposal.narrativeIntro}
          </p>
          <p className="text-stone-mid leading-relaxed max-w-2xl text-sm">
            {proposal.whyThisTrip}
          </p>

          {/* Trip meta */}
          <div className="flex flex-wrap gap-4 mt-8 text-sm text-stone-mid">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              {profile.dates.checkIn} → {profile.dates.checkOut} · {profile.dates.nights} noches
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={14} />
              {profile.travelers.adults} adultos{profile.travelers.children > 0 ? ` · ${profile.travelers.children} niños` : ''}
            </div>
            {primaryHotel && (
              <div className="flex items-center gap-1.5">
                <MapPin size={14} />
                {primaryHotel.address}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              Datos actualizados {new Date(proposal.dataFreshness).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tabs */}
      <div className="sticky top-[65px] z-30 bg-stone-warm/90 backdrop-blur-sm border-b border-stone-taupe/20 px-6">
        <div className="max-w-6xl mx-auto flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-gold-500 text-stone-deep font-medium'
                  : 'border-transparent text-stone-mid hover:text-stone-dark'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Overview Tab */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {primaryHotel && (
                <HotelCard hotel={primaryHotel} nights={profile.dates.nights} />
              )}
              <WeatherWidget weather={weather} />

              {/* Restaurants */}
              {restaurants.length > 0 && (
                <div className="bg-white rounded-3xl border border-stone-taupe/30 p-6">
                  <h3 className="font-serif text-xl text-stone-deep mb-5">Gastronomía curada</h3>
                  <div className="space-y-4">
                    {restaurants.slice(0, 4).map((r, i) => (
                      <div key={i} className="flex items-start gap-4 py-3 border-b border-stone-cream last:border-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-stone-cream flex items-center justify-center">
                          <Star size={16} className="text-gold-500" fill="currentColor" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-deep">{r.name}</span>
                            {r.michelinStars && (
                              <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                                ★{r.michelinStars} Michelin
                              </span>
                            )}
                            {r.bibGourmand && (
                              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                                Bib Gourmand
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-mid mt-0.5">{r.cuisine} · {'€'.repeat(r.priceLevel)}</div>
                          {r.description && <p className="text-xs text-stone-mid mt-1 leading-relaxed">{r.description}</p>}
                        </div>
                        <div className="text-sm font-medium text-stone-dark">{r.rating}/10</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Events */}
              {events.length > 0 && (
                <div className="bg-white rounded-3xl border border-stone-taupe/30 p-6">
                  <h3 className="font-serif text-xl text-stone-deep mb-5">Eventos durante tu viaje</h3>
                  <div className="space-y-3">
                    {events.map((e, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-stone-cream rounded-2xl">
                        <div className="flex-shrink-0 text-center bg-white rounded-xl px-3 py-2 border border-stone-taupe/20">
                          <div className="text-xs text-stone-mid">{formatShortMonth(e.date)}</div>
                          <div className="text-lg font-serif font-light text-stone-deep leading-none">{new Date(e.date + 'T12:00:00').getDate()}</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-stone-deep text-sm">{e.name}</div>
                          <div className="text-xs text-stone-mid mt-0.5">{e.venue}{e.time ? ` · ${e.time}` : ''}</div>
                          {e.description && <p className="text-xs text-stone-mid mt-1">{e.description}</p>}
                        </div>
                        {e.price !== undefined && (
                          <div className="text-xs font-medium text-stone-dark flex-shrink-0">
                            {e.price === 0 ? 'Gratuito' : `${e.price}€`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              <BudgetSummary budget={budget} nights={profile.dates.nights} adults={profile.travelers.adults} />

              {/* Alternative hotels */}
              {alternativeHotels && alternativeHotels.length > 0 && (
                <div className="bg-white rounded-3xl border border-stone-taupe/30 p-6">
                  <h3 className="font-serif text-lg text-stone-deep mb-4">Alternativas</h3>
                  <div className="space-y-4">
                    {alternativeHotels.map((h, i) => (
                      <div key={i} className="border-b border-stone-cream pb-4 last:border-0 last:pb-0">
                        <div className="font-medium text-stone-deep text-sm">{h.name}</div>
                        <div className="text-xs text-stone-mid mt-0.5">{h.address}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-gold-500 font-medium text-sm">{h.pricePerNight}€/noche</span>
                          <span className="text-xs text-stone-mid">{h.reviewScore}/10</span>
                        </div>
                        <a href={h.bookingUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-stone-mid hover:text-gold-500 transition-colors mt-1 inline-block">
                          Ver disponibilidad →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data sources */}
              <div className="bg-stone-cream rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-stone-mid mb-2">
                  <Database size={12} />
                  <span className="uppercase tracking-widest">Fuentes de datos</span>
                </div>
                <div className="space-y-1">
                  {proposal.dataSources.map((src, i) => (
                    <div key={i} className="text-xs text-stone-mid">· {src}</div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Itinerary Tab */}
        {tab === 'itinerary' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
            <ItineraryTimeline itinerary={itinerary} />
          </motion.div>
        )}

        {/* Map Tab */}
        {tab === 'map' && primaryHotel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <MapView
              center={{ lat: primaryHotel.latitude, lon: primaryHotel.longitude }}
              points={mapPoints}
            />
          </motion.div>
        )}

        {/* Budget Tab */}
        {tab === 'budget' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl">
            <BudgetSummary budget={budget} nights={profile.dates.nights} adults={profile.travelers.adults} />
          </motion.div>
        )}
      </div>

      {/* Generate again CTA */}
      <div className="border-t border-stone-taupe/20 py-12 text-center">
        <button
          onClick={() => router.push('/onboarding')}
          className="inline-flex items-center gap-2 bg-stone-deep text-stone-warm px-8 py-3 rounded-full text-sm tracking-widest uppercase hover:bg-gold-500 transition-colors"
        >
          <RefreshCw size={14} />
          Diseñar otro viaje
        </button>
        <p className="text-xs text-stone-mid mt-4">
          Propuesta generada el {new Date(proposal.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </main>
  )
}

function formatShortMonth(dateStr: string): string {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()
  } catch { return '' }
}
