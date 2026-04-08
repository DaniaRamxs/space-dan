'use client'
import dynamic from 'next/dynamic'

const AchievementsPage = dynamic(() => import('@/pages/AchievementsPage'), { ssr: false })

export default function LogrosPageClient() {
  return <AchievementsPage />
}
