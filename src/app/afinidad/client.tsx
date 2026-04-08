'use client'
import dynamic from 'next/dynamic'

const AffinityPage = dynamic(() => import('@/pages/AffinityPage'), { ssr: false })

export default function AfinidadPageClient() {
  return <AffinityPage />
}
