'use client'
import dynamic from 'next/dynamic'

const SpaceCabinPage = dynamic(() => import('@/pages/SpaceCabinPage'), { ssr: false })

export default function CabinaPageClient() {
  return <SpaceCabinPage />
}
