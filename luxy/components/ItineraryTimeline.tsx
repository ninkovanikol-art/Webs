'use client'

import { motion } from 'framer-motion'
import { Utensils, Footprints, Car, Building2, Sparkles, Cloud, Sun, CloudRain } from 'lucide-react'
import type { ItineraryDay } from '@/lib/types'

interface Props {
  itinerary: ItineraryDay[]
}

const TYPE_ICONS = {
  meal:          <Utensils size={14} />,
  activity:      <Footprints size={14} />,
  transport:     <Car size={14} />,
  accommodation: <Building2 size={14} />,
  experience:    <Sparkles size={14} />,
}

const TYPE_COLORS: Record<string, string> = {
  meal:          'bg-amber-50  border-amber-200  text-amber-700',
  activity:      'bg-emerald-50 border-emerald-200 text-emerald-700',
  transport:     'bg-blue-50   border-blue-200   text-blue-700',
  accommodation: 'bg-purple-50 border-purple-200 text-purple-700',
  experience:    'bg-gold-50   border-gold-200   text-gold-700',
}

function WeatherIcon({ icon }: { icon?: string }) {
  if (!icon) return <Sun size={14} />
  if (icon.includes('09') || icon.includes('10') || icon.includes('11')) return <CloudRain size={14} />
  if (icon.includes('02') || icon.includes('03') || icon.includes('04')) return <Cloud size={14} />
  return <Sun size={14} />
}

export default function ItineraryTimeline({ itinerary }: Props) {
  return (
    <div className="space-y-8">
      {itinerary.map((day, di) => (
        <motion.div
          key={day.day}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: di * 0.1, duration: 0.5 }}
          className="bg-white rounded-3xl border border-stone-taupe/30 overflow-hidden"
        >
          {/* Day header */}
          <div className="flex items-center justify-between px-6 py-5 bg-stone-cream border-b border-stone-taupe/20">
            <div>
              <div className="text-xs text-stone-mid uppercase tracking-widest mb-1">
                Día {day.day} · {formatDate(day.date)}
              </div>
              <h3 className="font-serif text-xl text-stone-deep">{day.title}</h3>
            </div>
            {day.weather && (
              <div className="flex items-center gap-2 text-stone-mid text-sm">
                <WeatherIcon icon={day.weather.icon} />
                <span>{day.weather.tempMin}–{day.weather.tempMax}°C</span>
              </div>
            )}
          </div>

          <div className="px-6 py-5">
            {/* Narrative */}
            <p className="text-stone-mid text-sm leading-relaxed mb-6 italic font-serif">
              {day.narrative}
            </p>

            {/* Weather note */}
            {day.weather?.note && (
              <div className="mb-5 flex items-start gap-2 text-xs text-stone-mid bg-stone-cream rounded-xl px-4 py-3">
                <WeatherIcon icon={day.weather.icon} />
                <span>{day.weather.note}</span>
              </div>
            )}

            {/* Activities timeline */}
            <div className="space-y-3">
              {day.activities?.map((act, ai) => (
                <div key={ai} className="flex gap-4">
                  {/* Time */}
                  <div className="flex-shrink-0 w-14 text-xs text-stone-mid pt-1 text-right">
                    {act.time}
                  </div>

                  {/* Line */}
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-gold-400 mt-1.5 flex-shrink-0" />
                    {ai < (day.activities?.length ?? 0) - 1 && (
                      <div className="w-px flex-1 bg-stone-taupe/30 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[act.type] ?? TYPE_COLORS.activity}`}>
                        {TYPE_ICONS[act.type as keyof typeof TYPE_ICONS] ?? TYPE_ICONS.activity}
                        {act.type}
                      </span>
                      {act.duration && (
                        <span className="text-xs text-stone-mid">{act.duration}</span>
                      )}
                      {act.estimatedCost !== undefined && act.estimatedCost > 0 && (
                        <span className="text-xs text-stone-mid">~{act.estimatedCost}€</span>
                      )}
                    </div>
                    <div className="font-medium text-stone-deep mt-1">{act.name}</div>
                    <p className="text-xs text-stone-mid leading-relaxed mt-0.5">{act.description}</p>
                    {act.bookable && act.bookingUrl && (
                      <a
                        href={act.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gold-600 hover:underline mt-1.5"
                      >
                        Reservar →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  } catch {
    return dateStr
  }
}
