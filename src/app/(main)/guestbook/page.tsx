'use client'
import dynamic from 'next/dynamic'

const GuestbookPage = dynamic(() => import('@/pages/GuestbookPage'), { ssr: false })

export default function Page() {
  return <GuestbookPage />
}
