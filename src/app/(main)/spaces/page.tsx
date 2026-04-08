'use client'
import dynamic from 'next/dynamic'

const SpacesPage = dynamic(() => import('@/pages/SpacesPage'), { ssr: false })

export default function Page() {
  return <SpacesPage />
}
