'use client'
import dynamic from 'next/dynamic'

const OrbitLettersPage = dynamic(() => import('@/pages/OrbitLettersPage'), { ssr: false })

export default function Page() {
  return <OrbitLettersPage />
}
