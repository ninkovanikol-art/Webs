'use client'

import { motion } from 'framer-motion'
import { Sun, Cloud, CloudRain, Wind } from 'lucide-react'
import type { WeatherDay } from '@/lib/types'

interface Props {
  weather: WeatherDay[]
}

function Icon({ icon, size = 20 }: { icon?: string; size?: number }) {
  if (!icon) return <Sun size={size} className="text-amber-400" />
  if (icon.includes('09') || icon.includes('10') || icon.includes('11'))
    return <CloudRain size={size} className="text-blue-400" />
  if (icon.includes('02') || icon.includes('03') || icon.includes('04'))
    return <Cloud size={size} className="text-stone-400" />
  return <Sun size={size} className="text-amber-400" />
}

export default function WeatherWidget({ weather }: Props) {
  if (!weather?.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-stone-taupe/30 p-6"
    >
      <h3 className="font-serif text-xl text-stone-deep mb-5">Previsión meteorológica</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {weather.map((day, i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 text-center ${day.suitable ? 'bg-stone-cream' : 'bg-blue-50'}`}
          >
            <div className="text-xs text-stone-mid mb-2">{formatShortDate(day.date)}</div>
            <Icon icon={day.icon} />
            <div className="mt-2 text-sm font-medium text-stone-deep">
              {day.tempMax}°<span className="text-stone-mid font-normal">/{day.tempMin}°</span>
            </div>
            {day.windSpeed > 0 && (
              <div className="flex items-center justify-center gap-1 text-xs text-stone-mid mt-1">
                <Wind size={10} />
                {day.windSpeed}km/h
              </div>
            )}
            {!day.suitable && (
              <div className="text-xs text-blue-500 mt-1">{day.precipitation}mm</div>
            )}
          </div>
        ))}
      </div>

      {/* Experiential notes */}
      {weather.some(w => w.note) && (
        <div className="mt-5 space-y-2">
          {weather.filter(w => w.note).slice(0, 3).map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-stone-mid">
              <Icon icon={w.icon} size={12} />
              <span><strong>{formatShortDate(w.date)}:</strong> {w.note}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}
