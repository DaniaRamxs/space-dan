'use client'
import dynamic from 'next/dynamic'

const ArquitecturaPage = dynamic(() => import('@/pages/ArquitecturaPage'), { ssr: false })

export default function ArquitecturaPageClient() {
  return <ArquitecturaPage />
}
