'use client'
import dynamic from 'next/dynamic'

const GlobalMusicFeedPage = dynamic(() => import('@/pages/GlobalMusicFeedPage'), { ssr: false })

export default function AhoraSuenaPageClient() {
  return <GlobalMusicFeedPage />
}
