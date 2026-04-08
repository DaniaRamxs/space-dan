'use client'
import dynamic from 'next/dynamic'

const CommunitiesPage = dynamic(() => import('@/pages/CommunitiesPage'), { ssr: false })

export default function Page() {
  return <CommunitiesPage />
}
