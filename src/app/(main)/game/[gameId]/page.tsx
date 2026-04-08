'use client'
import dynamic from 'next/dynamic'

const GamesPage = dynamic(() => import('@/pages/GamesPage'), { ssr: false })

export default function Page({ params }: { params: any }) {
  return <GamesPage params={params} />
}
