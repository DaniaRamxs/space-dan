'use client'
import dynamic from 'next/dynamic'

const UniversoPage = dynamic(() => import('@/pages/UniversoPage'), { ssr: false })

export default function UniversoPageClient() {
  return <UniversoPage />
}
