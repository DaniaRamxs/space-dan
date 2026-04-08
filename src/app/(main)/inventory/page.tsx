'use client'
import dynamic from 'next/dynamic'

const InventoryPage = dynamic(() => import('@/pages/InventoryPage'), { ssr: false })

export default function Page() {
  return <InventoryPage />
}
