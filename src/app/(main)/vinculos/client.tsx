'use client'
import dynamic from 'next/dynamic'

const VinculosPage = dynamic(() => import('@/pages/VinculosPage'), { ssr: false })

export default function VinculosPageClient() {
  return <VinculosPage />
}
