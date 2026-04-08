'use client'
import dynamic from 'next/dynamic'

const SpaceSessionPage = dynamic(() => import('@/pages/SpaceSessionPage'), { ssr: false })

export default function Page({ params }: { params: any }) {
  return <SpaceSessionPage params={params} />
}
