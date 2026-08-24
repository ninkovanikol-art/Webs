import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import ProposalDisplay from './ProposalDisplay'
import { cacheGet, proposalCacheKey } from '@/lib/cache'
import type { TravelProposal } from '@/lib/types'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Tu propuesta de viaje · Luxy`,
    description: 'Tu experiencia de viaje premium personalizada con disponibilidad confirmada y precios en tiempo real.',
  }
}

export default async function ProposalPage({ params }: Props) {
  const proposal = await cacheGet<TravelProposal>(proposalCacheKey(params.id))

  if (!proposal) {
    notFound()
  }

  return <ProposalDisplay proposal={proposal} />
}
