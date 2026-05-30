import { cacheSet } from './cache'

interface LogEntry {
  timestamp: string
  proposalId: string
  destination: string
  emotionalState: string
  budgetPerNight: number
  hotelName?: string
  hotelPrice?: number
  dataSource: string
  responseTimeMs: number
}

export async function logProposal(entry: LogEntry): Promise<void> {
  // Store in Redis with 30-day retention for analytics
  const key = `log:proposal:${entry.proposalId}`
  try {
    await cacheSet(key, entry, 60 * 60 * 24 * 30)
  } catch {
    // logging is non-fatal
  }

  // Also write to console for server-side visibility
  console.log('[Luxy]', JSON.stringify({
    ...entry,
    type: 'proposal_generated',
  }))
}
