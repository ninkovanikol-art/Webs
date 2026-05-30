import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Luxy — Curation de Viajes Premium',
  description: 'Diseña tu experiencia de viaje perfecta con inteligencia artificial y precios en tiempo real.',
  keywords:    ['viajes premium', 'luxury travel', 'AI travel agent', 'luxy'],
  openGraph: {
    title:       'Luxy — Curation de Viajes Premium',
    description: 'Tu agente de viajes inteligente para experiencias únicas y reservables.',
    type:        'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
