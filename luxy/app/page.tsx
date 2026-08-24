'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, MapPin, Star } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-stone-warm relative overflow-hidden">
      {/* Grain texture */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.15\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <span className="font-serif text-2xl font-light tracking-widest text-stone-deep">LUXY</span>
        <span className="text-xs tracking-[0.2em] text-stone-mid uppercase">Curation de Viajes Premium</span>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-gold-200 rounded-full px-4 py-1.5 mb-8 text-xs text-gold-600 tracking-widest uppercase">
            <Sparkles size={12} />
            Propuestas con disponibilidad real y precios en vivo
          </div>

          <h1 className="font-serif text-6xl md:text-8xl font-light leading-tight text-stone-deep mb-6">
            El viaje que<br />
            <em className="text-gold-500 not-italic">mereces</em><br />
            te espera
          </h1>

          <p className="max-w-xl mx-auto text-stone-mid text-lg font-light leading-relaxed mb-12">
            Responde 7 preguntas. Recibe una propuesta personalizada con alojamiento disponible,
            itinerario día a día y precios actualizados.
          </p>

          <motion.button
            onClick={() => router.push('/onboarding')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group inline-flex items-center gap-3 bg-stone-deep text-stone-warm px-10 py-4 rounded-full text-sm tracking-widest uppercase hover:bg-gold-500 transition-colors duration-300"
          >
            Comenzar mi viaje
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </section>

      {/* Feature pills */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <MapPin size={18} />, title: 'Inventario real', desc: 'Disponibilidad confirmada en Amadeus, Booking y fuentes directas' },
            { icon: <Star size={18} />,   title: 'Precios en vivo', desc: 'Comparativa de hasta 4 fuentes. Te indicamos dónde reservar más barato' },
            { icon: <Sparkles size={18} />, title: 'IA con contexto', desc: 'Claude usa meteorología, eventos locales y tu perfil para curar la propuesta' },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
              className="bg-white/50 backdrop-blur-sm border border-stone-taupe/40 rounded-2xl p-6"
            >
              <div className="text-gold-500 mb-3">{f.icon}</div>
              <h3 className="font-serif text-lg text-stone-deep mb-1">{f.title}</h3>
              <p className="text-sm text-stone-mid leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-xs text-stone-mid tracking-widest">
        LUXY © {new Date().getFullYear()} · Powered by Claude AI
      </footer>
    </main>
  )
}
