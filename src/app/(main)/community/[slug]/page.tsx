'use client'
import dynamic from 'next/dynamic'

const CommunityChannelsPage = dynamic(() => import('@/pages/CommunityChannelsPage'), { ssr: false })

export default function Page({ params }: { params: any }) {
  return <CommunityChannelsPage params={params} />
}
