'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import type { TravelerProfile, EmotionalState, Environment, AccomStyle, Experience } from '@/lib/types'

// ─── Question Definitions ────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'dates',
    label: '¿Cuándo quieres viajar?',
    subtitle: 'Consulto disponibilidad real para tus fechas exactas',
    type: 'dates',
  },
  {
    id: 'travelers',
    label: '¿Quiénes viajan?',
    subtitle: 'Para ajustar el tipo de experiencia y la configuración del alojamiento',
    type: 'travelers',
  },
  {
    id: 'emotionalState',
    label: '¿Qué estado emocional buscas?',
    subtitle: 'La base de toda la propuesta',
    type: 'choice',
    options: [
      { value: 'reconnect', label: 'Reconectar',   desc: 'Volver a sentirte tú mismo lejos del ruido' },
      { value: 'adventure', label: 'Aventura',     desc: 'Explorar, sorprenderte, salir de tu zona' },
      { value: 'rest',      label: 'Descanso',     desc: 'Parar. Leer. No hacer nada con todo el tiempo del mundo' },
      { value: 'romance',   label: 'Romance',      desc: 'Crear recuerdos juntos en entornos únicos' },
      { value: 'culture',   label: 'Cultura',      desc: 'Sumergirte en arte, historia y gastronomía local' },
      { value: 'detox',     label: 'Detox digital',desc: 'Desconectar del mundo y reconectar con la naturaleza' },
    ],
  },
  {
    id: 'environment',
    label: '¿Qué entorno te atrae?',
    subtitle: 'El paisaje donde quieres despertar cada mañana',
    type: 'choice',
    options: [
      { value: 'coast',    label: 'Costa',      desc: 'Mediterráneo, Atlántico, acantilados o cala secreta' },
      { value: 'mountain', label: 'Montaña',    desc: 'Altura, silencio, aire limpio y vistas infinitas' },
      { value: 'forest',   label: 'Bosque',     desc: 'Verde, humedad, caminos de tierra y pájaros al amanecer' },
      { value: 'desert',   label: 'Desierto',   desc: 'Aridez, horizontes infinitos y cielos nocturnos perfectos' },
      { value: 'island',   label: 'Isla',       desc: 'Rodeado de agua. El mundo queda lejos' },
      { value: 'city',     label: 'Ciudad',     desc: 'Energía, museos, restaurantes y vida nocturna' },
    ],
  },
  {
    id: 'accomStyle',
    label: '¿Cuál es tu estilo de alojamiento?',
    subtitle: 'El lugar donde cada noche termina y cada mañana empieza',
    type: 'choice',
    options: [
      { value: 'design-hotel', label: 'Hotel de diseño',  desc: 'Arquitectura contemporánea, arte y servicio excepcional' },
      { value: 'glamping',     label: 'Glamping',         desc: 'Naturaleza sin renunciar al confort premium' },
      { value: 'villa',        label: 'Villa privada',    desc: 'Tu propio espacio, piscina privada, total libertad' },
      { value: 'eco-resort',   label: 'Eco-resort',      desc: 'Sostenibilidad, spa y gastronomía saludable integrada' },
      { value: 'boutique',     label: 'Hotel boutique',   desc: 'Pequeño, con carácter, donde te conocen por el nombre' },
      { value: 'palace',       label: 'Palacio / Parador',desc: 'Historia viva. Noches en espacios con siglos de alma' },
    ],
  },
  {
    id: 'experiences',
    label: '¿Qué experiencias son irrenunciables?',
    subtitle: 'Elige todas las que quieras. Diseñaré el itinerario alrededor de ellas',
    type: 'multiChoice',
    options: [
      { value: 'gastronomy', label: 'Gastronomía',    desc: 'Restaurantes estrella, mercados, catas de vino' },
      { value: 'wellness',   label: 'Bienestar',      desc: 'Spa, yoga, baños termales, masajes' },
      { value: 'culture',    label: 'Cultura',        desc: 'Arte, arquitectura, museos, historia local' },
      { value: 'nature',     label: 'Naturaleza',     desc: 'Senderismo, observación de fauna, noche de estrellas' },
      { value: 'nightlife',  label: 'Vida nocturna',  desc: 'Coctelería de autor, música en vivo, terrazas' },
      { value: 'sport',      label: 'Deporte',        desc: 'Golf, surf, ciclismo, kayak, escalada' },
    ],
  },
  {
    id: 'budget',
    label: '¿Cuánto quieres invertir por noche?',
    subtitle: 'Trabajamos con alojamientos entre 150€ y más de 2.000€/noche. Sea cual sea tu rango, existe una opción excepcional',
    type: 'budget',
  },
]

