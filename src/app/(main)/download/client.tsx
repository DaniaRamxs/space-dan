'use client'
import dynamic from 'next/dynamic'

const DownloadPage = dynamic(() => import('@/pages/DownloadPage'), { ssr: false })

export default function DownloadPageClient() {
  return <DownloadPage />
}
