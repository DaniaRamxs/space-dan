'use client'
import dynamic from 'next/dynamic'

const SpotifyCallback = dynamic(() => import('@/pages/SpotifyCallback'), { ssr: false })

export default function SpotifyCallbackPageClient() {
  return <SpotifyCallback />
}
