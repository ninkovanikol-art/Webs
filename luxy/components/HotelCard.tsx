'use client'

import { motion } from 'framer-motion'
import { Star, ExternalLink, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react'
import type { HotelOffer } from '@/lib/types'

interface Props {
  hotel: HotelOffer
  nights: number
}

const URGENCY_LABELS = {
  high:   { label: 'Alta demanda — menos del 30% disponible', cls: 'badge-high' },
  medium: { label: 'Disponibilidad limitada', cls: 'badge-medium' },
  low:    { label: 'Buena disponibilidad', cls: 'badge-low' },
}

export default function HotelCard({ hotel, nights }: Props) {
  const urgency = URGENCY_LABELS[hotel.urgency ?? 'medium']
  const comp    = hotel.priceComparison

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-stone-taupe/30 overflow-hidden shadow-sm"
    >
      {/* Header image placeholder */}
      <div className="h-48 bg-gradient-to-br from-stone-cream to-stone-taupe relative flex items-end p-6">
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${urgency.cls}`}>
            <AlertTriangle size={11} />
            {urgency.label}
          </span>
        </div>
        <div>
          <h3 className="font-serif text-2xl text-stone-deep">{hotel.name}</h3>
          <p className="text-stone-mid text-sm mt-1">{hotel.address}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stars + score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: hotel.starRating }).map((_, i) => (
              <Star key={i} size={14} fill="currentColor" className="text-gold-500" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-stone-deep text-stone-warm text-sm font-semibold px-3 py-1 rounded-lg">
              {hotel.reviewScore.toFixed(1)}
            </span>
            <span className="text-xs text-stone-mid">
              {hotel.reviewCount > 0 ? `${hotel.reviewCount.toLocaleString()} valoraciones` : hotel.reviewSource}
            </span>
          </div>
        </div>

        {/* Description */}
        {hotel.description && (
          <p className="text-sm text-stone-mid leading-relaxed">{hotel.description}</p>
        )}

        {/* Pricing */}
        <div className="bg-stone-cream rounded-2xl p-5 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-serif font-light text-stone-deep">{hotel.pricePerNight}€</span>
              <span className="text-stone-mid text-sm ml-1">/noche</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-stone-mid">Total {nights} noches</div>
              <div className="font-semibold text-stone-deep text-lg">{hotel.totalPrice}€</div>
            </div>
          </div>

          {/* Price comparison */}
          {comp && (
            <div className="border-t border-stone-taupe/30 pt-4 space-y-2">
              <div className="text-xs text-stone-mid uppercase tracking-widest mb-3">Comparativa de precios</div>
              {[
                { source: 'Amadeus',   price: comp.amadeus },
                { source: 'Booking',   price: comp.booking },
                { source: 'Expedia',   price: comp.expedia },
                { source: 'Directo',   price: comp.direct  },
              ].filter(r => r.price).map(({ source, price }) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span className={source === toTitleCase(comp.lowestSource) ? 'text-gold-600 font-medium' : 'text-stone-mid'}>
                    {source}
                    {source === toTitleCase(comp.lowestSource) && <span className="ml-2 text-xs">← Más barato</span>}
                  </span>
                  <span className={source === toTitleCase(comp.lowestSource) ? 'font-semibold text-gold-600' : 'text-stone-mid'}>
                    {price}€
                  </span>
                </div>
              ))}

              {comp.directSaving && comp.directSaving > 0 && (
                <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700">
                  <TrendingDown size={13} />
                  Reservando directamente ahorras <strong>{comp.directSaving}€</strong> frente a las OTAs
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cancellation */}
        <div className="flex items-start gap-2 text-xs text-stone-mid">
          <CheckCircle size={14} className="text-gold-500 mt-0.5 flex-shrink-0" />
          <span>{hotel.cancellationPolicy}</span>
        </div>

        {/* CTA */}
        <a
          href={hotel.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-stone-deep text-stone-warm py-4 rounded-2xl text-sm tracking-widest uppercase hover:bg-gold-500 transition-colors duration-300"
        >
          Reservar ahora
          <ExternalLink size={13} />
        </a>
      </div>
    </motion.div>
  )
}

function toTitleCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
