'use client'

import dynamic from 'next/dynamic'

const CommunityChannelsPage = dynamic(() => import('@/pages/CommunityChannelsPage'), { ssr: false })

export default function CommunityPageClient() {
  return <CommunityChannelsPage />
}
