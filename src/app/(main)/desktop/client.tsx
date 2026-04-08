'use client'
import dynamic from 'next/dynamic'

const DesktopPage = dynamic(() => import('@/pages/DesktopPage'), { ssr: false })

export default function DesktopPageClient() {
  return <DesktopPage />
}
