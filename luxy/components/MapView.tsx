'use client'

import { useEffect, useRef } from 'react'

interface MapPoint {
  lat: number
  lon: number
  name: string
  type: 'hotel' | 'restaurant' | 'poi' | 'event'
  description?: string
}

interface Props {
  center: { lat: number; lon: number }
  points: MapPoint[]
}

const TYPE_COLORS = {
  hotel:      '#b8945a',
  restaurant: '#ef4444',
  poi:        '#10b981',
  event:      '#8b5cf6',
}

export default function MapView({ center, points }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    // Dynamic import to avoid SSR issues
    const initMap = async () => {
        // Load leaflet CSS dynamically
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
      const L = (await import('leaflet')).default

      const map = L.map(mapRef.current!, {
        center:  [center.lat, center.lon],
        zoom:    12,
        zoomControl: true,
      })
      leafletRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        maxZoom: 19,
      }).addTo(map)

      for (const point of points) {
        const color = TYPE_COLORS[point.type]

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })

        const marker = L.marker([point.lat, point.lon], { icon }).addTo(map)
        marker.bindPopup(`<strong>${point.name}</strong>${point.description ? '<br/><small>' + point.description + '</small>' : ''}`)
      }
    }

    initMap().catch(console.error)

    return () => {
      leafletRef.current?.remove()
      leafletRef.current = null
    }
  }, [center, points])

  return (
    <div className="bg-white rounded-3xl border border-stone-taupe/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-taupe/20">
        <h3 className="font-serif text-xl text-stone-deep">Mapa de la experiencia</h3>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 flex flex-wrap gap-4 border-b border-stone-taupe/10 bg-stone-cream/50">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-stone-mid">
            <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ background: color }} />
            {type === 'hotel' ? 'Alojamiento' : type === 'restaurant' ? 'Restaurantes' : type === 'poi' ? 'Puntos de interés' : 'Eventos'}
          </div>
        ))}
      </div>

      <div ref={mapRef} style={{ height: '380px' }} />
    </div>
  )
}
