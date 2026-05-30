'use client'

import { motion } from 'framer-motion'
import { Building2, Footprints, Utensils, Car, MoreHorizontal } from 'lucide-react'
import type { BudgetBreakdown } from '@/lib/types'

interface Props {
  budget: BudgetBreakdown
  nights: number
  adults: number
}

const CATEGORIES = [
  { key: 'accommodation', label: 'Alojamiento',  icon: <Building2 size={16} />, color: 'bg-purple-500' },
  { key: 'activities',    label: 'Actividades',  icon: <Footprints size={16} />, color: 'bg-emerald-500' },
  { key: 'dining',        label: 'Gastronomía',  icon: <Utensils size={16} />,   color: 'bg-amber-500'   },
  { key: 'transport',     label: 'Transporte',   icon: <Car size={16} />,        color: 'bg-blue-500'    },
  { key: 'miscellaneous', label: 'Varios (5%)',  icon: <MoreHorizontal size={16} />, color: 'bg-stone-400' },
]

export default function BudgetSummary({ budget, nights, adults }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-stone-taupe/30 p-6"
    >
      <h3 className="font-serif text-xl text-stone-deep mb-6">Presupuesto estimado del viaje</h3>

      {/* Bar chart */}
      <div className="space-y-4 mb-8">
        {CATEGORIES.map(({ key, label, icon, color }) => {
          const amount = budget[key as keyof BudgetBreakdown] as number
          const pct    = Math.round((amount / budget.total) * 100)
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2 text-stone-dark">
                  <span className="text-stone-mid">{icon}</span>
                  {label}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-mid">{pct}%</span>
                  <span className="font-medium text-stone-deep w-20 text-right">{amount.toLocaleString('es-ES')}€</span>
                </div>
              </div>
              <div className="h-2 bg-stone-cream rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-stone-taupe/20 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-stone-mid text-sm">Total estimado del viaje</span>
          <span className="font-serif text-3xl font-light text-stone-deep">
            {budget.total.toLocaleString('es-ES')}€
          </span>
        </div>
        {budget.perPersonPerDay && (
          <div className="flex items-center justify-between text-sm text-stone-mid">
            <span>Por persona y día</span>
            <span className="font-medium text-stone-dark">{budget.perPersonPerDay}€</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-stone-mid">
          <span>Noches incluidas</span>
          <span className="font-medium text-stone-dark">{nights} noches · {adults} {adults === 1 ? 'adulto' : 'adultos'}</span>
        </div>
      </div>

      <p className="text-xs text-stone-mid mt-5 leading-relaxed">
        Estimación orientativa. Los precios de actividades y restaurantes son aproximados.
        El alojamiento refleja el precio real consultado en el momento de generación de la propuesta.
      </p>
    </motion.div>
  )
}
