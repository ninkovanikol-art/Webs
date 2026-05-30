import type { WeatherDay } from './types'
import { cacheGet, cacheSetEnrichment, weatherCacheKey } from './cache'

const BASE_URL = 'https://api.openweathermap.org/data/2.5'

interface OWMForecastItem {
  dt: number
  main: { temp_min: number; temp_max: number }
  weather: Array<{ description: string; icon: string }>
  rain?: { '3h': number }
  wind: { speed: number }
  dt_txt: string
}

export async function getWeatherForecast(params: {
  latitude: number
  longitude: number
  checkIn: string
  nights: number
}): Promise<WeatherDay[]> {
  const { latitude, longitude, checkIn, nights } = params
  const cacheKey = weatherCacheKey(latitude, longitude, checkIn)

  const cached = await cacheGet<WeatherDay[]>(cacheKey)
  if (cached) return cached

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    console.warn('[Weather] No API key, using mock data')
    return getMockWeather(checkIn, nights)
  }

  try {
    const url = `${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&cnt=${Math.min(nights * 2, 40)}&lang=es`
    const res = await fetch(url, { next: { revalidate: 900 } })
    if (!res.ok) throw new Error(`OpenWeatherMap HTTP ${res.status}`)

    const data = await res.json()
    const checkInDate = new Date(checkIn)

    const dayMap = new Map<string, OWMForecastItem[]>()
    for (const item of data.list as OWMForecastItem[]) {
      const dateKey = item.dt_txt.slice(0, 10)
      if (!dayMap.has(dateKey)) dayMap.set(dateKey, [])
      dayMap.get(dateKey)!.push(item)
    }

    const days: WeatherDay[] = []
    for (let i = 0; i < nights; i++) {
      const date = new Date(checkInDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().slice(0, 10)
      const items = dayMap.get(dateKey) ?? []

      if (!items.length) {
        days.push(getMockDayWeather(dateKey, i))
        continue
      }

      const temps = items.map(it => it.main.temp_min)
      const tempMaxes = items.map(it => it.main.temp_max)
      const tempMin = Math.round(Math.min(...temps))
      const tempMax = Math.round(Math.max(...tempMaxes))
      const precipTotal = items.reduce((s, it) => s + (it.rain?.['3h'] ?? 0), 0)
      const windMax = Math.round(Math.max(...items.map(it => it.wind.speed)) * 3.6)
      const midItem = items[Math.floor(items.length / 2)]
      const desc = midItem.weather[0]?.description ?? 'despejado'
      const icon = midItem.weather[0]?.icon ?? '01d'

      const suitable = precipTotal < 5 && windMax < 40
      const note = buildWeatherNote(desc, tempMax, precipTotal, suitable)

      days.push({ date: dateKey, description: desc, tempMin, tempMax, precipitation: Math.round(precipTotal), windSpeed: windMax, icon, suitable, note })
    }

    await cacheSetEnrichment(cacheKey, days)
    return days
  } catch (err) {
    console.error('[Weather] Forecast error:', err)
    return getMockWeather(checkIn, nights)
  }
}

function buildWeatherNote(description: string, tempMax: number, precip: number, suitable: boolean): string {
  if (!suitable) return `Posibles lluvias (${precip.toFixed(1)}mm) — recomendable tener plan alternativo interior`
  if (tempMax > 28) return `Noche cálida y ${description}, perfecta para cenar en terraza`
  if (description.includes('despejado') || description.includes('clear')) {
    return 'Cielos despejados — condiciones ideales para actividades al aire libre y astronomía nocturna'
  }
  if (description.includes('nube') || description.includes('cloud')) {
    return 'Cielos parcialmente nublados, temperatura agradable para senderismo y visitas culturales'
  }
  return `Condiciones ${description} con temperatura máxima de ${tempMax}°C`
}

function getMockDayWeather(date: string, dayIndex: number): WeatherDay {
  const tempBase = 22 + Math.sin(dayIndex * 0.8) * 6
  const suitable = dayIndex % 7 !== 6
  return {
    date,
    description: suitable ? 'cielo despejado' : 'nubes y claros',
    tempMin: Math.round(tempBase - 7),
    tempMax: Math.round(tempBase),
    precipitation: suitable ? 0 : 2,
    windSpeed: 12 + dayIndex * 2,
    icon: suitable ? '01d' : '02d',
    suitable,
    note: suitable
      ? 'Cielos despejados — condiciones ideales para actividades al aire libre y astronomía nocturna'
      : 'Nubes dispersas, temperatura agradable',
  }
}

function getMockWeather(checkIn: string, nights: number): WeatherDay[] {
  const days: WeatherDay[] = []
  const startDate = new Date(checkIn)
  for (let i = 0; i < nights; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    days.push(getMockDayWeather(d.toISOString().slice(0, 10), i))
  }
  return days
}
