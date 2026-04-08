'use client'
import dynamic from 'next/dynamic'

const GlobalLeaderboardPage = dynamic(() => import('@/pages/GlobalLeaderboardPage'), { ssr: false })

export default function Page() {
  return <GlobalLeaderboardPage />
}
