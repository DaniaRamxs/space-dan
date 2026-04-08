'use client'
import dynamic from 'next/dynamic'

const ExplorePage = dynamic(() => import('@/pages/ExplorePage'), { ssr: false })

export default function ExplorarPageClient() {
  return <ExplorePage />
}