const BUDGET_OPTIONS = [
  { value: 200,   label: '150 – 250€',   desc: 'Boutique cuidado, relación calidad/precio excepcional' },
  { value: 400,   label: '250 – 500€',   desc: 'Hoteles de diseño y glamping premium' },
  { value: 800,   label: '500 – 1.000€', desc: 'Experiencias de lujo, spas y vistas excepcionales' },
  { value: 2000,  label: '+1.000€',      desc: 'Sin límites. Las mejores habitaciones del mundo' },
]

// ─── State ────────────────────────────────────────────────────────────────────

interface FormState {
  checkIn:       string
  checkOut:      string
  adults:        number
  children:      number
  emotionalState: EmotionalState | ''
  environment:   Environment | ''
  accomStyle:    AccomStyle | ''
  experiences:   Experience[]
  budgetPerNight: number
  destination:   string
}

const INITIAL: FormState = {
  checkIn:        '',
  checkOut:       '',
  adults:         2,
  children:       0,
  emotionalState: '',
  environment:    '',
  accomStyle:     '',
  experiences:    [],
  budgetPerNight: 400,
  destination:    '',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]       = useState(0)
  const [form, setForm]       = useState<FormState>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const q = QUESTIONS[step]
  const progress = ((step + 1) / QUESTIONS.length) * 100

  function canAdvance(): boolean {
    switch (q.id) {
      case 'dates':         return !!form.checkIn && !!form.checkOut && form.checkIn < form.checkOut
      case 'travelers':     return form.adults >= 1
      case 'emotionalState':return !!form.emotionalState
      case 'environment':   return !!form.environment
      case 'accomStyle':    return !!form.accomStyle
      case 'experiences':   return form.experiences.length > 0
      case 'budget':        return form.budgetPerNight > 0
      default:              return true
    }
  }

  function handleChoice(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleMultiChoice(value: Experience) {
    setForm(prev => ({
      ...prev,
      experiences: prev.experiences.includes(value)
        ? prev.experiences.filter(e => e !== value)
        : [...prev.experiences, value],
    }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const checkInDate  = new Date(form.checkIn)
    const checkOutDate = new Date(form.checkOut)
    const nights       = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000)

    const profile: TravelerProfile = {
      dates: {
        checkIn:  form.checkIn,
        checkOut: form.checkOut,
        nights,
      },
      travelers:      { adults: form.adults, children: form.children },
      emotionalState: form.emotionalState as EmotionalState,
      environment:    form.environment as Environment,
      accomStyle:     form.accomStyle as AccomStyle,
      experiences:    form.experiences,
      budgetPerNight: form.budgetPerNight,
      destination:    form.destination || undefined,
    }

    try {
      const res = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ profile }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error generando la propuesta')
      }

      const data = await res.json()
      router.push(`/proposal/${data.proposalId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  const isLastStep = step === QUESTIONS.length - 1

  return (
    <main className="min-h-screen bg-stone-warm flex flex-col">
      {/* Progress */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-stone-taupe/30">
        <div
          className="h-full bg-gold-500 progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <nav className="flex items-center justify-between px-8 py-6">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : router.push('/')}
          className="flex items-center gap-2 text-stone-mid hover:text-stone-deep transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          {step === 0 ? 'Inicio' : 'Atrás'}
        </button>
        <span className="font-serif text-xl text-stone-deep">LUXY</span>
        <span className="text-xs text-stone-mid">{step + 1} / {QUESTIONS.length}</span>
      </nav>

      {/* Question Area */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: [0.76, 0, 0.24, 1] }}
            >
              <h2 className="font-serif text-4xl md:text-5xl font-light text-stone-deep mb-3">
                {q.label}
              </h2>
              <p className="text-stone-mid text-sm mb-10 leading-relaxed">{q.subtitle}</p>

              {/* Dates */}
              {q.type === 'dates' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-mid uppercase tracking-widest block mb-2">Check-in</label>
                    <input
                      type="date"
                      value={form.checkIn}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => setForm(p => ({ ...p, checkIn: e.target.value, checkOut: p.checkOut && p.checkOut <= e.target.value ? '' : p.checkOut }))}
                      className="w-full bg-white border border-stone-taupe rounded-xl px-4 py-3 text-stone-deep focus:outline-none focus:border-gold-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-mid uppercase tracking-widest block mb-2">Check-out</label>
                    <input
                      type="date"
                      value={form.checkOut}
                      min={form.checkIn || new Date().toISOString().slice(0, 10)}
                      onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))}
                      className="w-full bg-white border border-stone-taupe rounded-xl px-4 py-3 text-stone-deep focus:outline-none focus:border-gold-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-stone-mid uppercase tracking-widest block mb-2">¿Tienes destino en mente? (opcional)</label>
                    <input
                      type="text"
                      value={form.destination}
                      placeholder="Ej: Costa Brava, Mallorca, Alicante..."
                      onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                      className="w-full bg-white border border-stone-taupe rounded-xl px-4 py-3 text-stone-deep placeholder:text-stone-taupe focus:outline-none focus:border-gold-500"
                    />
                  </div>
                </div>
              )}

              {/* Travelers */}
              {q.type === 'travelers' && (
                <div className="space-y-6">
                  {[
                    { key: 'adults',   label: 'Adultos',     min: 1  },
                    { key: 'children', label: 'Niños (< 12)', min: 0 },
                  ].map(({ key, label, min }) => (
                    <div key={key} className="flex items-center justify-between bg-white border border-stone-taupe rounded-xl px-6 py-4">
                      <span className="text-stone-deep">{label}</span>
                      <div className="flex items-center gap-5">
                        <button
                          onClick={() => setForm(p => ({ ...p, [key]: Math.max(min, (p[key as keyof FormState] as number) - 1) }))}
                          className="w-9 h-9 rounded-full border border-stone-taupe flex items-center justify-center text-stone-mid hover:border-gold-500 hover:text-gold-500 transition-colors"
                        >−</button>
                        <span className="w-6 text-center font-medium text-stone-deep">{form[key as keyof FormState] as number}</span>
                        <button
                          onClick={() => setForm(p => ({ ...p, [key]: (p[key as keyof FormState] as number) + 1 }))}
                          className="w-9 h-9 rounded-full border border-stone-taupe flex items-center justify-center text-stone-mid hover:border-gold-500 hover:text-gold-500 transition-colors"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Single choice */}
              {q.type === 'choice' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map(opt => {
                    const selected = form[q.id as keyof FormState] === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleChoice(q.id, opt.value)}
                        className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                          selected
                            ? 'border-gold-500 bg-gold-50'
                            : 'border-stone-taupe/50 bg-white hover:border-stone-mid'
                        }`}
                      >
                        <div className={`font-medium mb-1 ${selected ? 'text-gold-600' : 'text-stone-deep'}`}>
                          {opt.label}
                        </div>
                        <div className="text-xs text-stone-mid leading-relaxed">{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Multi choice */}
              {q.type === 'multiChoice' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map(opt => {
                    const selected = form.experiences.includes(opt.value as Experience)
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleMultiChoice(opt.value as Experience)}
                        className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                          selected
                            ? 'border-gold-500 bg-gold-50'
                            : 'border-stone-taupe/50 bg-white hover:border-stone-mid'
                        }`}
                      >
                        <div className={`font-medium mb-1 ${selected ? 'text-gold-600' : 'text-stone-deep'}`}>
                          {opt.label}
                        </div>
                        <div className="text-xs text-stone-mid leading-relaxed">{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Budget */}
              {q.type === 'budget' && (
                <div className="space-y-3">
                  {BUDGET_OPTIONS.map(opt => {
                    const selected = form.budgetPerNight === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm(p => ({ ...p, budgetPerNight: opt.value }))}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between ${
                          selected
                            ? 'border-gold-500 bg-gold-50'
                            : 'border-stone-taupe/50 bg-white hover:border-stone-mid'
                        }`}
                      >
                        <div>
                          <div className={`font-medium ${selected ? 'text-gold-600' : 'text-stone-deep'}`}>{opt.label}</div>
                          <div className="text-xs text-stone-mid mt-0.5">{opt.desc}</div>
                        </div>
                        {selected && <div className="w-3 h-3 rounded-full bg-gold-500" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-stone-warm/90 backdrop-blur-sm border-t border-stone-taupe/20 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-xs text-stone-mid">
            {step + 1} de {QUESTIONS.length} preguntas
          </div>
          <button
            disabled={!canAdvance() || loading}
            onClick={() => {
              if (isLastStep) handleSubmit()
              else setStep(s => s + 1)
            }}
            className={`flex items-center gap-2 px-8 py-3 rounded-full text-sm tracking-widest uppercase font-medium transition-all duration-300 ${
              canAdvance() && !loading
                ? 'bg-stone-deep text-stone-warm hover:bg-gold-500'
                : 'bg-stone-taupe/40 text-stone-mid cursor-not-allowed'
            }`}
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Preparando tu viaje…</>
            ) : isLastStep ? (
              <>Generar propuesta <ArrowRight size={14} /></>
            ) : (
              <>Siguiente <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
