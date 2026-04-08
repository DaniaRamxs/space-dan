'use client'
import dynamic from 'next/dynamic'

const SpaceCreatePage = dynamic(() => import('@/pages/SpaceCreatePage'), { ssr: false })

export default function Page() {
  return <SpaceCreatePage />
}
