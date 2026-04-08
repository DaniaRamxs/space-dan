'use client'
import dynamic from 'next/dynamic'

const ShopPage = dynamic(() => import('@/pages/ShopPage'), { ssr: false })

export default function Page() {
  return <ShopPage />
}
