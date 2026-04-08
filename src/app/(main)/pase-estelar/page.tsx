'use client'
import dynamic from 'next/dynamic'

const StellarPassPage = dynamic(() => import('@/pages/StellarPassPage'), { ssr: false })

export default function Page() {
  return <StellarPassPage />
}
