'use client'

import { motion } from 'framer-motion'

const STEPS = [
  'Verificando disponibilidad en tiempo real…',
  'Consultando inventario hotelero…',
  'Obteniendo previsión meteorológica…',
  'Curating restaurantes y experiencias…',
  'Generando tu propuesta personalizada…',
]

interface Props {
  currentStep?: number
}

export default function LoadingState({ currentStep = 0 }: Props) {
  return (
    <div className="min-h-screen bg-stone-warm flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center max-w-md"
      >
        {/* Animated logo */}
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="font-serif text-4xl text-stone-deep mb-12 tracking-widest"
        >
          LUXY
        </motion.div>

        {/* Spinner ring */}
        <div className="relative w-20 h-20 mx-auto mb-10">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-stone-taupe/30"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-2 rounded-full bg-stone-cream" />
        </div>

        {/* Current step */}
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="text-stone-mid text-sm leading-relaxed"
        >
          {STEPS[Math.min(currentStep, STEPS.length - 1)]}
        </motion.p>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i <= currentStep
                  ? 'w-6 h-1.5 bg-gold-500'
                  : 'w-1.5 h-1.5 bg-stone-taupe'
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-stone-taupe mt-8">
          Máx. 8 segundos · Datos en tiempo real
        </p>
      </motion.div>
    </div>
  )
}
