'use client'
import dynamic from 'next/dynamic'

const BlackMarketPage = dynamic(() => import('@/pages/BlackMarketPage'), { ssr: false })

export default function Page() {
  return <BlackMarketPage />
}
