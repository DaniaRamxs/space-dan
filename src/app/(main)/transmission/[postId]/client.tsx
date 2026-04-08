'use client'

import dynamic from 'next/dynamic'

const PostDetailPage = dynamic(() => import('@/pages/PostDetailPage'), { ssr: false })

export default function TransmissionPageClient() {
  return <PostDetailPage />
}
