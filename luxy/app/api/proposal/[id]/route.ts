import { NextRequest, NextResponse } from 'next/server'
import { cacheGet, proposalCacheKey } from '@/lib/cache'
import type { TravelProposal } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const proposal = await cacheGet<TravelProposal>(proposalCacheKey(id))
  if (!proposal) {
    return NextResponse.json({ error: 'Propuesta no encontrada o expirada' }, { status: 404 })
  }

  return NextResponse.json({ proposal, cacheHit: true })
}
