'use client'
import dynamic from 'next/dynamic'

const GlobalChatPage = dynamic(() => import('@/pages/GlobalChatPage'), { ssr: false })

export default function Page() {
  return <GlobalChatPage />
}
