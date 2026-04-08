'use client'
import dynamic from 'next/dynamic'

const VaultPage = dynamic(() => import('@/pages/VaultPage'), { ssr: false })

export default function Page() {
  return <VaultPage />
}
