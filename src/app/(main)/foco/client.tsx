'use client'
import dynamic from 'next/dynamic'

const FocusRoom = dynamic(() => import('@/pages/FocusRoom'), { ssr: false })

export default function FocoPageClient() {
  return <FocusRoom />
}
