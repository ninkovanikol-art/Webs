import { Redis } from '@upstash/redis'

// TTL in seconds: 15 minutes for availability/pricing data
const AVAILABILITY_TTL = 900
// 24 hours for enrichment data (restaurants, POIs, etc.)
const ENRICHMENT_TTL = 86400

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!redis) {
    redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis()
  if (!client) return null
  try {
    return await client.get<T>(key)
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttl = AVAILABILITY_TTL): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    await client.set(key, value, { ex: ttl })
  } catch {
    // cache failure is non-fatal
  }
}

export async function cacheSetEnrichment(key: string, value: unknown): Promise<void> {
  return cacheSet(key, value, ENRICHMENT_TTL)
}

export function hotelCacheKey(cityCode: string, checkIn: string, checkOut: string, adults: number): string {
  return `hotels:${cityCode}:${checkIn}:${checkOut}:${adults}`
}

export function weatherCacheKey(lat: number, lon: number, date: string): string {
  return `weather:${lat.toFixed(2)}:${lon.toFixed(2)}:${date}`
}

export function placesCacheKey(lat: number, lon: number, type: string): string {
  return `places:${lat.toFixed(2)}:${lon.toFixed(2)}:${type}`
}

export function proposalCacheKey(id: string): string {
  return `proposal:${id}`
}
