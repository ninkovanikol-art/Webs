'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-stone-warm flex flex-col items-center justify-center px-6 text-center">
      <span className="font-serif text-3xl text-stone-deep tracking-widest mb-6">LUXY</span>
      <h1 className="font-serif text-5xl font-light text-stone-deep mb-4">404</h1>
      <p className="text-stone-mid mb-8 max-w-sm">
        Esta propuesta no está disponible. Puede haber expirado o el enlace ser incorrecto.
      </p>
      <button
        onClick={() => router.push('/onboarding')}
        className="flex items-center gap-2 bg-stone-deep text-stone-warm px-8 py-3 rounded-full text-sm tracking-widest uppercase hover:bg-gold-500 transition-colors"
      >
        <ArrowLeft size={14} />
        Crear nueva propuesta
      </button>
    </main>
  )
}
