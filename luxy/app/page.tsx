'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
import { motion } from "framer-motion"
import {
  BrainCircuit,
  Building2,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Hotel,
  Layers3,
  MapPin,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

import type { Variants } from "framer-motion"

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full mb-4">
      {children}
    </span>
  )
}

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col items-center text-center p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
    >
      <span className="text-3xl md:text-4xl font-bold bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent">
        {value}
      </span>
      <span className="mt-2 text-sm font-semibold text-white/90">{label}</span>
      {sub && <span className="mt-1 text-xs text-white/40">{sub}</span>}
    </motion.div>
  )
}

function LayerCard({
  num, name, desc, model, when,
  icon: Icon,
}: {
  num: string; name: string; desc: string; model: string; when: string
  icon: React.ElementType
}) {
  return (
    <motion.div variants={fadeUp} className="relative group">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Card className="relative bg-white/5 border-white/10 rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-amber-500 mb-1">CAPA {num}</div>
              <h3 className="text-lg font-bold text-white mb-2">{name}</h3>
              <p className="text-sm text-white/60 mb-3">{desc}</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{model}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">{when}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function LuxyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0a0a0a]/80 to-[#0a0a0a]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <SectionLabel>TravelTech Premium · Europa · 2026</SectionLabel>
          </motion.div>
          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-7xl md:text-9xl font-black tracking-tighter mb-4">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">LUXY</span>
          </motion.h1>
          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mb-8">
            Tu próximo viaje premium, diseñado por IA, en un minuto.
          </motion.p>
          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="text-sm text-white/30 mb-10">
            Agente IA · TravelTech Premium Europe · Business Plan — Lanzadera 2026
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="flex flex-wrap gap-4 justify-center">
            <a href="https://agentluxy.netlify.app" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors duration-200">
              <Sparkles className="w-4 h-4" />
              Ver Demo Pública
            </a>
            <a href="#producto"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold text-sm transition-colors duration-200">
              Descubrir más <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-white/20" />
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>01 · El Problema</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">El gap del mercado premium</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              El mercado de viajes premium tiene un problema estructural no resuelto: la calidad de la experiencia
              es inversamente proporcional a la escala del servicio.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <StatCard value="1,49T€" label="Turismo Premium Global" sub="CAGR 6,2% hasta 2035" />
            <StatCard value="28,7%" label="CAGR HotelTech IA" sub="MarketsandMarkets" />
            <StatCard value="89%" label="Viajeros quieren IA" sub="Booking.com 2025" />
            <StatCard value="50%" label="Hoteles usan alguna IA" sub="AI Blog 2025" />
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left p-4 text-white/40 font-medium">Dimensión</th>
                        <th className="text-center p-4 text-white/50 font-semibold">Polo masivo (OTAs)</th>
                        <th className="text-center p-4 text-white/50 font-semibold">Polo premium (Agencias)</th>
                        <th className="text-center p-4 text-amber-400 font-bold">LUXY ✦</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Escala", "Masiva", "Limitada", "Ilimitada"],
                        ["Personalización", "Inexistente", "Real pero costosa", "Real y automática"],
                        ["Velocidad", "Inmediata", "Días / semanas", "Segundos"],
                        ["Memoria del viajero", "Sin memoria", "Limitada", "Acumulativa"],
                        ["Gestión de la estancia", "Inexistente", "Cara y no escalable", "Automatizada"],
                      ].map(([dim, ota, agency, luxy], i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white/60">{dim}</td>
                          <td className="p-4 text-center text-white/35">{ota}</td>
                          <td className="p-4 text-center text-white/35">{agency}</td>
                          <td className="p-4 text-center text-amber-400 font-semibold">{luxy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.blockquote initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="mt-10 text-center text-xl md:text-2xl font-light italic text-white/40 max-w-2xl mx-auto border-l-4 border-amber-500/40 pl-6">
            &ldquo;El gap entre estos dos polos es exactamente el espacio que Luxy ocupa.&rdquo;
          </motion.blockquote>
        </div>
      </section>

      {/* PRODUCT */}
      <section id="producto" className="py-24 px-6 relative">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1600&q=80')",
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>02 · El Producto</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">Una plataforma. Tres capas.</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Luxy cubre el ciclo completo del viajero: desde la inspiración hasta la post-estancia.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid md:grid-cols-3 gap-6 mb-16">
            <LayerCard num="1" name="Agente IA Global"
              desc="Diseña y vende experiencias personalizadas en segundos. Flujo de 7 preguntas, 18 paquetes signature activos."
              model="B2C · Comisión 15–20%" when="Antes del viaje" icon={BrainCircuit} />
            <LayerCard num="2" name="Guest OS"
              desc="Gestiona la estancia en tiempo real. Check-in, upselling contextual, predicción de incidencias."
              model="B2B · Licencia mensual" when="Durante el viaje" icon={Hotel} />
            <LayerCard num="3" name="Mayordomo Virtual"
              desc="IA conversacional en cada habitación. Anticipa necesidades y fideliza al huésped post-estancia."
              model="B2B SaaS · Por habitación/mes" when="Durante y después" icon={Sparkles} />
          </motion.div>

          {/* Agent demo card */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Card className="bg-black/[0.96] border-white/10 rounded-2xl overflow-hidden relative">
              <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <SectionLabel>Demo Operativa · Mayo 2026</SectionLabel>
                    <h3 className="text-3xl font-black text-white mb-4">El Agente IA ya está vivo</h3>
                    <ul className="space-y-3 mb-6">
                      {[
                        "Flujo completo de 7 preguntas desde perfil emocional",
                        "Tipologías automáticas: Burbuja · Domo · Villa",
                        "Itinerario con precio dinámico y paquetes adicionales",
                        "18 paquetes signature activos",
                        "Powered by Claude Sonnet API — respuestas en tiempo real",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-white/70 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <a href="https://agentluxy.netlify.app" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors">
                      <Zap className="w-4 h-4" />
                      Probar agentluxy.netlify.app
                    </a>
                  </div>
                  <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 min-h-[280px]">
                    <img
                      src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80"
                      alt="Luxury hotel experience"
                      className="w-full h-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/80 backdrop-blur rounded-xl p-5 border border-amber-500/20 max-w-xs w-full mx-4">
                        <div className="text-xs text-amber-400 font-mono mb-2 tracking-widest">AGENTE LUXY</div>
                        <div className="text-white/80 text-sm mb-3">&ldquo;¿Qué tipo de viajero eres?&rdquo;</div>
                        <div className="flex gap-2 flex-wrap">
                          {["Aventurero", "Romántico", "Gourmet", "Cultural"].map((t) => (
                            <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60 border border-white/10">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* SAAS PRICING */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>03 · SaaS B2B</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">Modelo de Pricing</h2>
            <p className="text-white/50 max-w-xl mx-auto">Licencia mensual por habitación para alojamientos boutique de toda Europa.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid md:grid-cols-3 gap-6">
            {[
              { tier: "Starter", target: "Glamping 5–15 uds.", price: "150 €", arr: "90.000 €", features: ["Mayordomo Virtual", "WhatsApp", "Dashboard"], highlight: false },
              { tier: "Professional", target: "Hotel boutique 15–50 uds.", price: "300 €", arr: "180.000 €", features: ["Todo Starter", "PMS", "Upselling", "Analytics"], highlight: true },
              { tier: "Enterprise", target: "Resort 50+ uds.", price: "500 €", arr: "300.000 €", features: ["Todo Professional", "Guest OS completo", "Onboarding dedicado"], highlight: false },
            ].map((plan, i) => (
              <motion.div key={plan.tier} variants={fadeUp} custom={i}>
                <Card className={`rounded-2xl overflow-hidden relative h-full ${plan.highlight ? "border-amber-500/50 bg-amber-500/5" : "border-white/10 bg-white/5"}`}>
                  {plan.highlight && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-300" />}
                  <CardContent className="p-6 flex flex-col h-full">
                    {plan.highlight && <span className="text-xs font-bold tracking-widest uppercase text-amber-400 mb-2">★ Más popular</span>}
                    <div className="text-lg font-bold text-white mb-1">{plan.tier}</div>
                    <div className="text-xs text-white/40 mb-4">{plan.target}</div>
                    <div className="text-4xl font-black text-white mb-1">{plan.price}<span className="text-sm font-normal text-white/40">/ud./mes</span></div>
                    <div className="text-xs text-amber-400 mb-6">ARR 50 uds.: {plan.arr}</div>
                    <ul className="space-y-2 mt-auto">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                          <CheckCircle2 className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* NATUR-LUX HIDEAWAY */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80')",
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>04 · Validación Real</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">Natur-Lux Hideaway</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Eco-resort Only Adults en Finestrat, Alicante. El laboratorio donde la IA aprende
              con huéspedes, operaciones y reservas reales.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <StatCard value="26,28%" label="TIR sin deuda" sub="vs 8–15% del sector" />
            <StatCard value="2,78M€" label="VAN a 10 años" sub="WACC 6,36%" />
            <StatCard value="9,33x" label="DSCR (carencia)" sub="mínimo exigido 1,30x" />
            <StatCard value="21,4%" label="Break-even" sub="ocupación mínima" />
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid md:grid-cols-3 gap-6">
            {[
              { tipo: "Burbuja Panorámica", uds: "5 uds.", adr: "220–300 €", ingresos: "320.744 €", img: "https://images.unsplash.com/photo-1573227895226-42c9abf0d63e?w=600&q=80" },
              { tipo: "Domo Geodésico", uds: "4 uds.", adr: "300–400 €", ingresos: "359.233 €", img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80" },
              { tipo: "Villa + Infinity Pool", uds: "3 uds.", adr: "450–600 €", ingresos: "384.893 €", img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80" },
            ].map((t, i) => (
              <motion.div key={t.tipo} variants={fadeUp} custom={i}
                className="group relative rounded-2xl overflow-hidden border border-white/10 min-h-[280px]">
                <img src={t.img} alt={t.tipo}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <div className="text-xs text-amber-400 font-semibold mb-1">{t.uds} · ADR {t.adr}</div>
                  <div className="text-lg font-bold text-white mb-1">{t.tipo}</div>
                  <div className="text-sm text-white/60">Ingresos Año 1: <span className="text-amber-300 font-semibold">{t.ingresos}</span></div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* REVENUE PROJECTION */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>05 · Modelo de Negocio</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">Tres streams de ingresos</h2>
            <p className="text-white/50 max-w-xl mx-auto">Márgenes brutos superiores al 80% en tecnología y EBITDA del 62,9% en el activo físico.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="mb-8">
            <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left p-4 text-white/40 font-medium">Fuente de ingresos</th>
                        <th className="text-center p-4 text-white/50 font-semibold">Año 1</th>
                        <th className="text-center p-4 text-white/50 font-semibold">Año 2</th>
                        <th className="text-center p-4 text-amber-400 font-bold">Año 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["🏨 Natur-Lux Hideaway", "1.064.869 €", "1.118.113 €", "1.174.018 €"],
                        ["🤖 Agente IA — Comisiones B2C", "10–24K €", "51–102K €", "163–272K €"],
                        ["⚙️ SaaS B2B (Guest OS + Mayordomo)", "43.200 €", "121–324K €", "495K–990K €"],
                      ].map(([label, y1, y2, y3], i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white/80 font-medium">{label}</td>
                          <td className="p-4 text-center text-white/50">{y1}</td>
                          <td className="p-4 text-center text-white/50">{y2}</td>
                          <td className="p-4 text-center text-amber-400 font-semibold">{y3}</td>
                        </tr>
                      ))}
                      <tr className="bg-amber-500/5 border-t border-amber-500/20">
                        <td className="p-4 font-bold text-white">TOTAL CONSOLIDADO</td>
                        <td className="p-4 text-center font-bold text-white">1,1–1,13 M€</td>
                        <td className="p-4 text-center font-bold text-white">1,34–1,59 M€</td>
                        <td className="p-4 text-center font-bold text-amber-400">1,93–2,54 M€</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stream cards */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid md:grid-cols-3 gap-4">
            {[
              { icon: BrainCircuit, label: "Agente IA Global", type: "B2C · Comisión 15–20%", margin: "> 80% margen bruto", start: "Mes 3–6" },
              { icon: Hotel, label: "Guest OS + Mayordomo", type: "B2B SaaS · Licencia mensual", margin: "> 85% margen bruto", start: "Mes 6–9" },
              { icon: MapPin, label: "Natur-Lux Hideaway", type: "Revenue directo por estancia", margin: "62,9% EBITDA", start: "Año 1–2" },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <Card className="bg-white/5 border-white/10 rounded-2xl">
                  <CardContent className="p-5 flex gap-4 items-start">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <s.icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm mb-1">{s.label}</div>
                      <div className="text-xs text-white/40 mb-1">{s.type}</div>
                      <div className="text-xs text-amber-400">{s.margin}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* COMPETITION */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>06 · Competencia</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">Ninguno replica nuestro modelo</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left p-4 text-white/40 font-medium">Capacidad</th>
                        <th className="text-center p-4 text-amber-400 font-bold">Luxy ✦</th>
                        <th className="text-center p-4 text-white/50 font-medium">Black Tomato</th>
                        <th className="text-center p-4 text-white/50 font-medium">Booking</th>
                        <th className="text-center p-4 text-white/50 font-medium">Journy</th>
                        <th className="text-center p-4 text-white/50 font-medium">Cloudbeds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["IA en tiempo real", "✓", "Parcial", "Parcial", "Parcial", "✗"],
                        ["Activo físico propio", "✓", "✗", "✗", "✗", "✗"],
                        ["Guest OS licenciable", "✓", "✗", "✗", "✗", "✗"],
                        ["Memoria del viajero", "✓", "✗", "Limitado", "✗", "✗"],
                        ["Modelo SaaS B2B", "✓", "✗", "✗", "✗", "Solo PMS"],
                        ["Datos propios de entrenamiento", "✓", "✗", "✗", "✗", "✗"],
                      ].map(([cap, luxy, ...rest], i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white/60">{cap}</td>
                          <td className="p-4 text-center font-bold text-amber-400">{luxy}</td>
                          {rest.map((v, j) => (
                            <td key={j} className={`p-4 text-center ${v === "✗" ? "text-white/20" : "text-white/50"}`}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="mt-8 text-center text-white/40 text-sm max-w-2xl mx-auto">
            Luxy no compite con Booking ni con Airbnb. Compite con Black Tomato — y lo hace con IA en lugar de personas.
            Black Tomato tardó 20 años en llegar a 35M$ con 99 empleados. Nosotros podemos hacerlo en 5, con 10.
          </motion.p>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>07 · Roadmap</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">4 fases hasta la escala</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid md:grid-cols-4 gap-6">
            {[
              { phase: "MVP", time: "Mes 1–3", tech: ["Agente IA en producción", "Mayordomo v1 vía WhatsApp", "Integración PMS"], biz: ["10+ reservas confirmadas", "Natur-Lux como cliente 1"], icon: Rocket },
              { phase: "Validación", time: "Mes 4–9", tech: ["Guest OS Fase 1", "Agente global 3–5 destinos", "Motor upselling básico"], biz: ["1er contrato SaaS B2B", "ARR > 0", "NPS > 85"], icon: BarChart3 },
              { phase: "Escala V1", time: "Mes 10–18", tech: ["Memoria longitudinal (vector DB)", "Analytics B2B", "Pricing dinámico"], biz: ["3–5 clientes SaaS", "ARR > 50.000€", "Conversaciones Serie A"], icon: TrendingUp },
              { phase: "Crecimiento V2", time: "Año 2–3", tech: ["Plataforma multilingüe", "API pública", "Predicción LTV"], biz: ["10–20 clientes SaaS", "ARR > 500K€", "Serie A cerrada"], icon: Globe2 },
            ].map((p, i) => (
              <motion.div key={p.phase} variants={fadeUp} custom={i}>
                <Card className="bg-white/5 border-white/10 rounded-2xl h-full">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <p.icon className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{p.phase}</div>
                        <div className="text-xs text-white/40">{p.time}</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Tecnología</div>
                      <ul className="space-y-1.5 mb-4">
                        {p.tech.map((t) => (
                          <li key={t} className="text-xs text-white/60 flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">·</span>{t}
                          </li>
                        ))}
                      </ul>
                      <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Negocio</div>
                      <ul className="space-y-1.5">
                        {p.biz.map((b) => (
                          <li key={b} className="text-xs text-white/60 flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">·</span>{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>08 · Equipo</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">Skin in the game real</h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Los fundadores no construyen sobre un PowerPoint — invierten su capital, su red y su empresa constructora familiar.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { name: "Nikol Ninkova", role: "CEO", desc: "Arquitecta del modelo TravelTech. Liderazgo estratégico y fundraising.", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80" },
              { name: "Juan Ramón Amador", role: "COO", desc: "Operaciones físicas. Constructora familiar: ahorro 90–120K€ en CapEx.", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" },
              { name: "CTO (confirmado)", role: "CTO", desc: "Arquitectura IA, plataforma SaaS e integraciones técnicas. Gap técnico cubierto.", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80" },
            ].map((person, i) => (
              <motion.div key={person.name} variants={fadeUp} custom={i}>
                <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
                  <CardContent className="p-6 flex gap-4 items-start">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-amber-500/30">
                      <img src={person.img} alt={person.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{person.name}</div>
                      <div className="text-xs text-amber-400 font-semibold mb-2">{person.role}</div>
                      <div className="text-sm text-white/50">{person.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid md:grid-cols-3 gap-4">
            <StatCard value="152.308 €" label="Sweat equity documentado" sub="7% del CapEx total" />
            <StatCard value="2" label="Municipios con apoyo" sub="Finestrat y Orxeta" />
            <StatCard value="3 años 9m" label="Payback" sub="vs 6–10 años del sector" />
          </motion.div>
        </div>
      </section>

      {/* INVESTMENT ASK */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-transparent to-transparent" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-16">
            <SectionLabel>09 · El Ask</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">Inversión Pre-seed</h2>
            <p className="text-6xl md:text-8xl font-black text-amber-400 mb-4">100K–300K€</p>
            <p className="text-white/50 max-w-xl mx-auto">
              Para el desarrollo del producto tecnológico y la validación comercial.
              Independiente de la financiación bancaria del activo físico.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid md:grid-cols-2 gap-4 mb-12">
            {[
              { label: "Desarrollo Agente IA + Guest OS + Mayordomo", amount: "80.000–120.000 €", milestone: "Demo funcional pública en Mes 3", icon: BrainCircuit },
              { label: "Infraestructura cloud, APIs y modelos IA", amount: "20.000–40.000 €", milestone: "Sistema operativo en producción Mes 4", icon: Layers3 },
              { label: "CTO / Lead Developer", amount: "40.000–80.000 €", milestone: "Incorporación Mes 1–2", icon: Users },
              { label: "Marketing y captación primeros clientes", amount: "30.000–60.000 €", milestone: "10 reservas Mes 6 · 1 piloto SaaS Mes 9", icon: TrendingUp },
              { label: "Legal, IP y estructuración societaria", amount: "10.000–20.000 €", milestone: "Sociedad constituida y marca registrada Mes 2", icon: Building2 },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <Card className="bg-white/5 border-white/10 rounded-xl">
                  <CardContent className="p-4 flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">{item.label}</div>
                      <div className="text-amber-400 font-bold text-sm mb-1">{item.amount}</div>
                      <div className="text-xs text-white/40">{item.milestone}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* 8-month milestones */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { mes: "Mes 3", title: "Agente IA en producción", sub: "URL pública + 50 propuestas" },
              { mes: "Mes 6", title: "10 reservas B2C", sub: "Confirmadas y pagadas" },
              { mes: "Mes 9", title: "Primer cliente SaaS B2B", sub: "Contrato firmado · ARR > 0" },
              { mes: "Mes 12", title: "ARR SaaS > 50.000 €", sub: "Base para Serie A" },
            ].map((m, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}
                className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center">
                <div className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-1">{m.mes}</div>
                <div className="text-sm font-bold text-white mb-1">{m.title}</div>
                <div className="text-xs text-white/40">{m.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA / CLOSING */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=80')",
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/80 to-[#0a0a0a]" />
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <SectionLabel>Lanzadera · Valencia · 2026</SectionLabel>
          </motion.div>
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6">
            Construimos el sistema operativo del turismo experiencial premium
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
            className="text-white/50 text-lg mb-4">
            Natur-Lux es donde lo probamos. El mundo es donde lo escalamos.
          </motion.p>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}
            className="text-white/25 text-sm mb-10 italic">
            — Nikol Ninkova, CEO & Cofundadora · Luxy · Mayo 2026
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4}
            className="flex flex-wrap gap-4 justify-center">
            <a href="https://agentluxy.netlify.app" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
              <Sparkles className="w-5 h-5" />
              Ver Demo del Agente IA
            </a>
            <a href="https://natur-lux-hideaway.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold transition-colors">
              <MapPin className="w-5 h-5" />
              Natur-Lux Hideaway
            </a>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-white/30 text-xs">
          <div className="flex items-center gap-2">
            <Star className="w-3 h-3 text-amber-500" />
            <span className="font-bold text-white/50">LUXY</span>
            <span>· TravelTech Premium Europe</span>
          </div>
          <div>DOCUMENTO CONFIDENCIAL · Versión 1.0 · Mayo 2026</div>
          <div>Nikol Ninkova (CEO) · Juan Ramón Amador (COO)</div>
        </div>
      </footer>
    </main>
  )
}
