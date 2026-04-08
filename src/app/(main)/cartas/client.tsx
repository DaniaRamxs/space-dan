'use client'
import dynamic from 'next/dynamic'

const OrbitLettersPage = dynamic(() => import('@/pages/OrbitLettersPage'), { ssr: false })

export default function CartasPageClient() {
  return <OrbitLettersPage />
}
